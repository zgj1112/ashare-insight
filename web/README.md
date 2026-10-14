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
src/
├─ App.tsx                    看板页面组装
├─ api/market.ts              后端接口封装（含统一错误处理）
├─ hooks/useMarket.ts         useOverview（自动刷新）/ useSearch（防抖搜索）
├─ components/
│  ├─ AppHeader.tsx           品牌、交易状态、数据时间、搜索框、刷新
│  ├─ IndexBoard.tsx          指数卡片
│  ├─ RankList.tsx            榜单表格（涨幅/跌幅/成交额共用）
│  ├─ MarketBreadth.tsx       涨跌家数与涨跌停统计
│  └─ MarketMetrics.tsx       平均/中位涨跌幅等市场概览
├─ types/market.ts            与后端 app/models/market.py 对应的类型
└─ utils/format.ts            涨跌配色（涨红跌绿）、时间与代码格式化
```

## 约定

- 涨跌配色：涨红 `#f5455c`、跌绿 `#16b979`、平盘灰，定义在 `src/index.css` 的 CSS 变量中
- 数字统一使用等宽字体与 `tabular-nums`，保证纵向对齐
- 后端地址默认 `http://127.0.0.1:8000`，可用环境变量 `VITE_API_TARGET` 覆盖
- 后端若已托管 `dist`，可直接访问 http://127.0.0.1:8000/ ，无需启动本开发服务器

## 受限环境的说明

`scripts/dev-preload.mjs` 会在启动前替换 `child_process` 中「磁盘类型探测」类命令
（`net use` / `fsutil` 等只读查询）的返回值，用于规避沙箱禁止创建管道导致的
`spawn EPERM`。其余命令不受影响；常规环境无需使用。
