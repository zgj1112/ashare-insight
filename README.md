# A 股行情数据项目（ashare-insight）

一个用于获取 A 股股票交易数据的项目，当前已完成**第一个页面：行情总览看板**。

- 后端：Python + FastAPI（行情抓取、缓存、统计聚合）
- 前端：React 19 + Vite + TypeScript（深色行情看板，涨红跌绿）
- 数据源：新浪财经公开行情接口（东财接口在部分网络下会被断连，见文末规划）

## 页面预览

深色（默认）：

![行情总览看板（深色）](docs/screenshot-dashboard.png)

浅色：

![行情总览看板（浅色）](docs/screenshot-dashboard-light.png)

展示设置页（卡片顺序与显隐）：

![展示设置页](docs/screenshot-settings.png)

个股详情页（实时大单资金流）：

![个股详情页](docs/screenshot-detail.png)

看板包含（自上而下，顺序可在展示设置中调整）：

1. **市场情绪**：单行横条 —— 左侧标题、中间涨跌平分布条、右侧上涨/下跌/平盘/涨停/跌停、上涨占比与成交额
2. **板块涨幅**：单行横条 —— 领涨板块胶囊（名称 + 涨跌幅），右侧可切行业 / 概念
3. **指数卡片**：上证指数、深证成指、创业板指、科创50、沪深300、上证50 的实时点位、涨跌幅、开高低与成交额
4. **我的自选**：默认包含贵州茅台与宁德时代，展示最新价、涨跌幅、涨跌额、成交额、换手率、振幅；支持删除、搜索添加，记录保存在浏览器本地
5. **主力净流入榜**（左）与 **涨幅榜**（右）：主力净额降序；涨幅榜只显示涨幅 11% 以内的标的
6. **成交量榜**（左）与 **市场概览**（右）：成交量（手）降序；市场概览含平均/中位涨跌幅、上涨占比、涨跌家数比
7. **搜索**：支持 6 位代码（`600519`）或中文名称（`茅台`）实时检索，结果可直接「+ 自选」

顶部第一行为品牌与搜索、刷新；第二行为市场状态、数据时间与显示设置（**展示设置**、**行数 10/20/30**、**字体 小/中/大**、**主题 浅色/深色**）。页面每 30 秒自动刷新，也可手动刷新。

> 卡片一律**不限高**：选 20/30 条时列表完整展开，不出现内部滚动条。行数越多页面越长，需要看哪块直接滚动页面即可。

### 个股详情页（`#/stock/sh600519`）

从自选或任一榜单点击行即可进入，页面重点在**实时大单资金**：

1. **行情快照**：大号最新价与涨跌幅，右侧 12 项关键指标（今开/昨收/最高/最低/成交量/成交额/换手率/振幅/涨停/跌停/市盈率/总市值）
2. **实时资金流**（核心，每 10 秒刷新）：
   - 顶部大字显示 **主力净额（超大单 + 大单）**，以及占成交额比例
   - 强度条按 0–100% **等比**显示主力净额占比，并标注刻度，不做放大避免误读
   - 四级明细分表：**超大单（单笔 ≥ 100 万）/ 大单（20–100 万）/ 中单（4–20 万）/ 小单（< 4 万）**，
     每级给出流入、流出、净额与占成交额比例
3. **行情走势**：分时图（价格线 + 昨收均价参考 + 分钟成交量柱）与 日 K（前复权 + MA5/10/20）切换
4. **领涨板块**：行业板块整体涨幅胶囊，用于判断个股所处板块氛围

资金流数据按标的缓存 5 秒，前端每 10 秒轮询；页头可一键加入/移出自选。

### 展示设置页

- 入口：右上角控制行的「展示设置」按钮（设置页内同一位置变为「← 返回看板」），地址为 `#/settings`
- **顺序**：按「行」调整，每行有 ↑↓ 上下移动一行；并排的两张卡片可先在行内左右互换
  （若按单个位置交换，会把并排卡片拆散，所以按行处理）
- 设置页的排布与首页**完全一致**：整行卡片单张一行，半宽卡片并排显示，所见即所得
- **显隐**：每张卡片的开关可隐藏；隐藏后与它并排的另一张自动占满整行，全部隐藏时首页给出提示
- 每张卡片标注「整行 / 半宽」，半宽卡片相邻时自动并排，被整行卡片隔开则各自独占整行
- 一键「恢复默认布局」，配置存在 `localStorage`（键：`ashare-insight:layout`）；
  默认顺序或卡片清单变化时会通过 `LAYOUT_VERSION` 让旧配置自动回到新默认
- 该页与看板共用同一份行情数据与轮询，来回切换不会重复请求

### 榜单口径说明

| 榜单 | 排序字段 | 过滤规则 |
| --- | --- | --- |
| 板块涨幅 | 板块涨跌幅降序 | 行业 49 个 / 概念 200+ 个，横条展示前 8 个 |
| 主力净流入榜 | 主力（超大单）净额降序 | 仅个股，剔除 ETF / 基金 / 债券 |
| 涨幅榜 | 涨跌幅降序 | 涨幅 ≤ 11%，剔除停牌 |
| 成交量榜 | 成交量降序 | 剔除停牌 |

- 板块数据来自新浪板块行情（`newSinaHy.php` 行业 / `newFLJK.php?param=class` 概念），
  字段为板块代码、名称、成分股数、平均价、涨跌幅、成交量、成交额与领涨股
- 概念板块数据量较大，默认只在切换到「概念」时按需加载并缓存在前端

市场情绪横条的口径：上涨/下跌/平盘按涨跌幅符号统计，涨停/跌停按交易所限制价（主板 10%、创业板与科创板 20%、北交所 30%、ST 主板 5%）判定。

- **行数档位**：右上角 10 / 20 / 30 一键切换，作用于资金流榜、涨幅榜、成交量榜；
  前端把它作为 `limit` 传给 `/api/market/overview`，后端按需返回（上限 30）
- 卡片不限高，行数多少就展示多少；默认 10 条时看板总高约 1840px，30 条时约 3500px
- 主力净额单位「元」，接口同时给出净占比（主力净额 / 成交额）；后端按亿元/万元格式化
- 涨幅上限可在 `backend/app/core/config.py` 的 `GAINERS_MAX_PERCENT` 调整（默认 11.0）
- 资金流数据来自新浪资金流接口（`MoneyFlow.ssl_bkzj_ssggzj`），排序由数据源完成；
  另有净流出方向（`/api/market/fund-flow?order=asc`）可供后续页面使用
- 主力净流出榜在界面上已移除（首页只保留净流入榜），后端接口与数据仍在，需要时可随时加回

### 显示设置（行数、字体与主题）

- **入口**：右上角控制行（`RowCountToggle` + `FontScaleToggle` + `ThemeToggle`），窄屏自动换行，不会挤压搜索框
- **行数**：10 / 20 / 30 一键切换，作用于首页所有榜单；选择存在 `localStorage`（键：`ashare-insight:row-count`）
- **字体**：小 / 中 / 大三档，点一下立即生效；根字号 13 / 14 / 16 px，页面所有字号都用 `rem`，因此整体等比缩放
- **主题**：浅色 / 深色一键切换，两种背景下涨红跌绿都保持辨识度
- 三者都记录在 `localStorage`，刷新与重启后保持（键：`ashare-insight:row-count`、`ashare-insight:font`、`ashare-insight:theme`）
- **卡片布局**：顺序与显隐在展示设置页调整，存在 `ashare-insight:layout`
- **颜色与字号全部走 CSS 变量**，定义集中在 `web/src/styles/theme.css`，新增页面只引用变量即可自动适配两套主题与三档字号
- 变量约定：`--bg / --panel / --border / --text*` 控制层级，`--up / --down / --flat` 控制涨跌平，`--accent` 为主色，`--font-size-root` 为根字号；另有 `--shadow-panel`、`--skeleton-*`、`--zebra` 等
- 涨跌色按主题分别取值：深色 `#f5455c / #16b979`，浅色 `#d92038 / #0a9d5f`
- 首屏由 `web/public/theme-init.js` 在样式表之前写 `<html data-theme data-font>`，避免主题与字号闪烁
- 已预留「跟随系统」：`useTheme().setPreference('system')` 即跟随系统配色并监听变化，需要时在界面上暴露入口即可

### 自选列表说明

- 默认清单由后端 `DEFAULT_WATCHLIST` 配置（`backend/app/core/config.py`），当前为 `sh600519`、`sz300750`
- 首次访问会带上「默认」徽标；一旦在浏览器里增删过，就以本地记录为准（`localStorage` 键：`ashare-insight:watchlist`）
- 清空浏览器本地记录即可恢复默认清单；上限 60 只
- 换手率、市盈率、市值等字段来自列表接口，首次请求时后台预热全市场清单（约 2 秒），预热完成后自动补齐

## 快速开始

### 前置条件

只需要两样东西，**Node 与 Python 均在 PATH 中即可**（具体版本不限，实测 Node 24 / Python 3.12）：

| 依赖 | 检查命令 | 说明 |
| --- | --- | --- |
| Python ≥ 3.10 | `python --version` | 用标准库运行 `dev.py` / `run.py` |
| Node ≥ 20 | `node --version` | 运行 Vite 开发服务器 |

### 首次安装（只需做一次）

```bash
python backend/tools/bootstrap_deps.py   # 后端依赖 → backend/.venv（不污染全局 site-packages）
cd web && npm install && cd ..           # 前端依赖 → web/node_modules
```

> 为什么后端不用 `pip install`：`bootstrap_deps.py` 直接把 wheel 解包到 `backend/.venv`，
> 避免受限环境（临时目录不可写）下 pip 安装失败；`run.py` 启动时会自动把该目录加入模块搜索路径。
> 若你本机 pip 正常，用 `pip install fastapi uvicorn httpx` 也可以。

### 一键启动（推荐）

```bash
python dev.py            # 同时启动后端与前端，Ctrl+C 一起退出
python dev.py --backend  # 只启动后端
python dev.py --web      # 只启动前端
```

它做三件事：检查依赖是否装好 → 用当前 Python 启动 `backend/run.py`（8000）→
用 Node 启动 Vite（5173，附带 `web/scripts/dev-preload.mjs` 预加载）。

启动后访问：

| 地址 | 说明 |
| --- | --- |
| http://127.0.0.1:5173 | 前端页面（Vite 开发服务器，含热更新） |
| http://127.0.0.1:5173/#/stock/sh600519 | 个股详情页（把 `sh600519` 换成任意代码） |
| http://127.0.0.1:5173/#/settings | 展示设置页 |
| http://127.0.0.1:8000/docs | 后端接口文档（Swagger UI） |
| http://127.0.0.1:8000/api/market/overview | 总览看板聚合接口 |

可用环境变量覆盖端口与 node 路径：`ASHARE_API_PORT`、`ASHARE_WEB_PORT`、`ASHARE_API_HOST`、`ASHARE_NODE`。

### 分步启动（`dev.py` 不可用时）

```bash
# 1) 后端（8000）
cd backend && python run.py --port 8000

# 2) 前端（5173，另开一个终端）
cd web && npm run dev
```

若 Vite 报 `spawn EPERM`（受限环境禁止子进程管道），改用带预加载的启动方式：

```bash
cd web && node --import ./scripts/dev-preload.mjs node_modules/vite/bin/vite.js --port 5173
```

> 注意：`--import` 后面**必须**是相对路径或 `file://` URL。
> 在 Windows 上传绝对路径（`D:\...`）会报 `ERR_UNSUPPORTED_ESM_URL_SCHEME`，
> 因为 Node 会把 `D:` 当成协议名。`dev.py` 已用 `Path.as_uri()` 处理，手动启动时请照上面写。

### 单服务模式（只跑后端）

前端构建产物存在时，后端会直接托管页面，此时只需一个服务：

```bash
cd web && npm run build      # 生成 web/dist
cd ../backend && python run.py
# 打开 http://127.0.0.1:8000/ 即为看板页面
```

## 项目结构

```
ashare-insight/
├─ dev.py                       # 一键启动前后端
├─ backend/
│  ├─ run.py                    # 后端启动入口（自动加载 .venv 依赖）
│  ├─ tools/bootstrap_deps.py   # 手动安装依赖（直接解包 wheel，不依赖 pip 临时目录）
│  └─ app/
│     ├─ main.py                # FastAPI 应用、CORS、请求日志、前端静态托管
│     ├─ api/routes_market.py   # 行情路由
│     ├─ models/market.py       # 响应模型（Quote / IndexCard / MarketStats / MarketOverview ...）
│     ├─ core/
│     │  ├─ config.py           # 超时、并发、缓存时长等配置
│     │  ├─ cache.py            # 线程安全的 TTL 缓存
│     │  └─ utils.py            # 数值转换、格式化、板块判定、涨跌停价、交易时段
│     └─ services/
│        ├─ sina_client.py      # 新浪行情接口客户端（重试、分页、并发全市场抓取）
│        └─ market_service.py   # 总览聚合、涨跌统计、榜单、搜索
└─ web/
   ├─ vite.config.ts            # /api 代理到后端
   ├─ public/theme-init.js      # 首屏主题脚本（防闪烁，不参与打包）
   └─ src/
      ├─ App.tsx                # 页面路由（hash）与共享数据
      ├─ router.ts              # 极简 hash 路由：#/ 看板、#/settings 展示设置
      ├─ pages/
      │  ├─ DashboardPage.tsx   # 看板页：按布局配置渲染卡片
      │  ├─ SettingsPage.tsx    # 展示设置页：卡片顺序与显隐
      │  └─ StockDetailPage.tsx # 个股详情页：实时资金流 + 分时/日K
      ├─ components/charts/     # IntradayChart / KLineChart / MoneyFlowPanel
      │                         # PriceChartPanel / chartUtils（SVG 手写，无图表库）
      ├─ hooks/                 # useMarket（总览/搜索）、useWatchlist、useStockDetail
      ├─ theme/                 # ThemeProvider、useTheme、主题/字号/行数/布局
      ├─ styles/theme.css       # 全局 CSS 变量（明/暗两套 + 根字号）与基础样式
      ├─ components/            # AppHeader / TopControls / IndexBoard / WatchList
      │                         # FlowList / RankList / MarketBreadth / MarketMetrics
      │                         # ThemeToggle / FontScaleToggle / RowCountToggle
      ├─ types/market.ts        # 与后端模型对应的类型
      └─ utils/format.ts        # 涨跌配色、时间与代码格式化
```

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/market/overview?limit=10` | 总览看板聚合数据（指数 + 统计 + 资金流榜 + 涨幅榜 + 成交量榜 + 板块榜） |
| GET | `/api/market/indices` | 主要指数行情 |
| GET | `/api/market/sectors?kind=industry&limit=10` | 板块涨幅榜（kind=industry 行业 / concept 概念） |
| GET | `/api/market/fund-flow?order=desc&limit=20` | 主力资金榜（desc 净流入 / asc 净流出） |
| GET | `/api/market/rank?sort_by=volume&order=desc&limit=20` | 排行榜（含 change_percent/amount/volume/main_net_inflow） |
| GET | `/api/market/search?keyword=茅台` | 标的搜索 |
| GET | `/api/market/quotes?codes=sh600519,sz300750` | 批量行情（自选列表用，返回顺序与入参一致） |
| GET | `/api/market/watchlist/default` | 自选股默认清单 |
| GET | `/api/market/quote/{code}` | 单只标的实时行情，如 `sh600519` |
| GET | `/api/market/detail/{code}` | 个股详情聚合（快照 + 分时 + 实时资金流） |
| GET | `/api/market/money-flow/{code}` | 个股实时资金流（超大单/大单/中单/小单，前端每 10 秒轮询） |
| GET | `/api/market/kline/{code}?period=day&limit=60` | K 线（前复权，period=day/week/month） |

### 数据源与字段约定

- 请求地址：`hq.sinajs.cn`（批量行情，单次最多 150 只）与 `vip.stock.finance.sina.com.cn`（列表/榜单，每页 100 条）
- 全市场快照约 5,570 只标的，8 线程并发抓取约 2 秒
- 单位约定：`volume` 为**股**，`amount` 为**元**；新浪列表接口的 `mktcap`/`nmc` 为**万元**，后端已统一换算为元
- 指数成交量数据源以「手」返回，与个股「股」量级等价，已在格式化层区分处理
- 涨跌停按板块判定：主板 10%、创业板/科创板 20%、北交所 30%、ST 股主板 5%
- 缓存策略：指数 5s、榜单 15s、全市场快照 30s、自选行情 5s、标的清单与代码索引 12h（缓存实现在 `core/cache.py`）
- 行情快照接口（`hq.sinajs.cn`）不含换手率与估值，因此自选列表会用列表接口的全市场清单做一次字段补齐

## 后续规划

- [ ] 个股详情页：分时图、五色盘口、日/周/月 K 线
- [ ] K 线数据源接入（腾讯 `web.ifzq.gtimg.cn` 的 fqkline 接口已验证可用）
- [ ] 榜单行点击跳转个股详情，支持板块/市场筛选
- [ ] 展示设置支持拖拽排序与更多卡片（资金流净流出榜、成交额榜接口已就绪）
- [ ] 资金流榜支持查看 5 日 / 10 日周期（数据源另有对应接口）
- [ ] 自选股分组、拖拽排序与到价提醒
- [ ] 在界面上暴露「跟随系统」主题选项
- [ ] 显示设置改为可折叠面板，支持自定义字号
- [ ] 多数据源自动切换与降级（东方财富为主、新浪/腾讯备用）
- [ ] 数据落盘（SQLite / Parquet）与历史行情批量回补

## 开发环境注意事项

本项目在受限沙箱环境下搭建，有两处与常规流程不同，已做兼容：

1. **依赖安装位置**：`pip` 的临时目录不可写时会安装失败，因此 `backend/tools/bootstrap_deps.py` 直接从镜像下载 wheel 并用 `zipfile` 解包到 `backend/.venv`，`run.py` 启动时自动加载该目录。
2. **Vite 启动**：沙箱禁止为「被捕获输出」的子进程建立管道，而 Vite 启动时会用 `net use` 探测盘符类型。`web/scripts/dev-preload.mjs` 会把这类探测替换为固定结果（仅拦截只读探测命令，其余命令照常执行），`dev.py` 启动前端时会自动带上该预加载。

### 常见启动报错

| 报错 | 原因 | 解决 |
| --- | --- | --- |
| `ERR_UNSUPPORTED_ESM_URL_SCHEME`（protocol 'd:'） | 给 `node --import` 传了 Windows 绝对路径 | 用相对路径或 `file://` URL；`dev.py` 已自动处理 |
| `spawn EPERM`（Vite 启动时） | 受限环境禁止子进程管道 | 用 `dev.py` 或带 `--import ./scripts/dev-preload.mjs` 启动 |
| `端口已被占用` / `EADDRINUSE` | 8000 或 5173 已被其他进程占用 | 关掉旧进程，或设 `ASHARE_API_PORT` / `ASHARE_WEB_PORT` |
| `未找到 uvicorn` | 后端依赖未安装 | `python backend/tools/bootstrap_deps.py` |
| GitHub 推送超时 | 需要代理但代理未开 | 开代理后 `git config --local http.proxy http://127.0.0.1:7897`；不用代理则 `--unset` |

## 免责声明

行情数据来自第三方公开接口，仅供学习与研究使用，可能存在延迟或误差，**不构成任何投资建议**。
