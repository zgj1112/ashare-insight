"""新浪财经行情数据客户端。

选择新浪的原因：接口稳定、不限流、单次可批量取多只标的、字段覆盖总览看板所需。
东方财富接口在部分网络环境下会被断连，后续可作为备用数据源接入（见 README 规划）。
"""

from __future__ import annotations

import json
import logging
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from app.core.config import (
    FUND_FLOW_EXCLUDE_PREFIXES,
    PAGE_SIZE,
    REQUEST_RETRIES,
    REQUEST_TIMEOUT,
    SNAPSHOT_WORKERS,
    USER_AGENT,
)
from app.core.utils import (
    board_of,
    exchange_of,
    format_amount,
    format_change,
    format_percent,
    format_price,
    format_volume,
    is_index,
    normalize_code,
    round_or_none,
    to_float,
    to_optional_float,
)

logger = logging.getLogger(__name__)

SINA_QUOTE_URL = "https://hq.sinajs.cn/list={codes}"
SINA_LIST_URL = (
    "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/"
    "Market_Center.getHQNodeData"
)
SINA_COUNT_URL = (
    "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/"
    "Market_Center.getHQNodeStockCount"
)
# 资金流排行（主力大单净额等），字段为 r0_*（超大单）、r3_*（大单）
SINA_FUND_FLOW_URL = (
    "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/"
    "MoneyFlow.ssl_bkzj_ssggzj"
)
# 板块行情：行业（申万风格）与概念板块，返回 JS 变量赋值的 JSON
SINA_SECTOR_URLS = {
    "industry": "https://vip.stock.finance.sina.com.cn/q/view/newSinaHy.php",
    "concept": "https://vip.stock.finance.sina.com.cn/q/view/newFLJK.php?param=class",
}

QUOTE_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://finance.sina.com.cn",
}
LIST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://vip.stock.finance.sina.com.cn/",
}
SECTOR_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://finance.sina.com.cn/",
}

# 支持的榜单排序字段 -> 新浪接口的 sort 参数
SORT_FIELDS = {
    "change_percent": "changepercent",
    "amount": "amount",
    "volume": "volume",
    "turnover_rate": "turnoverratio",
    "market_cap": "mktcap",
    "float_cap": "nmc",
    "price": "trade",
    "pe": "per",
    "pb": "pb",
}


class SinaClientError(RuntimeError):
    """数据源请求失败。"""


class SinaClient:
    """新浪行情接口封装，全部为同步方法，由上层决定并发与缓存。"""

    def __init__(self, timeout: float = REQUEST_TIMEOUT, retries: int = REQUEST_RETRIES) -> None:
        self.timeout = timeout
        self.retries = retries

    # ------------------------------------------------------------------ 底层
    def _request(self, url: str, headers: dict[str, str], encoding: str) -> str:
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                request = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    return response.read().decode(encoding, "replace")
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = exc
                if attempt < self.retries:
                    time.sleep(0.3 * (attempt + 1) + random.random() * 0.2)
        raise SinaClientError(f"请求失败: {url} ({last_error})")

    # ------------------------------------------------------------ 行情快照
    def fetch_quotes(self, codes: list[str], list_fields: dict[str, dict] | None = None) -> list[dict]:
        """批量取实时行情，单次建议不超过 200 个代码。

        list_fields 为「代码 -> 列表接口行数据」的映射，用于补齐换手率、市值等
        快照接口不提供的字段（由上层维护全市场清单后传入）。
        """
        cleaned = [code.strip().lower() for code in codes if code.strip()]
        if not cleaned:
            return []
        results: list[dict] = []
        for start in range(0, len(cleaned), 150):
            batch = cleaned[start : start + 150]
            url = SINA_QUOTE_URL.format(codes=",".join(batch))
            text = self._request(url, QUOTE_HEADERS, "gbk")
            results.extend(
                build_display_fields(raw) for raw in self._parse_quote_payload(text)
            )
        if list_fields:
            self._merge_list_fields(results, list_fields)
        return results

    @staticmethod
    def _merge_list_fields(quotes: list[dict], list_fields: dict[str, dict]) -> None:
        """用列表接口的数据补齐快照缺失字段，仅在原值为空时覆盖。"""
        for quote in quotes:
            extra = list_fields.get(quote["code"])
            if not extra:
                continue
            for field in ("turnover_rate", "pe", "pb", "market_cap", "float_cap"):
                if quote.get(field) is None and extra.get(field) is not None:
                    quote[field] = extra[field]

    @staticmethod
    def _parse_quote_payload(text: str) -> list[dict]:
        quotes: list[dict] = []
        for line in text.split(";"):
            line = line.strip()
            if not line or '="' not in line:
                continue
            head, payload = line.split('="', 1)
            code = head.replace("var hq_str_", "").strip().lower()
            parts = payload.rstrip('"').split(",")
            if len(parts) < 6 or not parts[0].strip():
                continue  # 无数据的代码（如退市、代码错误）
            base = SinaClient._build_base_quote(code, parts)
            if base is not None:
                quotes.append(base)
        return quotes

    @staticmethod
    def _build_base_quote(code: str, parts: list[str]) -> dict | None:
        """把新浪 33 字段解析成统一字典。"""
        name = parts[0].strip()
        prev_close = to_float(parts[2])
        price = to_float(parts[3])
        volume_shares = to_float(parts[8])
        amount = to_float(parts[9])
        trade_date = parts[30].strip() if len(parts) > 30 else ""
        trade_clock = parts[31].strip() if len(parts) > 31 else ""

        # 停牌时现价为 0，用昨收兜底展示
        suspended = price <= 0
        if suspended:
            price = prev_close
        price_change = price - prev_close if prev_close else 0.0
        change_percent = (price_change / prev_close * 100) if prev_close else 0.0
        high = to_float(parts[4])
        low = to_float(parts[5])
        amplitude = ((high - low) / prev_close * 100) if prev_close and high and low else 0.0

        _, symbol, exchange = normalize_code(code)
        return {
            "code": code,
            "symbol": symbol,
            "name": name,
            "exchange": exchange,
            "board": board_of(code),
            "price": price,
            "prev_close": prev_close,
            "open": to_float(parts[1]),
            "high": high,
            "low": low,
            "price_change": price_change,
            "change_percent": change_percent,
            "amplitude": amplitude,
            "volume": volume_shares,
            "amount": amount,
            "turnover_rate": None,
            "pe": None,
            "pb": None,
            "market_cap": None,
            "float_cap": None,
            "trade_time": f"{trade_date} {trade_clock}".strip(),
            "is_suspended": suspended,
        }

    # ------------------------------------------------------------ 榜单/列表
    def fetch_page(
        self,
        page: int = 1,
        sort: str = "symbol",
        ascending: bool = True,
        node: str = "hs_a",
    ) -> list[dict]:
        """取一页全市场数据（每页最多 100 条）。"""
        params = {
            "page": page,
            "num": PAGE_SIZE,
            "sort": sort,
            "asc": 1 if ascending else 0,
            "node": node,
            "symbol": "",
            "_s_r_a": "page",
        }
        url = f"{SINA_LIST_URL}?{urllib.parse.urlencode(params)}"
        text = self._request(url, LIST_HEADERS, "gbk").strip()
        if text in ("", "null", "[]"):
            return []
        try:
            rows = json.loads(text)
        except json.JSONDecodeError as exc:
            raise SinaClientError(f"榜单数据解析失败: {exc}") from exc
        return [self._convert_row(row) for row in rows if isinstance(row, dict)]

    def fetch_sectors(self, kind: str = "industry") -> list[dict]:
        """板块行情：kind 为 industry（行业）或 concept（概念）。

        数据源返回形如 `var S_Finance_bankuai_xxx = {...};` 的赋值语句，
        每个板块的取值是逗号分隔的字符串：
          0 板块代码 1 板块名 2 成分股数 3 平均价 4 平均涨跌额 5 涨跌幅%
          6 成交量(股) 7 成交额(元) 8 领涨股代码 9 领涨股涨跌幅% 10 领涨股价
          11 领涨股涨跌额 12 领涨股名
        """
        url = SINA_SECTOR_URLS.get(kind) or SINA_SECTOR_URLS["industry"]
        text = self._request(url, SECTOR_HEADERS, "gbk").strip()
        if "=" not in text:
            return []
        payload = text.split("=", 1)[1].strip().rstrip(";")
        try:
            raw = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise SinaClientError(f"板块数据解析失败: {exc}") from exc
        if not isinstance(raw, dict):
            return []
        return [self._convert_sector_row(value) for value in raw.values() if isinstance(value, str)]

    @staticmethod
    def _convert_sector_row(value: str) -> dict:
        fields = value.split(",")
        while len(fields) < 13:
            fields.append("")
        lead_symbol = fields[8].strip().lower()
        lead_code = ""
        lead_digits = ""
        if lead_symbol:
            lead_code, lead_digits, _ = normalize_code(lead_symbol)
        return {
            "code": fields[0].strip(),
            "name": fields[1].strip(),
            "stock_count": int(to_float(fields[2])),
            "avg_price": to_float(fields[3]),
            "change": to_float(fields[4]),
            "change_percent": to_float(fields[5]),
            "volume": to_float(fields[6]),
            "amount": to_float(fields[7]),
            "lead_code": lead_code,
            "lead_symbol": lead_digits,
            "lead_name": fields[12].strip(),
            "lead_change_percent": to_float(fields[9]),
            "lead_price": to_float(fields[10]),
        }

    def fetch_rank(
        self,
        sort_by: str = "change_percent",
        order: str = "desc",
        limit: int = 10,
        node: str = "hs_a",
    ) -> list[dict]:
        """取排行榜（服务端排序）。"""
        sort_field = SORT_FIELDS.get(sort_by, "changepercent")
        rows = self.fetch_page(page=1, sort=sort_field, ascending=order != "desc", node=node)
        return rows[:limit]

    def fetch_stock_count(self, node: str = "hs_a") -> int:
        url = f"{SINA_COUNT_URL}?node={node}"
        text = self._request(url, LIST_HEADERS, "gbk").strip().strip('"')
        return int(to_float(text, 0))

    def fetch_fund_flow_rank(
        self,
        sort: str = "r0_net",
        ascending: bool = False,
        limit: int = 20,
        stocks_only: bool = True,
    ) -> list[dict]:
        """主力资金流向排行。

        数据源字段含义：
          r0_net / r0_in / r0_out 超大单（主力）净额/流入/流出，单位元
          r0_ratio                主力净额占成交额比例（小数，如 0.346 = 34.6%）
          netamount / ratioamount 全部资金（含中小单）的净额与占比
        """
        params = {
            "page": 1,
            "num": max(limit * 4, 100) if stocks_only else limit,
            "sort": sort,
            "asc": 0 if not ascending else 1,
            "bankuai": "",
            "shichang": "",
        }
        url = f"{SINA_FUND_FLOW_URL}?{urllib.parse.urlencode(params)}"
        text = self._request(url, LIST_HEADERS, "gbk").strip()
        if text in ("", "null", "[]"):
            return []
        try:
            rows = json.loads(text)
        except json.JSONDecodeError as exc:
            raise SinaClientError(f"资金流数据解析失败: {exc}") from exc
        if not isinstance(rows, list):
            return []

        converted = [self._convert_flow_row(row) for row in rows if isinstance(row, dict)]
        if stocks_only:
            converted = [row for row in converted if row["is_stock"]]
        return converted[:limit]

    @staticmethod
    def _convert_flow_row(row: dict) -> dict:
        """把资金流行转成统一字典。"""
        symbol = str(row.get("symbol") or "").strip().lower()
        digits = "".join(ch for ch in symbol if ch.isdigit())
        exchange = exchange_of(symbol)
        main_net = to_float(row.get("r0_net"))
        amount = to_float(row.get("amount"))
        # 净占比优先用接口返回的 r0_ratio，缺失时按 净额/成交额 估算
        ratio = to_float(row.get("r0_ratio"), default=float("nan"))
        if ratio != ratio:
            ratio = main_net / amount if amount else 0.0
        return {
            "code": f"{exchange}{digits}",
            "symbol": digits,
            "name": str(row.get("name") or "").strip(),
            "exchange": exchange,
            "board": board_of(f"{exchange}{digits}"),
            "price": to_float(row.get("trade")),
            "change_percent": to_float(row.get("changeratio")) * 100,
            "amount": amount,
            "main_net_inflow": main_net,
            "main_net_ratio": ratio * 100,
            "retail_net_inflow": to_float(row.get("netamount")) - main_net,
            "is_stock": not digits.startswith(FUND_FLOW_EXCLUDE_PREFIXES),
        }

    def fetch_all(self, node: str = "hs_a") -> list[dict]:
        """并发抓取全市场快照（约 5600 只，2 秒左右）。"""
        try:
            total = self.fetch_stock_count(node)
        except SinaClientError:
            total = 0
        pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE) if total else 60
        pages = min(max(pages, 1), 80)

        def load(page: int) -> list[dict]:
            try:
                return self.fetch_page(page=page, sort="symbol", ascending=True, node=node)
            except SinaClientError as exc:
                logger.warning("快照第 %s 页抓取失败: %s", page, exc)
                return []

        # 第一页先取，确认总量与页数是否一致
        first = load(1)
        if not first:
            return []
        results = list(first)
        if pages > 1:
            with ThreadPoolExecutor(max_workers=SNAPSHOT_WORKERS) as pool:
                for chunk in pool.map(load, range(2, pages + 1)):
                    results.extend(chunk)
        return results

    # ---------------------------------------------------------------- 转换
    @staticmethod
    def _convert_row(row: dict) -> dict:
        """把新浪榜单行转成统一字典（与行情快照同构）。"""
        symbol = str(row.get("symbol") or row.get("code") or "").strip().lower()
        digits = str(row.get("code") or "".join(ch for ch in symbol if ch.isdigit()))
        exchange = exchange_of(symbol)
        code = f"{exchange}{digits}"

        price = to_float(row.get("trade"))
        prev_close = to_float(row.get("settlement"))
        change = to_float(row.get("pricechange"))
        percent = to_float(row.get("changepercent"))
        volume = to_float(row.get("volume"))
        amount = to_float(row.get("amount"))
        high = to_float(row.get("high"))
        low = to_float(row.get("low"))
        amplitude = ((high - low) / prev_close * 100) if prev_close and high and low else 0.0
        # 新浪榜单的 mktcap / nmc 单位是万元
        market_cap = to_optional_float(row.get("mktcap"))
        float_cap = to_optional_float(row.get("nmc"))
        suspended = price <= 0

        return {
            "code": code,
            "symbol": digits,
            "name": str(row.get("name") or "").strip(),
            "exchange": exchange,
            "board": board_of(code),
            "price": price,
            "prev_close": prev_close,
            "open": to_float(row.get("open")),
            "high": high,
            "low": low,
            "price_change": change,
            "change_percent": percent,
            "amplitude": amplitude,
            "volume": volume,
            "amount": amount,
            "turnover_rate": to_optional_float(row.get("turnoverratio")),
            "pe": to_optional_float(row.get("per")),
            "pb": to_optional_float(row.get("pb")),
            "market_cap": market_cap * 1e4 if market_cap else None,
            "float_cap": float_cap * 1e4 if float_cap else None,
            "trade_time": str(row.get("ticktime") or ""),
            "is_suspended": suspended,
        }


def _fmt_price(value: float) -> str:
    """价格展示：指数点位/低价股保留 3 位，高价股 2 位更清爽。"""
    return format_price(value, 2 if value >= 100 else 3)


def build_display_fields(raw: dict) -> dict:
    """生成统一的展示字段（与 app.models.market.Quote 的字段一一对应）。"""
    return {
        "code": raw.get("code", ""),
        "symbol": raw.get("symbol", ""),
        "name": raw.get("name", ""),
        "exchange": raw.get("exchange", "sh"),
        "board": raw.get("board", ""),
        "price": round(raw.get("price", 0.0), 3),
        "prev_close": round(raw.get("prev_close", 0.0), 3),
        "open": round(raw.get("open", 0.0), 3),
        "high": round(raw.get("high", 0.0), 3),
        "low": round(raw.get("low", 0.0), 3),
        "price_change": round(raw.get("price_change", 0.0), 3),
        "change_percent": round(raw.get("change_percent", 0.0), 2),
        "amplitude": round(raw.get("amplitude", 0.0), 2),
        "volume": round(raw.get("volume", 0.0), 0),
        "amount": round(raw.get("amount", 0.0), 2),
        "turnover_rate": round_or_none(raw.get("turnover_rate")),
        "pe": round_or_none(raw.get("pe")),
        "pb": round_or_none(raw.get("pb")),
        "market_cap": round_or_none(raw.get("market_cap"), 0),
        "float_cap": round_or_none(raw.get("float_cap"), 0),
        "trade_time": raw.get("trade_time", ""),
        "is_suspended": bool(raw.get("is_suspended", False)),
        "price_fmt": _fmt_price(raw.get("price", 0.0)),
        "change_fmt": format_change(raw.get("price_change", 0.0)),
        "percent_fmt": format_percent(raw.get("change_percent", 0.0)),
        "amount_fmt": format_amount(raw.get("amount", 0.0)),
        "volume_fmt": format_volume(raw.get("volume", 0.0), is_index=is_index(raw.get("code", ""))),
    }
