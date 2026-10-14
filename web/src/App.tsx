/** 应用入口：共享行情数据，按 hash 路由在首页与展示设置之间切换。 */

import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { useOverview } from './hooks/useMarket'
import { useWatchlist } from './hooks/useWatchlist'
import { usePage } from './router'
import { useTheme } from './theme/ThemeProvider'
import './App.css'

function App() {
  const page = usePage()
  const { rowCount } = useTheme()
  // 两个页面共用同一份行情数据与轮询，切换页面不会重复请求
  const { data, loading, refreshing, error, lastUpdated, refresh } = useOverview(30_000, rowCount)
  const watchlist = useWatchlist(30_000)

  return (
    <>
      {page === 'settings' ? (
        <SettingsPage overview={data} lastUpdated={lastUpdated} />
      ) : (
        <DashboardPage
          data={data}
          loading={loading}
          refreshing={refreshing}
          error={error}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          watchlist={watchlist}
          rowCount={rowCount}
        />
      )}
    </>
  )
}

export default App
