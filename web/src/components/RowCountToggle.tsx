/** 榜单行数档位：10 / 20 / 30，统一作用于首页所有榜单。 */

import { useTheme } from '../theme/ThemeProvider'
import { ROW_COUNTS } from '../theme/rows'

export function RowCountToggle() {
  const { rowCount, setRowCount } = useTheme()

  return (
    <div className="font-scale row-scale" role="group" aria-label="榜单显示条数">
      <span className="font-scale-label">行数</span>
      {ROW_COUNTS.map((count) => (
        <button
          key={count}
          type="button"
          className={`font-btn ${rowCount === count ? 'active' : ''}`}
          aria-pressed={rowCount === count}
          title={`每个榜单显示 ${count} 条`}
          onClick={() => setRowCount(count)}
        >
          {count}
        </button>
      ))}
    </div>
  )
}
