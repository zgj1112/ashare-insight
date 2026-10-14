/** 榜单列表（涨幅榜 / 跌幅榜 / 成交额榜）。 */

import type { Quote } from '../types/market'
import { plainCode, trendClass } from '../utils/format'

interface Props {
  title: string
  subtitle: string
  items: Quote[]
  loading: boolean
  /** 右侧数值列，默认展示成交额 */
  displayValue?: (item: Quote) => string
  valueLabel?: string
}

export function RankList({ title, subtitle, items, loading, displayValue, valueLabel = '成交额' }: Props) {
  const renderValue = displayValue ?? ((item: Quote) => item.amount_fmt)

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="panel-count">{loading ? '…' : `${items.length} 条`}</span>
      </header>

      <table className="rank-table">
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-name">名称</th>
            <th className="col-price">最新价</th>
            <th className="col-percent">涨跌幅</th>
            <th className="col-value">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0
            ? Array.from({ length: 8 }, (_, index) => (
                <tr key={index} className="skeleton-row">
                  <td colSpan={5}>
                    <div className="skeleton-line w100" />
                  </td>
                </tr>
              ))
            : items.map((item, index) => (
                <tr key={item.code}>
                  <td className="col-rank">{index + 1}</td>
                  <td className="col-name">
                    <span className="stock-name">{item.name}</span>
                    <span className="stock-code">{plainCode(item.code)}</span>
                  </td>
                  <td className={`col-price ${trendClass(item.change_percent)}`}>{item.price_fmt}</td>
                  <td className="col-percent">
                    <span className={`pill ${trendClass(item.change_percent)}`}>{item.percent_fmt}</span>
                  </td>
                  <td className="col-value">{renderValue(item)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </section>
  )
}
