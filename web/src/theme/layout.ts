/**
 * 首页卡片布局配置：顺序与显隐。全局共用，持久化到 localStorage。
 *
 * 首页由「区域」组成，卡片在区域内部排序：
 *   hero  —— 指数卡片（固定，始终显示）
 *   watch —— 我的自选
 *   flow  —— 主力资金榜（并排区域，单卡时自动占满整行）
 *   rank  —— 涨幅榜 / 成交量榜（并排区域）
 *   stat  —— 市场情绪 / 市场概览（并排区域）
 * 区域内不支持跨区拖动，但可以上下调序、隐藏，并在恢复默认时一键还原。
 */

export type CardId = 'watchlist' | 'main_inflow' | 'gainers' | 'volume' | 'breadth' | 'metrics'

export const LAYOUT_STORAGE_KEY = 'ashare-insight:layout'

export const DEFAULT_CARD_ORDER: CardId[] = [
  'watchlist',
  'main_inflow',
  'gainers',
  'volume',
  'breadth',
  'metrics',
]

export interface LayoutConfig {
  order: CardId[]
  hidden: CardId[]
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  order: [...DEFAULT_CARD_ORDER],
  hidden: [],
}

export interface CardMeta {
  id: CardId
  title: string
  description: string
  /** 所属区域，用于提示「同区域卡片并排展示」 */
  region: string
}

export const CARD_META: Record<CardId, CardMeta> = {
  watchlist: {
    id: 'watchlist',
    title: '我的自选',
    description: '自选股实时行情，支持增删；行数由右上角档位决定只影响榜单',
    region: '自选',
  },
  main_inflow: {
    id: 'main_inflow',
    title: '主力净流入榜',
    description: '主力（超大单）净额降序，观察资金流入方向',
    region: '资金流',
  },
  gainers: {
    id: 'gainers',
    title: '涨幅榜',
    description: '仅显示涨幅 11% 以内的标的，避开 20cm 涨停占榜',
    region: '榜单',
  },
  volume: {
    id: 'volume',
    title: '成交量榜',
    description: '按成交量（手）降序，观察换手活跃的标的',
    region: '榜单',
  },
  breadth: {
    id: 'breadth',
    title: '市场情绪',
    description: '涨跌平家数、涨停跌停停牌与上涨占比',
    region: '统计',
  },
  metrics: {
    id: 'metrics',
    title: '市场概览',
    description: '平均/中位涨跌幅、上涨占比、涨跌家数比',
    region: '统计',
  },
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
  return { order, hidden: Array.from(new Set(hidden)) }
}

export function readLayout(): LayoutConfig {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return normalizeLayout(DEFAULT_LAYOUT)
    return normalizeLayout(JSON.parse(raw) as Partial<LayoutConfig>)
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

/** 按区域分组（保持 order 中的相对次序） */
export function groupByRegion(order: CardId[]): Array<{ region: string; cards: CardId[] }> {
  const groups: Array<{ region: string; cards: CardId[] }> = []
  for (const id of order) {
    const region = CARD_META[id].region
    const existing = groups.find((group) => group.region === region)
    if (existing) existing.cards.push(id)
    else groups.push({ region, cards: [id] })
  }
  return groups
}
