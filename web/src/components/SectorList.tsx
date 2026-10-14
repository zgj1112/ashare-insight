/** 板块涨幅榜：行业 / 概念切换，按板块涨跌幅降序。 */

import { useCallback, useEffect, useState } from 'react'
import { fetchSectors } from '../api/market'
import type { SectorItem } from '../types/market'
import { plainCode, trendClass } from '../utils/format'

type SectorKind = 'industry' | 'concept'

interface Props {
  /** 来自总览接口的行业板块数据 */
  items: SectorItem[]
  loading: boolean
  rowCount: number
}

export function SectorList({ items, loading, rowCount }: Props) {
  const [kind, setKind] = useState<SectorKind>('industry')
  const [concept, setConcept] = useState<SectorItem[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConcept = useCallback(async () => {
    setFetching(true)
    try {
      setConcept(await fetchSectors('concept', 30))
      setError(null)
    } catch {
      setError('概念板块加载失败，请稍后重试')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (kind === 'concept' && concept === null && !fetching) void loadConcept()
  }, [kind, concept, fetching, loadConcept])

  const isConcept = kind === 'concept'
  const rows = (isConcept ? concept ?? [] : items).slice(0, rowCount)
  const busy = loading || (isConcept && fetching)

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>板块涨幅榜</h2>
          <p>按板块涨跌幅降序 · 数据来源：新浪板块行情</p>
        </div>
        <div className="panel-head-right">
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
          <span className="panel-count">{busy && rows.length === 0 ? '加载中…' : `${rows.length} 条`}</span>
        </div>
      </header>

      {error && <div className="panel-error">{error}</div>}

      <div className="list-scroll">
        <table className="rank-table sector-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-name">板块</th>
              <th className="col-count">成分股</th>
              <th className="col-percent">涨跌幅</th>
              <th className="col-amount">成交额</th>
              <th className="col-lead">领涨股</th>
            </tr>
          </thead>
          <tbody>
            {busy && rows.length === 0
              ? Array.from({ length: Math.min(rowCount, 12) }, (_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td colSpan={6}>
                      <div className="skeleton-line w100" />
                    </td>
                  </tr>
                ))
              : rows.map((item, index) => (
                  <tr key={item.code}>
                    <td className="col-rank">{index + 1}</td>
                    <td className="col-name">
                      <span className="stock-name">{item.name}</span>
                    </td>
                    <td className="col-count">{item.stock_count ? `${item.stock_count} 只` : '--'}</td>
                    <td className="col-percent">
                      <span className={`pill ${trendClass(item.change_percent)}`}>{item.percent_fmt}</span>
                    </td>
                    <td className="col-amount">{item.amount_fmt}</td>
                    <td className="col-lead">
                      {item.lead_name ? (
                        <>
                          <span className="lead-name">{item.lead_name}</span>
                          <span className="stock-code">{plainCode(item.lead_code)}</span>
                          <span className={`lead-percent ${trendClass(item.lead_change_percent)}`}>
                            {item.lead_percent_fmt}
                          </span>
                        </>
                      ) : (
                        '--'
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
