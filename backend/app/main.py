"""A 股行情数据服务入口。"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.api.routes_market import router as market_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("ashare")

app = FastAPI(
    title="A 股行情数据服务",
    description="提供 A 股实时行情、涨跌统计与排行榜数据，数据源为新浪财经公开接口。",
    version="0.1.0",
)

# 前端开发服务器通过 Vite 代理访问，这里额外放开跨域便于直连调试
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - started) * 1000
    logger.info("%s %s -> %s (%.0fms)", request.method, request.url.path, response.status_code, elapsed)
    return response


@app.get("/api/health", tags=["system"], summary="健康检查")
def health() -> dict:
    return {"status": "ok", "service": "ashare-insight-api", "version": app.version}


app.include_router(market_router)

# 前端构建产物（web/dist）存在时由本服务一并托管，
# 这样只需启动一个服务即可访问页面，无需额外的静态服务器。
WEB_DIST = Path(__file__).resolve().parents[2] / "web" / "dist"


@app.get("/", include_in_schema=False)
def index():
    index_file = WEB_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        {
            "service": app.title,
            "version": app.version,
            "docs": "/docs",
            "hint": "前端尚未构建：请在 web 目录执行 npm run build，或使用 npm run dev 启动开发服务器",
        }
    )


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    """前端路由回退：静态资源存在则返回文件，否则交给 index.html。"""
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "接口不存在"}, status_code=404)
    candidate = (WEB_DIST / full_path).resolve()
    if WEB_DIST.exists() and candidate.is_file() and WEB_DIST.resolve() in candidate.parents:
        return FileResponse(candidate)
    index_file = WEB_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse({"detail": "前端尚未构建"}, status_code=404)
