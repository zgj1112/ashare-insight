/** 额外市场指标：为看板补齐左栏，避免留白。 */

import type { MarketStats } from '../types/market'

interface Props {
  stats: MarketStats
  loading: boolean
}

export function MarketMetrics({ stats, loading }: Props) {
  const items = [
    { label: '平均涨跌幅', value: `${stats.avg_change_percent >= 0 ? '+' : ''}${stats.avg_change_percent}%`, trend: stats.avg_change_percent },
    { label: '中位数涨跌幅', value: `${stats.median_change_percent >= 0 ? '+' : ''}${stats.median_change_percent}%`, trend: stats.median_change_percent },
    { label: '上涨占比', value: `${stats.up_ratio}%`, trend: stats.up_ratio - 50 },
    { label: '涨跌家数比', value: stats.down ? (stats.up / stats.down).toFixed(2) : '--', trend: stats.up - stats.down },
  ]

  return (
    <section className="panel metrics">
      <header className="panel-head">
        <div>
          <h2>市场概览</h2>
          <p>基于全市场 {stats.total || '--'} 只标的实时计算</p>
        </div>
      </header>
      <div className="metrics-grid">
        {items.map((item) => (
          <div key={item.label} className="metric-cell">
            <span className="metric-label">{item.label}</span>
            <strong className={item.trend > 0 ? 'trend-up' : item.trend < 0 ? 'trend-down' : 'trend-flat'}>
              {loading ? '--' : item.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}
