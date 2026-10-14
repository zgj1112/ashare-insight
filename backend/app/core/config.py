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

# 全市场快照并发线程数
SNAPSHOT_WORKERS = int(os.getenv("ASHARE_SNAPSHOT_WORKERS", "8"))

# 单页最大条数（数据源限制）
PAGE_SIZE = 100
