/**
 * 日 K 线：蜡烛 + MA5/10/20 + 成交量副图，带坐标轴与悬停明细。
 *
 * 说明：
 * - 按容器真实像素宽度渲染（ResizeObserver），不使用 viewBox 拉伸，
 *   否则文字会被横向拉宽失真；
 * - 鼠标悬停显示十字线与浮层，包含当日开高低收、涨跌幅、振幅、成交量与均线值。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KlineBar } from '../../types/market'
import { buildPath, makeScale } from './chartUtils'

interface Props {
  bars: KlineBar[]
  height?: number
}

const PADDING = { top: 14, right: 66, bottom: 22, left: 10 }
const VOLUME_RATIO = 0.24
const GAP = 10
const MA_PERIODS = [5, 10, 20]
const PRICE_TICKS = 5

function movingAverage(bars: KlineBar[], period: number): Array<number | null> {
  return bars.map((_, index) => {
    if (index < period - 1) return null
    const slice = bars.slice(index - period + 1, index + 1)
    return slice.reduce((sum, bar) => sum + bar.close, 0) / period
  })
}

function formatVolume(shares: number): string {
  if (!shares) return '--'
  const lots = shares / 100
  if (lots >= 1e4) return `${(lots / 1e4).toFixed(2)} 万手`
  return `${Math.round(lots)} 手`
}

function formatAmount(value: number): string {
  if (!value) return '--'
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`
  if (value >= 1e4) return `${(value / 1e4).toFixed(2)} 万`
  return value.toFixed(0)
}

/** 日期标签：同年只显示 MM-DD，跨年显示 YY-MM */
function dateLabel(date: string, sameYear: boolean): string {
  const parts = date.split('-')
  if (parts.length < 3) return date
  return sameYear ? `${parts[1]}-${parts[2]}` : `${parts[0].slice(2)}-${parts[1]}`
}

export function KLineChart({ bars, height = 340 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null)

  // 跟随容器宽度重绘，保证文字与坐标不被拉伸
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

  const chart = useMemo(() => {
    if (bars.length === 0) return null
    const plotWidth = Math.max(80, width - PADDING.left - PADDING.right)
    const bodyHeight = height - PADDING.top - PADDING.bottom
    const volumeHeight = Math.round(bodyHeight * VOLUME_RATIO)
    const priceHeight = bodyHeight - volumeHeight - GAP
    const priceTop = PADDING.top
    const priceBottom = priceTop + priceHeight
    const volumeTop = priceBottom + GAP
    const volumeBottom = volumeTop + volumeHeight

    const highs = bars.map((bar) => bar.high)
    const lows = bars.map((bar) => bar.low)
    const maValues = MA_PERIODS.map((period) => movingAverage(bars, period))
    const maNumbers = maValues.flat().filter((value): value is number => value !== null)
    const maxPrice = Math.max(...highs, ...maNumbers)
    const minPrice = Math.min(...lows, ...maNumbers)
    const pad = (maxPrice - minPrice) * 0.06 || 1
    const top = maxPrice + pad
    const bottom = minPrice - pad
    const y = makeScale(top, bottom, priceTop, priceBottom)

    const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1)
    const volumeY = makeScale(0, maxVolume, volumeBottom, volumeTop)

    const step = plotWidth / bars.length
    const candleWidth = Math.max(2, Math.min(step * 0.66, 18))

    const candles = bars.map((bar, index) => {
      const centerX = PADDING.left + step * index + step / 2
      return {
        key: `${bar.date}-${index}`,
        centerX,
        x: centerX - candleWidth / 2,
        width: candleWidth,
        bodyTop: y(Math.max(bar.open, bar.close)),
        bodyHeight: Math.max(1, Math.abs(y(bar.open) - y(bar.close))),
        highY: y(bar.high),
        lowY: y(bar.low),
        up: bar.close >= bar.open,
        volumeY: volumeY(bar.volume),
      }
    })

    const maLines = MA_PERIODS.map((period, position) => {
      const points = maValues[position]
        .map((value, index) =>
          value === null
            ? null
            : ([PADDING.left + step * index + step / 2, y(value)] as [number, number]),
        )
        .filter((item): item is [number, number] => item !== null)
      return { period, path: buildPath(points) }
    })

    const priceTicks = Array.from({ length: PRICE_TICKS }, (_, index) => {
      const ratio = index / (PRICE_TICKS - 1)
      const value = top - (top - bottom) * ratio
      return { value, y: y(value) }
    })

    // 日期刻度：均匀取样约 6 个
    const tickCount = Math.min(6, bars.length)
    const dateTicks = Array.from({ length: tickCount }, (_, index) => {
      const barIndex = Math.round((index / Math.max(tickCount - 1, 1)) * (bars.length - 1))
      const anchor: 'start' | 'end' | 'middle' =
        index === 0 ? 'start' : index === tickCount - 1 ? 'end' : 'middle'
      return {
        date: bars[barIndex].date,
        x: PADDING.left + step * barIndex + step / 2,
        anchor,
      }
    })
    const sameYear = new Set(bars.map((bar) => bar.date.slice(0, 4))).size === 1

    return {
      step,
      candles,
      maLines,
      maValues,
      priceTicks,
      dateTicks,
      sameYear,
      y,
      priceTop,
      volumeTop,
      volumeBottom,
      maxVolume,
      plotWidth,
    }
  }, [bars, width, height])

  if (!chart) return <div className="chart-empty">暂无 K 线数据</div>

  const hovered = hover ? bars[hover.index] : null
  const hoveredPrev = hover && hover.index > 0 ? bars[hover.index - 1] : null
  const hoveredChange =
    hovered && hoveredPrev ? ((hovered.close - hoveredPrev.close) / hoveredPrev.close) * 100 : null

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const yPos = event.clientY - rect.top
    const index = Math.floor((x - PADDING.left) / chart.step)
    if (index < 0 || index >= bars.length) {
      setHover(null)
      return
    }
    setHover({ index, x, y: yPos })
  }

  const tooltipLeft = hover ? Math.min(Math.max(hover.x + 16, 8), Math.max(8, width - 210)) : 0
  const tooltipTop = hover ? Math.max(8, Math.min(hover.y - 40, height - 172)) : 0

  return (
    <div
      className="kline-wrap"
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={width} height={height} role="img" aria-label="日 K 线图">
        {/* 价格区网格与右侧刻度 */}
        {chart.priceTicks.map((tick, index) => (
          <g key={`p${index}`}>
            <line
              className="grid-line"
              x1={PADDING.left}
              x2={PADDING.left + chart.plotWidth}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="axis-text axis-price"
              x={PADDING.left + chart.plotWidth + 8}
              y={tick.y + 4}
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* 成交量区基线与标注 */}
        <line
          className="grid-line"
          x1={PADDING.left}
          x2={PADDING.left + chart.plotWidth}
          y1={chart.volumeBottom}
          y2={chart.volumeBottom}
        />
        <text className="axis-text axis-label" x={PADDING.left} y={chart.volumeTop - 4}>
          成交量
        </text>
        <text
          className="axis-text axis-price"
          x={PADDING.left + chart.plotWidth + 8}
          y={chart.volumeTop + 8}
        >
          {formatVolume(chart.maxVolume)}
        </text>

        {/* 蜡烛与成交量柱 */}
        {chart.candles.map((item) => (
          <g key={item.key}>
            <line
              className={item.up ? 'candle-wick-up' : 'candle-wick-down'}
              x1={item.centerX}
              x2={item.centerX}
              y1={item.highY}
              y2={item.lowY}
            />
            <rect
              className={item.up ? 'candle-up' : 'candle-down'}
              x={item.x}
              y={item.bodyTop}
              width={item.width}
              height={item.bodyHeight}
            />
            <rect
              className={item.up ? 'volume-up' : 'volume-down'}
              x={item.x}
              y={item.volumeY}
              width={item.width}
              height={Math.max(0, chart.volumeBottom - item.volumeY)}
            />
          </g>
        ))}

        {/* 均线 */}
        {chart.maLines.map((line) => (
          <path key={line.period} className={`ma-line ma-${line.period}`} d={line.path} />
        ))}

        {/* 日期刻度 */}
        {chart.dateTicks.map((tick, index) => (
          <text
            key={`d${index}`}
            className="axis-text axis-date"
            x={tick.x}
            y={height - 6}
            textAnchor={tick.anchor}
          >
            {dateLabel(tick.date, chart.sameYear)}
          </text>
        ))}

        {/* 悬停十字线 */}
        {hover && hovered && (
          <g className="crosshair">
            <line
              x1={chart.candles[hover.index].centerX}
              x2={chart.candles[hover.index].centerX}
              y1={PADDING.top}
              y2={chart.volumeBottom}
            />
            <line
              x1={PADDING.left}
              x2={PADDING.left + chart.plotWidth}
              y1={chart.y(hovered.close)}
              y2={chart.y(hovered.close)}
            />
            <text
              className="crosshair-price"
              x={PADDING.left + chart.plotWidth + 8}
              y={chart.y(hovered.close) + 4}
            >
              {hovered.close.toFixed(2)}
            </text>
          </g>
        )}
      </svg>

      {/* 均线图例（悬停时显示该日数值） */}
      <div className="kline-legend">
        {chart.maLines.map((line, position) => {
          const value = hover ? chart.maValues[position][hover.index] : null
          return (
            <span key={line.period} className={`legend-item ma-${line.period}`}>
              MA{line.period}
              {value !== null ? ` ${value.toFixed(2)}` : ''}
            </span>
          )
        })}
        <span className="legend-item hint">共 {bars.length} 个交易日 · 鼠标悬停查看明细</span>
      </div>

      {/* 悬停明细浮层 */}
      {hover && hovered && (
        <div className="kline-tooltip" style={{ left: tooltipLeft, top: tooltipTop }}>
          <div className="tooltip-date">{hovered.date}</div>
          <dl className="tooltip-grid">
            <div>
              <dt>开</dt>
              <dd>{hovered.open.toFixed(2)}</dd>
            </div>
            <div>
              <dt>高</dt>
              <dd className="trend-up">{hovered.high.toFixed(2)}</dd>
            </div>
            <div>
              <dt>低</dt>
              <dd className="trend-down">{hovered.low.toFixed(2)}</dd>
            </div>
            <div>
              <dt>收</dt>
              <dd className={hovered.close >= hovered.open ? 'trend-up' : 'trend-down'}>
                {hovered.close.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt>涨跌</dt>
              <dd
                className={
                  hoveredChange === null ? '' : hoveredChange >= 0 ? 'trend-up' : 'trend-down'
                }
              >
                {hoveredChange === null
                  ? '--'
                  : `${hoveredChange >= 0 ? '+' : ''}${hoveredChange.toFixed(2)}%`}
              </dd>
            </div>
            <div>
              <dt>振幅</dt>
              <dd>
                {hoveredPrev
                  ? `${(((hovered.high - hovered.low) / hoveredPrev.close) * 100).toFixed(2)}%`
                  : '--'}
              </dd>
            </div>
            <div className="tooltip-wide">
              <dt>成交量</dt>
              <dd>{formatVolume(hovered.volume)}</dd>
            </div>
            {hovered.amount > 0 && (
              <div className="tooltip-wide">
                <dt>成交额</dt>
                <dd>{formatAmount(hovered.amount)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
