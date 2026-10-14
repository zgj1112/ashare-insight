/**
 * 顶部控制行：市场状态、数据时间与显示设置（字体、主题）。
 *
 * 单独占一行并靠右，避免与搜索框、刷新按钮抢位置；
 * 窄屏下允许换行，不会挤压搜索框。
 */

import type { MarketOverview } from '../types/market'
import { formatClock } from '../utils/format'
import { FontScaleToggle } from './FontScaleToggle'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  overview: MarketOverview | null
  lastUpdated: number | null
}

export function TopControls({ overview, lastUpdated }: Props) {
  const state = overview?.market_state ?? 'closed'
  const stateText = overview?.market_state_text ?? '加载中'

  return (
    <div className="top-controls">
      <div className={`market-state state-${state}`}>
        <span className="dot" />
        {stateText}
      </div>

      <div className="updated">
        <span className="updated-label">数据时间</span>
        <strong>{lastUpdated ? formatClock(new Date(lastUpdated).toISOString()) : '--:--:--'}</strong>
      </div>

      <div className="top-divider" aria-hidden="true" />

      <FontScaleToggle />
      <ThemeToggle />
    </div>
  )
}
