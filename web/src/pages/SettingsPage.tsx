/** 展示设置页：调整首页卡片的显示顺序与显隐。 */

import { TopControls } from '../components/TopControls'
import { CARD_META, DEFAULT_CARD_ORDER, groupByRegion, type CardId } from '../theme/layout'
import { useTheme } from '../theme/ThemeProvider'
import type { MarketOverview } from '../types/market'
import { formatClock } from '../utils/format'
import './SettingsPage.css'

interface Props {
  overview: MarketOverview | null
  lastUpdated: number | null
}

export function SettingsPage({ overview, lastUpdated }: Props) {
  const { layout, isVisible, toggleCard, moveCard, resetLayout, rowCount, fontSize, theme } =
    useTheme()
  const groups = groupByRegion(layout.order)
  const visibleCount = layout.order.filter((id) => isVisible(id)).length
  const orderChanged =
    layout.order.length !== DEFAULT_CARD_ORDER.length ||
    layout.order.some((id, index) => id !== DEFAULT_CARD_ORDER[index])
  const changed = orderChanged || layout.hidden.length > 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div className="brand-text">
            <h1>展示设置</h1>
            <p>调整首页卡片的顺序与显隐 · 改动自动保存</p>
          </div>
        </div>
      </header>

      <TopControls overview={overview} lastUpdated={lastUpdated} />

      <main className="app-main">
        <section className="panel settings-panel">
          <header className="panel-head">
            <div>
              <h2>卡片管理</h2>
              <p>
                同一区域的卡片会并排展示，因此顺序调整只在区域内生效；隐藏的卡片不会请求、也不会占位
              </p>
            </div>
            <span className="panel-count">
              显示 {visibleCount} / {layout.order.length}
            </span>
          </header>

          <div className="settings-body">
            {groups.map((group) => (
              <div key={group.region} className="settings-group">
                <div className="settings-group-head">
                  <span className="settings-region">{group.region}</span>
                  {group.cards.length > 1 && <span className="settings-hint">并排区域</span>}
                </div>

                {group.cards.map((id) => (
                  <CardRow
                    key={id}
                    id={id}
                    visible={isVisible(id)}
                    index={group.cards.indexOf(id)}
                    total={group.cards.length}
                    onToggle={() => toggleCard(id)}
                    onMove={(direction) => moveCard(id, direction)}
                  />
                ))}
              </div>
            ))}
          </div>

          <footer className="settings-foot">
            <div className="settings-state">
              <span>
                当前：行数 {rowCount} · 字体 {fontSize === 'small' ? '小' : fontSize === 'medium' ? '中' : '大'} · 主题{' '}
                {theme === 'dark' ? '深色' : '浅色'}
              </span>
              {changed && <span className="settings-changed">已自定义布局</span>}
            </div>
            <button type="button" className="refresh-btn" onClick={resetLayout}>
              恢复默认布局
            </button>
          </footer>
        </section>

        <section className="panel settings-tips">
          <header className="panel-head">
            <div>
              <h2>说明</h2>
              <p>这些设置都保存在浏览器本地，换设备需要重新设置</p>
            </div>
          </header>
          <ul className="tips-list">
            <li>「我的自选」的股票增删在看板页的搜索框里完成，最多 60 只</li>
            <li>右上角的行数档位（10 / 20 / 30）只影响榜单条数，不影响自选</li>
            <li>隐藏「涨幅榜」时，「成交量榜」会自动占满整行；两者都隐藏则整块区域消失</li>
            <li>数据每 30 秒自动刷新，与设置页共用同一份行情数据</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <span>数据来源：{overview?.source ?? '—'}</span>
        <span>交易日：{overview?.trade_date ?? '—'}</span>
        <span>数据生成：{overview?.as_of ?? '—'}</span>
        <span>{lastUpdated ? `页面更新：${formatClock(new Date(lastUpdated).toISOString())}` : ''}</span>
      </footer>
    </div>
  )
}

interface CardRowProps {
  id: CardId
  visible: boolean
  index: number
  total: number
  onToggle: () => void
  onMove: (direction: 'up' | 'down') => void
}

function CardRow({ id, visible, index, total, onToggle, onMove }: CardRowProps) {
  const meta = CARD_META[id]
  return (
    <div className={`settings-card ${visible ? '' : 'is-hidden'}`}>
      <div className="settings-card-main">
        <span className="settings-card-title">{meta.title}</span>
        <span className="settings-card-desc">{meta.description}</span>
      </div>

      <div className="settings-card-actions">
        <button
          type="button"
          className="icon-btn"
          title="上移"
          aria-label={`${meta.title} 上移`}
          disabled={index === 0}
          onClick={() => onMove('up')}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          title="下移"
          aria-label={`${meta.title} 下移`}
          disabled={index === total - 1}
          onClick={() => onMove('down')}
        >
          ↓
        </button>
        <button
          type="button"
          className={`switch ${visible ? 'on' : ''}`}
          role="switch"
          aria-checked={visible}
          aria-label={`${visible ? '隐藏' : '显示'}${meta.title}`}
          onClick={onToggle}
        >
          <span className="switch-knob" />
        </button>
        <span className="switch-text">{visible ? '显示' : '已隐藏'}</span>
      </div>
    </div>
  )
}
