"""开发/生产启动脚本。

沙箱环境下包管理器的临时目录不可写，依赖被安装在 backend/.venv 内，
这里在导入 uvicorn 之前把该目录加入 sys.path，避免依赖环境变量。

用法:
    python run.py                 # 默认 127.0.0.1:8000
    python run.py --port 8010     # 指定端口
    python run.py --reload        # 热重载
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
VENV_SITE = BACKEND_DIR / ".venv" / "Lib" / "site-packages"
RUNTIME_SITE = Path(sys.base_prefix) / "Lib" / "site-packages"


def _prepare_import_path() -> None:
    paths = [str(p) for p in (VENV_SITE, RUNTIME_SITE) if p.exists()]
    for candidate in reversed(paths):
        if candidate not in sys.path:
            sys.path.insert(0, candidate)
    # reload 模式下 uvicorn 会派生子进程，需要把路径同步到 PYTHONPATH
    if paths:
        existing = os.environ.get("PYTHONPATH", "")
        merged = os.pathsep.join(paths + ([existing] if existing else []))
        os.environ["PYTHONPATH"] = merged


def main() -> int:
    parser = argparse.ArgumentParser(description="启动 A 股行情数据服务")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true", help="代码变更自动重启")
    args = parser.parse_args()

    _prepare_import_path()
    os.chdir(BACKEND_DIR)
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    os.environ.setdefault("PYTHONUTF8", "1")

    try:
        import uvicorn
    except ModuleNotFoundError:
        print("未找到 uvicorn，请先执行: python tools/bootstrap_deps.py", file=sys.stderr)
        return 1

    print(f"API 文档: http://{args.host}:{args.port}/docs")
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
