"""行情总览业务逻辑：聚合指数、涨跌统计与榜单。"""

from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from statistics import median

from app.core.cache import TTLCache
from app.core.config import (
    DEFAULT_WATCHLIST,
    GAINERS_MAX_PERCENT,
    RANK_FETCH_SIZE,
    ROW_COUNT_MAX,
    TTL_INDEX_QUOTE,
    TTL_RANK,
    TTL_SNAPSHOT,
    TTL_STOCK_LIST,
    TTL_WATCH_QUOTE,
    WATCHLIST_MAX,
)
from app.core.utils import CN_TZ, format_amount, format_percent, format_price, limit_prices, market_state
from app.models.market import (
    FlowItem,
    IndexCard,
    KlineResponse,
    MarketOverview,
    MarketStats,
    Quote,
    RankResponse,
    SearchResponse,
    SectorItem,
)
from app.services.sina_client import SinaClient, build_display_fields

logger = logging.getLogger(__name__)

client = SinaClient()

# 首页展示的主要指数
MAIN_INDICES: list[tuple[str, str]] = [
    ("sh000001", "上证指数"),
    ("sz399001", "深证成指"),
    ("sz399006", "创业板指"),
    ("sh000688", "科创50"),
    ("sh000300", "沪深300"),
    ("sh000016", "上证50"),
]

_index_cache = TTLCache(TTL_INDEX_QUOTE, "index")
_rank_cache = TTLCache(TTL_RANK, "rank")
_snapshot_cache = TTLCache(TTL_SNAPSHOT, "snapshot")
_stock_list_cache = TTLCache(TTL_STOCK_LIST, "stock_list")
_watch_cache = TTLCache(TTL_WATCH_QUOTE, "watchlist")

# 全市场清单的代码索引（供自选补齐换手率等字段），预热是懒加载的
_stock_index_cache = TTLCache(TTL_STOCK_LIST, "stock_index")
_STOCK_INDEX_NOT_READY = object()
_warm_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="stock-index")
_stock_index_warming = False
_warm_lock = threading.Lock()


def _ensure_stock_index_warming() -> None:
    global _stock_index_warming
    with _warm_lock:
        if _stock_index_warming:
            return
        _stock_index_warming = True
    _warm_pool.submit(_warm_stock_index)

SOURCE_NAME = "新浪财经"


def _to_sector_item(raw: dict, kind: str) -> SectorItem:
    """把板块行转成 SectorItem，并补齐展示字段。"""
    return SectorItem(
        code=raw.get("code", ""),
        name=raw.get("name", ""),
        kind=kind,  # type: ignore[arg-type]
        stock_count=int(raw.get("stock_count") or 0),
        avg_price=round(raw.get("avg_price") or 0.0, 3),
        change=round(raw.get("change") or 0.0, 3),
        change_percent=round(raw.get("change_percent") or 0.0, 2),
        volume=round(raw.get("volume") or 0.0, 0),
        amount=round(raw.get("amount") or 0.0, 2),
        lead_code=raw.get("lead_code", ""),
        lead_symbol=raw.get("lead_symbol", ""),
        lead_name=raw.get("lead_name", ""),
        lead_change_percent=round(raw.get("lead_change_percent") or 0.0, 2),
        lead_price=round(raw.get("lead_price") or 0.0, 3),
        percent_fmt=format_percent(raw.get("change_percent") or 0.0),
        amount_fmt=format_amount(raw.get("amount") or 0.0),
        lead_percent_fmt=format_percent(raw.get("lead_change_percent") or 0.0),
        lead_price_fmt=format_price(raw.get("lead_price") or 0.0),
    )


def get_sector_rank(kind: str = "industry", limit: int = 10) -> list[SectorItem]:
    """板块涨幅榜：kind 为 industry（行业）或 concept（概念），按涨跌幅降序。

    板块总数有限（行业约 50、概念 200+），一次取全量后按需切片，
    因此不同 limit 共用同一份缓存。
    """
    if kind not in ("industry", "concept"):
        kind = "industry"
    cache_key = f"sector|{kind}"
    store = _rank_cache.get_or_load(lambda: {})
    if cache_key not in store:
        rows = client.fetch_sectors(kind)
        rows.sort(key=lambda row: row.get("change_percent", 0.0), reverse=True)
        store[cache_key] = rows
    return [_to_sector_item(row, kind) for row in store[cache_key][:limit]]


def _to_quote(raw: dict, model=Quote) -> Quote:
    return model(**build_display_fields(raw))


def get_indices() -> list[IndexCard]:
    """主要指数实时行情。"""

    def load() -> list[IndexCard]:
        codes = [code for code, _ in MAIN_INDICES]
        rows = {row["code"]: row for row in client.fetch_quotes(codes)}
        cards: list[IndexCard] = []
        for code, fallback_name in MAIN_INDICES:
            row = rows.get(code)
            if not row:
                logger.warning("指数 %s 无数据", code)
                continue
            card = _to_quote(row, IndexCard)
            if not card.name:
                card.name = fallback_name
            card.high_fmt = card.price_fmt if not row.get("high") else f"{row['high']:,.2f}"
            card.low_fmt = card.price_fmt if not row.get("low") else f"{row['low']:,.2f}"
            cards.append(card)
        return cards

    return _index_cache.get_or_load(load)


def get_snapshot() -> list[dict]:
    """全市场快照（约 5600 只），用于统计涨跌家数与涨跌停。"""
    return _snapshot_cache.get_or_load(client.fetch_all)


def get_stock_list() -> list[dict]:
    """全市场标的清单（代码+名称+基础行情），供搜索与字段补齐使用，缓存 12 小时。

    数据源的 symbol 过滤参数实际不生效，因此搜索改在本地清单上完成。
    """
    return _stock_list_cache.get_or_load(client.fetch_all)


def _stock_index() -> dict[str, dict]:
    """「带前缀代码 -> 列表行」映射。

    全市场清单约 5600 条、抓取约 2 秒，首次调用只在后台线程预热，
    当前请求先返回空映射（换手率等字段显示为 --），预热完成后自动生效。
    """
    cached = _stock_index_cache.get_or_load(lambda: _STOCK_INDEX_NOT_READY)
    return cached if cached is not _STOCK_INDEX_NOT_READY else {}


def _warm_stock_index() -> None:
    global _stock_index_warming
    try:
        rows = get_stock_list()
        # 先清掉「未就绪」哨兵，再写入真正的映射，否则读取方仍会看到哨兵
        _stock_index_cache.clear()
        _stock_index_cache.get_or_load(lambda: {row["code"]: row for row in rows})
        logger.info("全市场清单预热完成，共 %s 只标的", len(rows))
    except Exception as exc:  # 预热失败不影响主流程，允许下次请求重试
        logger.warning("全市场清单预热失败: %s", exc)
        _stock_index_warming = False


def _rank(
    sort_by: str,
    order: str,
    limit: int,
    exclude_suspended: bool = True,
    max_change_percent: float | None = None,
) -> list[dict]:
    """取榜单（内部统一入口，带缓存）。

    max_change_percent 用于过滤掉涨幅过高的标的（例如只看 11% 以内的涨幅榜），
    因为榜单里这类标的占比可能较高，抓取时先多取一些再过滤。
    """
    widen = 3 if max_change_percent is not None else 2

    def load() -> list[dict]:
        rows = client.fetch_rank(
            sort_by=sort_by,
            order=order,
            limit=limit * widen if exclude_suspended else limit,
        )
        if exclude_suspended:
            rows = [row for row in rows if not row.get("is_suspended") and row.get("price", 0) > 0]
        if max_change_percent is not None:
            rows = [row for row in rows if row.get("change_percent", 0.0) <= max_change_percent]
        return rows[:limit]

    cache_key = f"{sort_by}|{order}|{limit}|{exclude_suspended}|{max_change_percent}"
    store = _rank_cache.get_or_load(lambda: {})
    if cache_key in store:
        return store[cache_key]
    value = load()
    store[cache_key] = value
    return value


def _to_flow_item(raw: dict) -> FlowItem:
    """把资金流行转成 FlowItem（复用 Quote 的展示字段生成逻辑）。"""
    item = FlowItem(**build_display_fields(raw))
    main_net = raw.get("main_net_inflow") or 0.0
    ratio = raw.get("main_net_ratio") or 0.0
    item.main_net_inflow = round(main_net, 2)
    item.main_net_ratio = round(ratio, 2)
    item.retail_net_inflow = round(raw.get("retail_net_inflow") or 0.0, 2)
    item.main_net_fmt = format_amount(main_net)
    item.main_net_ratio_fmt = f"{ratio:+.2f}%"
    return item


def _rank_main_inflow(limit: int = 10, order: str = "desc") -> list[dict]:
    """主力资金榜（order=desc 净流入榜 / asc 净流出榜，仅个股）。

    排序必须交给数据源完成：只有降序的前若干条里全都是净流入，
    本地排序无法得到净流出榜。
    """
    cache_key = f"main_flow|{order}|{limit}"
    store = _rank_cache.get_or_load(lambda: {})
    if cache_key in store:
        return store[cache_key]
    rows = client.fetch_fund_flow_rank(
        sort="r0_net", ascending=order == "asc", limit=limit
    )
    store[cache_key] = rows
    return rows


def compute_stats(rows: list[dict]) -> MarketStats:
    """由全市场快照统计涨跌家数、涨跌停、平均/中位涨跌幅与总成交额。"""
    stats = MarketStats(total=len(rows))
    total_amount = 0.0
    percents: list[float] = []
    for row in rows:
        amount = row.get("amount") or 0.0
        total_amount += amount
        if row.get("is_suspended"):
            stats.suspended += 1
            continue
        percent = row.get("change_percent") or 0.0
        price = row.get("price") or 0.0
        prev_close = row.get("prev_close") or 0.0
        percents.append(percent)
        if percent > 0:
            stats.up += 1
        elif percent < 0:
            stats.down += 1
        else:
            stats.flat += 1

        # 涨跌停判定：触及交易所限制价
        if price > 0 and prev_close > 0:
            upper, lower = limit_prices(row.get("code", ""), prev_close, row.get("name", ""))
            if upper and price >= upper - 0.005:
                stats.limit_up += 1
            elif lower and price <= lower + 0.005:
                stats.limit_down += 1

    counted = stats.up + stats.down + stats.flat
    stats.up_ratio = round(stats.up / counted * 100, 2) if counted else 0.0
    if percents:
        stats.avg_change_percent = round(sum(percents) / len(percents), 2)
        stats.median_change_percent = round(median(percents), 2)
    stats.total_amount = round(total_amount, 2)
    stats.total_amount_fmt = format_amount(total_amount)
    return stats


def get_overview(limit: int = 10) -> MarketOverview:
    """总览看板聚合数据：指数 + 统计 + 榜单，并发拉取。

    limit 为每个榜单返回的条数（前端「行数」档位：10/20/30）。
    首页当前展示：主力净流入榜（最优先）、涨幅榜（11% 以内）、成交量榜。
    top_losers / top_turnover 仍保留在响应里，供其他页面或后续扩展使用。
    """
    limit = max(1, min(limit, ROW_COUNT_MAX))
    with ThreadPoolExecutor(max_workers=7) as pool:
        future_indices = pool.submit(get_indices)
        future_inflow = pool.submit(_rank_main_inflow, limit, "desc")
        future_outflow = pool.submit(_rank_main_inflow, limit, "asc")
        future_gainers = pool.submit(
            _rank, "change_percent", "desc", limit, True, GAINERS_MAX_PERCENT
        )
        future_volume = pool.submit(_rank, "volume", "desc", limit)
        future_sectors = pool.submit(get_sector_rank, "industry", 8)
        future_losers = pool.submit(_rank, "change_percent", "asc", limit)
        future_turnover = pool.submit(_rank, "amount", "desc", limit)

        indices = future_indices.result()
        inflow = future_inflow.result()
        outflow = future_outflow.result()
        gainers = future_gainers.result()
        volume_top = future_volume.result()
        sectors = future_sectors.result()
        losers = future_losers.result()
        turnover = future_turnover.result()

    try:
        stats = compute_stats(get_snapshot())
    except Exception as exc:  # 快照失败不应导致整页不可用
        logger.warning("全市场快照获取失败，统计信息降级: %s", exc)
        stats = MarketStats()

    state, state_text, trade_date = market_state()
    return MarketOverview(
        as_of=datetime.now(CN_TZ).strftime("%Y-%m-%d %H:%M:%S"),
        market_state=state,  # type: ignore[arg-type]
        market_state_text=state_text,
        trade_date=trade_date,
        source=SOURCE_NAME,
        data_age_seconds=round(_snapshot_cache.age, 1),
        indices=indices,
        stats=stats,
        main_inflow=[_to_flow_item(row) for row in inflow],
        main_outflow=[_to_flow_item(row) for row in outflow],
        top_gainers=[_to_quote(row) for row in gainers],
        top_volume=[_to_quote(row) for row in volume_top],
        top_sectors=sectors,
        sector_kind="industry",
        top_losers=[_to_quote(row) for row in losers],
        top_turnover=[_to_quote(row) for row in turnover],
    )


def get_rank_response(sort_by: str = "change_percent", order: str = "desc", limit: int = 20) -> RankResponse:
    if sort_by == "main_net_inflow":
        rows = _rank_main_inflow(limit=limit, order=order)
        return RankResponse(
            sort_by=sort_by,
            order=order,
            items=[_to_quote(row) for row in rows],  # type: ignore[list-item]
        )
    rows = _rank(sort_by, order, limit)
    return RankResponse(
        sort_by=sort_by,
        order=order,
        items=[_to_quote(row) for row in rows],
    )


def get_fund_flow_rank(order: str = "desc", limit: int = 20) -> list[FlowItem]:
    """资金流榜接口：默认按主力净额降序（净流入），order=asc 时为净流出。"""
    rows = _rank_main_inflow(limit=limit, order=order)
    return [_to_flow_item(row) for row in rows]


def get_quote(code: str) -> Quote | None:
    rows = client.fetch_quotes([code])
    return _to_quote(rows[0]) if rows else None


def get_quotes(codes: list[str], use_cache: bool = True) -> list[Quote]:
    """批量取行情，返回顺序与入参顺序一致（查不到的代码会被跳过）。

    自选列表每次刷新都会调用，因此带 5 秒缓存；缓存以代码组合为键，
    避免不同自选组合互相覆盖。换手率、市值等字段由全市场清单补齐。
    """
    ordered: list[str] = []
    seen: set[str] = set()
    for raw in codes:
        code = raw.strip().lower()
        if not code or code in seen:
            continue
        seen.add(code)
        ordered.append(code)
    if not ordered:
        return []
    ordered = ordered[:WATCHLIST_MAX]

    list_fields = _stock_index()
    if not list_fields:
        # 首次请求时后台预热全市场清单，本次先用快照接口的数据返回
        _ensure_stock_index_warming()

    def enrich(rows: list[dict]) -> list[dict]:
        """用全市场清单补齐换手率、市值等快照接口缺失的字段。"""
        if not list_fields:
            return rows
        for row in rows:
            extra = list_fields.get(row["code"])
            if not extra:
                continue
            for field in ("turnover_rate", "pe", "pb", "market_cap", "float_cap"):
                if row.get(field) is None and extra.get(field) is not None:
                    row[field] = extra[field]
        return rows

    def load() -> dict[str, dict]:
        store = _watch_cache.get_or_load(lambda: {}) if use_cache else {}
        key = ",".join(ordered)
        if key not in store:
            rows = enrich(client.fetch_quotes(ordered))
            if use_cache:
                store.clear()  # 只保留最近一次自选组合，避免缓存无限增长
                store[key] = {row["code"]: row for row in rows}
            else:
                return {row["code"]: row for row in rows}
        return store[key]

    mapping = load()
    return [_to_quote(mapping[code]) for code in ordered if code in mapping]


def get_default_watchlist() -> list[str]:
    """自选股默认清单（浏览器首次访问时使用）。"""
    return list(DEFAULT_WATCHLIST)


def get_kline(code: str, period: str = "day", adjust: str = "qfq", limit: int = 120) -> KlineResponse:
    """日/周/月 K 线。当前数据源暂未接入，保留接口占位。"""
    return KlineResponse(code=code, period=period, adjust=adjust, bars=[])


def search(keyword: str, limit: int = 10) -> SearchResponse:
    """在本地标的清单上做代码/名称匹配，返回结果按匹配优先级排序。"""
    text = keyword.strip()
    if not text:
        return SearchResponse(keyword=keyword, items=[])
    lowered = text.lower()
    digits = "".join(ch for ch in text if ch.isdigit())

    rows = get_stock_list()
    exact: list[dict] = []
    prefix: list[dict] = []
    contains: list[dict] = []

    for row in rows:
        code = row["code"]
        symbol = row["symbol"]
        name = row["name"]
        lowered_name = name.lower()
        if lowered in (code, symbol):
            exact.append(row)
        elif digits and symbol.startswith(digits):
            prefix.append(row)
        elif lowered in code or lowered in lowered_name:
            contains.append(row)
        if len(exact) >= limit:
            break

    ordered = exact + prefix + contains
    return SearchResponse(keyword=keyword, items=[_to_quote(row) for row in ordered[:limit]])
