/** 顶部栏：品牌、搜索框、刷新按钮（状态与显示设置见 TopControls）。 */

import { useEffect, useRef, useState } from 'react'
import { useSearch } from '../hooks/useMarket'
import { plainCode, trendClass } from '../utils/format'

interface Props {
  refreshing: boolean
  onRefresh: () => void
  isWatched: (code: string) => boolean
  onAddWatch: (code: string) => void
}

export function AppHeader({ refreshing, onRefresh, isWatched, onAddWatch }: Props) {
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

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">A</span>
        <div className="brand-text">
          <h1>A 股行情看板</h1>
          <p>实时行情 · 涨跌统计 · 自选盯盘</p>
        </div>
      </div>

      <div className="header-right">
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
              {search.results.map((item) => {
                const watched = isWatched(item.code)
                return (
                  <div key={item.code} className="search-item">
                    <span className="search-item-main">
                      <span className="search-item-name">{item.name}</span>
                      <span className="search-item-code">{plainCode(item.code)}</span>
                      <span className="tag">{item.board}</span>
                      {item.is_suspended && <span className="tag tag-warn">停牌</span>}
                    </span>
                    <span className="search-item-right">
                      <span className={`search-item-price ${trendClass(item.change_percent)}`}>
                        {item.price_fmt}
                        <em>{item.percent_fmt}</em>
                      </span>
                      <button
                        type="button"
                        className={`watch-btn ${watched ? 'watched' : ''}`}
                        disabled={watched}
                        onClick={() => {
                          onAddWatch(item.code)
                          setOpen(false)
                          search.setKeyword('')
                        }}
                      >
                        {watched ? '已自选' : '+ 自选'}
                      </button>
                    </span>
                  </div>
                )
              })}
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
