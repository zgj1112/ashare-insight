/** 自选列表（首页优先展示），支持设置买入成本价并显示盈亏。 */

import { useEffect, useState } from 'react'
import { profitPercent, type CostMap } from '../hooks/usePositions'
import { navigate } from '../router'
import type { Quote } from '../types/market'
import { plainCode, trendArrow, trendClass } from '../utils/format'

interface Props {
  quotes: Quote[]
  loading: boolean
  error: string | null
  usingDefault: boolean
  onRemove: (code: string) => void
  costs: CostMap
  onSetCost: (code: string, price: number) => void
  onRemoveCost: (code: string) => void
}

export function WatchList({
  quotes,
  loading,
  error,
  usingDefault,
  onRemove,
  costs,
  onSetCost,
  onRemoveCost,
}: Props) {
  /** 正在编辑成本价的行 */
  const [editing, setEditing] = useState<{ code: string; draft: string } | null>(null)

  // 行被移出自选时自动关闭编辑
  useEffect(() => {
    if (editing && !quotes.some((item) => item.code === editing.code)) setEditing(null)
  }, [quotes, editing])

  const openEditor = (code: string, price: number) => {
    const cost = costs[code]
    setEditing({ code, draft: cost ? String(cost) : price ? price.toFixed(2) : '' })
  }

  /** 以现价为基准按百分比增减，保留 2 位小数 */
  const nudge = (price: number, percent: number) => {
    const base = Number(editing?.draft)
    const current = Number.isFinite(base) && base > 0 ? base : price
    const next = current * (1 + percent / 100)
    setEditing((state) => (state ? { ...state, draft: (Math.round(next * 100) / 100).toFixed(2) } : state))
  }

  const save = (code: string) => {
    const value = Number(editing?.draft)
    if (!editing) return
    if (!editing.draft.trim()) {
      onRemoveCost(code) // 清空即清除成本
    } else if (Number.isFinite(value) && value > 0) {
      onSetCost(code, value)
    } else {
      return // 非法输入不提交
    }
    setEditing(null)
  }

  return (
    <section className="panel watchlist">
      <header className="panel-head">
        <div>
          <h2>
            我的自选
            {usingDefault && <span className="badge">默认</span>}
          </h2>
          <p>
            点「成本」记录买入价，显示相对成本的盈亏 · 点行内其它位置查看个股详情 · 数据每 30 秒刷新
          </p>
        </div>
        <span className="panel-count">
          {loading && quotes.length === 0 ? '加载中…' : `${quotes.length} 只`}
        </span>
      </header>

      {error && <div className="panel-error">{error}</div>}

      {!error && !loading && quotes.length === 0 && (
        <div className="watch-empty">
          <p>自选列表是空的</p>
          <span>在上方搜索框输入股票代码或名称，点击「+ 自选」即可添加</span>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="watch-scroll">
          <table className="rank-table watch-table">
            <thead>
              <tr>
                <th className="col-name">名称</th>
                <th className="col-price">最新价</th>
                <th className="col-percent">涨跌幅</th>
                <th className="col-cost">成本 / 盈亏</th>
                <th className="col-change">涨跌额</th>
                <th className="col-amount">成交额</th>
                <th className="col-turnover">换手率</th>
                <th className="col-amplitude">振幅</th>
                <th className="col-action" aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((item) => {
                const cost = costs[item.code]
                const pnl = profitPercent(item.price, cost)
                const isEditing = editing?.code === item.code
                return [
                  <tr
                    key={item.code}
                    className="clickable-row"
                    onClick={() => navigate('stock', item.code)}
                    title={`查看 ${item.name} 详情`}
                  >
                    <td className="col-name">
                      <span className="stock-name">{item.name}</span>
                      <span className="stock-code">{plainCode(item.code)}</span>
                      {item.is_suspended && <span className="tag tag-warn">停牌</span>}
                    </td>
                    <td className={`col-price ${trendClass(item.change_percent)}`}>{item.price_fmt}</td>
                    <td className="col-percent">
                      <span className={`pill ${trendClass(item.change_percent)}`}>
                        {trendArrow(item.change_percent)} {item.percent_fmt}
                      </span>
                    </td>
                    <td className="col-cost">
                      {cost ? (
                        <button
                          type="button"
                          className="cost-chip"
                          title={`成本 ${cost}，点击修改`}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEditor(item.code, item.price)
                          }}
                        >
                          <span className="cost-value">{cost.toFixed(2)}</span>
                          {pnl !== null && (
                            <span className={`cost-pnl ${trendClass(pnl)}`}>
                              {pnl >= 0 ? '+' : ''}
                              {pnl.toFixed(2)}%
                            </span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cost-btn"
                          title={`为 ${item.name} 设置买入成本价`}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEditor(item.code, item.price)
                          }}
                        >
                          + 成本
                        </button>
                      )}
                    </td>
                    <td className={`col-change ${trendClass(item.change_percent)}`}>{item.change_fmt}</td>
                    <td className="col-amount">{item.amount_fmt}</td>
                    <td className="col-turnover">
                      {item.turnover_rate ? `${item.turnover_rate}%` : '--'}
                    </td>
                    <td className="col-amplitude">{item.amplitude ? `${item.amplitude}%` : '--'}</td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="remove-btn"
                        title={`从自选中移除 ${item.name}`}
                        aria-label={`从自选中移除 ${item.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onRemove(item.code)
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>,

                  isEditing && (
                    <tr key={`${item.code}-edit`} className="cost-editor-row">
                      <td colSpan={9}>
                        <div
                          className="cost-editor"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') save(item.code)
                            if (event.key === 'Escape') setEditing(null)
                          }}
                        >
                          <span className="cost-editor-label">{item.name} 买入价</span>

                          <div className="cost-stepper">
                            <button type="button" onClick={() => nudge(item.price, -1)}>
                              −1%
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              autoFocus
                              value={editing.draft}
                              onChange={(event) =>
                                setEditing({ code: item.code, draft: event.target.value })
                              }
                              aria-label="买入价格"
                            />
                            <button type="button" onClick={() => nudge(item.price, 1)}>
                              +1%
                            </button>
                          </div>

                          <button
                            type="button"
                            className="cost-quick"
                            onClick={() =>
                              setEditing({ code: item.code, draft: item.price.toFixed(2) })
                            }
                          >
                            现价 {item.price_fmt}
                          </button>

                          <button type="button" className="cost-save" onClick={() => save(item.code)}>
                            保存
                          </button>
                          <button
                            type="button"
                            className="cost-cancel"
                            onClick={() => setEditing(null)}
                          >
                            取消
                          </button>
                          <span className="cost-hint">清空后保存即取消成本</span>
                        </div>
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
