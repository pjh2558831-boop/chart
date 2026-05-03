from __future__ import annotations

from datetime import datetime
import math
import re
from typing import Any

import yfinance as yf


MIN_CANDLE_COUNT = 30


def should_run_market_validation(symbol_detection: dict[str, Any]) -> tuple[bool, str | None]:
    ticker = (symbol_detection.get("detectedTicker") or "").strip()
    market = (symbol_detection.get("detectedMarket") or "UNKNOWN").upper()
    confidence = (symbol_detection.get("confidence") or "low").lower()

    if not ticker:
        return False, "symbol_not_detected"
    if confidence == "low":
        return False, "low_confidence_symbol"
    if market == "UNKNOWN":
        return False, "unknown_market"
    if market not in {"KR", "US"}:
        return False, "unsupported_market"

    return True, None


def map_timeframe_to_yfinance(timeframe_estimate: str) -> dict[str, str | None]:
    value = timeframe_estimate or ""

    if "월봉" in value:
        return {"interval": "1mo", "period": "5y", "warning": None}
    if "주봉" in value:
        return {"interval": "1wk", "period": "2y", "warning": None}
    if "4시간" in value or "4h" in value.lower():
        return {
            "interval": "1h",
            "period": "3mo",
            "warning": "4시간봉은 yfinance에서 직접 조회하지 않고 1시간봉 데이터로 대체했습니다.",
        }
    if "1시간" in value or "1h" in value.lower():
        return {"interval": "1h", "period": "3mo", "warning": None}
    if "분봉" in value or "15m" in value.lower():
        return {"interval": "15m", "period": "1mo", "warning": None}
    if "일봉" in value:
        return {"interval": "1d", "period": "6mo", "warning": None}

    return {
        "interval": "1d",
        "period": "6mo",
        "warning": "시간봉 추정이 불명확하여 일봉 6개월 데이터로 검증했습니다.",
    }


def build_yfinance_candidates(detected_ticker: str, detected_market: str) -> list[str]:
    ticker = detected_ticker.strip().upper()
    market = detected_market.strip().upper()

    if market == "KR":
        digits = re.sub(r"\D", "", ticker)
        if not re.fullmatch(r"\d{6}", digits):
            raise ValueError("한국 종목 검증에는 6자리 숫자 티커가 필요합니다.")
        return [f"{digits}.KS", f"{digits}.KQ"]

    if market == "US":
        if not re.fullmatch(r"[A-Z0-9.-]+", ticker):
            raise ValueError("미국 종목 티커 형식이 올바르지 않습니다.")
        return [ticker]

    raise ValueError("지원하지 않는 시장입니다.")


def _is_finite_number(value: Any) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _format_date(index_value: Any) -> str:
    if hasattr(index_value, "to_pydatetime"):
        return index_value.to_pydatetime().date().isoformat()
    if isinstance(index_value, datetime):
        return index_value.date().isoformat()
    return str(index_value)[:10]


def _history_to_ohlcv(history: Any) -> list[dict[str, float | int | str]]:
    rows: list[dict[str, float | int | str]] = []

    for index_value, row in history.iterrows():
        open_value = row.get("Open")
        high_value = row.get("High")
        low_value = row.get("Low")
        close_value = row.get("Close")
        volume_value = row.get("Volume")

        if not all(_is_finite_number(value) for value in [open_value, high_value, low_value, close_value]):
            continue

        volume = int(float(volume_value)) if _is_finite_number(volume_value) else 0
        rows.append(
            {
                "date": _format_date(index_value),
                "open": round(float(open_value), 4),
                "high": round(float(high_value), 4),
                "low": round(float(low_value), 4),
                "close": round(float(close_value), 4),
                "volume": volume,
            }
        )

    return rows


def fetch_ohlcv_from_candidates(candidates: list[str], period: str, interval: str) -> dict[str, Any]:
    errors: list[str] = []

    for candidate in candidates:
        try:
            history = yf.Ticker(candidate).history(period=period, interval=interval, auto_adjust=False)
            ohlcv = _history_to_ohlcv(history)
            if ohlcv:
                return {
                    "resolvedSymbol": candidate,
                    "period": period,
                    "interval": interval,
                    "ohlcv": ohlcv,
                }
            errors.append(f"{candidate}: 데이터 없음")
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    raise ValueError("yfinance에서 OHLCV 데이터를 조회하지 못했습니다. " + " / ".join(errors))


def validate_ohlcv_data(ohlcv: list[dict[str, Any]]) -> dict[str, int | bool | str | None]:
    candle_count = len(ohlcv)
    is_enough_data = candle_count >= MIN_CANDLE_COUNT

    return {
        "candleCount": candle_count,
        "isEnoughData": is_enough_data,
        "warning": None if is_enough_data else "캔들 수가 30개 미만이라 기술적 분석을 건너뜁니다.",
    }
