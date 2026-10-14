/** 行情总览看板首页。 */

import { AppHeader } from './components/AppHeader'
import { IndexBoard } from './components/IndexBoard'
import { MarketBreadth } from './components/MarketBreadth'
import { MarketMetrics } from './components/MarketMetrics'
import { RankList } from './components/RankList'
import { WatchList } from './components/WatchList'
import { useOverview } from './hooks/useMarket'
import { useWatchlist } from './hooks/useWatchlist'
import type { MarketStats } from './types/market'
import './App.css'

const EMPTY_STATS: MarketStats = {
  total: 0,
  up: 0,
  down: 0,
  flat: 0,
  suspended: 0,
  limit_up: 0,
  limit_down: 0,
  up_ratio: 0,
  avg_change_percent: 0,
  median_change_percent: 0,
  total_amount: 0,
  total_amount_fmt: '',
}

function App() {
  const { data, loading, refreshing, error, lastUpdated, refresh } = useOverview(30_000)
  const watchlist = useWatchlist(30_000)

  return (
    <div className="app">
      <AppHeader
        overview={data}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refresh}
        isWatched={watchlist.has}
        onAddWatch={watchlist.add}
      />

      <main className="app-main">
        {error && (
          <div className="alert">
            <span>{error}</span>
            <button type="button" onClick={refresh}>
              重试
            </button>
          </div>
        )}

        <IndexBoard indices={data?.indices ?? []} loading={loading} />

        <WatchList
          quotes={watchlist.quotes}
          loading={watchlist.loading}
          error={watchlist.error}
          usingDefault={watchlist.usingDefault}
          onRemove={watchlist.remove}
        />

        <div className="content-grid">
          <RankList
            title="涨幅榜"
            subtitle="按涨跌幅降序"
            items={data?.top_gainers ?? []}
            loading={loading}
          />
          <RankList
            title="跌幅榜"
            subtitle="按涨跌幅升序"
            items={data?.top_losers ?? []}
            loading={loading}
          />
        </div>

        <div className="content-grid">
          <div className="stack">
            <MarketBreadth stats={data?.stats ?? EMPTY_STATS} loading={loading} />
            <MarketMetrics stats={data?.stats ?? EMPTY_STATS} loading={loading} />
          </div>
          <RankList
            title="成交额榜"
            subtitle="按成交金额降序"
            items={data?.top_turnover ?? []}
            loading={loading}
            displayValue={(item) => (item.turnover_rate ? `${item.turnover_rate}%` : '--')}
            valueLabel="换手率"
          />
        </div>
      </main>

      <footer className="app-footer">
        <span>数据来源：{data?.source ?? '—'}</span>
        <span>交易日：{data?.trade_date ?? '—'}</span>
        <span>数据生成：{data?.as_of ?? '—'}</span>
        <span>每 30 秒自动刷新 · 行情仅供研究参考，不构成投资建议</span>
      </footer>
    </div>
  )
}

export default App
