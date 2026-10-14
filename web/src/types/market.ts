/**
 * 与后端 app/models/market.py 对应的类型定义。
 */

export type MarketState = 'pre_open' | 'trading' | 'lunch_break' | 'closed'

export interface Quote {
  code: string
  symbol: string
  name: string
  exchange: 'sh' | 'sz' | 'bj'
  board: string

  price: number
  prev_close: number
  open: number
  high: number
  low: number
  price_change: number
  change_percent: number
  amplitude: number
  volume: number
  amount: number
  turnover_rate: number | null
  pe: number | null
  pb: number | null
  market_cap: number | null
  float_cap: number | null

  trade_time: string
  is_suspended: boolean

  price_fmt: string
  change_fmt: string
  percent_fmt: string
  amount_fmt: string
  volume_fmt: string
}

export interface IndexCard extends Quote {
  high_fmt: string
  low_fmt: string
}

export interface FlowItem extends Quote {
  /** 主力净流入（元），负数为净流出 */
  main_net_inflow: number
  /** 主力净额占成交额比例 % */
  main_net_ratio: number
  /** 非主力（中小单）净额，元 */
  retail_net_inflow: number
  main_net_fmt: string
  main_net_ratio_fmt: string
}

export interface SectorItem {
  code: string
  name: string
  kind: 'industry' | 'concept'
  stock_count: number
  avg_price: number
  change: number
  change_percent: number
  volume: number
  amount: number

  lead_code: string
  lead_symbol: string
  lead_name: string
  lead_change_percent: number
  lead_price: number

  percent_fmt: string
  amount_fmt: string
  lead_percent_fmt: string
  lead_price_fmt: string
}

export interface MarketStats {
  total: number
  up: number
  down: number
  flat: number
  suspended: number
  limit_up: number
  limit_down: number
  up_ratio: number
  avg_change_percent: number
  median_change_percent: number
  total_amount: number
  total_amount_fmt: string
}

export interface MarketOverview {
  as_of: string
  market_state: MarketState
  market_state_text: string
  trade_date: string
  source: string
  data_age_seconds: number

  indices: IndexCard[]
  stats: MarketStats
  /** 主力净流入榜（首页最优先展示） */
  main_inflow: FlowItem[]
  /** 主力净流出榜 */
  main_outflow: FlowItem[]
  /** 涨幅榜：已按 11% 上限过滤 */
  top_gainers: Quote[]
  /** 成交量榜 */
  top_volume: Quote[]
  /** 板块涨幅榜（默认行业） */
  top_sectors: SectorItem[]
  sector_kind: string
  top_losers: Quote[]
  top_turnover: Quote[]
}

export interface SearchResponse {
  keyword: string
  items: Quote[]
}
