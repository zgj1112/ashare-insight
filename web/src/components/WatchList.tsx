/** 自选列表（首页优先展示）。 */

import type { Quote } from '../types/market'
import { plainCode, trendArrow, trendClass } from '../utils/format'

interface Props {
  quotes: Quote[]
  loading: boolean
  error: string | null
  usingDefault: boolean
  onRemove: (code: string) => void
}

export function WatchList({ quotes, loading, error, usingDefault, onRemove }: Props) {
  return (
    <section className="panel watchlist">
      <header className="panel-head">
        <div>
          <h2>
            我的自选
            {usingDefault && <span className="badge">默认</span>}
          </h2>
          <p>点击搜索框结果中的「+ 自选」可添加，最多 60 只 · 数据每 30 秒刷新</p>
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
        <table className="rank-table watch-table">
          <thead>
            <tr>
              <th className="col-name">名称</th>
              <th className="col-price">最新价</th>
              <th className="col-percent">涨跌幅</th>
              <th className="col-change">涨跌额</th>
              <th className="col-amount">成交额</th>
              <th className="col-turnover">换手率</th>
              <th className="col-amplitude">振幅</th>
              <th className="col-action" aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {quotes.map((item) => (
              <tr key={item.code}>
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
                <td className={`col-change ${trendClass(item.change_percent)}`}>{item.change_fmt}</td>
                <td className="col-amount">{item.amount_fmt}</td>
                <td className="col-turnover">{item.turnover_rate ? `${item.turnover_rate}%` : '--'}</td>
                <td className="col-amplitude">{item.amplitude ? `${item.amplitude}%` : '--'}</td>
                <td className="col-action">
                  <button
                    type="button"
                    className="remove-btn"
                    title={`从自选中移除 ${item.name}`}
                    aria-label={`从自选中移除 ${item.name}`}
                    onClick={() => onRemove(item.code)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
