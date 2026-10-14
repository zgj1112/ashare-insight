# web — A 股行情看板前端

React 19 + Vite + TypeScript。接口请求全部走 `/api`，由 Vite 代理到后端。

## 常用命令

```bash
npm install

npm run dev           # 开发服务器 http://127.0.0.1:5173
npm run dev:sandbox   # 同上，附带 dev-preload.mjs（受限沙箱环境用）
npm run build         # 类型检查 + 生产构建，输出到 dist/
npm run preview       # 预览构建产物
```

## 目录说明

```
public/theme-init.js          首屏应用本地主题（防闪烁，不参与打包）
src/
├─ App.tsx                    页面路由与共享数据（总览、自选各拉一次）
├─ router.ts                  hash 路由：#/ 看板、#/settings 展示设置
├─ pages/
│  ├─ DashboardPage.tsx       看板页：按布局配置渲染卡片，并排区域自适应
│  └─ SettingsPage.tsx        展示设置页：区域内调序、显隐开关、恢复默认
├─ api/market.ts              后端接口封装（含统一错误处理）
├─ hooks/
│  ├─ useMarket.ts            useOverview（自动刷新，按行数档位传 limit）/ useSearch
│  └─ useWatchlist.ts         自选列表（本地持久化 + 批量行情）
├─ theme/
│  ├─ ThemeProvider.tsx       ThemeProvider 与 useTheme（主题 + 字号 + 行数 + 布局）
│  ├─ theme.ts                明暗类型、本地读写、系统偏好解析
│  ├─ font.ts                 字号档位（小/中/大）与根字号应用
│  ├─ rows.ts                 榜单行数档位（10/20/30）
│  └─ layout.ts               首页卡片顺序与显隐（含区域定义）
├─ styles/theme.css           全局 CSS 变量（明/暗两套 + 根字号）与基础样式
├─ components/
│  ├─ AppHeader.tsx           品牌、搜索框、刷新
│  ├─ TopControls.tsx         右上角控制行：状态、数据时间、展示设置入口、行数、字体、主题
│  ├─ ThemeToggle.tsx         明/暗主题切换按钮
│  ├─ FontScaleToggle.tsx     字体档位（小/中/大）切换
│  ├─ RowCountToggle.tsx      行数档位（10/20/30）切换
│  ├─ IndexBoard.tsx          指数卡片
│  ├─ FlowList.tsx            主力净流入榜
│  ├─ SectorList.tsx          板块涨幅横条（行业 / 概念切换）
│  ├─ WatchList.tsx           我的自选（不限制高度，全部展示）
│  ├─ RankList.tsx            榜单表格（涨幅/成交量共用）
│  ├─ MarketBreadth.tsx       涨跌家数与涨跌停统计
│  └─ MarketMetrics.tsx       平均/中位涨跌幅等市场概览
├─ types/market.ts            与后端 app/models/market.py 对应的类型
└─ utils/format.ts            涨跌配色（涨红跌绿）、时间与代码格式化
```

## 主题与字号约定

- **不要写死颜色**：所有色值放在 `src/styles/theme.css` 的 CSS 变量里，组件样式只引用变量，
  这样切换主题与新增页面都不需要额外工作
- **不要写死字号**：所有字号用 `rem`，根字号由 `--font-size-root`（小 13 / 中 14 / 大 16）决定，
  切换档位即整体等比缩放；间距与圆角保持 px，避免布局跳动
- 变量分层：`--bg / --bg-soft / --bg-elevated`（背景）、`--panel / --panel-soft`（面板）、
  `--border / --border-soft`（描边）、`--text / --text-dim / --text-faint`（文字）、
  `--up / --up-soft / --down / --down-soft / --flat`（涨跌平）、`--accent*`（主色）、
  `--shadow-panel`、`--skeleton-a/b`、`--zebra`、`--scrollbar-thumb`
- 切换方式：`useTheme().toggle()`（浅↔深）、`useTheme().setPreference('system')`（跟随系统）、
  `useTheme().setFontSize('small' | 'medium' | 'large')`（字号档位）、
  `useTheme().setRowCount(10 | 20 | 30)`（榜单行数，会触发总览接口按 limit 重新拉取）、
  `useTheme().toggleCard(id)` / `moveCard(id, 'up' | 'down')` / `resetLayout()`（卡片布局）；
  最终写入 `<html data-theme data-font>`，CSS 变量据此生效（行数与布局不进 DOM）

## 卡片布局约定

- 卡片清单与摆放规则集中在 `src/theme/layout.ts`：`CARD_META` 声明每张卡片的 `span`
  （`full` 独占整行 / `half` 与相邻半宽卡片并排），`buildRows()` 把顺序切成行，
  `moveInRows()` 实现「按行」上下移动与行内左右互换
- 看板与管理页都调用同一组函数，因此**设置页的排布始终等于首页的排布**
- 新增卡片：在 `CardId` 与 `CARD_META` 里登记 → 在 `DashboardPage` 的 `renderCard` 中渲染；
  展示设置页会自动出现该卡片，无需改动设置页
- 布局只保存「顺序 + 隐藏项」，未知/缺失的卡片在读取时会自动补全；
  **调整默认顺序、改动卡片清单或 span 时必须把 `LAYOUT_VERSION` 加 1**，
  否则老用户的本地配置会盖住新默认
- 列表容器（`.list-scroll` / `.flow-scroll` / `.watch-scroll`）不要加 `max-height`，
  卡片按内容自然展开是既定行为
- 显示设置的入口统一放在 `TopControls`（首页头部第二行靠右），新增页面若要复用，
  把它挂到自己的顶部即可，状态仍由同一个 `useTheme()` 提供
- 常用 px→rem 换算（基准 14px）：`11px=0.7857` `11.5px=0.8214` `12px=0.8571` `12.5px=0.8929`
  `13px=0.9286` `13.5px=0.9643` `14px=1` `14.5px=1.0357` `15px=1.0714` `16px=1.1429`
  `17px=1.2143` `18px=1.2857` `20px=1.4286` `22px=1.5714`
- 首屏防闪烁：`public/theme-init.js` 在样式表之前同步执行，读取 localStorage 后立即写
  `data-theme` 与 `data-font`；它不参与打包，因此使用 ES5 写法，
  改动时需与 `src/theme/theme.ts`、`src/theme/font.ts` 的键名和取值保持一致

## 约定

- 涨跌配色遵循 A 股习惯（涨红跌绿），色值由 `src/styles/theme.css` 的 `--up / --down` 提供
- 数字统一使用等宽字体与 `tabular-nums`，保证纵向对齐
- 后端地址默认 `http://127.0.0.1:8000`，可用环境变量 `VITE_API_TARGET` 覆盖
- 后端若已托管 `dist`，可直接访问 http://127.0.0.1:8000/ ，无需启动本开发服务器

## 受限环境的说明

`scripts/dev-preload.mjs` 会在启动前替换 `child_process` 中「磁盘类型探测」类命令
（`net use` / `fsutil` 等只读查询）的返回值，用于规避沙箱禁止创建管道导致的
`spawn EPERM`。其余命令不受影响；常规环境无需使用。
