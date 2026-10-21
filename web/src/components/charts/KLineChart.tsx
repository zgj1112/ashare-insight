/** 日 K 线：蜡烛 + MA5/10/20 + 成交量柱。 */

import { useMemo } from 'react'
import type { KlineBar } from '../../types/market'
import { buildPath, makeScale } from './chartUtils'

interface Props {
  bars: KlineBar[]
  height?: number
}

const PADDING = { top: 12, right: 56, bottom: 18, left: 8 }
const VOLUME_RATIO = 0.22
const MA_PERIODS = [5, 10, 20]

function movingAverage(bars: KlineBar[], period: number): Array<number | null> {
  return bars.map((_, index) => {
    if (index < period - 1) return null
    const slice = bars.slice(index - period + 1, index + 1)
    return slice.reduce((sum, bar) => sum + bar.close, 0) / period
  })
}

export function KLineChart({ bars, height = 320 }: Props) {
  const width = 1000

  const chart = useMemo(() => {
    if (bars.length === 0) return null
    const plotWidth = width - PADDING.left - PADDING.right
    const volumeHeight = Math.round((height - PADDING.top - PADDING.bottom) * VOLUME_RATIO)
    const priceHeight = height - PADDING.top - PADDING.bottom - volumeHeight - 8
    const priceTop = PADDING.top
    const priceBottom = priceTop + priceHeight
    const volumeTop = priceBottom + 8
    const volumeBottom = volumeTop + volumeHeight

    const highs = bars.map((bar) => bar.high)
    const lows = bars.map((bar) => bar.low)
    const maxPrice = Math.max(...highs)
    const minPrice = Math.min(...lows)
    const pad = (maxPrice - minPrice) * 0.04 || 1
    const y = makeScale(maxPrice + pad, minPrice - pad, priceTop, priceBottom)

    const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1)
    const volumeY = makeScale(0, maxVolume, volumeBottom, volumeTop)

    const step = plotWidth / bars.length
    const candleWidth = Math.max(1.5, step * 0.62)

    const candles = bars.map((bar, index) => {
      const centerX = PADDING.left + step * index + step / 2
      return {
        key: `${bar.date}-${index}`,
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

    const maLines = MA_PERIODS.map((period) => {
      const values = movingAverage(bars, period)
      const points = values
        .map((value, index) =>
          value === null
            ? null
            : ([PADDING.left + step * index + step / 2, y(value)] as [number, number]),
        )
        .filter((item): item is [number, number] => item !== null)
      return { period, path: buildPath(points) }
    })

    return {
      candles,
      maLines,
      volumeBottom,
      priceBottom,
      ticks: [maxPrice, (maxPrice + minPrice) / 2, minPrice].map((value) => ({
        value,
        y: y(value),
      })),
    }
  }, [bars, height])

  if (!chart) return <div className="chart-empty">暂无 K 线数据</div>

  return (
    <div className="kline-wrap">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="日 K 线图"
      >
        {chart.ticks.map((tick, index) => (
          <g key={index}>
            <line
              className="grid-line"
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="axis-text" x={width - PADDING.right + 6} y={tick.y + 4}>
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {chart.candles.map((candle) => (
          <g key={candle.key}>
            <line
              className={candle.up ? 'candle-wick-up' : 'candle-wick-down'}
              x1={candle.x + candle.width / 2}
              x2={candle.x + candle.width / 2}
              y1={candle.highY}
              y2={candle.lowY}
            />
            <rect
              className={candle.up ? 'candle-up' : 'candle-down'}
              x={candle.x}
              y={candle.bodyTop}
              width={candle.width}
              height={candle.bodyHeight}
            />
            <rect
              className={candle.up ? 'volume-up' : 'volume-down'}
              x={candle.x}
              y={candle.volumeY}
              width={candle.width}
              height={Math.max(0, chart.volumeBottom - candle.volumeY)}
            />
          </g>
        ))}

        {chart.maLines.map((line) => (
          <path key={line.period} className={`ma-line ma-${line.period}`} d={line.path} />
        ))}
      </svg>

      <div className="kline-legend">
        {chart.maLines.map((line) => (
          <span key={line.period} className={`legend-item ma-${line.period}`}>
            MA{line.period}
          </span>
        ))}
        <span className="legend-item hint">共 {bars.length} 个交易日</span>
      </div>
    </div>
  )
}
