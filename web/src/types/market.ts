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
  top_gainers: Quote[]
  top_losers: Quote[]
  top_turnover: Quote[]
}

export interface SearchResponse {
  keyword: string
  items: Quote[]
}
