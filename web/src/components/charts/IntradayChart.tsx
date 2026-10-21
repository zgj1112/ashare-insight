/** 分时图：价格线 + 均价线 + 分钟成交量柱，以昨收为对称轴。 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MinutePoint } from '../../types/market'
import { buildArea, buildPath, makeScale } from './chartUtils'

interface Props {
  points: MinutePoint[]
  prevClose: number
  /** 图表高度（px） */
  height?: number
}

const PADDING = { top: 12, right: 56, bottom: 18, left: 8 }
const VOLUME_RATIO = 0.22

export function IntradayChart({ points, prevClose, height = 320 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  // 按真实像素宽度渲染，避免 viewBox 横向拉伸导致文字失真
  const [width, setWidth] = useState(960)

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0
      if (next > 0) setWidth(Math.round(next))
    })
    observer.observe(element)
    setWidth(Math.round(element.getBoundingClientRect().width) || 960)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(80, width - PADDING.left - PADDING.right)
  const volumeHeight = Math.round((height - PADDING.top - PADDING.bottom) * VOLUME_RATIO)
  const priceHeight = height - PADDING.top - PADDING.bottom - volumeHeight - 8
  const priceTop = PADDING.top
  const priceBottom = priceTop + priceHeight
  const volumeTop = priceBottom + 8
  const volumeBottom = volumeTop + volumeHeight

  const { pricePath, avgPath, areaPath, bars, yTicks, percentTicks } = useMemo(() => {
    if (points.length === 0) {
      return { pricePath: '', avgPath: '', areaPath: '', bars: [], yTicks: [], percentTicks: [] }
    }
    const prices = points.map((point) => point.price)
    const avgs = points.map((point) => point.avg_price).filter((value) => value > 0)
    const all = prevClose > 0 ? [...prices, ...avgs, prevClose] : [...prices, ...avgs]
    const maxPrice = Math.max(...all)
    const minPrice = Math.min(...all)
    // 以昨收为中心对称，涨跌幅两侧刻度对称
    const span = Math.max(maxPrice - prevClose, prevClose - minPrice, prevClose * 0.002)
    const top = prevClose + span
    const bottom = prevClose - span

    const y = makeScale(top, bottom, priceTop, priceBottom)
    const step = plotWidth / Math.max(points.length - 1, 1)
    const pricePoints = points.map((point, index) => [PADDING.left + step * index, y(point.price)] as [number, number])
    const avgPoints = points
      .map((point, index) =>
        point.avg_price > 0
          ? ([PADDING.left + step * index, y(point.avg_price)] as [number, number])
          : null,
      )
      .filter((item): item is [number, number] => item !== null)

    const maxVolume = Math.max(...points.map((point) => point.volume), 1)
    const barWidth = Math.max(1, (plotWidth / Math.max(points.length, 1)) * 0.7)
    const volumeY = makeScale(0, maxVolume, volumeBottom, volumeTop)
    const volumeBars = points.map((point, index) => ({
      x: PADDING.left + step * index,
      y: volumeY(point.volume),
      width: barWidth,
      up: index === 0 ? point.price >= prevClose : point.price >= points[index - 1].price,
    }))

    return {
      pricePath: buildPath(pricePoints),
      avgPath: buildPath(avgPoints),
      areaPath: buildArea(pricePoints, priceBottom),
      bars: volumeBars,
      yTicks: [top, prevClose, bottom].map((value) => ({ value, y: y(value) })),
      percentTicks: [top, prevClose, bottom].map((value) => ({
        value,
        y: y(value),
        percent: prevClose ? ((value - prevClose) / prevClose) * 100 : 0,
      })),
    }
  }, [points, prevClose, plotWidth, priceTop, priceBottom, volumeTop, volumeBottom])

  if (points.length === 0) {
    return <div className="chart-empty">暂无分时数据</div>
  }

  return (
    <div className="kline-wrap" ref={wrapRef}>
      <svg width={width} height={height} role="img" aria-label="分时图">
        {/* 网格与刻度 */}
        {yTicks.map((tick, index) => (
          <g key={index}>
            <line
              className={`grid-line ${index === 1 ? 'baseline' : ''}`}
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="axis-text axis-price" x={PADDING.left + plotWidth + 8} y={tick.y + 4}>
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}
        {percentTicks.map((tick, index) => (
          <text
            key={`p${index}`}
            className={`axis-text percent ${tick.percent > 0 ? 'trend-up' : tick.percent < 0 ? 'trend-down' : ''}`}
            x={PADDING.left + plotWidth + 8}
            y={tick.y + 16}
          >
            {tick.percent >= 0 ? '+' : ''}
            {tick.percent.toFixed(2)}%
          </text>
        ))}

        {/* 成交量 */}
        {bars.map((bar, index) => (
          <rect
            key={index}
            className={bar.up ? 'volume-up' : 'volume-down'}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={Math.max(0, volumeBottom - bar.y)}
          />
        ))}

        {/* 价格与均价 */}
        <path className="price-area" d={areaPath} />
        <path className="price-line" d={pricePath} />
        {avgPath && <path className="avg-line" d={avgPath} />}

        {/* 时间刻度 */}
        {['09:30', '11:30/13:00', '15:00'].map((label, index) => (
          <text
            key={label}
            className="axis-text axis-date"
            x={PADDING.left + (plotWidth / 2) * index}
            y={height - 4}
            textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}
