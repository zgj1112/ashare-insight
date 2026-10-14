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
├─ App.tsx                    看板页面组装
├─ api/market.ts              后端接口封装（含统一错误处理）
├─ hooks/
│  ├─ useMarket.ts            useOverview（自动刷新）/ useSearch（防抖搜索）
│  └─ useWatchlist.ts         自选列表（本地持久化 + 批量行情）
├─ theme/
│  ├─ ThemeProvider.tsx       ThemeProvider 与 useTheme
│  └─ theme.ts                明暗类型、本地读写、系统偏好解析
├─ styles/theme.css           全局 CSS 变量（明/暗两套）与基础样式
├─ components/
│  ├─ AppHeader.tsx           品牌、交易状态、数据时间、搜索框、刷新、主题切换
│  ├─ ThemeToggle.tsx         明/暗主题切换按钮
│  ├─ IndexBoard.tsx          指数卡片
│  ├─ WatchList.tsx           我的自选
│  ├─ RankList.tsx            榜单表格（涨幅/跌幅/成交额共用）
│  ├─ MarketBreadth.tsx       涨跌家数与涨跌停统计
│  └─ MarketMetrics.tsx       平均/中位涨跌幅等市场概览
├─ types/market.ts            与后端 app/models/market.py 对应的类型
└─ utils/format.ts            涨跌配色（涨红跌绿）、时间与代码格式化
```

## 主题与配色约定

- **不要写死颜色**：所有色值放在 `src/styles/theme.css` 的 CSS 变量里，组件样式只引用变量，
  这样切换主题与新增页面都不需要额外工作
- 变量分层：`--bg / --bg-soft / --bg-elevated`（背景）、`--panel / --panel-soft`（面板）、
  `--border / --border-soft`（描边）、`--text / --text-dim / --text-faint`（文字）、
  `--up / --up-soft / --down / --down-soft / --flat`（涨跌平）、`--accent*`（主色）、
  `--shadow-panel`、`--skeleton-a/b`、`--zebra`、`--scrollbar-thumb`
- 切换方式：`useTheme().toggle()`（浅↔深）或 `useTheme().setPreference('system')`（跟随系统）；
  最终主题写入 `<html data-theme="dark|light">`，CSS 变量据此生效
- 新增主题相关表现时，优先给变量取值，而不是在组件里判断当前主题
- 首屏防闪烁：`public/theme-init.js` 在样式表之前同步执行，读取 `localStorage` 后立即写 `data-theme`；
  它不能参与打包，因此使用 ES5 写法，改动时需与 `src/theme/theme.ts` 的取值逻辑保持一致

## 约定

- 涨跌配色遵循 A 股习惯（涨红跌绿），色值由 `src/styles/theme.css` 的 `--up / --down` 提供
- 数字统一使用等宽字体与 `tabular-nums`，保证纵向对齐
- 后端地址默认 `http://127.0.0.1:8000`，可用环境变量 `VITE_API_TARGET` 覆盖
- 后端若已托管 `dist`，可直接访问 http://127.0.0.1:8000/ ，无需启动本开发服务器

## 受限环境的说明

`scripts/dev-preload.mjs` 会在启动前替换 `child_process` 中「磁盘类型探测」类命令
（`net use` / `fsutil` 等只读查询）的返回值，用于规避沙箱禁止创建管道导致的
`spawn EPERM`。其余命令不受影响；常规环境无需使用。
