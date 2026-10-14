/** 行情总览数据 hooks。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchOverview, searchStocks } from '../api/market'
import type { MarketOverview, Quote } from '../types/market'

interface OverviewState {
  data: MarketOverview | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: number | null
  refresh: () => void
}

/**
 * 拉取总览数据，并按 interval 定时刷新。
 * 首次加载展示骨架屏，之后刷新只做静默更新，避免页面闪烁。
 */
export function useOverview(interval = 30_000): OverviewState {
  const [data, setData] = useState<MarketOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)
  const hasData = useRef(false)

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    if (hasData.current) setRefreshing(true)

    fetchOverview(controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
        setLastUpdated(Date.now())
        hasData.current = true
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : '加载失败，请稍后重试')
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })

    return () => controller.abort()
  }, [nonce])

  useEffect(() => {
    if (interval <= 0) return
    const timer = window.setInterval(() => setNonce((value) => value + 1), interval)
    return () => window.clearInterval(timer)
  }, [interval])

  return { data, loading, refreshing, error, lastUpdated, refresh }
}

interface SearchState {
  keyword: string
  results: Quote[]
  searching: boolean
  error: string | null
  setKeyword: (value: string) => void
}

/** 搜索框：输入防抖 250ms 后请求后端。 */
export function useSearch(delay = 250): SearchState {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Quote[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const text = keyword.trim()
    if (!text) {
      setResults([])
      setError(null)
      setSearching(false)
      return
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(() => {
      searchStocks(text, controller.signal)
        .then((response) => {
          setResults(response.items)
          setError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setResults([])
          setError(err instanceof ApiError ? err.message : '搜索失败')
        })
        .finally(() => setSearching(false))
    }, delay)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [keyword, delay])

  return { keyword, results, searching, error, setKeyword }
}
