from __future__ import annotations

from contextlib import contextmanager
from time import perf_counter
from typing import Iterator


def now_ms() -> float:
    return perf_counter() * 1000


@contextmanager
def measure_step(name: str, timings: dict[str, float]) -> Iterator[None]:
    started_at = now_ms()
    try:
        yield
    finally:
        timings[name] = round(now_ms() - started_at, 2)


def build_performance_report(timings: dict[str, float]) -> dict[str, float]:
    report = {
        "totalMs": timings.get("totalMs", 0.0),
        "imageReadMs": timings.get("imageReadMs", 0.0),
        "imageProcessingMs": timings.get("imageProcessingMs", 0.0),
        "cacheLookupMs": timings.get("cacheLookupMs", 0.0),
        "aiRequestMs": timings.get("aiRequestMs", 0.0),
        "postProcessMs": timings.get("postProcessMs", 0.0),
        "dbSaveMs": timings.get("dbSaveMs", 0.0),
    }
    return {key: round(value, 2) for key, value in report.items()}
