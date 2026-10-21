/**
 * 自选股的买入成本价（每个代码一个价格），保存在浏览器本地。
 *
 * 只记录价格，不涉及数量，尽量保持轻量；
 * 用于在看板上直接看到相对成本的盈亏。
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'ashare-insight:costs'

export type CostMap = Record<string, number>

function readStored(): CostMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: CostMap = {}
    for (const [code, value] of Object.entries(parsed as Record<string, unknown>)) {
      const price = Number(value)
      if (Number.isFinite(price) && price > 0) result[code] = price
    }
    return result
  } catch {
    return {}
  }
}

function writeStored(costs: CostMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(costs))
  } catch {
    /* 忽略写入失败，不影响本次会话 */
  }
}

interface PositionsState {
  costs: CostMap
  setCost: (code: string, price: number) => void
  removeCost: (code: string) => void
  getCost: (code: string) => number | undefined
}

export function usePositions(): PositionsState {
  const [costs, setCosts] = useState<CostMap>(() =>
    typeof window === 'undefined' ? {} : readStored(),
  )
  const ref = useRef(costs)

  useEffect(() => {
    ref.current = costs
    writeStored(costs)
  }, [costs])

  const setCost = useCallback((code: string, price: number) => {
    if (!Number.isFinite(price) || price <= 0) return
    setCosts((current) => ({ ...current, [code]: Math.round(price * 1000) / 1000 }))
  }, [])

  const removeCost = useCallback((code: string) => {
    setCosts((current) => {
      if (!(code in current)) return current
      const next = { ...current }
      delete next[code]
      return next
    })
  }, [])

  const getCost = useCallback((code: string) => ref.current[code], [])

  return { costs, setCost, removeCost, getCost }
}

/** 相对成本的盈亏百分比（成本缺失返回 null） */
export function profitPercent(price: number, cost: number | undefined): number | null {
  if (!cost || cost <= 0 || !price) return null
  return ((price - cost) / cost) * 100
}
