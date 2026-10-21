/** 个股详情页：重点展示实时资金流（大单分级）。 */

import { MoneyFlowPanel } from '../components/charts/MoneyFlowPanel'
import { PriceChartPanel } from '../components/charts/PriceChartPanel'
import { TopControls } from '../components/TopControls'
import { useStockDetail } from '../hooks/useStockDetail'
import { navigate } from '../router'
import { useTheme } from '../theme/ThemeProvider'
import { plainCode, trendArrow, trendClass } from '../utils/format'
import type { MarketOverview } from '../types/market'
import './StockDetailPage.css'

interface Props {
  code: string
  overview: MarketOverview | null
  lastUpdated: number | null
  isWatched: (code: string) => boolean
  onAddWatch: (code: string) => void
  onRemoveWatch: (code: string) => void
}

export function StockDetailPage({
  code,
  overview,
  lastUpdated,
  isWatched,
  onAddWatch,
  onRemoveWatch,
}: Props) {
  const { rowCount } = useTheme()
  const { detail, flow, loading, error, flowUpdatedAt, refresh } = useStockDetail(code, 10_000)

  const quote = detail?.quote
  const watched = quote ? isWatched(quote.code) : false

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div className="brand-text">
            <h1>{quote ? quote.name : loading ? '加载中…' : '未找到标的'}</h1>
            <p>
              {quote ? `${plainCode(quote.code)} · ${quote.board}` : '个股详情 · 实时资金流'}
              {detail?.trade_date ? ` · ${detail.trade_date}` : ''}
            </p>
          </div>
        </div>

        <div className="header-right">
          {quote && (
            <button
              type="button"
              className={`watch-btn ${watched ? 'watched' : ''}`}
              onClick={() => (watched ? onRemoveWatch(quote.code) : onAddWatch(quote.code))}
            >
              {watched ? '★ 已自选' : '+ 加入自选'}
            </button>
          )}
          <button type="button" className="refresh-btn" onClick={refresh}>
            刷新
          </button>
          <button type="button" className="refresh-btn" onClick={() => navigate('home')}>
            ← 返回看板
          </button>
        </div>
      </header>

      <TopControls overview={overview} lastUpdated={lastUpdated} />

      <main className="app-main">
        {error && <div className="alert">{error}</div>}

        {quote && (
          <section className="panel quote-panel">
            <div className="quote-main">
              <span className={`quote-price ${trendClass(quote.change_percent)}`}>{quote.price_fmt}</span>
              <div className={`quote-change ${trendClass(quote.change_percent)}`}>
                <span>
                  {trendArrow(quote.change_percent)} {quote.change_fmt}
                </span>
                <span>{quote.percent_fmt}</span>
              </div>
            </div>

            <dl className="quote-grid">
              {[
                ['今开', quote.open ? quote.open.toFixed(2) : '--'],
                ['昨收', quote.prev_close ? quote.prev_close.toFixed(2) : '--'],
                ['最高', quote.high ? quote.high.toFixed(2) : '--'],
                ['最低', quote.low ? quote.low.toFixed(2) : '--'],
                ['成交量', quote.volume_fmt],
                ['成交额', quote.amount_fmt],
                ['换手率', quote.turnover_rate ? `${quote.turnover_rate}%` : '--'],
                ['振幅', quote.amplitude ? `${quote.amplitude}%` : '--'],
                ['涨停', detail?.limit_up ? detail.limit_up.toFixed(2) : '--'],
                ['跌停', detail?.limit_down ? detail.limit_down.toFixed(2) : '--'],
                ['市盈率', quote.pe ? quote.pe.toFixed(2) : '--'],
                ['总市值', quote.market_cap ? formatMarketCap(quote.market_cap) : '--'],
              ].map(([label, value]) => (
                <div key={label} className="quote-item">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <MoneyFlowPanel flow={flow} loading={loading} />

        {quote && (
          <PriceChartPanel
            code={quote.code}
            points={detail?.minutes ?? []}
            prevClose={detail?.prev_close ?? quote.prev_close}
            updatedAt={flowUpdatedAt}
          />
        )}

        <section className="panel related-panel">
          <header className="panel-head">
            <div>
              <h2>领涨板块</h2>
              <p>行业板块整体表现，用于判断个股所处的板块氛围</p>
            </div>
          </header>
          <div className="related-list">
            {(overview?.top_sectors ?? []).slice(0, Math.min(rowCount, 8)).map((item) => (
              <span className="sector-chip" key={item.code}>
                <span className="sector-chip-name">{item.name}</span>
                <span className={`sector-chip-percent ${trendClass(item.change_percent)}`}>
                  {item.percent_fmt}
                </span>
              </span>
            ))}
            {(overview?.top_sectors ?? []).length === 0 && (
              <span className="strip-empty">暂无板块数据</span>
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>数据来源：{detail?.source ?? '—'}</span>
        <span>资金流每 10 秒刷新 · 行情仅供研究参考，不构成投资建议</span>
        <span>{detail?.flow.trade_date ? `交易日：${detail.flow.trade_date}` : ''}</span>
      </footer>
    </div>
  )
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} 万亿`
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`
  return `${(value / 1e4).toFixed(2)} 万`
}
