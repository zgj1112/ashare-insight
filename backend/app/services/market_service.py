"""行情总览业务逻辑：聚合指数、涨跌统计与榜单。"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from statistics import median

from app.core.cache import TTLCache
from app.core.config import TTL_INDEX_QUOTE, TTL_RANK, TTL_SNAPSHOT, TTL_STOCK_LIST
from app.core.utils import CN_TZ, format_amount, limit_prices, market_state
from app.models.market import (
    IndexCard,
    KlineResponse,
    MarketOverview,
    MarketStats,
    Quote,
    RankResponse,
    SearchResponse,
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

SOURCE_NAME = "新浪财经"


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
    """全市场标的清单（代码+名称+基础行情），供搜索使用，缓存 12 小时。

    数据源的 symbol 过滤参数实际不生效，因此搜索改在本地清单上完成。
    """
    return _stock_list_cache.get_or_load(client.fetch_all)


def _rank(sort_by: str, order: str, limit: int, exclude_suspended: bool = True) -> list[dict]:
    """取榜单（内部统一入口，带缓存）。"""

    def load() -> list[dict]:
        rows = client.fetch_rank(sort_by=sort_by, order=order, limit=limit * 2 if exclude_suspended else limit)
        if exclude_suspended:
            rows = [row for row in rows if not row.get("is_suspended") and row.get("price", 0) > 0]
        return rows[:limit]

    cache_key = f"{sort_by}|{order}|{limit}|{exclude_suspended}"
    store = _rank_cache.get_or_load(lambda: {})
    if cache_key in store:
        return store[cache_key]
    value = load()
    store[cache_key] = value
    return value


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


def get_overview() -> MarketOverview:
    """总览看板聚合数据：指数 + 统计 + 三个榜单，并发拉取。"""
    with ThreadPoolExecutor(max_workers=4) as pool:
        future_indices = pool.submit(get_indices)
        future_gainers = pool.submit(_rank, "change_percent", "desc", 10)
        future_losers = pool.submit(_rank, "change_percent", "asc", 10)
        future_turnover = pool.submit(_rank, "amount", "desc", 10)

        indices = future_indices.result()
        gainers = future_gainers.result()
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
        top_gainers=[_to_quote(row) for row in gainers],
        top_losers=[_to_quote(row) for row in losers],
        top_turnover=[_to_quote(row) for row in turnover],
    )


def get_rank_response(sort_by: str = "change_percent", order: str = "desc", limit: int = 20) -> RankResponse:
    rows = _rank(sort_by, order, limit)
    return RankResponse(
        sort_by=sort_by,
        order=order,
        items=[_to_quote(row) for row in rows],
    )


def get_quote(code: str) -> Quote | None:
    rows = client.fetch_quotes([code])
    return _to_quote(rows[0]) if rows else None


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
