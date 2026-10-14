/** 主力资金净流入榜（首页卡片之一）。 */

import type { FlowItem } from '../types/market'
import { plainCode, trendClass } from '../utils/format'

interface Props {
  items: FlowItem[]
  loading: boolean
}

export function FlowBoards({ items, loading }: Props) {
  return (
    <section className="panel flow-panel">
      <header className="panel-head">
        <div>
          <h2>
            主力净流入榜
            <span className="badge badge-strong">最优先</span>
          </h2>
          <p>按主力（超大单）净额降序 · 数据来源：新浪资金流</p>
        </div>
        <span className="panel-count">
          {loading && items.length === 0 ? '加载中…' : `${items.length} 条`}
        </span>
      </header>

      <div className="flow-scroll">
        <table className="rank-table flow-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-name">名称</th>
              <th className="col-price">最新价</th>
              <th className="col-percent">涨跌幅</th>
              <th className="col-net">主力净额</th>
              <th className="col-ratio">净占比</th>
              <th className="col-amount">成交额</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0
              ? Array.from({ length: 10 }, (_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td colSpan={7}>
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
                    <td className="col-net net-in">
                      {item.main_net_inflow > 0 ? '+' : ''}
                      {item.main_net_fmt}
                    </td>
                    <td className="col-ratio net-in">{item.main_net_ratio_fmt}</td>
                    <td className="col-amount">{item.amount_fmt}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
