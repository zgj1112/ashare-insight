/** 个股详情数据：初次加载快照 + 分时 + 资金流，之后只高频轮询资金流。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchMoneyFlow, fetchStockDetail } from '../api/market'
import type { MoneyFlow, StockDetail } from '../types/market'

interface DetailState {
  detail: StockDetail | null
  /** 资金流单独维护：轮询只更新这一块，避免整页重渲染 */
  flow: MoneyFlow | null
  loading: boolean
  error: string | null
  /** 资金流本轮是否刷新成功，用于展示“实时”状态 */
  flowUpdatedAt: string
  refresh: () => void
}

/**
 * @param code 标的代码，如 sh600519
 * @param flowInterval 资金流轮询间隔（毫秒），默认 10 秒
 */
export function useStockDetail(code: string | null, flowInterval = 10_000): DetailState {
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [flow, setFlow] = useState<MoneyFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [tick, setTick] = useState(0)
  const loadedCode = useRef<string | null>(null)

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  // 主数据：切换标的或手动刷新时重新拉取
  useEffect(() => {
    if (!code) {
      setDetail(null)
      setFlow(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    if (loadedCode.current !== code) setLoading(true)

    fetchStockDetail(code, controller.signal)
      .then((result) => {
        setDetail(result)
        setFlow(result.flow)
        setError(null)
        loadedCode.current = code
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : '详情数据加载失败')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [code, nonce])

  // 资金流轮询：只更新 flow
  useEffect(() => {
    if (!code || flowInterval <= 0) return
    const timer = window.setInterval(() => setTick((value) => value + 1), flowInterval)
    return () => window.clearInterval(timer)
  }, [code, flowInterval])

  useEffect(() => {
    if (!code || tick === 0) return
    const controller = new AbortController()
    fetchMoneyFlow(code, controller.signal)
      .then((result) => setFlow(result))
      .catch(() => {
        /* 轮询失败静默处理，下一轮再试 */
      })
    return () => controller.abort()
  }, [code, tick])

  return {
    detail,
    flow,
    loading,
    error,
    flowUpdatedAt: flow?.updated_at ?? '',
    refresh,
  }
}
