/** 行情总览看板首页。 */

import { AppHeader } from './components/AppHeader'
import { FlowBoards } from './components/FlowList'
import { IndexBoard } from './components/IndexBoard'
import { MarketBreadth } from './components/MarketBreadth'
import { MarketMetrics } from './components/MarketMetrics'
import { RankList } from './components/RankList'
import { TopControls } from './components/TopControls'
import { WatchList } from './components/WatchList'
import { useOverview } from './hooks/useMarket'
import { useWatchlist } from './hooks/useWatchlist'
import { useTheme } from './theme/ThemeProvider'
import type { MarketStats } from './types/market'
import './App.css'

/** 与后端 GAINERS_MAX_PERCENT 保持一致，仅用于文案展示 */
const GAINERS_MAX_PERCENT = 11

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
  const { rowCount } = useTheme()
  const { data, loading, refreshing, error, lastUpdated, refresh } = useOverview(
    30_000,
    rowCount,
  )
  const watchlist = useWatchlist(30_000)

  return (
    <div className="app">
      <AppHeader
        refreshing={refreshing}
        onRefresh={refresh}
        isWatched={watchlist.has}
        onAddWatch={watchlist.add}
      />

      <TopControls overview={data} lastUpdated={lastUpdated} />

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

        <FlowBoards
          inflow={data?.main_inflow ?? []}
          outflow={data?.main_outflow ?? []}
          loading={loading}
          rowCount={rowCount}
        />

        <div className="content-grid">
          <RankList
            title="涨幅榜"
            subtitle={`仅显示涨幅 ${GAINERS_MAX_PERCENT}% 以内的标的`}
            items={data?.top_gainers ?? []}
            loading={loading}
            rowCount={rowCount}
          />
          <RankList
            title="成交量榜"
            subtitle="按成交量降序"
            items={data?.top_volume ?? []}
            loading={loading}
            displayValue={(item) => item.volume_fmt}
            valueLabel="成交量"
            rowCount={rowCount}
          />
        </div>

        <div className="content-grid">
          <MarketBreadth stats={data?.stats ?? EMPTY_STATS} loading={loading} />
          <MarketMetrics stats={data?.stats ?? EMPTY_STATS} loading={loading} />
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
