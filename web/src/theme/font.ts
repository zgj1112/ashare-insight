/**
 * 字体大小（小 / 中 / 大）。全局共用，新增页面直接引用 rem 单位即可自动适配。
 *
 * 实现方式：把 <html> 的根字号定为 --font-size-root，页面里所有字号都用 rem，
 * 这样切换档位时整体等比缩放，不需要改任何组件代码。
 */

export type FontSize = 'small' | 'medium' | 'large'

export const FONT_STORAGE_KEY = 'ashare-insight:font'

export const DEFAULT_FONT_SIZE: FontSize = 'medium'

export const FONT_SIZES: FontSize[] = ['small', 'medium', 'large']

/** 每档的根字号（px），中档与原始设计一致 */
export const FONT_ROOT_PX: Record<FontSize, number> = {
  small: 13,
  medium: 14,
  large: 16,
}

export const FONT_LABEL: Record<FontSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
}

export function isFontSize(value: unknown): value is FontSize {
  return value === 'small' || value === 'medium' || value === 'large'
}

export function readFontSize(): FontSize {
  try {
    const raw = window.localStorage.getItem(FONT_STORAGE_KEY)
    if (isFontSize(raw)) return raw
  } catch {
    /* 隐私模式下读取会抛错，忽略 */
  }
  return DEFAULT_FONT_SIZE
}

export function writeFontSize(size: FontSize): void {
  try {
    window.localStorage.setItem(FONT_STORAGE_KEY, size)
  } catch {
    /* 忽略写入失败，不影响本次会话 */
  }
}

/** 写入 <html data-font="...">，CSS 变量据此调整根字号 */
export function applyFontSize(size: FontSize): void {
  document.documentElement.dataset.font = size
}
