/** 顶部栏：品牌、市场状态、数据时间、刷新按钮、搜索框。 */

import { useEffect, useRef, useState } from 'react'
import { useSearch } from '../hooks/useMarket'
import type { MarketOverview } from '../types/market'
import { formatClock, plainCode, trendClass } from '../utils/format'

interface Props {
  overview: MarketOverview | null
  lastUpdated: number | null
  refreshing: boolean
  onRefresh: () => void
}

export function AppHeader({ overview, lastUpdated, refreshing, onRefresh }: Props) {
  const search = useSearch()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭搜索结果
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const state = overview?.market_state ?? 'closed'
  const stateText = overview?.market_state_text ?? '加载中'

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">A</span>
        <div className="brand-text">
          <h1>A 股行情看板</h1>
          <p>实时行情 · 涨跌统计 · 龙虎榜单</p>
        </div>
      </div>

      <div className="header-right">
        <div className={`market-state state-${state}`}>
          <span className="dot" />
          {stateText}
        </div>

        <div className="updated">
          <span className="updated-label">数据时间</span>
          <strong>{lastUpdated ? formatClock(new Date(lastUpdated).toISOString()) : '--:--:--'}</strong>
        </div>

        <div className="search" ref={boxRef}>
          <input
            value={search.keyword}
            onChange={(event) => {
              search.setKeyword(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="搜索股票代码或名称，如 600519 / 茅台"
            aria-label="搜索股票"
          />
          <span className="search-icon">⌕</span>

          {open && search.keyword.trim() !== '' && (
            <div className="search-panel">
              {search.searching && <div className="search-tip">搜索中…</div>}
              {!search.searching && search.error && <div className="search-tip error">{search.error}</div>}
              {!search.searching && !search.error && search.results.length === 0 && (
                <div className="search-tip">未找到匹配的标的</div>
              )}
              {search.results.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className="search-item"
                  onClick={() => {
                    search.setKeyword(item.name)
                    setOpen(false)
                  }}
                >
                  <span className="search-item-main">
                    <span className="search-item-name">{item.name}</span>
                    <span className="search-item-code">{plainCode(item.code)}</span>
                    <span className="tag">{item.board}</span>
                    {item.is_suspended && <span className="tag tag-warn">停牌</span>}
                  </span>
                  <span className={`search-item-price ${trendClass(item.change_percent)}`}>
                    {item.price_fmt}
                    <em>{item.percent_fmt}</em>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="refresh-btn" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>
    </header>
  )
}
