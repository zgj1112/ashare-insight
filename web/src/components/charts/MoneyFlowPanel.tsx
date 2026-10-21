/** 资金流向面板：主力净额、四级大单明细与占比条。 */

import type { MoneyFlow } from '../../types/market'
import { trendClass } from '../../utils/format'

interface Props {
  flow: MoneyFlow | null
  loading: boolean
}

/** 四级大单的展示顺序与说明 */
const TIER_HINT: Record<string, string> = {
  r0: '单笔 ≥ 100 万',
  r1: '单笔 20–100 万',
  r2: '单笔 4–20 万',
  r3: '单笔 < 4 万',
}

export function MoneyFlowPanel({ flow, loading }: Props) {
  if (!flow) {
    return (
      <section className="panel flow-detail">
        <header className="panel-head">
          <div>
            <h2>实时资金流</h2>
            <p>按单笔成交金额分级统计</p>
          </div>
        </header>
        <div className="chart-empty">{loading ? '加载中…' : '暂无资金流数据'}</div>
      </section>
    )
  }

  const mainPositive = flow.main_net >= 0
  // 强度条直接对应「主力净额 / 成交额」，不做任何放大，避免误读
  const mainShare = Math.min(100, Math.abs(flow.main_net_ratio))

  return (
    <section className="panel flow-detail">
      <header className="panel-head">
        <div>
          <h2>实时资金流</h2>
          <p>按单笔成交金额分级统计 · 每 10 秒刷新</p>
        </div>
        <span className="panel-count live">
          <span className="live-dot" />
          {flow.updated_at || '--:--:--'}
        </span>
      </header>

      <div className="flow-main">
        <div className="flow-main-left">
          <span className="flow-main-label">主力净额（超大单 + 大单）</span>
          <strong className={`flow-main-value ${trendClass(flow.main_net)}`}>
            {flow.main_net > 0 ? '+' : ''}
            {flow.main_net_fmt}
          </strong>
          <span className={`flow-main-ratio ${trendClass(flow.main_net)}`}>
            占成交额 {flow.main_net_ratio_fmt}
          </span>
        </div>

        <div className="flow-main-right">
          <div className="flow-kv">
            <span>超大单净额</span>
            <strong className={trendClass(flow.strength)}>{flow.strength_fmt}</strong>
          </div>
          <div className="flow-kv">
            <span>中小单净额</span>
            <strong className={trendClass(flow.retail_net)}>
              {flow.retail_net > 0 ? '+' : ''}
              {flow.retail_net_fmt}
            </strong>
          </div>
          <div className="flow-kv">
            <span>成交额</span>
            <strong>{flow.amount_fmt}</strong>
          </div>
        </div>
      </div>

      {/* 主力净额占成交额的比例条（0–100% 等比，不放大） */}
      <div className="flow-gauge" title={`主力净额占成交额 ${flow.main_net_ratio_fmt}`}>
        <span
          className={`flow-gauge-fill ${mainPositive ? 'trend-up-bg' : 'trend-down-bg'}`}
          style={{ width: `${Math.max(1, mainShare)}%` }}
        />
      </div>
      <p className="flow-gauge-caption">
        主力净额占成交额 {flow.main_net_ratio_fmt}（0–100% 等比刻度）
      </p>

      <table className="rank-table flow-detail-table">
        <thead>
          <tr>
            <th className="col-name">资金类型</th>
            <th className="col-num">流入</th>
            <th className="col-num">流出</th>
            <th className="col-num">净额</th>
            <th className="col-num">占成交额</th>
          </tr>
        </thead>
        <tbody>
          {flow.tiers.map((tier) => (
            <tr key={tier.key}>
              <td className="col-name">
                <span className="stock-name">{tier.label}</span>
                <span className="stock-code">{TIER_HINT[tier.key] ?? ''}</span>
              </td>
              <td className="col-num trend-up">{tier.inflow_fmt}</td>
              <td className="col-num trend-down">{tier.outflow_fmt}</td>
              <td className={`col-num strong ${trendClass(tier.net)}`}>
                {tier.net > 0 ? '+' : ''}
                {tier.net_fmt}
              </td>
              <td className={`col-num ${trendClass(tier.net)}`}>{tier.net_ratio_fmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
