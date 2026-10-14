/**
 * 榜单行数档位（10 / 20 / 30）。全局共用，作用于首页所有榜单。
 */

export type RowCount = 10 | 20 | 30

export const ROW_STORAGE_KEY = 'ashare-insight:row-count'

export const DEFAULT_ROW_COUNT: RowCount = 10

export const ROW_COUNTS: RowCount[] = [10, 20, 30]

/** 后端 overview 接口允许的最大行数 */
export const MAX_ROW_COUNT = 30

export function isRowCount(value: unknown): value is RowCount {
  return value === 10 || value === 20 || value === 30
}

export function readRowCount(): RowCount {
  try {
    const raw = window.localStorage.getItem(ROW_STORAGE_KEY)
    const parsed = raw === null ? null : Number(raw)
    if (isRowCount(parsed)) return parsed
  } catch {
    /* 隐私模式下读取会抛错，忽略 */
  }
  return DEFAULT_ROW_COUNT
}

export function writeRowCount(count: RowCount): void {
  try {
    window.localStorage.setItem(ROW_STORAGE_KEY, String(count))
  } catch {
    /* 忽略写入失败，不影响本次会话 */
  }
}
