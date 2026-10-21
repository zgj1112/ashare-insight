/**
 * 极简路由：用 URL hash 区分页面，避免为少量页面引入路由库。
 *   #/                    首页看板
 *   #/settings            展示设置
 *   #/stock/sh600519      个股详情
 */

import { useEffect, useState } from 'react'

export type Page = 'home' | 'settings' | 'stock'

export interface Route {
  page: Page
  /** 个股详情页的标的代码，如 sh600519 */
  code: string | null
}

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  if (path.startsWith('settings')) return { page: 'settings', code: null }
  if (path.startsWith('stock/')) {
    const code = path.slice('stock/'.length).split(/[/?]/)[0].trim().toLowerCase()
    return { page: 'stock', code: code || null }
  }
  return { page: 'home', code: null }
}

export function navigate(page: Page, code?: string): void {
  if (page === 'settings') window.location.hash = '#/settings'
  else if (page === 'stock' && code) window.location.hash = `#/stock/${code}`
  else window.location.hash = '#/'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
