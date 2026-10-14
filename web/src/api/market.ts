/**
 * 后端接口封装。开发环境通过 Vite 代理访问 /api，无需处理跨域。
 */

import type { MarketOverview, Quote, SearchResponse } from '../types/market'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接后端服务，请确认后端已启动', 0)
  }
  if (!response.ok) {
    let detail = `请求失败（HTTP ${response.status}）`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      /* 响应体不是 JSON 时保留默认提示 */
    }
    throw new ApiError(detail, response.status)
  }
  return (await response.json()) as T
}

/** 行情总览看板数据；limit 为每个榜单返回的条数 */
export function fetchOverview(limit: number, signal?: AbortSignal): Promise<MarketOverview> {
  return request<MarketOverview>(`/api/market/overview?limit=${limit}`, signal)
}

/** 搜索标的 */
export function searchStocks(keyword: string, signal?: AbortSignal): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/market/search?keyword=${encodeURIComponent(keyword)}`, signal)
}

/** 批量行情（自选列表用），返回顺序与入参一致 */
export function fetchQuotes(codes: string[], signal?: AbortSignal): Promise<Quote[]> {
  if (codes.length === 0) return Promise.resolve([])
  return request<Quote[]>(`/api/market/quotes?codes=${encodeURIComponent(codes.join(','))}`, signal)
}

/** 自选股默认清单 */
export function fetchDefaultWatchlist(signal?: AbortSignal): Promise<string[]> {
  return request<string[]>('/api/market/watchlist/default', signal)
}
