from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException


_REQUESTS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def _env_int(name: str, default: int, minimum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return max(value, minimum)


def check_rate_limit(key: str) -> None:
    window_seconds = _env_int("RATE_LIMIT_WINDOW_SECONDS", 60, 1)
    max_requests = _env_int("RATE_LIMIT_MAX_REQUESTS", 5, 1)
    now = time.monotonic()
    cutoff = now - window_seconds

    with _LOCK:
        bucket = _REQUESTS[key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
            )

        bucket.append(now)
