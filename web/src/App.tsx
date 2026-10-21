/** 应用入口：共享行情与自选数据，按 hash 路由切换页面。 */

import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { StockDetailPage } from './pages/StockDetailPage'
import { useOverview } from './hooks/useMarket'
import { useWatchlist } from './hooks/useWatchlist'
import { useRoute } from './router'
import { useTheme } from './theme/ThemeProvider'
import './App.css'

function App() {
  const route = useRoute()
  const { rowCount } = useTheme()
  // 三个页面共用同一份行情数据与轮询，切换页面不会重复请求
  const { data, loading, refreshing, error, lastUpdated, refresh } = useOverview(30_000, rowCount)
  const watchlist = useWatchlist(30_000)

  if (route.page === 'settings') {
    return <SettingsPage overview={data} lastUpdated={lastUpdated} />
  }

  if (route.page === 'stock' && route.code) {
    return (
      <StockDetailPage
        code={route.code}
        overview={data}
        lastUpdated={lastUpdated}
        isWatched={watchlist.has}
        onAddWatch={watchlist.add}
        onRemoveWatch={watchlist.remove}
      />
    )
  }

  return (
    <DashboardPage
      data={data}
      loading={loading}
      refreshing={refreshing}
      error={error}
      lastUpdated={lastUpdated}
      onRefresh={refresh}
      watchlist={watchlist}
    />
  )
}

export default App
