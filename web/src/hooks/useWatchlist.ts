/** 自选列表：本地持久化 + 批量行情拉取。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchDefaultWatchlist, fetchQuotes } from '../api/market'
import type { Quote } from '../types/market'

const STORAGE_KEY = 'ashare-insight:watchlist'
/** 与后端 WATCHLIST_MAX 保持一致 */
const MAX_CODES = 60

function normalize(code: string): string {
  return code.trim().toLowerCase()
}

function readStored(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is string => typeof item === 'string').map(normalize)
  } catch {
    // 隐私模式或数据损坏时退回默认清单
    return null
  }
}

function writeStored(codes: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
  } catch {
    /* 忽略写入失败，不影响页面使用 */
  }
}

interface WatchlistState {
  quotes: Quote[]
  loading: boolean
  error: string | null
  /** 本地还没有记录时为 true，用于提示当前是默认自选 */
  usingDefault: boolean
  add: (code: string) => void
  remove: (code: string) => void
  has: (code: string) => boolean
  maxReached: boolean
}

export function useWatchlist(pollMs = 30_000): WatchlistState {
  const [codes, setCodes] = useState<string[] | null>(null)
  const [usingDefault, setUsingDefault] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const codesRef = useRef<string[]>([])

  // 初始化：优先本地记录，其次后端默认清单
  useEffect(() => {
    const stored = readStored()
    if (stored !== null) {
      setCodes(stored)
      return
    }
    const controller = new AbortController()
    fetchDefaultWatchlist(controller.signal)
      .then((defaults) => {
        setCodes(defaults.map(normalize))
        setUsingDefault(true)
      })
      .catch(() => {
        setCodes([])
        setUsingDefault(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    codesRef.current = codes ?? []
  }, [codes])

  // 拉取自选行情
  useEffect(() => {
    if (codes === null) return
    if (codes.length === 0) {
      setQuotes([])
      setLoading(false)
      setError(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetchQuotes(codes, controller.signal)
      .then((rows) => {
        setQuotes(rows)
        setError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : '自选行情加载失败')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [codes, tick])

  useEffect(() => {
    if (pollMs <= 0) return
    const timer = window.setInterval(() => setTick((value) => value + 1), pollMs)
    return () => window.clearInterval(timer)
  }, [pollMs])

  const persist = useCallback((next: string[]) => {
    setCodes(next)
    writeStored(next)
    setUsingDefault(false)
  }, [])

  const add = useCallback(
    (code: string) => {
      const target = normalize(code)
      if (!target) return
      const current = codesRef.current
      if (current.includes(target) || current.length >= MAX_CODES) return
      persist([...current, target])
    },
    [persist],
  )

  const remove = useCallback(
    (code: string) => {
      const target = normalize(code)
      persist(codesRef.current.filter((item) => item !== target))
    },
    [persist],
  )

  const has = useCallback(
    (code: string) => (codes ?? []).includes(normalize(code)),
    [codes],
  )

  return {
    quotes,
    loading,
    error,
    usingDefault,
    add,
    remove,
    has,
    maxReached: (codes?.length ?? 0) >= MAX_CODES,
  }
}
