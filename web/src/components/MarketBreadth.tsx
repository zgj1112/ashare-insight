/** 市场情绪与涨跌统计。 */

import type { MarketStats } from '../types/market'

interface Props {
  stats: MarketStats
  loading: boolean
}

export function MarketBreadth({ stats, loading }: Props) {
  const counted = Math.max(stats.up + stats.down + stats.flat, 1)
  const upWidth = (stats.up / counted) * 100
  const downWidth = (stats.down / counted) * 100
  const flatWidth = Math.max(0, 100 - upWidth - downWidth)

  const cells = [
    { key: 'up', label: '上涨', value: stats.up, className: 'trend-up' },
    { key: 'down', label: '下跌', value: stats.down, className: 'trend-down' },
    { key: 'flat', label: '平盘', value: stats.flat, className: 'trend-flat' },
    { key: 'limit_up', label: '涨停', value: stats.limit_up, className: 'trend-up' },
    { key: 'limit_down', label: '跌停', value: stats.limit_down, className: 'trend-down' },
    { key: 'suspended', label: '停牌', value: stats.suspended, className: 'trend-flat' },
  ]

  return (
    <section className="panel breadth">
      <header className="panel-head">
        <div>
          <h2>市场情绪</h2>
          <p>
            全市场 {stats.total || '--'} 只标的 · 成交额 {stats.total_amount_fmt || '--'}
          </p>
        </div>
        <span className="panel-count">上涨占比 {stats.up_ratio}%</span>
      </header>

      <div className="breadth-bar">
        <span className="bar-up" style={{ width: `${loading ? 0 : upWidth}%` }} />
        <span className="bar-flat" style={{ width: `${loading ? 0 : flatWidth}%` }} />
        <span className="bar-down" style={{ width: `${loading ? 0 : downWidth}%` }} />
      </div>

      <div className="breadth-grid">
        {cells.map((cell) => (
          <div key={cell.key} className="breadth-cell">
            <span className="breadth-label">{cell.label}</span>
            <strong className={cell.className}>{loading ? '--' : cell.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
