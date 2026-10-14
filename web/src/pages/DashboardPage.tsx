/** 首页看板：卡片顺序与显隐由展示设置决定。 */

import type { ReactNode } from 'react'
import { AppHeader } from '../components/AppHeader'
import { FlowBoards } from '../components/FlowList'
import { IndexBoard } from '../components/IndexBoard'
import { MarketBreadth } from '../components/MarketBreadth'
import { MarketMetrics } from '../components/MarketMetrics'
import { RankList } from '../components/RankList'
import { SectorList } from '../components/SectorList'
import { TopControls } from '../components/TopControls'
import { WatchList } from '../components/WatchList'
import { useTheme } from '../theme/ThemeProvider'
import { buildRows } from '../theme/layout'
import type { CardId } from '../theme/layout'
import type { MarketOverview, MarketStats, Quote } from '../types/market'

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

interface WatchlistBinding {
  quotes: Quote[]
  loading: boolean
  error: string | null
  usingDefault: boolean
  has: (code: string) => boolean
  add: (code: string) => void
  remove: (code: string) => void
}

interface Props {
  data: MarketOverview | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: number | null
  onRefresh: () => void
  watchlist: WatchlistBinding
}

export function DashboardPage({
  data,
  loading,
  refreshing,
  error,
  lastUpdated,
  onRefresh,
  watchlist,
}: Props) {
  const { isVisible, layout } = useTheme()
  const stats = data?.stats ?? EMPTY_STATS

  const renderCard = (id: CardId): ReactNode => {
    switch (id) {
      case 'watchlist':
        return (
          <WatchList
            quotes={watchlist.quotes}
            loading={watchlist.loading}
            error={watchlist.error}
            usingDefault={watchlist.usingDefault}
            onRemove={watchlist.remove}
          />
        )
      case 'main_inflow':
        return <FlowBoards items={data?.main_inflow ?? []} loading={loading} />
      case 'sectors':
        return <SectorList items={data?.top_sectors ?? []} loading={loading} />
      case 'gainers':
        return (
          <RankList
            title="涨幅榜"
            subtitle={`仅显示涨幅 ${GAINERS_MAX_PERCENT}% 以内的标的`}
            items={data?.top_gainers ?? []}
            loading={loading}
          />
        )
      case 'volume':
        return (
          <RankList
            title="成交量榜"
            subtitle="按成交量降序"
            items={data?.top_volume ?? []}
            loading={loading}
            displayValue={(item) => item.volume_fmt}
            valueLabel="成交量"
          />
        )
      case 'breadth':
        return <MarketBreadth stats={stats} loading={loading} />
      case 'metrics':
        return <MarketMetrics stats={stats} loading={loading} />
      default:
        return null
    }
  }

  // 按全局顺序切分出行：整行卡片单独一行，相邻的两张半宽卡片并排
  const rows = buildRows(layout.order, isVisible)

  const blocks: ReactNode[] = rows.map((row) => {
    if (row.type === 'single') {
      return (
        <div className="card-block" key={row.id} data-card={row.id}>
          {renderCard(row.id)}
        </div>
      )
    }
    return (
      <div
        className={`card-pair ${row.ids.length === 1 ? 'single' : ''}`}
        key={row.ids.join('-')}
        data-cards={row.ids.join(',')}
      >
        {row.ids.map((id) => (
          <div className="card-slot" key={id} data-card={id}>
            {renderCard(id)}
          </div>
        ))}
      </div>
    )
  })

  return (
    <div className="app">
      <AppHeader
        refreshing={refreshing}
        onRefresh={onRefresh}
        isWatched={watchlist.has}
        onAddWatch={watchlist.add}
      />

      <TopControls overview={data} lastUpdated={lastUpdated} />

      <main className="app-main">
        {error && (
          <div className="alert">
            <span>{error}</span>
            <button type="button" onClick={onRefresh}>
              重试
            </button>
          </div>
        )}

        <IndexBoard indices={data?.indices ?? []} loading={loading} />

        {blocks.length > 0 ? (
          blocks
        ) : (
          <div className="empty-layout">所有卡片都已隐藏，可在展示设置中重新打开</div>
        )}
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
