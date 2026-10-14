"""带 TTL 的进程内缓存。"""

from __future__ import annotations

import threading
import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")


class TTLCache:
    """线程安全的懒加载缓存：命中直接返回，过期后重新计算。"""

    def __init__(self, ttl: float, name: str = "") -> None:
        self.ttl = ttl
        self.name = name
        self._lock = threading.Lock()
        self._value: Any = None
        self._expire_at: float = 0.0

    def get_or_load(self, loader: Callable[[], T]) -> T:
        now = time.time()
        if self._value is not None and now < self._expire_at:
            return self._value  # type: ignore[return-value]
        with self._lock:
            now = time.time()
            if self._value is not None and now < self._expire_at:
                return self._value  # type: ignore[return-value]
            value = loader()
            self._value = value
            self._expire_at = time.time() + self.ttl
            return value

    @property
    def age(self) -> float:
        """当前缓存值的年龄（秒）；未命中返回 0。"""
        if self._value is None:
            return 0.0
        return max(0.0, self.ttl - (self._expire_at - time.time()))

    def clear(self) -> None:
        """丢弃当前缓存值，下次读取时重新加载。"""
        with self._lock:
            self._value = None
            self._expire_at = 0.0
