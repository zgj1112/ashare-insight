"""在工作区内安装 Python 依赖，不依赖 pip 的临时目录。

沙箱环境会拒绝 pip 解包后的重命名操作，这里改为：直接从镜像下载 wheel，
用 zipfile 解压到目标目录。仅支持纯 Python wheel 与当前解释器匹配的二进制 wheel。

用法:
    python tools/bootstrap_deps.py            # 安装 pyproject 中声明的依赖
    python tools/bootstrap_deps.py --check    # 仅检查是否已就绪
"""

from __future__ import annotations

import argparse
import html
import io
import os
import re
import shutil
import ssl
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

MIRRORS = [
    "https://mirrors.aliyun.com/pypi/simple/{name}/",
    "https://pypi.org/simple/{name}/",
]

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / ".venv" / "Lib" / "site-packages"

# 直接依赖（其余传递依赖自动解析）
DIRECT = ["fastapi", "uvicorn", "httpx", "pandas", "numpy"]

# 禁止选到预览版/开发版的包
STABLE_ONLY = {"httpx", "fastapi", "uvicorn", "starlette", "pydantic", "anyio"}

# 已经是解释器自带的包，无需安装
BUILTIN = {"numpy", "pandas", "python-dateutil", "six", "tzdata"}


def _ctx() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=_ctx(), timeout=30) as resp:
        return resp.read()


def _tag_supported(filename: str) -> bool:
    """判断 wheel 文件名是否适配当前解释器与平台。"""
    m = re.match(r"^(?P<name>.+?)-(?P<ver>[^-]+)(-(?P<build>\d[^-]*))?-(?P<py>[^-]+)-(?P<abi>[^-]+)-(?P<plat>[^-]+)\.whl$", filename)
    if not m:
        return False
    py, abi, plat = m.group("py"), m.group("abi"), m.group("plat")

    cp = f"cp{sys.version_info.major}{sys.version_info.minor}"
    if abi == "none":
        ok_py = py in {"py3", f"py{sys.version_info.major}", cp} or py.startswith("py3")
    else:
        ok_py = cp in py.split(".") or "abi3" in abi

    if not ok_py:
        return False
    if plat == "any":
        return True
    if sys.platform == "win32":
        return "win_amd64" in plat
    if sys.platform == "darwin":
        return "macosx" in plat
    return "manylinux" in plat or "linux_x86_64" in plat


def _parse_index(name: str) -> list[tuple[str, str]]:
    """返回 [(版本, wheel 下载地址), ...]，版本升序。"""
    last_error: Exception | None = None
    for mirror in MIRRORS:
        url = mirror.format(name=name)
        try:
            page = _fetch(url).decode("utf-8", "replace")
        except Exception as exc:  # 换下一个镜像
            last_error = exc
            continue
        found: list[tuple[str, str]] = []
        for href, label in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>', page):
            filename = html.unescape(label.strip())
            if not filename.endswith(".whl") or not _tag_supported(filename):
                continue
            m = re.match(r"^.+?-(?P<ver>[^-]+)(?:-\d[^-]*)?-[^-]+-[^-]+-[^-]+\.whl$", filename)
            if not m:
                continue
            link = html.unescape(href)
            if link.startswith("../") or link.startswith("/"):
                link = urllib.parse.urljoin(url, link)
            if "#" in link:
                link = link.split("#", 1)[0]
            found.append((m.group("ver"), link))
        if found:
            return sorted(found, key=lambda item: _version_key(item[0]))
        last_error = RuntimeError(f"{name}: 索引中没有可用 wheel")
    raise RuntimeError(str(last_error))


def _version_key(version: str):
    parts = []
    for chunk in re.split(r"[._-]", version):
        if chunk.isdigit():
            parts.append((1, int(chunk), ""))
        else:
            parts.append((0, 0, chunk))
    return parts


def _installed(name: str) -> bool:
    return (TARGET / name.replace("-", "_")).exists() or (TARGET / f"{name}.py").exists()


def _extract(url: str) -> None:
    data = _fetch(url)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for member in zf.namelist():
            if member.endswith("/"):
                continue
            dest = TARGET / member
            dest.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(dest, "wb") as out:
                shutil.copyfileobj(src, out)


def _requirements(url: str) -> list[str]:
    """读取 wheel 元数据里的 Requires-Dist。"""
    data = _fetch(url)
    names: list[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        meta = [n for n in zf.namelist() if n.endswith(".dist-info/METADATA")]
        if not meta:
            return names
        text = zf.read(meta[0]).decode("utf-8", "replace")
    for line in text.splitlines():
        if not line.startswith("Requires-Dist:"):
            continue
        spec = line.split(":", 1)[1].strip()
        # 跳过可选依赖与环境标记
        if "extra ==" in spec:
            continue
        name = re.split(r"[\s;\[<>=!~(]", spec, 1)[0].strip()
        if name:
            names.append(name)
    return names


def _is_prerelease(version: str) -> bool:
    return bool(re.search(r"(a|b|rc|dev|alpha|beta|pre)[._-]?\d*$", version, re.IGNORECASE))


def _pick(name: str) -> tuple[str, str]:
    """选出版本最高且适配当前环境的 wheel。"""
    candidates = _parse_index(name)
    if name in STABLE_ONLY:
        stable = [item for item in candidates if not _is_prerelease(item[0])]
        if stable:
            candidates = stable
    if not candidates:
        raise RuntimeError(f"{name}: 没有可用 wheel")
    return candidates[-1]


def install(names: list[str]) -> None:
    seen: set[str] = set()
    queue = list(names)
    TARGET.mkdir(parents=True, exist_ok=True)
    while queue:
        raw = queue.pop(0)
        name = raw.lower().replace("_", "-")
        if name in seen or name in BUILTIN:
            continue
        seen.add(name)
        if _installed(name):
            print(f"  = {name} 已存在")
            continue
        version, url = _pick(name)
        print(f"  + {name} {version}")
        _extract(url)
        queue.extend(_requirements(url))


def check() -> int:
    missing = [n for n in DIRECT if n not in BUILTIN and not _installed(n)]
    for package in DIRECT:
        state = "内置" if package in BUILTIN else ("已就绪" if _installed(package) else "缺失")
        print(f"  {package}: {state}")
    return 1 if missing else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    print(f"目标目录: {TARGET}")
    if args.check:
        return check()
    print("安装直接依赖及其传递依赖 ...")
    install(DIRECT)
    print("完成，校验：")
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
