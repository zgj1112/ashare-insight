/** 全局显示偏好：明暗主题 + 字体大小。 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyFontSize,
  readFontSize,
  writeFontSize,
  type FontSize,
} from './font'
import {
  readRowCount,
  writeRowCount,
  type RowCount,
} from './rows'
import {
  applyTheme,
  readPreference,
  resolveTheme,
  systemPrefersDark,
  writePreference,
  type Theme,
  type ThemePreference,
} from './theme'

interface DisplayContextValue {
  /** 当前生效的主题 */
  theme: Theme
  /** 用户选择：light / dark / system */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** 在浅色与深色之间切换（会覆盖「跟随系统」） */
  toggle: () => void
  /** 当前字体档位 */
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  /** 榜单行数档位（统一作用于首页所有榜单） */
  rowCount: RowCount
  setRowCount: (count: RowCount) => void
}

const DisplayContext = createContext<DisplayContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'dark' : readPreference(),
  )
  const [resolved, setResolved] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'dark' : resolveTheme(readPreference()),
  )
  const [fontSize, setFontSizeState] = useState<FontSize>(() =>
    typeof window === 'undefined' ? 'medium' : readFontSize(),
  )
  const [rowCount, setRowCountState] = useState<RowCount>(() =>
    typeof window === 'undefined' ? 10 : readRowCount(),
  )

  // 偏好变化时同步到 DOM 与本地存储
  useEffect(() => {
    const theme = resolveTheme(preference)
    setResolved(theme)
    applyTheme(theme)
    writePreference(preference)
  }, [preference])

  useEffect(() => {
    applyFontSize(fontSize)
    writeFontSize(fontSize)
  }, [fontSize])

  useEffect(() => {
    writeRowCount(rowCount)
  }, [rowCount])

  // 跟随系统时，监听系统配色变化
  useEffect(() => {
    if (preference !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const theme: Theme = systemPrefersDark() ? 'dark' : 'light'
      setResolved(theme)
      applyTheme(theme)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), [])

  const toggle = useCallback(() => {
    setPreferenceState((current) => (resolveTheme(current) === 'dark' ? 'light' : 'dark'))
  }, [])

  const setFontSize = useCallback((next: FontSize) => setFontSizeState(next), [])

  const setRowCount = useCallback((next: RowCount) => setRowCountState(next), [])

  const value = useMemo<DisplayContextValue>(
    () => ({
      theme: resolved,
      preference,
      setPreference,
      toggle,
      fontSize,
      setFontSize,
      rowCount,
      setRowCount,
    }),
    [resolved, preference, setPreference, toggle, fontSize, setFontSize, rowCount, setRowCount],
  )

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
}

/** 读取主题与字体设置；必须在 ThemeProvider 内使用。 */
export function useTheme(): DisplayContextValue {
  const context = useContext(DisplayContext)
  if (!context) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return context
}
