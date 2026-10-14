# A 股行情数据项目（ashare-insight）

一个用于获取 A 股股票交易数据的项目，当前已完成**第一个页面：行情总览看板**。

- 后端：Python + FastAPI（行情抓取、缓存、统计聚合）
- 前端：React 19 + Vite + TypeScript（深色行情看板，涨红跌绿）
- 数据源：新浪财经公开行情接口（东财接口在部分网络下会被断连，见文末规划）

## 页面预览

![行情总览看板](docs/screenshot-dashboard.png)

看板包含：

1. **指数卡片**：上证指数、深证成指、创业板指、科创50、沪深300、上证50 的实时点位、涨跌幅、开高低与成交额
2. **涨幅榜 / 跌幅榜**：全市场排序前 10 名，含最新价、涨跌幅、成交额
3. **市场情绪**：上涨/下跌/平盘家数、涨停/跌停/停牌数量、上涨占比与红绿分布条
4. **市场概览**：全市场平均涨跌幅、中位数涨跌幅、上涨占比、涨跌家数比
5. **成交额榜**：成交金额前 10 名，附换手率
6. **搜索**：支持 6 位代码（`600519`）或中文名称（`茅台`）实时检索

顶部显示交易状态（交易中/午间休市/已收盘）、数据时间，页面每 30 秒自动刷新，也可手动刷新。

## 快速开始

### 一键启动（推荐）

```bash
python dev.py            # 同时启动后端与前端
python dev.py --backend  # 只启动后端
python dev.py --web      # 只启动前端
```

启动后访问：

| 地址 | 说明 |
| --- | --- |
| http://127.0.0.1:5173 | 前端页面（Vite 开发服务器，含热更新） |
| http://127.0.0.1:8000/docs | 后端接口文档（Swagger UI） |
| http://127.0.0.1:8000/api/market/overview | 总览看板聚合接口 |

### 分步启动

```bash
# 1) 安装后端依赖（依赖会装到 backend/.venv 内）
python backend/tools/bootstrap_deps.py

# 2) 启动后端
cd backend && python run.py --port 8000

# 3) 安装并启动前端
cd web && npm install && npm run dev
```

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
   └─ src/
      ├─ App.tsx                # 看板页面组装
      ├─ api/market.ts          # 接口封装
      ├─ hooks/useMarket.ts     # 数据获取、自动刷新、搜索防抖
      ├─ components/            # AppHeader / IndexBoard / RankList / MarketBreadth / MarketMetrics
      ├─ types/market.ts        # 与后端模型对应的类型
      └─ utils/format.ts        # 涨跌配色、时间与代码格式化
```

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/market/overview` | 总览看板聚合数据（指数 + 统计 + 三个榜单） |
| GET | `/api/market/indices` | 主要指数行情 |
| GET | `/api/market/rank?sort_by=amount&order=desc&limit=20` | 排行榜 |
| GET | `/api/market/search?keyword=茅台` | 标的搜索 |
| GET | `/api/market/quote/{code}` | 单只标的实时行情，如 `sh600519` |
| GET | `/api/market/kline/{code}` | K 线数据（**接口已占位，数据源待接入**） |

### 数据源与字段约定

- 请求地址：`hq.sinajs.cn`（批量行情，单次最多 150 只）与 `vip.stock.finance.sina.com.cn`（列表/榜单，每页 100 条）
- 全市场快照约 5,570 只标的，8 线程并发抓取约 2 秒
- 单位约定：`volume` 为**股**，`amount` 为**元**；新浪列表接口的 `mktcap`/`nmc` 为**万元**，后端已统一换算为元
- 指数成交量数据源以「手」返回，与个股「股」量级等价，已在格式化层区分处理
- 涨跌停按板块判定：主板 10%、创业板/科创板 20%、北交所 30%、ST 股主板 5%
- 缓存策略：指数 5s、榜单 15s、全市场快照 30s、标的清单 12h（缓存实现在 `core/cache.py`）

## 开发环境注意事项

本项目在受限沙箱环境下搭建，有两点与常规流程不同，已做兼容：

1. **依赖安装位置**：`pip` 的临时目录不可写时会安装失败，因此 `backend/tools/bootstrap_deps.py` 直接从镜像下载 wheel 并用 `zipfile` 解包到 `backend/.venv`，`run.py` 启动时自动加载该目录。
2. **Vite 启动**：沙箱禁止为「被捕获输出」的子进程建立管道，而 Vite 启动时会用 `net use` 探测盘符类型。`web/scripts/dev-preload.mjs` 会把这类探测替换为固定结果（仅拦截只读探测命令，其余命令照常执行），`npm run dev:sandbox` 会带上该预加载。

## 后续规划

- [ ] 个股详情页：分时图、五色盘口、日/周/月 K 线
- [ ] K 线数据源接入（腾讯 `web.ifzq.gtimg.cn` 的 fqkline 接口已验证可用）
- [ ] 榜单行点击跳转个股详情，支持板块/市场筛选
- [ ] 自选股分组、本地持久化与到价提醒
- [ ] 多数据源自动切换与降级（东方财富为主、新浪/腾讯备用）
- [ ] 数据落盘（SQLite / Parquet）与历史行情批量回补

## 免责声明

行情数据来自第三方公开接口，仅供学习与研究使用，可能存在延迟或误差，**不构成任何投资建议**。
