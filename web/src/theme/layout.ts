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

export type CardId =
  | 'watchlist'
  | 'sectors'
  | 'main_inflow'
  | 'gainers'
  | 'volume'
  | 'breadth'
  | 'metrics'

export const LAYOUT_STORAGE_KEY = 'ashare-insight:layout'

/**
 * 布局配置版本。默认顺序调整后需要 +1：
 * 旧版本的本地配置会被丢弃并回到新默认，避免老用户看不到新的默认布局。
 */
export const LAYOUT_VERSION = 3

export const DEFAULT_CARD_ORDER: CardId[] = [
  'breadth',
  'watchlist',
  'sectors',
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

export interface CardMeta {
  id: CardId
  title: string
  description: string
  /** 所属区域，用于提示「同区域卡片并排展示」 */
  region: string
  /** 并排区域：仅这些区域的卡片会左右并排，其余卡片独占整行 */
  regionPaired?: boolean
}

export const CARD_META: Record<CardId, CardMeta> = {
  breadth: {
    id: 'breadth',
    title: '市场情绪',
    description: '单行横条：涨跌平家数分布、涨停跌停、上涨占比与成交额',
    region: '统计',
  },
  watchlist: {
    id: 'watchlist',
    title: '我的自选',
    description: '自选股实时行情，支持增删；行数档位只影响榜单',
    region: '自选',
  },
  main_inflow: {
    id: 'main_inflow',
    title: '主力净流入榜',
    description: '主力（超大单）净额降序，观察资金流入方向',
    region: '资金流',
  },
  sectors: {
    id: 'sectors',
    title: '板块涨幅榜',
    description: '行业 / 概念板块按涨跌幅降序，含成分股数、成交额与领涨股',
    region: '板块',
  },
  gainers: {
    id: 'gainers',
    title: '涨幅榜',
    description: '仅显示涨幅 11% 以内的标的，避开 20cm 涨停占榜',
    region: '榜单',
    regionPaired: true,
  },
  volume: {
    id: 'volume',
    title: '成交量榜',
    description: '按成交量（手）降序，观察换手活跃的标的',
    region: '榜单',
    regionPaired: true,
  },
  metrics: {
    id: 'metrics',
    title: '市场概览',
    description: '平均/中位涨跌幅、上涨占比、涨跌家数比',
    region: '概览',
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
