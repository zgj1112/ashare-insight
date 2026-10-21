"""Vercel Python Function 入口。

Vercel 的 Python Runtime 会读取本文件里的 `app` 变量（ASGI 应用），
把 /api/* 的请求交给 FastAPI 处理。仓库通过 vercel.json 配置了
`/api/(.*) -> /api/index` 的改写，因此前端同源调用无需跨域。

本地静态文件（web/dist）由 Vercel CDN 直接服务，不会走到这个函数。
"""

import sys
from pathlib import Path

# 把 backend 目录加入模块搜索路径（backend/app 是 FastAPI 应用本体）
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# 本地 .venv 仅存在于开发机，Vercel 上由 requirements.txt 安装，存在才加载
LOCAL_SITE = BACKEND_DIR / ".venv" / "Lib" / "site-packages"
if LOCAL_SITE.exists():
    sys.path.insert(0, str(LOCAL_SITE))

from app.main import app  # noqa: E402  (Vercel Python Runtime 依赖此变量)
