/**
 * 极简路由：用 URL hash 区分页面，避免为两个页面引入路由库。
 *   #/        首页
 *   #/settings 展示设置
 */

import { useEffect, useState } from 'react'

export type Page = 'home' | 'settings'

function parse(hash: string): Page {
  return hash.replace(/^#\/?/, '').startsWith('settings') ? 'settings' : 'home'
}

export function navigate(page: Page): void {
  window.location.hash = page === 'settings' ? '#/settings' : '#/'
}

export function usePage(): Page {
  const [page, setPage] = useState<Page>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setPage(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return page
}
