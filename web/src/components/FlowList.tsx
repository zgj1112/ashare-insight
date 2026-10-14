/** 主力资金榜：净流入（涨红）/ 净流出（跌绿）两张表并排展示。 */

import type { FlowItem } from '../types/market'
import { plainCode, trendClass } from '../utils/format'

interface TableProps {
  title: string
  subtitle: string
  items: FlowItem[]
  loading: boolean
  /** 净流入用暖色、净流出用冷色，避免「跌绿」与「净额为正」混淆 */
  tone: 'inflow' | 'outflow'
  /** 标注最优先展示的榜单 */
  highlight?: boolean
}

function FlowTable({ title, subtitle, items, loading, tone, highlight }: TableProps) {
  return (
    <section className="panel flow-panel">
      <header className="panel-head">
        <div>
          <h2>
            {title}
            {highlight && <span className="badge badge-strong">最优先</span>}
          </h2>
          <p>{subtitle}</p>
        </div>
        <span className="panel-count">
          {loading && items.length === 0 ? '加载中…' : `${items.length} 条`}
        </span>
      </header>

      <div className="flow-scroll">
        <table className={`rank-table flow-table flow-${tone}`}>
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-name">名称</th>
              <th className="col-price">最新价</th>
              <th className="col-percent">涨跌幅</th>
              <th className="col-net">主力净额</th>
              <th className="col-ratio">净占比</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0
              ? Array.from({ length: 10 }, (_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td colSpan={6}>
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
                    <td className={`col-net ${tone === 'inflow' ? 'net-in' : 'net-out'}`}>
                      {item.main_net_inflow > 0 ? '+' : ''}
                      {item.main_net_fmt}
                    </td>
                    <td className={`col-ratio ${tone === 'inflow' ? 'net-in' : 'net-out'}`}>
                      {item.main_net_ratio_fmt}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface Props {
  inflow: FlowItem[]
  outflow: FlowItem[]
  loading: boolean
}

export function FlowBoards({ inflow, outflow, loading }: Props) {
  return (
    <div className="content-grid flow-grid">
      <FlowTable
        title="主力净流入榜"
        subtitle="按主力（超大单）净额降序 · 数据来源：新浪资金流"
        items={inflow}
        loading={loading}
        tone="inflow"
        highlight
      />
      <FlowTable
        title="主力净流出榜"
        subtitle="按主力（超大单）净额升序"
        items={outflow}
        loading={loading}
        tone="outflow"
      />
    </div>
  )
}
