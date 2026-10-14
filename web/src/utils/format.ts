/** 展示层小工具。 */

/** A 股习惯：涨红跌绿。 */
export type Trend = 'up' | 'down' | 'flat'

export function trendOf(value: number): Trend {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

export function trendClass(value: number): string {
  return `trend-${trendOf(value)}`
}

export function trendArrow(value: number): string {
  if (value > 0) return '▲'
  if (value < 0) return '▼'
  return '—'
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatClock(iso: string): string {
  const date = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return iso
  return timeFormatter.format(date)
}

/** 去掉代码前缀，仅保留 6 位数字。 */
export function plainCode(code: string): string {
  return code.replace(/^[a-z]{2}/i, '').toUpperCase()
}
