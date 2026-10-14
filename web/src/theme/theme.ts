/**
 * 主题（明/暗）类型与读写。全局共用，新增页面直接引用即可。
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ashare-insight:theme'

/** 存储值：'light' / 'dark' 为手动指定，'system' 表示跟随系统 */
export type ThemePreference = Theme | 'system'

export const DEFAULT_PREFERENCE: ThemePreference = 'dark'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** 读取用户偏好；没有记录或数据损坏时返回默认值 */
export function readPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'system' || isTheme(raw)) return raw
  } catch {
    /* 隐私模式下读取会抛错，忽略 */
  }
  return DEFAULT_PREFERENCE
}

export function writePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* 忽略写入失败，不影响本次会话 */
  }
}

/** 系统是否偏好深色 */
export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 把偏好解析为最终生效的主题 */
export function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return preference
}

/** 写入 <html data-theme="...">，CSS 变量据此切换 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export const THEME_LABEL: Record<Theme, string> = {
  dark: '深色',
  light: '浅色',
}
