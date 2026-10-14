"""一键启动开发环境：后端 API + 前端开发服务器。

用法:
    python dev.py              # 同时启动前后端，Ctrl+C 全部退出
    python dev.py --backend    # 只启动后端
    python dev.py --web        # 只启动前端

说明:
    项目依赖安装在 backend/.venv 内（沙箱环境下 pip 无法写入用户目录），
    backend/run.py 会自动把该目录加入模块搜索路径。
"""

from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
WEB_DIR = ROOT / "web"
VENV_SITE = BACKEND_DIR / ".venv" / "Lib" / "site-packages"
NODE_MODULES = WEB_DIR / "node_modules"
PRELOAD = WEB_DIR / "scripts" / "dev-preload.mjs"

API_HOST = os.getenv("ASHARE_API_HOST", "127.0.0.1")
API_PORT = os.getenv("ASHARE_API_PORT", "8000")
WEB_PORT = os.getenv("ASHARE_WEB_PORT", "5173")


def _node_executable() -> str:
    """优先使用打包运行时里的 node，找不到再退回 PATH 上的 node。"""
    candidates = [
        os.getenv("ASHARE_NODE", ""),
        r"C:\Users\zgj\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return "node"


def _check(condition: bool, message: str, hint: str) -> bool:
    if condition:
        return True
    print(f"[错误] {message}")
    print(f"        {hint}")
    return False


def start_backend() -> subprocess.Popen:
    print(f"[启动] 后端 API  http://{API_HOST}:{API_PORT}  (文档 /docs)")
    return subprocess.Popen(
        [sys.executable, "run.py", "--host", API_HOST, "--port", API_PORT],
        cwd=BACKEND_DIR,
    )


def start_web() -> subprocess.Popen:
    node = _node_executable()
    command = [node]
    if PRELOAD.exists():
        command += ["--import", str(PRELOAD)]
    command += [str(NODE_MODULES / "vite" / "bin" / "vite.js"), "--port", WEB_PORT, "--strictPort"]
    print(f"[启动] 前端页面  http://{API_HOST}:{WEB_PORT}")
    return subprocess.Popen(command, cwd=WEB_DIR)


def main() -> int:
    parser = argparse.ArgumentParser(description="启动 A 股行情项目开发环境")
    parser.add_argument("--backend", action="store_true", help="只启动后端")
    parser.add_argument("--web", action="store_true", help="只启动前端")
    args = parser.parse_args()

    only_backend = args.backend and not args.web
    only_web = args.web and not args.backend

    if not only_web and not _check(
        VENV_SITE.exists(),
        "后端依赖未安装",
        "请先执行: python backend/tools/bootstrap_deps.py",
    ):
        return 1
    if not only_backend and not _check(
        NODE_MODULES.exists(),
        "前端依赖未安装",
        "请先在 web 目录执行: npm install",
    ):
        return 1

    processes: list[subprocess.Popen] = []
    if not only_web:
        processes.append(start_backend())
    if not only_backend:
        processes.append(start_web())

    print("\n按 Ctrl+C 停止全部服务\n")

    def shutdown(*_args) -> None:
        print("\n[停止] 正在关闭服务 ...")
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                process.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # 任一进程退出即整体退出，避免留下孤儿进程
    try:
        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    print(f"[退出] 有服务已停止（退出码 {code}），一并关闭其余服务")
                    shutdown()
            time.sleep(0.6)
    except KeyboardInterrupt:
        shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
