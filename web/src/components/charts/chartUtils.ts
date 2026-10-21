/** 通用 SVG 折线/柱状图元，详情页图表共用。 */

export interface Scale {
  (value: number): number
}

/** 生成把 [min,max] 映射到 [start,end] 的比例函数（end 可小于 start 表示 y 轴翻转） */
export function makeScale(min: number, max: number, start: number, end: number): Scale {
  const span = max - min || 1
  return (value: number) => start + ((value - min) / span) * (end - start)
}

export function buildPath(points: Array<[number, number]>): string {
  if (points.length === 0) return ''
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
}

export function buildArea(points: Array<[number, number]>, baselineY: number): string {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${buildPath(points)} L${last[0].toFixed(1)},${baselineY.toFixed(1)} L${first[0].toFixed(
    1,
  )},${baselineY.toFixed(1)} Z`
}

/** 把一天压缩成 n 个刻度上的均匀分布（用于成交量柱等） */
export function evenlySpaced(count: number, left: number, width: number): number[] {
  if (count <= 0) return []
  const step = width / count
  return Array.from({ length: count }, (_, index) => left + step * index + step / 2)
}
