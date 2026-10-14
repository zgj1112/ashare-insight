/** 指数卡片区域。 */

import type { IndexCard } from '../types/market'
import { trendArrow, trendClass } from '../utils/format'

interface Props {
  indices: IndexCard[]
  loading: boolean
}

function CardSkeleton() {
  return (
    <div className="index-card skeleton">
      <div className="skeleton-line w40" />
      <div className="skeleton-line w70 tall" />
      <div className="skeleton-line w55" />
    </div>
  )
}

export function IndexBoard({ indices, loading }: Props) {
  if (loading && indices.length === 0) {
    return (
      <section className="index-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </section>
    )
  }

  return (
    <section className="index-grid">
      {indices.map((item) => (
        <article key={item.code} className={`index-card ${trendClass(item.change_percent)}`}>
          <div className="index-head">
            <span className="index-name">{item.name}</span>
            <span className="index-code">{item.symbol}</span>
          </div>
          <div className="index-price">
            {item.price_fmt}
            <span className="index-percent">
              {trendArrow(item.change_percent)} {item.percent_fmt}
            </span>
          </div>
          <div className="index-meta">
            <span>今开 {item.open ? item.open.toFixed(2) : '--'}</span>
            <span>最高 {item.high_fmt}</span>
            <span>最低 {item.low_fmt}</span>
          </div>
          <div className="index-foot">
            <span>成交 {item.volume_fmt}</span>
            <span>金额 {item.amount_fmt}</span>
          </div>
        </article>
      ))}
    </section>
  )
}
