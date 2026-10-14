/** 板块涨幅榜：单行横条，展示领涨板块，可切换行业 / 概念。 */

import { useCallback, useEffect, useState } from 'react'
import { fetchSectors } from '../api/market'
import type { SectorItem } from '../types/market'
import { trendClass } from '../utils/format'

type SectorKind = 'industry' | 'concept'

/** 横条最多展示几个板块 */
const STRIP_SIZE = 8

interface Props {
  /** 来自总览接口的行业板块数据 */
  items: SectorItem[]
  loading: boolean
}

export function SectorList({ items, loading }: Props) {
  const [kind, setKind] = useState<SectorKind>('industry')
  const [concept, setConcept] = useState<SectorItem[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConcept = useCallback(async () => {
    setFetching(true)
    try {
      setConcept(await fetchSectors('concept', STRIP_SIZE))
      setError(null)
    } catch {
      setError('概念板块加载失败')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (kind === 'concept' && concept === null && !fetching) void loadConcept()
  }, [kind, concept, fetching, loadConcept])

  const isConcept = kind === 'concept'
  const rows = (isConcept ? concept ?? [] : items).slice(0, STRIP_SIZE)
  const busy = loading || (isConcept && fetching)

  return (
    <section className="panel strip-panel">
      <span className="strip-title">板块涨幅</span>

      <div className="strip-items">
        {rows.map((item, index) => {
          const showName = item.name.length <= 4
          return (
            <span className="sector-chip" key={item.code} title={`${item.name} · ${item.stock_count} 只成分股`}>
              {showName && (
                <>
                  <span className="sector-chip-rank">{index + 1}</span>
                  <span className="sector-chip-name">{item.name}</span>
                </>
              )}
              <span className={`sector-chip-percent ${trendClass(item.change_percent)}`}>
                {item.percent_fmt}
              </span>
            </span>
          )
        })}
        {busy && rows.length === 0 && <span className="strip-empty">加载中…</span>}
        {error && <span className="strip-empty error">{error}</span>}
      </div>

      <div className="segmented" role="group" aria-label="板块类型">
        <button
          type="button"
          className={`seg-btn ${kind === 'industry' ? 'active' : ''}`}
          aria-pressed={kind === 'industry'}
          onClick={() => setKind('industry')}
        >
          行业
        </button>
        <button
          type="button"
          className={`seg-btn ${kind === 'concept' ? 'active' : ''}`}
          aria-pressed={kind === 'concept'}
          onClick={() => setKind('concept')}
        >
          概念
        </button>
      </div>
    </section>
  )
}
