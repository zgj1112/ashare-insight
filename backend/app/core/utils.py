"""通用小工具：数值转换、格式化、板块判定、交易时段。"""

from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

CN_TZ = ZoneInfo("Asia/Shanghai")

MORNING_OPEN = time(9, 30)
MORNING_CLOSE = time(11, 30)
AFTERNOON_OPEN = time(13, 0)
AFTERNOON_CLOSE = time(15, 0)
CALL_AUCTION_START = time(9, 15)


def to_float(value: object, default: float = 0.0) -> float:
    """把数据源返回的字符串/空值安全转成 float。"""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if text in ("", "-", "--", "null", "None", "nan"):
        return default
    try:
        return float(text)
    except ValueError:
        return default


def to_optional_float(value: object) -> float | None:
    """与 to_float 相同，但空值返回 None（用于市盈率等可能缺失的字段）。"""
    if value is None:
        return None
    text = str(value).strip()
    if text in ("", "-", "--", "null", "None", "nan", "0"):
        return None
    result = to_float(value, default=float("nan"))
    return None if result != result else result


def round_or_none(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


INDEX_HEADS = ("399", "395", "159", "880", "881", "882", "883", "899")


def exchange_of(symbol: str) -> str:
    """根据代码判断交易所前缀（已带前缀则以前缀为准）。"""
    text = symbol.strip().lower()
    digits = "".join(ch for ch in text if ch.isdigit())
    if text[:2] in ("sh", "sz", "bj"):
        return text[:2]
    if not digits:
        return "sh"
    if digits.startswith(INDEX_HEADS):
        return "sz"
    head = digits[0]
    if head in ("6", "9"):
        return "sh"
    if head in ("0", "2", "3", "1"):
        return "sz"
    if head in ("4", "8"):
        return "bj"
    return "sh"


def is_index(symbol: str) -> bool:
    """判断是否为指数代码（000xxx 在沪市是指数，在深市是个股）。"""
    text = symbol.strip().lower()
    digits = "".join(ch for ch in text if ch.isdigit())
    if not digits:
        return False
    if digits.startswith(INDEX_HEADS):
        return True
    if digits.startswith("000"):
        # sh000001 上证指数 / sz000001 平安银行
        return text.startswith(("sh", "bj"))
    return False


def normalize_code(code: str) -> tuple[str, str, str]:
    """返回 (带前缀代码, 纯代码, 交易所)。"""
    text = code.strip().lower()
    digits = "".join(ch for ch in text if ch.isdigit())
    exchange = exchange_of(text)
    return f"{exchange}{digits}", digits, exchange


def board_of(symbol: str) -> str:
    """判断所属板块。"""
    text = symbol.strip().lower()
    digits = "".join(ch for ch in text if ch.isdigit())
    if not digits:
        return "未知"
    if is_index(text):
        return "指数"
    if digits.startswith("600") or digits.startswith("601") or digits.startswith("603") or digits.startswith("605"):
        return "沪市主板"
    if digits.startswith("688"):
        return "科创板"
    if digits.startswith(("000", "001", "002", "003")):
        return "深市主板"
    if digits.startswith(("300", "301")):
        return "创业板"
    if digits.startswith(("43", "83", "87", "88", "92")):
        return "北交所"
    if digits.startswith(("51", "56", "58", "15", "16")):
        return "基金"
    return "其他"


def limit_ratio(symbol: str, name: str = "") -> float:
    """涨停/跌停幅度（如 0.1 表示 10%）；指数无涨跌停，返回 0。"""
    text = symbol.strip().lower()
    if is_index(text):
        return 0.0
    digits = "".join(ch for ch in text if ch.isdigit())
    upper_name = name.upper().replace(" ", "")
    is_st = "ST" in upper_name
    if digits.startswith(("688", "300", "301")):
        base = 0.20
    elif digits.startswith(("43", "83", "87", "88", "92")):
        base = 0.30
    else:
        base = 0.10
    if is_st:
        # ST 股在主板为 5%，创业板/科创板仍为 20%
        base = 0.20 if base == 0.20 else 0.05
    return base


def limit_prices(symbol: str, prev_close: float, name: str = "") -> tuple[float, float]:
    """按交易所四舍五入规则计算涨停价与跌停价；指数返回 (0, 0)。"""
    ratio = limit_ratio(symbol, name)
    if ratio <= 0:
        return 0.0, 0.0
    return round(prev_close * (1 + ratio), 2), round(prev_close * (1 - ratio), 2)


def format_price(value: float, digits: int | None = None) -> str:
    if value is None:
        return "--"
    if digits is None:
        digits = 3 if abs(value) < 100 else 2
    return f"{value:,.{digits}f}"


def format_percent(value: float) -> str:
    return f"{value:+.2f}%"


def format_change(value: float) -> str:
    return f"{value:+.2f}"


def format_amount(value: float) -> str:
    """成交额/市值格式化：元 -> 亿/万。"""
    if not value:
        return "--"
    abs_value = abs(value)
    if abs_value >= 1e12:
        return f"{value / 1e12:,.2f} 万亿"
    if abs_value >= 1e8:
        return f"{value / 1e8:,.2f} 亿"
    if abs_value >= 1e4:
        return f"{value / 1e4:,.2f} 万"
    return f"{value:,.2f}"


def format_volume(shares: float, is_index: bool = False) -> str:
    """成交量格式化。

    数据源个股返回「股」，指数返回「手」，两者量级等价，因此统一换算：
    个股按 手 = 股 / 100，指数本身已是手；再按 亿手 / 万手 / 手 分级展示。
    """
    if not shares:
        return "--"
    lots = shares if is_index else shares / 100
    if lots >= 1e8:
        return f"{lots / 1e8:,.2f} 亿手"
    if lots >= 1e4:
        return f"{lots / 1e4:,.2f} 万手"
    return f"{lots:,.0f} 手"


def pad2(value: int) -> str:
    return f"{value:02d}"


def market_state(now: datetime | None = None) -> tuple[str, str, str]:
    """返回 (状态码, 中文描述, 交易日) 。"""
    now = now or datetime.now(CN_TZ)
    trade_date = now.strftime("%Y-%m-%d")
    weekday = now.weekday() >= 5
    clock = now.time()

    if weekday:
        return "closed", "休市（周末）", trade_date
    if clock < CALL_AUCTION_START:
        return "pre_open", "盘前", trade_date
    if clock < MORNING_OPEN:
        return "pre_open", "集合竞价", trade_date
    if clock <= MORNING_CLOSE:
        return "trading", "交易中", trade_date
    if clock < AFTERNOON_OPEN:
        return "lunch_break", "午间休市", trade_date
    if clock <= AFTERNOON_CLOSE:
        return "trading", "交易中", trade_date
    return "closed", "已收盘", trade_date


def previous_trade_date(now: datetime | None = None) -> str:
    """粗略的上一个交易日（仅跳过周末，不含节假日）。"""
    now = now or datetime.now(CN_TZ)
    cursor = now.date() - timedelta(days=1)
    while cursor.weekday() >= 5:
        cursor -= timedelta(days=1)
    return cursor.strftime("%Y-%m-%d")
