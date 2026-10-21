/** 榜单列表（涨幅榜 / 跌幅榜 / 成交额榜）。 */

import { navigate } from '../router'
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
  /** 统一行数档位：骨架屏条数按它渲染，避免切换时高度跳动 */
  rowCount?: number
}

export function RankList({
  title,
  subtitle,
  items,
  loading,
  displayValue,
  valueLabel = '成交额',
  rowCount,
}: Props) {
  const renderValue = displayValue ?? ((item: Quote) => item.amount_fmt)
  const skeletonCount = Math.min(rowCount ?? 8, 12)

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="panel-count">{loading ? '…' : `${items.length} 条`}</span>
      </header>

      <div className="list-scroll">
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
              ? Array.from({ length: skeletonCount }, (_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td colSpan={5}>
                      <div className="skeleton-line w100" />
                    </td>
                  </tr>
                ))
              : items.map((item, index) => (
                  <tr
                    key={item.code}
                    className="clickable-row"
                    onClick={() => navigate('stock', item.code)}
                    title={`查看 ${item.name} 详情`}
                  >
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
      </div>
    </section>
  )
}
