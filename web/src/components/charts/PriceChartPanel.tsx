/** 行情图卡片：分时 / 日K 切换。 */

import { useEffect, useState } from 'react'
import { fetchKline } from '../../api/market'
import type { KlineBar, MinutePoint } from '../../types/market'
import { IntradayChart } from './IntradayChart'
import { KLineChart } from './KLineChart'

type Tab = 'intraday' | 'daily'

interface Props {
  code: string
  points: MinutePoint[]
  prevClose: number
  updatedAt: string
}

export function PriceChartPanel({ code, points, prevClose, updatedAt }: Props) {
  const [tab, setTab] = useState<Tab>('intraday')
  const [bars, setBars] = useState<KlineBar[]>([])
  const [loadingKline, setLoadingKline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tab !== 'daily' || bars.length > 0) return
    const controller = new AbortController()
    setLoadingKline(true)
    fetchKline(code, 'day', 60, controller.signal)
      .then((result) => {
        setBars(result.bars)
        setError(null)
      })
      .catch(() => setError('K 线加载失败'))
      .finally(() => setLoadingKline(false))
    return () => controller.abort()
  }, [tab, code, bars.length])

  return (
    <section className="panel chart-panel">
      <header className="panel-head">
        <div>
          <h2>行情走势</h2>
          <p>{tab === 'intraday' ? '分时：价格 / 均价 / 分钟成交量' : '日 K：前复权，含 MA5 / MA10 / MA20'}</p>
        </div>
        <div className="panel-head-right">
          {tab === 'intraday' && <span className="panel-count">更新 {updatedAt || '--:--:--'}</span>}
          <div className="segmented" role="group" aria-label="图表类型">
            <button
              type="button"
              className={`seg-btn ${tab === 'intraday' ? 'active' : ''}`}
              onClick={() => setTab('intraday')}
            >
              分时
            </button>
            <button
              type="button"
              className={`seg-btn ${tab === 'daily' ? 'active' : ''}`}
              onClick={() => setTab('daily')}
            >
              日K
            </button>
          </div>
        </div>
      </header>

      <div className="chart-body">
        {tab === 'intraday' ? (
          <IntradayChart points={points} prevClose={prevClose} />
        ) : loadingKline && bars.length === 0 ? (
          <div className="chart-empty">K 线加载中…</div>
        ) : error ? (
          <div className="chart-empty">{error}</div>
        ) : (
          <KLineChart bars={bars} />
        )}
      </div>
    </section>
  )
}
