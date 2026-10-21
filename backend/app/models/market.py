"""对外返回的数据模型。

约定：
- price / price_change / change_percent 为原始数值，前端自行决定小数位；
- volume 单位为「股」，amount 单位为「元」；
- *_fmt 为后端格式化好的字符串，方便直接展示（带千分位/亿万元）。
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MarketState = Literal["pre_open", "trading", "lunch_break", "closed"]


class Quote(BaseModel):
    """单个标的的行情快照。"""

    code: str = Field(description="带市场前缀的代码，如 sh600519")
    symbol: str = Field(description="纯代码，如 600519")
    name: str
    exchange: Literal["sh", "sz", "bj"] = "sh"
    board: str = Field(default="", description="所属板块，如 主板/创业板/科创板/北交所")

    price: float = 0.0
    prev_close: float = 0.0
    open: float = 0.0
    high: float = 0.0
    low: float = 0.0
    price_change: float = 0.0
    change_percent: float = 0.0
    amplitude: float = 0.0
    volume: float = Field(default=0.0, description="成交量（股）")
    amount: float = Field(default=0.0, description="成交额（元）")
    turnover_rate: float | None = None
    pe: float | None = None
    pb: float | None = None
    market_cap: float | None = Field(default=None, description="总市值（元）")
    float_cap: float | None = Field(default=None, description="流通市值（元）")

    trade_time: str = ""
    is_suspended: bool = False

    price_fmt: str = ""
    change_fmt: str = ""
    percent_fmt: str = ""
    amount_fmt: str = ""
    volume_fmt: str = ""


class IndexCard(Quote):
    """指数卡片，额外携带分时点位。"""

    high_fmt: str = ""
    low_fmt: str = ""


class MarketStats(BaseModel):
    """全市场涨跌统计。"""

    total: int = 0
    up: int = 0
    down: int = 0
    flat: int = 0
    suspended: int = 0
    limit_up: int = 0
    limit_down: int = 0
    up_ratio: float = Field(default=0.0, description="上涨家数占比 %")
    avg_change_percent: float = Field(default=0.0, description="全市场平均涨跌幅 %")
    median_change_percent: float = Field(default=0.0, description="全市场涨跌幅中位数 %")
    total_amount: float = Field(default=0.0, description="全市场成交额（元）")
    total_amount_fmt: str = ""


class MarketOverview(BaseModel):
    """行情总览看板一次性返回的聚合数据。"""

    as_of: str = Field(description="数据生成时间")
    market_state: MarketState = "closed"
    market_state_text: str = ""
    trade_date: str = ""
    source: str = ""
    data_age_seconds: float = 0.0

    indices: list[IndexCard] = Field(default_factory=list)
    stats: MarketStats = Field(default_factory=MarketStats)
    # 主力净流入榜（首页最优先展示）
    main_inflow: list[FlowItem] = Field(default_factory=list)
    # 主力净流出榜（与净流入榜对称展示）
    main_outflow: list[FlowItem] = Field(default_factory=list)
    # 涨幅榜：已过滤掉涨幅超过阈值的标的
    top_gainers: list[Quote] = Field(default_factory=list)
    # 成交量榜
    top_volume: list[Quote] = Field(default_factory=list)
    # 板块涨幅榜（默认行业，可切换概念）
    top_sectors: list[SectorItem] = Field(default_factory=list)
    sector_kind: str = "industry"
    top_losers: list[Quote] = Field(default_factory=list)
    top_turnover: list[Quote] = Field(default_factory=list)


class KlineBar(BaseModel):
    """单根 K 线。"""

    date: str
    open: float
    close: float
    high: float
    low: float
    volume: float = Field(description="成交量（股）")
    amount: float = 0.0


class MoneyFlowTier(BaseModel):
    """单一大单级别的资金流向。"""

    key: str
    label: str
    inflow: float = Field(description="流入（元）")
    outflow: float = Field(description="流出（元）")
    net: float = Field(description="净额（元）")
    total: float = Field(default=0.0, description="流入+流出，用于占比")
    inflow_fmt: str = ""
    outflow_fmt: str = ""
    net_fmt: str = ""
    net_ratio: float = Field(default=0.0, description="净额占成交额比例 %")
    net_ratio_fmt: str = ""


class MoneyFlow(BaseModel):
    """个股实时资金流向（大单分级）。"""

    code: str
    name: str = ""
    trade_date: str = ""
    price: float = 0.0
    change_percent: float = 0.0
    amount: float = Field(default=0.0, description="成交额（元）")
    amount_fmt: str = ""
    turnover_rate: float | None = None

    tiers: list[MoneyFlowTier] = Field(default_factory=list)
    # 主力 = 超大单 + 大单
    main_inflow: float = 0.0
    main_outflow: float = 0.0
    main_net: float = 0.0
    main_net_fmt: str = ""
    main_net_ratio: float = Field(default=0.0, description="主力净额占成交额 %")
    main_net_ratio_fmt: str = ""
    retail_net: float = Field(default=0.0, description="中小单净额（元）")
    retail_net_fmt: str = ""
    # 大单强度：超大单净额 / 成交额，衡量大资金参与度
    strength: float = Field(default=0.0, description="超大单净额 / 成交额 %")
    strength_fmt: str = ""
    updated_at: str = ""


class MinutePoint(BaseModel):
    """分时点。"""

    time: str = Field(description="HH:MM")
    price: float
    avg_price: float = 0.0
    volume: float = Field(default=0.0, description="该分钟成交量（股）")


class StockDetail(BaseModel):
    """个股详情页聚合数据。"""

    quote: Quote
    flow: MoneyFlow
    minutes: list[MinutePoint] = Field(default_factory=list)
    prev_close: float = 0.0
    limit_up: float = 0.0
    limit_down: float = 0.0
    trade_date: str = ""
    source: str = ""


class KlineResponse(BaseModel):
    code: str
    name: str = ""
    period: str = "day"
    adjust: str = "qfq"
    bars: list[KlineBar] = Field(default_factory=list)


class RankItem(Quote):
    pass


class FlowItem(Quote):
    """资金流榜条目，附带主力资金数据。"""

    main_net_inflow: float = Field(default=0.0, description="主力净流入（元），负数为净流出")
    main_net_ratio: float = Field(default=0.0, description="主力净额占成交额比例 %")
    retail_net_inflow: float = Field(default=0.0, description="非主力（中小单）净额，元")
    main_net_fmt: str = ""
    main_net_ratio_fmt: str = ""


class SectorItem(BaseModel):
    """板块（行业 / 概念）行情条目。"""

    code: str
    name: str
    kind: Literal["industry", "concept"] = "industry"
    stock_count: int = 0
    avg_price: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    volume: float = Field(default=0.0, description="成交量（股）")
    amount: float = Field(default=0.0, description="成交额（元）")

    lead_code: str = ""
    lead_symbol: str = ""
    lead_name: str = ""
    lead_change_percent: float = 0.0
    lead_price: float = 0.0

    percent_fmt: str = ""
    amount_fmt: str = ""
    lead_percent_fmt: str = ""
    lead_price_fmt: str = ""


class RankResponse(BaseModel):
    sort_by: str
    order: str
    board: str = "hs_a"
    items: list[RankItem] = Field(default_factory=list)


class SearchResponse(BaseModel):
    keyword: str
    items: list[Quote] = Field(default_factory=list)
