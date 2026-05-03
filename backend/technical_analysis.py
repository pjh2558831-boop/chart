from __future__ import annotations

import math
from statistics import mean, pstdev
from typing import Any


MIN_CANDLE_COUNT = 30


def _round(value: float | None, digits: int = 4) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return round(float(value), digits)


def _safe_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def validate_ohlcv(ohlcv: list[dict[str, Any]]) -> dict[str, int | bool | str | None]:
    candle_count = len(ohlcv)
    warning = None
    if candle_count < MIN_CANDLE_COUNT:
        warning = "캔들 수가 30개 미만이라 기술적 분석 신뢰도가 낮습니다."
    elif candle_count < 60:
        warning = "캔들 수가 60개 미만이라 일부 장기 지표와 지지/저항 후보가 제한적입니다."

    return {
        "candleCount": candle_count,
        "isEnoughData": candle_count >= MIN_CANDLE_COUNT,
        "warning": warning,
    }


def _extract_prices(ohlcv: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for item in ohlcv:
        value = _safe_float(item.get(key))
        if value is not None:
            values.append(value)
    return values


def get_close_prices(ohlcv: list[dict[str, Any]]) -> list[float]:
    return _extract_prices(ohlcv, "close")


def get_high_prices(ohlcv: list[dict[str, Any]]) -> list[float]:
    return _extract_prices(ohlcv, "high")


def get_low_prices(ohlcv: list[dict[str, Any]]) -> list[float]:
    return _extract_prices(ohlcv, "low")


def get_volumes(ohlcv: list[dict[str, Any]]) -> list[float]:
    return _extract_prices(ohlcv, "volume")


def calculate_sma(values: list[float], window: int) -> float | None:
    if len(values) < window or window <= 0:
        return None
    return _round(sum(values[-window:]) / window)


def calculate_ema_series(values: list[float], window: int) -> list[float]:
    if not values or window <= 0:
        return []

    multiplier = 2 / (window + 1)
    ema_values = [float(values[0])]
    for value in values[1:]:
        ema_values.append((float(value) - ema_values[-1]) * multiplier + ema_values[-1])
    return ema_values


def _rsi_value(closes: list[float], window: int) -> float | None:
    if len(closes) <= window:
        return None

    gains: list[float] = []
    losses: list[float] = []
    for previous, current in zip(closes[-window - 1 : -1], closes[-window:]):
        change = current - previous
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))

    average_gain = sum(gains) / window
    average_loss = sum(losses) / window
    if average_loss == 0:
        return 100.0

    relative_strength = average_gain / average_loss
    return 100 - (100 / (1 + relative_strength))


def calculate_rsi(closes: list[float], window: int = 14) -> dict[str, float | str | None]:
    current_rsi = _rsi_value(closes, window)
    if current_rsi is None:
        return {
            "value": None,
            "status": "insufficient_data",
            "interpretation": "RSI 계산에 필요한 종가 데이터가 부족합니다.",
        }

    previous_rsi = _rsi_value(closes[:-1], window)
    status = "neutral"
    interpretation = "RSI가 중립 구간에 있습니다."

    if current_rsi >= 70:
        status = "overbought"
        interpretation = "RSI가 과열 구간에 있습니다."
    elif current_rsi <= 30:
        status = "oversold"
        interpretation = "RSI가 과매도 구간에 있습니다."
    elif previous_rsi is not None and previous_rsi <= 30 < current_rsi:
        status = "rebound_candidate"
        interpretation = "RSI가 과매도권에서 회복되는 흐름입니다."

    return {"value": _round(current_rsi, 2), "status": status, "interpretation": interpretation}


def calculate_macd(closes: list[float]) -> dict[str, float | str | None]:
    if len(closes) < 26:
        return {
            "macd": None,
            "signal": None,
            "histogram": None,
            "status": "insufficient_data",
            "interpretation": "MACD 계산에 필요한 종가 데이터가 부족합니다.",
        }

    ema12 = calculate_ema_series(closes, 12)
    ema26 = calculate_ema_series(closes, 26)
    macd_series = [short - long for short, long in zip(ema12, ema26)]
    signal_series = calculate_ema_series(macd_series, 9)

    if len(macd_series) < 2 or len(signal_series) < 2:
        return {
            "macd": None,
            "signal": None,
            "histogram": None,
            "status": "insufficient_data",
            "interpretation": "MACD Signal 계산에 필요한 데이터가 부족합니다.",
        }

    previous_macd = macd_series[-2]
    previous_signal = signal_series[-2]
    current_macd = macd_series[-1]
    current_signal = signal_series[-1]
    histogram = current_macd - current_signal

    if previous_macd <= previous_signal and current_macd > current_signal:
        status = "bullish_cross"
        interpretation = "MACD가 Signal을 상향 돌파했습니다."
    elif previous_macd >= previous_signal and current_macd < current_signal:
        status = "bearish_cross"
        interpretation = "MACD가 Signal을 하향 이탈했습니다."
    elif current_macd > current_signal:
        status = "bullish"
        interpretation = "MACD가 Signal 위에 있어 상향 흐름입니다."
    elif current_macd < current_signal:
        status = "bearish"
        interpretation = "MACD가 Signal 아래에 있어 하향 흐름입니다."
    else:
        status = "neutral"
        interpretation = "MACD와 Signal이 비슷한 구간입니다."

    return {
        "macd": _round(current_macd),
        "signal": _round(current_signal),
        "histogram": _round(histogram),
        "status": status,
        "interpretation": interpretation,
    }


def calculate_bollinger_bands(
    closes: list[float],
    window: int = 20,
    num_std: float = 2.0,
) -> dict[str, float | str | None]:
    if len(closes) < window:
        return {
            "upper": None,
            "middle": None,
            "lower": None,
            "position": "insufficient_data",
            "interpretation": "볼린저밴드 계산에 필요한 종가 데이터가 부족합니다.",
        }

    recent = closes[-window:]
    middle = mean(recent)
    deviation = pstdev(recent)
    upper = middle + deviation * num_std
    lower = middle - deviation * num_std
    current = closes[-1]

    if current > upper:
        position = "above_upper"
        interpretation = "현재가가 볼린저밴드 상단 위에 있습니다."
    elif current < lower:
        position = "below_lower"
        interpretation = "현재가가 볼린저밴드 하단 아래에 있습니다."
    elif upper == lower:
        position = "middle"
        interpretation = "볼린저밴드 폭이 매우 좁습니다."
    else:
        location = (current - lower) / (upper - lower)
        if location <= 0.2:
            position = "near_lower"
            interpretation = "현재가는 볼린저밴드 하단에 가까운 구간입니다."
        elif location >= 0.8:
            position = "near_upper"
            interpretation = "현재가는 볼린저밴드 상단에 가까운 구간입니다."
        else:
            position = "middle"
            interpretation = "현재가는 볼린저밴드 중간 구간에 있습니다."

    return {
        "upper": _round(upper),
        "middle": _round(middle),
        "lower": _round(lower),
        "position": position,
        "interpretation": interpretation,
    }


def find_recent_high_low(ohlcv: list[dict[str, Any]], lookback: int = 60) -> dict[str, float | str | None]:
    if not ohlcv:
        return {"recentHigh": None, "recentHighDate": None, "recentLow": None, "recentLowDate": None}

    recent = ohlcv[-lookback:]
    high_item = max(recent, key=lambda item: float(item.get("high") or 0))
    low_item = min(recent, key=lambda item: float(item.get("low") or 0))

    return {
        "recentHigh": _round(_safe_float(high_item.get("high"))),
        "recentHighDate": str(high_item.get("date") or ""),
        "recentLow": _round(_safe_float(low_item.get("low"))),
        "recentLowDate": str(low_item.get("date") or ""),
    }


def calculate_volume_average(ohlcv: list[dict[str, Any]]) -> dict[str, float | str | None]:
    volumes = get_volumes(ohlcv)
    if len(volumes) < 20:
        return {
            "recentAverageVolume": None,
            "baseAverageVolume": None,
            "ratio": None,
            "status": "insufficient_data",
            "interpretation": "거래량 평균 계산에 필요한 데이터가 부족합니다.",
        }

    recent_average = sum(volumes[-5:]) / 5
    base_average = sum(volumes[-20:]) / 20
    ratio = recent_average / base_average if base_average else None

    status = "neutral"
    interpretation = "최근 거래량은 평균과 비슷한 수준입니다."
    if ratio is not None and ratio >= 1.3:
        status = "increasing"
        interpretation = "최근 거래량이 평균 대비 증가했습니다."
    elif ratio is not None and ratio <= 0.7:
        status = "decreasing"
        interpretation = "최근 거래량이 평균 대비 감소했습니다."

    return {
        "recentAverageVolume": _round(recent_average, 2),
        "baseAverageVolume": _round(base_average, 2),
        "ratio": _round(ratio, 2),
        "status": status,
        "interpretation": interpretation,
    }


def _merge_nearby_levels(levels: list[float], threshold_ratio: float = 0.015) -> list[float]:
    merged: list[float] = []
    for level in sorted(levels):
        if not merged:
            merged.append(level)
            continue

        previous = merged[-1]
        if previous and abs(level - previous) / previous <= threshold_ratio:
            merged[-1] = (previous + level) / 2
        else:
            merged.append(level)

    return merged


def generate_support_resistance(ohlcv: list[dict[str, Any]]) -> dict[str, list[float] | float | None]:
    if len(ohlcv) < 5:
        return {
            "supportLevels": [],
            "resistanceLevels": [],
            "nearestSupport": None,
            "nearestResistance": None,
        }

    recent = ohlcv[-60:]
    current_price = float(recent[-1]["close"])
    lows: list[float] = []
    highs: list[float] = []

    for index in range(1, len(recent) - 1):
        previous = recent[index - 1]
        current = recent[index]
        following = recent[index + 1]
        low = float(current["low"])
        high = float(current["high"])

        if low <= float(previous["low"]) and low <= float(following["low"]):
            lows.append(low)
        if high >= float(previous["high"]) and high >= float(following["high"]):
            highs.append(high)

    supports = [level for level in _merge_nearby_levels(lows) if level < current_price]
    resistances = [level for level in _merge_nearby_levels(highs) if level > current_price]
    supports = sorted(supports, key=lambda level: abs(current_price - level))[:3]
    resistances = sorted(resistances, key=lambda level: abs(current_price - level))[:3]

    rounded_supports = [_round(level, 4) or 0 for level in supports]
    rounded_resistances = [_round(level, 4) or 0 for level in resistances]

    return {
        "supportLevels": rounded_supports,
        "resistanceLevels": rounded_resistances,
        "nearestSupport": rounded_supports[0] if rounded_supports else None,
        "nearestResistance": rounded_resistances[0] if rounded_resistances else None,
    }


def run_technical_analysis(ohlcv: list[dict[str, Any]]) -> dict[str, Any]:
    closes = get_close_prices(ohlcv)
    data_quality = validate_ohlcv(ohlcv)
    latest_close = closes[-1] if closes else None

    return {
        "latestClose": _round(latest_close),
        "movingAverages": {
            "ma5": calculate_sma(closes, 5),
            "ma20": calculate_sma(closes, 20),
            "ma60": calculate_sma(closes, 60),
            "ma120": calculate_sma(closes, 120),
        },
        "rsi": calculate_rsi(closes),
        "macd": calculate_macd(closes),
        "bollingerBands": calculate_bollinger_bands(closes),
        "recentHighLow": find_recent_high_low(ohlcv),
        "volume": calculate_volume_average(ohlcv),
        "supportResistance": generate_support_resistance(ohlcv),
        "dataQuality": data_quality,
    }
