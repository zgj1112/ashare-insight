"""项目级配置。"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# 缓存目录，用于落盘个股列表等低频数据
CACHE_DIR = DATA_DIR / "cache"

# HTTP 请求
REQUEST_TIMEOUT = float(os.getenv("ASHARE_HTTP_TIMEOUT", "12"))
REQUEST_RETRIES = int(os.getenv("ASHARE_HTTP_RETRIES", "2"))
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# 缓存时长（秒）
TTL_INDEX_QUOTE = 5
TTL_RANK = 15
TTL_SNAPSHOT = 30
TTL_STOCK_LIST = 12 * 60 * 60
TTL_WATCH_QUOTE = 5

# 自选股默认清单（前端首次访问时使用，之后以浏览器本地记录为准）
DEFAULT_WATCHLIST = ["sh600519", "sz300750"]

# 自选股数量上限，避免单次批量行情请求过大
WATCHLIST_MAX = 60

# 涨幅榜上限：超过该涨跌幅的标的（如 20cm 涨停）不纳入榜单
GAINERS_MAX_PERCENT = 11.0

# 榜单一次取多少条（取多一些以便过滤后仍有足够展示数量）
RANK_FETCH_SIZE = 60

# 资金流榜需要过滤掉的非个股代码前缀（ETF / 基金 / 债券 / 回购）
FUND_FLOW_EXCLUDE_PREFIXES = ("51", "56", "58", "15", "16", "11", "12", "13", "18")

# 全市场快照并发线程数
SNAPSHOT_WORKERS = int(os.getenv("ASHARE_SNAPSHOT_WORKERS", "8"))

# 单页最大条数（数据源限制）
PAGE_SIZE = 100
