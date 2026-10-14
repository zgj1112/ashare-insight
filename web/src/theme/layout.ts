/**
 * 首页展示配置：卡片清单、默认顺序与显隐。
 *
 * 顺序是**全局**的：管理页里任意两张卡片都能互换位置，不再限制在区域内。
 * 每张卡片声明自己的占位宽度（span），相邻的两张半宽卡片会自动并排成一行；
 * 一旦被其他卡片隔开，就各自独占整行。
 */

export type CardId =
  | 'breadth'
  | 'sectors'
  | 'watchlist'
  | 'main_inflow'
  | 'gainers'
  | 'volume'
  | 'metrics'

export const LAYOUT_STORAGE_KEY = 'ashare-insight:layout'

/**
 * 配置版本。默认顺序或卡片清单变化后需要 +1：
 * 旧版本的本地配置会被丢弃并回到新默认，避免老用户看不到新的默认布局。
 */
export const LAYOUT_VERSION = 4

export interface CardMeta {
  id: CardId
  title: string
  description: string
  /** 'full' 独占整行；'half' 与相邻的半宽卡片并排 */
  span: 'full' | 'half'
  /** 并排（半宽）时的分组标签 */
  group: string
}

export const CARD_META: Record<CardId, CardMeta> = {
  breadth: {
    id: 'breadth',
    title: '市场情绪',
    description: '单行横条：涨跌平分布、涨停跌停、上涨占比与成交额',
    span: 'full',
    group: '行情概览',
  },
  sectors: {
    id: 'sectors',
    title: '板块涨幅',
    description: '单行横条：领涨板块，可切换行业 / 概念',
    span: 'full',
    group: '行情概览',
  },
  watchlist: {
    id: 'watchlist',
    title: '我的自选',
    description: '自选股实时行情，支持增删；行数档位只影响榜单',
    span: 'full',
    group: '自选',
  },
  main_inflow: {
    id: 'main_inflow',
    title: '主力净流入榜',
    description: '主力（超大单）净额降序，观察资金流入方向',
    span: 'half',
    group: '资金流',
  },
  gainers: {
    id: 'gainers',
    title: '涨幅榜',
    description: '仅显示涨幅 11% 以内的标的，避开 20cm 涨停占榜',
    span: 'half',
    group: '涨幅榜',
  },
  volume: {
    id: 'volume',
    title: '成交量榜',
    description: '按成交量（手）降序，观察换手活跃的标的',
    span: 'half',
    group: '成交量榜',
  },
  metrics: {
    id: 'metrics',
    title: '市场概览',
    description: '平均/中位涨跌幅、上涨占比、涨跌家数比',
    span: 'half',
    group: '统计',
  },
}

export const DEFAULT_CARD_ORDER: CardId[] = [
  'breadth',
  'sectors',
  'watchlist',
  'main_inflow',
  'gainers',
  'volume',
  'metrics',
]

export interface LayoutConfig {
  version: number
  order: CardId[]
  hidden: CardId[]
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  version: LAYOUT_VERSION,
  order: [...DEFAULT_CARD_ORDER],
  hidden: [],
}

function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && value in CARD_META
}

/** 补全缺失卡片、剔除未知项，保证顺序完整且无重复 */
export function normalizeLayout(config: Partial<LayoutConfig> | null | undefined): LayoutConfig {
  const storedOrder = Array.isArray(config?.order) ? config!.order.filter(isCardId) : []
  const order = [...storedOrder]
  for (const id of DEFAULT_CARD_ORDER) {
    if (!order.includes(id)) order.push(id)
  }
  const hidden = Array.isArray(config?.hidden) ? config!.hidden.filter(isCardId) : []
  return { version: LAYOUT_VERSION, order, hidden: Array.from(new Set(hidden)) }
}

export function readLayout(): LayoutConfig {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return normalizeLayout(DEFAULT_LAYOUT)
    const parsed = JSON.parse(raw) as Partial<LayoutConfig>
    // 版本不一致说明默认布局已更新，直接回到新默认
    if (parsed?.version !== LAYOUT_VERSION) return normalizeLayout(DEFAULT_LAYOUT)
    return normalizeLayout(parsed)
  } catch {
    return normalizeLayout(DEFAULT_LAYOUT)
  }
}

export function writeLayout(config: LayoutConfig): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* 忽略写入失败，不影响本次会话 */
  }
}

/** 按顺序切分出「整行卡片」与「并排行」，供看板与管理页共用 */
export type LayoutRow =
  | { type: 'single'; id: CardId }
  | { type: 'pair'; ids: CardId[] }

export function buildRows(order: CardId[], isVisible: (id: CardId) => boolean = () => true): LayoutRow[] {
  const rows: LayoutRow[] = []
  const queue = order.filter(isVisible)
  let index = 0
  while (index < queue.length) {
    const id = queue[index]
    if (CARD_META[id].span === 'full') {
      rows.push({ type: 'single', id })
      index += 1
      continue
    }
    const next = queue[index + 1]
    if (next && CARD_META[next].span === 'half') {
      rows.push({ type: 'pair', ids: [id, next] })
      index += 2
    } else {
      rows.push({ type: 'pair', ids: [id] })
      index += 1
    }
  }
  return rows
}

/**
 * 按「行」交换位置：同一行内先左右互换，再与上一行/下一行交换。
 * 这样 ↑↓ 的语义是「整块上移/下移一行」，与首页看到的排布一致
 * （若按单个位置交换，并排的两张卡片会被拆开）。
 */
export function moveInRows(order: CardId[], id: CardId, direction: 'up' | 'down'): CardId[] {
  const rows = buildRows(order)
  const rowIndex = rows.findIndex((row) =>
    row.type === 'single' ? row.id === id : row.ids.includes(id),
  )
  if (rowIndex < 0) return order

  const row = rows[rowIndex]
  // 同一行内还有伙伴：先交换左右位置
  if (row.type === 'pair' && row.ids.length > 1) {
    const position = row.ids.indexOf(id)
    const target = position + (direction === 'up' ? -1 : 1)
    if (target >= 0 && target < row.ids.length) {
      const swapped = [...row.ids]
      ;[swapped[position], swapped[target]] = [swapped[target], swapped[position]]
      rows[rowIndex] = { type: 'pair', ids: swapped }
      return rows.flatMap((item) => (item.type === 'single' ? [item.id] : item.ids))
    }
  }

  const neighbourIndex = rowIndex + (direction === 'up' ? -1 : 1)
  if (neighbourIndex < 0 || neighbourIndex >= rows.length) return order
  const neighbour = rows[neighbourIndex]
  rows[rowIndex] = neighbour
  rows[neighbourIndex] = row
  return rows.flatMap((item) => (item.type === 'single' ? [item.id] : item.ids))
}
