/** 市场情绪：单行横条，展示涨跌家数分布与涨跌停数量。 */

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
  ]

  return (
    <section className="panel breadth-bar-panel">
      <span className="breadth-title">市场情绪</span>

      <div className="breadth-bar" title={`上涨 ${stats.up} · 下跌 ${stats.down} · 平盘 ${stats.flat}`}>
        <span className="bar-up" style={{ width: `${loading ? 0 : upWidth}%` }} />
        <span className="bar-flat" style={{ width: `${loading ? 0 : flatWidth}%` }} />
        <span className="bar-down" style={{ width: `${loading ? 0 : downWidth}%` }} />
      </div>

      <div className="breadth-inline">
        {cells.map((cell) => (
          <span key={cell.key} className="breadth-item">
            <span className="breadth-item-label">{cell.label}</span>
            <strong className={cell.className}>{loading ? '--' : cell.value}</strong>
          </span>
        ))}
        <span className="breadth-item breadth-item-extra">
          <span className="breadth-item-label">上涨占比</span>
          <strong className="trend-flat">{loading ? '--' : `${stats.up_ratio}%`}</strong>
        </span>
        <span className="breadth-item breadth-item-extra">
          <span className="breadth-item-label">成交额</span>
          <strong className="trend-flat">{loading ? '--' : stats.total_amount_fmt}</strong>
        </span>
      </div>
    </section>
  )
}
