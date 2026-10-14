/** 展示设置页：调整首页卡片的显示顺序与显隐。 */

import { TopControls } from '../components/TopControls'
import {
  buildRows,
  CARD_META,
  DEFAULT_CARD_ORDER,
  type CardId,
  type LayoutRow,
} from '../theme/layout'
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
  // 与首页一致：先按可见性切分成行，再逐行展示
  const rows = buildRows(layout.order, isVisible)
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
              <h2>卡片顺序</h2>
              <p>
                用 ↑↓ 把整块卡片上下移动一行；并排的两张卡片可先在行内左右互换。
                这里的排布就是首页的实际排布
              </p>
            </div>
            <span className="panel-count">
              显示 {visibleCount} / {layout.order.length}
            </span>
          </header>

          <div className="settings-body">
            {rows.map((row, rowIndex) => (
              <RowBlock
                key={rowKey(row)}
                row={row}
                rowIndex={rowIndex}
                rowCount={rows.length}
                isVisible={isVisible}
                onToggle={toggleCard}
                onMove={moveCard}
              />
            ))}
          </div>

          <footer className="settings-foot">
            <div className="settings-state">
              <span>
                当前：行数 {rowCount} · 字体{' '}
                {fontSize === 'small' ? '小' : fontSize === 'medium' ? '中' : '大'} · 主题{' '}
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
            <li>顺序按「一行」为单位调整；半宽卡片成对出现，被整行卡片隔开时会各自占满整行</li>
            <li>隐藏某张卡片后，与它并排的另一张会自动占满整行；全部隐藏时首页会给出提示</li>
            <li>「我的自选」的股票增删在看板页的搜索框里完成，最多 60 只</li>
            <li>右上角的行数档位（10 / 20 / 30）只影响榜单条数，不影响自选与板块</li>
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

function rowKey(row: LayoutRow): string {
  return row.type === 'single' ? row.id : row.ids.join('-')
}

interface RowBlockProps {
  row: LayoutRow
  rowIndex: number
  rowCount: number
  isVisible: (id: CardId) => boolean
  onToggle: (id: CardId) => void
  onMove: (id: CardId, direction: 'up' | 'down') => void
}

/** 一行卡片：整行卡片单张显示，并排卡片左右并置（与首页一致） */
function RowBlock({ row, rowIndex, rowCount, isVisible, onToggle, onMove }: RowBlockProps) {
  const ids = row.type === 'single' ? [row.id] : row.ids
  return (
    <div className={`settings-row ${ids.length > 1 ? 'is-pair' : ''}`}>
      <div className="settings-row-head">
        <span className="settings-order">{rowIndex + 1}</span>
        <span className="settings-row-label">
          {ids.length > 1 ? '并排一行' : CARD_META[ids[0]].span === 'half' ? '半宽（独占一行）' : '整行'}
        </span>
      </div>

      {ids.map((id) => (
        <CardRow
          key={id}
          id={id}
          rowIndex={rowIndex}
          rowCount={rowCount}
          visible={isVisible(id)}
          onToggle={() => onToggle(id)}
          onMove={(direction) => onMove(id, direction)}
        />
      ))}
    </div>
  )
}

interface CardRowProps {
  id: CardId
  rowIndex: number
  rowCount: number
  visible: boolean
  onToggle: () => void
  onMove: (direction: 'up' | 'down') => void
}

function CardRow({ id, rowIndex, rowCount, visible, onToggle, onMove }: CardRowProps) {
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
          title="上移一行"
          aria-label={`${meta.title} 上移`}
          disabled={rowIndex === 0}
          onClick={() => onMove('up')}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          title="下移一行"
          aria-label={`${meta.title} 下移`}
          disabled={rowIndex === rowCount - 1}
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
