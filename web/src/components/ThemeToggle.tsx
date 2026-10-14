/** 主题切换按钮：图标 + 当前主题文案，悬停提示点击后的效果。 */

import { useTheme } from '../theme/ThemeProvider'
import { THEME_LABEL } from '../theme/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? THEME_LABEL.light : THEME_LABEL.dark

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={`切换到${next}主题`}
      aria-label={`切换到${next}主题`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      <span>{THEME_LABEL[theme]}</span>
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M4.2 12H2M22 12h-2.2M5.6 5.6 4 4M20 20l-1.6-1.6M18.4 5.6 20 4M4 20l1.6-1.6" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
    </svg>
  )
}
