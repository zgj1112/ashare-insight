/** 全局主题上下文：明/暗切换，带本地持久化与跟随系统。 */

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
  applyTheme,
  readPreference,
  resolveTheme,
  systemPrefersDark,
  writePreference,
  type Theme,
  type ThemePreference,
} from './theme'

interface ThemeContextValue {
  /** 当前生效的主题 */
  theme: Theme
  /** 用户选择：light / dark / system */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** 在浅色与深色之间切换（会覆盖「跟随系统」） */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'dark' : readPreference(),
  )
  const [resolved, setResolved] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'dark' : resolveTheme(readPreference()),
  )

  // 偏好变化时同步到 DOM 与本地存储
  useEffect(() => {
    const theme = resolveTheme(preference)
    setResolved(theme)
    applyTheme(theme)
    writePreference(preference)
  }, [preference])

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

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: resolved, preference, setPreference, toggle }),
    [resolved, preference, setPreference, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** 读取当前主题与切换方法；必须在 ThemeProvider 内使用。 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return context
}
