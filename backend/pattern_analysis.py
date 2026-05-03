from __future__ import annotations

import math
from statistics import mean
from typing import Any, Callable

from schemas import PATTERN_DEFINITIONS, normalize_pattern_candidates
from technical_analysis import run_technical_analysis


SwingPoint = dict[str, Any]
Cluster = dict[str, Any]


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


def _unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def calculate_atr(ohlcv_data: list[dict[str, Any]], window: int = 14) -> float | None:
    if len(ohlcv_data) < window + 1:
        return None

    true_ranges: list[float] = []
    for index in range(1, len(ohlcv_data)):
        high = _safe_float(ohlcv_data[index].get("high"))
        low = _safe_float(ohlcv_data[index].get("low"))
        previous_close = _safe_float(ohlcv_data[index - 1].get("close"))
        if high is None or low is None or previous_close is None:
            continue
        true_ranges.append(max(high - low, abs(high - previous_close), abs(low - previous_close)))

    if len(true_ranges) < window:
        return None
    return _round(sum(true_ranges[-window:]) / window)


def detect_swing_points(ohlcv_data: list[dict[str, Any]], window: int = 2) -> dict[str, list[SwingPoint]]:
    swing_highs: list[SwingPoint] = []
    swing_lows: list[SwingPoint] = []

    if len(ohlcv_data) < window * 2 + 1:
        return {"highs": swing_highs, "lows": swing_lows}

    for index in range(window, len(ohlcv_data) - window):
        current = ohlcv_data[index]
        current_high = _safe_float(current.get("high"))
        current_low = _safe_float(current.get("low"))
        if current_high is None or current_low is None:
            continue

        left = ohlcv_data[index - window : index]
        right = ohlcv_data[index + 1 : index + window + 1]

        if all(current_high >= _safe_float(item.get("high")) for item in left + right if _safe_float(item.get("high")) is not None):
            swing_highs.append(
                {
                    "index": index,
                    "price": current_high,
                    "date": str(current.get("date") or ""),
                    "kind": "high",
                }
            )

        if all(current_low <= _safe_float(item.get("low")) for item in left + right if _safe_float(item.get("low")) is not None):
            swing_lows.append(
                {
                    "index": index,
                    "price": current_low,
                    "date": str(current.get("date") or ""),
                    "kind": "low",
                }
            )

    return {"highs": swing_highs, "lows": swing_lows}


def cluster_price_levels(points: list[SwingPoint], tolerance: float) -> list[Cluster]:
    if not points:
        return []

    sorted_points = sorted(points, key=lambda point: point["price"])
    clusters: list[Cluster] = []

    for point in sorted_points:
        if not clusters:
            clusters.append({"level": point["price"], "points": [point], "touches": 1})
            continue

        previous = clusters[-1]
        if abs(point["price"] - previous["level"]) <= tolerance:
            previous["points"].append(point)
            previous["touches"] = len(previous["points"])
            previous["level"] = sum(item["price"] for item in previous["points"]) / previous["touches"]
        else:
            clusters.append({"level": point["price"], "points": [point], "touches": 1})

    for cluster in clusters:
        cluster["level"] = _round(cluster["level"])
        cluster["latestIndex"] = max(point["index"] for point in cluster["points"])
        cluster["dates"] = [point["date"] for point in cluster["points"]]

    return sorted(clusters, key=lambda cluster: (-cluster["touches"], -cluster["latestIndex"]))


def calculate_trendline(points: list[SwingPoint]) -> dict[str, Any]:
    if len(points) < 2:
        return {"slope": None, "relativeSlope": None, "direction": "unknown", "line": None}

    recent = points[-3:] if len(points) >= 3 else points
    first = recent[0]
    last = recent[-1]
    distance = last["index"] - first["index"]
    if distance <= 0:
        return {"slope": None, "relativeSlope": None, "direction": "unknown", "line": None}

    slope = (last["price"] - first["price"]) / distance
    base_price = first["price"] if first["price"] else 1
    relative_slope = slope / base_price
    intercept = first["price"] - slope * first["index"]

    if relative_slope > 0.0012:
        direction = "up"
    elif relative_slope < -0.0012:
        direction = "down"
    else:
        direction = "flat"

    return {
        "slope": slope,
        "relativeSlope": relative_slope,
        "direction": direction,
        "line": {"slope": slope, "intercept": intercept},
    }


def _line_value(line: dict[str, Any] | None, index: int) -> float | None:
    if not line:
        return None
    slope = _safe_float(line.get("slope"))
    intercept = _safe_float(line.get("intercept"))
    if slope is None or intercept is None:
        return None
    return slope * index + intercept


def _touch_score(touches: int) -> int:
    if touches >= 4:
        return 15
    if touches == 3:
        return 12
    if touches == 2:
        return 8
    if touches == 1:
        return 4
    return 0


def _breakout_readiness_score(current_price: float | None, confirmation_level: float | None, tolerance: float) -> int:
    if current_price is None or confirmation_level is None or tolerance <= 0:
        return 0
    distance = abs(current_price - confirmation_level)
    if distance <= tolerance:
        return 15
    if distance <= tolerance * 2:
        return 10
    if distance <= tolerance * 4:
        return 5
    return 0


def _volume_score(indicators: dict[str, Any], breakout_ready: bool = False) -> int:
    volume = indicators.get("volume") or {}
    status = str(volume.get("status") or "").lower()
    ratio = _safe_float(volume.get("ratio"))
    if ratio is not None and ratio >= 1.3:
        return 15
    if status == "increasing":
        return 12 if breakout_ready else 10
    if status == "neutral":
        return 4
    return 0


def _indicator_confluence(direction: str, indicators: dict[str, Any], pattern_name: str) -> tuple[int, bool]:
    score = 0
    conflict = False

    rsi = indicators.get("rsi") or {}
    macd = indicators.get("macd") or {}
    moving_averages = indicators.get("movingAverages") or {}
    bollinger = indicators.get("bollingerBands") or {}
    volume = indicators.get("volume") or {}

    rsi_status = str(rsi.get("status") or "").lower()
    macd_status = str(macd.get("status") or "").lower()
    ma_status = str(moving_averages.get("status") or "").lower()
    band_position = str(bollinger.get("position") or "").lower()
    volume_status = str(volume.get("status") or "").lower()

    if direction == "upside_candidate":
        if rsi_status in {"rebound_candidate", "oversold"}:
            score += 3
        elif rsi_status == "overbought":
            conflict = True

        if macd_status in {"bullish_cross", "bullish"}:
            score += 3
        elif macd_status in {"bearish_cross", "bearish"}:
            conflict = True

        if ma_status in {"price_above_ma", "short_above_long"}:
            score += 2
        elif ma_status in {"price_below_ma", "short_below_long"}:
            conflict = True

        if band_position in {"near_lower", "middle"} and pattern_name in {"double_bottom", "inverse_head_and_shoulders"}:
            score += 1
        if volume_status == "increasing":
            score += 1
    elif direction == "downside_candidate":
        if rsi_status == "overbought":
            score += 3
        elif rsi_status in {"rebound_candidate", "oversold"}:
            conflict = True

        if macd_status in {"bearish_cross", "bearish"}:
            score += 3
        elif macd_status in {"bullish_cross", "bullish"}:
            conflict = True

        if ma_status in {"price_below_ma", "short_below_long"}:
            score += 2
        elif ma_status in {"price_above_ma", "short_above_long"}:
            conflict = True

        if band_position in {"near_upper", "above_upper"} and pattern_name in {"double_top", "head_and_shoulders"}:
            score += 1
        if volume_status == "increasing":
            score += 1
    else:
        if volume_status == "increasing":
            score += 2
        if macd_status in {"bullish_cross", "bearish_cross"}:
            score += 2
        if band_position in {"near_upper", "near_lower"}:
            score += 1

    return min(score, 10), conflict


def _confirmation_level(direction: str, resistance: float | None, support: float | None) -> float | None:
    if direction == "upside_candidate":
        return resistance
    if direction == "downside_candidate":
        return support
    return resistance or support


def _risk_from_context(base: str, breakout_ready: int, touches: int, has_volume_confirmation: bool) -> str:
    if touches < 2 or breakout_ready == 0:
        return "high"
    if base == "low" and has_volume_confirmation:
        return "low"
    if base == "medium" and breakout_ready >= 10:
        return "medium"
    return base


def _build_candidate(
    *,
    name: str,
    evidence: list[str],
    breakout_direction: str,
    confirmation_condition: str,
    invalidation_condition: str,
    entry_logic: str,
    risk_level: str,
    score_parts: dict[str, int],
    touches: int,
    image_based: bool = False,
    indicator_conflict: bool = False,
    key_condition_missing: bool = False,
    internal_levels: dict[str, float | None] | None = None,
) -> dict[str, Any]:
    total_score = sum(score_parts.values())
    if total_score >= 75:
        confidence = "high"
    elif total_score >= 50:
        confidence = "medium"
    else:
        confidence = "low"

    if image_based or touches < 2 or key_condition_missing or indicator_conflict or breakout_direction == "unknown":
        confidence = "low"
    if image_based and confidence == "high":
        confidence = "medium"

    defaults = PATTERN_DEFINITIONS[name]
    return {
        "name": name,
        "label": defaults["label"],
        "category": defaults["category"],
        "confidence": confidence,
        "evidence": _unique_strings(evidence),
        "breakoutDirection": breakout_direction,
        "confirmationCondition": confirmation_condition,
        "invalidationCondition": invalidation_condition,
        "entryLogic": entry_logic,
        "riskLevel": risk_level,
        "internalPatternScore": {**score_parts, "totalScore": total_score},
        "_internalLevels": internal_levels or {},
    }


def _candidate_sort_key(candidate: dict[str, Any]) -> tuple[int, int]:
    confidence_rank = {"high": 3, "medium": 2, "low": 1}
    total_score = int(((candidate.get("internalPatternScore") or {}).get("totalScore")) or 0)
    return (confidence_rank.get(candidate.get("confidence"), 0), total_score)


def _latest_close(ohlcv_data: list[dict[str, Any]]) -> float | None:
    if not ohlcv_data:
        return None
    return _safe_float(ohlcv_data[-1].get("close"))


def _recent_impulse(ohlcv_data: list[dict[str, Any]], atr: float | None) -> dict[str, Any]:
    if len(ohlcv_data) < 15:
        return {"direction": "unknown", "strength": 0.0, "retracement": 0.0}

    impulse_window = ohlcv_data[-15:-7]
    flag_window = ohlcv_data[-7:]
    start = _safe_float(impulse_window[0].get("close"))
    end = _safe_float(impulse_window[-1].get("close"))
    if start is None or end is None:
        return {"direction": "unknown", "strength": 0.0, "retracement": 0.0}

    move = end - start
    direction = "upside_candidate" if move > 0 else "downside_candidate"
    impulse_strength = abs(move) / max(start, 1)
    correction_start = _safe_float(flag_window[0].get("close")) or end
    correction_end = _safe_float(flag_window[-1].get("close")) or correction_start
    retracement = abs(correction_end - correction_start) / max(abs(move), 1e-6)

    if atr is not None and abs(move) < atr * 2:
        direction = "unknown"

    return {"direction": direction, "strength": impulse_strength, "retracement": retracement}


def _detect_box_range(
    context: dict[str, Any],
    resistance_clusters: list[Cluster],
    support_clusters: list[Cluster],
) -> dict[str, Any] | None:
    if not resistance_clusters or not support_clusters:
        return None

    resistance = resistance_clusters[0]
    support = support_clusters[0]
    current_price = context["current_price"]
    if current_price is None or resistance["touches"] < 2 or support["touches"] < 2:
        return None

    width_ratio = (resistance["level"] - support["level"]) / max(current_price, 1)
    if width_ratio <= 0 or width_ratio > 0.2:
        return None

    position_ratio = (current_price - support["level"]) / max(resistance["level"] - support["level"], 1e-6)
    if position_ratio >= 0.66:
        breakout_direction = "upside_candidate"
    elif position_ratio <= 0.34:
        breakout_direction = "downside_candidate"
    else:
        breakout_direction = "neutral"

    confirmation_level = _confirmation_level(breakout_direction, resistance["level"], support["level"])
    breakout_ready = _breakout_readiness_score(current_price, confirmation_level, context["tolerance"])
    indicator_score, indicator_conflict = _indicator_confluence(breakout_direction, context["indicators"], "box_range")

    base_risk = "high" if 0.34 < position_ratio < 0.66 else "medium"
    candidate = _build_candidate(
        name="box_range",
        evidence=[
            f"상단 저항 후보가 {resistance['touches']}회 관찰되었습니다.",
            f"하단 지지 후보가 {support['touches']}회 관찰되었습니다.",
            "가격이 일정 범위 안에서 왕복하는 구조가 관찰됩니다.",
        ],
        breakout_direction=breakout_direction,
        confirmation_condition=PATTERN_DEFINITIONS["box_range"]["confirmationCondition"],
        invalidation_condition=PATTERN_DEFINITIONS["box_range"]["invalidationCondition"],
        entry_logic=PATTERN_DEFINITIONS["box_range"]["entryLogic"],
        risk_level=_risk_from_context(base_risk, breakout_ready, min(resistance["touches"], support["touches"]), context["indicators"].get("volume", {}).get("status") == "increasing"),
        score_parts={
            "structureScore": 24,
            "touchCountScore": _touch_score(min(resistance["touches"], support["touches"])),
            "slopeScore": 15,
            "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
            "indicatorConfluenceScore": indicator_score,
            "breakoutReadinessScore": breakout_ready,
        },
        touches=min(resistance["touches"], support["touches"]),
        indicator_conflict=indicator_conflict,
        internal_levels={
            "confirmationLevel": _round(confirmation_level),
            "invalidationLevel": _round(support["level"] if breakout_direction == "downside_candidate" else resistance["level"]),
            "supportLevel": _round(support["level"]),
            "resistanceLevel": _round(resistance["level"]),
        },
    )
    return candidate


def _detect_channel(context: dict[str, Any], direction: str) -> dict[str, Any] | None:
    high_trend = context["high_trend"]
    low_trend = context["low_trend"]
    highs = context["swings"]["highs"]
    lows = context["swings"]["lows"]

    if len(highs) < 2 or len(lows) < 2:
        return None

    high_direction = high_trend["direction"]
    low_direction = low_trend["direction"]
    if direction == "up" and not (high_direction == "up" and low_direction == "up"):
        return None
    if direction == "down" and not (high_direction == "down" and low_direction == "down"):
        return None

    high_slope = _safe_float(high_trend["relativeSlope"])
    low_slope = _safe_float(low_trend["relativeSlope"])
    if high_slope is None or low_slope is None:
        return None

    slope_gap = abs(abs(high_slope) - abs(low_slope))
    if slope_gap > 0.0025:
        return None

    last_index = len(context["ohlcv"]) - 1
    upper_value = _line_value(high_trend["line"], last_index)
    lower_value = _line_value(low_trend["line"], last_index)
    current_price = context["current_price"]
    if upper_value is None or lower_value is None or current_price is None or upper_value <= lower_value:
        return None

    channel_position = (current_price - lower_value) / max(upper_value - lower_value, 1e-6)
    name = "ascending_channel" if direction == "up" else "descending_channel"
    breakout_direction = "upside_candidate" if direction == "up" and channel_position < 0.75 else "neutral"
    if direction == "down":
        breakout_direction = "downside_candidate" if channel_position > 0.25 else "neutral"

    evidence = [
        "고점과 저점이 같은 방향으로 움직이는 평행 채널 후보가 관찰됩니다.",
        f"상단 추세선 기울기 후보는 {round(high_slope, 5)}입니다.",
        f"하단 추세선 기울기 후보는 {round(low_slope, 5)}입니다.",
    ]

    breakout_ready = 10 if channel_position <= 0.25 or channel_position >= 0.75 else 5
    indicator_score, indicator_conflict = _indicator_confluence(
        "upside_candidate" if direction == "up" else "downside_candidate",
        context["indicators"],
        name,
    )
    base_risk = "medium" if channel_position <= 0.35 or channel_position >= 0.65 else "high"
    if direction == "down" and channel_position <= 0.2:
        base_risk = "high"

    return _build_candidate(
        name=name,
        evidence=evidence,
        breakout_direction=breakout_direction,
        confirmation_condition=PATTERN_DEFINITIONS[name]["confirmationCondition"],
        invalidation_condition=PATTERN_DEFINITIONS[name]["invalidationCondition"],
        entry_logic=PATTERN_DEFINITIONS[name]["entryLogic"],
        risk_level=_risk_from_context(base_risk, breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
        score_parts={
            "structureScore": 24,
            "touchCountScore": _touch_score(2),
            "slopeScore": 14,
            "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
            "indicatorConfluenceScore": indicator_score,
            "breakoutReadinessScore": breakout_ready,
        },
        touches=2,
        indicator_conflict=indicator_conflict,
        internal_levels={
            "confirmationLevel": _round(lower_value if direction == "up" else upper_value),
            "invalidationLevel": _round(lower_value if direction == "up" else upper_value),
            "upperLine": _round(upper_value),
            "lowerLine": _round(lower_value),
        },
    )


def _detect_triangles(context: dict[str, Any], resistance_clusters: list[Cluster], support_clusters: list[Cluster]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    high_trend = context["high_trend"]
    low_trend = context["low_trend"]
    current_price = context["current_price"]
    high_slope = _safe_float(high_trend["relativeSlope"])
    low_slope = _safe_float(low_trend["relativeSlope"])
    if high_slope is None or low_slope is None or current_price is None:
        return candidates

    last_index = len(context["ohlcv"]) - 1
    upper_now = _line_value(high_trend["line"], last_index)
    lower_now = _line_value(low_trend["line"], last_index)
    earlier_index = max(0, last_index - 20)
    upper_earlier = _line_value(high_trend["line"], earlier_index)
    lower_earlier = _line_value(low_trend["line"], earlier_index)
    if None in {upper_now, lower_now, upper_earlier, lower_earlier}:
        return candidates

    gap_now = upper_now - lower_now
    gap_earlier = upper_earlier - lower_earlier
    if gap_now <= 0 or gap_earlier <= 0:
        return candidates

    contracting = gap_now < gap_earlier
    if high_trend["direction"] == "down" and low_trend["direction"] == "up" and contracting:
        breakout_direction = "unknown"
        if current_price >= upper_now - context["tolerance"] * 2:
            breakout_direction = "upside_candidate"
        elif current_price <= lower_now + context["tolerance"] * 2:
            breakout_direction = "downside_candidate"

        breakout_ready = _breakout_readiness_score(
            current_price,
            upper_now if breakout_direction == "upside_candidate" else lower_now if breakout_direction == "downside_candidate" else None,
            context["tolerance"],
        )
        indicator_score, indicator_conflict = _indicator_confluence(breakout_direction, context["indicators"], "symmetrical_triangle")
        candidates.append(
            _build_candidate(
                name="symmetrical_triangle",
                evidence=[
                    "고점은 낮아지고 저점은 높아지는 수렴 구조가 관찰됩니다.",
                    "상단과 하단 추세선 간격이 점차 감소합니다.",
                    "변동폭 축소로 돌파 대기 구조처럼 보입니다.",
                ],
                breakout_direction=breakout_direction,
                confirmation_condition=PATTERN_DEFINITIONS["symmetrical_triangle"]["confirmationCondition"],
                invalidation_condition=PATTERN_DEFINITIONS["symmetrical_triangle"]["invalidationCondition"],
                entry_logic=PATTERN_DEFINITIONS["symmetrical_triangle"]["entryLogic"],
                risk_level=_risk_from_context("high", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
                score_parts={
                    "structureScore": 27,
                    "touchCountScore": _touch_score(2),
                    "slopeScore": 15,
                    "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
                    "indicatorConfluenceScore": indicator_score,
                    "breakoutReadinessScore": breakout_ready,
                },
                touches=2,
                indicator_conflict=indicator_conflict,
                internal_levels={
                    "confirmationLevel": _round(upper_now if breakout_direction != "downside_candidate" else lower_now),
                    "invalidationLevel": _round(lower_now if breakout_direction != "downside_candidate" else upper_now),
                },
            )
        )

    if resistance_clusters and abs(high_slope) <= 0.0012 and low_trend["direction"] == "up":
        resistance = resistance_clusters[0]
        if resistance["touches"] >= 2:
            breakout_ready = _breakout_readiness_score(current_price, resistance["level"], context["tolerance"])
            indicator_score, indicator_conflict = _indicator_confluence("upside_candidate", context["indicators"], "ascending_triangle")
            candidates.append(
                _build_candidate(
                    name="ascending_triangle",
                    evidence=[
                        f"비슷한 위치의 상단 저항 후보가 {resistance['touches']}회 관찰됩니다.",
                        "저점이 점진적으로 높아지는 구조가 관찰됩니다.",
                        "매수 압력이 점차 높아지는 형태 후보입니다.",
                    ],
                    breakout_direction="upside_candidate",
                    confirmation_condition=PATTERN_DEFINITIONS["ascending_triangle"]["confirmationCondition"],
                    invalidation_condition=PATTERN_DEFINITIONS["ascending_triangle"]["invalidationCondition"],
                    entry_logic=PATTERN_DEFINITIONS["ascending_triangle"]["entryLogic"],
                    risk_level=_risk_from_context("medium", breakout_ready, resistance["touches"], context["indicators"].get("volume", {}).get("status") == "increasing"),
                    score_parts={
                        "structureScore": 28,
                        "touchCountScore": _touch_score(resistance["touches"]),
                        "slopeScore": 14,
                        "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
                        "indicatorConfluenceScore": indicator_score,
                        "breakoutReadinessScore": breakout_ready,
                    },
                    touches=resistance["touches"],
                    indicator_conflict=indicator_conflict,
                    internal_levels={"confirmationLevel": _round(resistance["level"]), "invalidationLevel": _round(lower_now)},
                )
            )

    if support_clusters and abs(low_slope) <= 0.0012 and high_trend["direction"] == "down":
        support = support_clusters[0]
        if support["touches"] >= 2:
            breakout_ready = _breakout_readiness_score(current_price, support["level"], context["tolerance"])
            indicator_score, indicator_conflict = _indicator_confluence("downside_candidate", context["indicators"], "descending_triangle")
            candidates.append(
                _build_candidate(
                    name="descending_triangle",
                    evidence=[
                        f"비슷한 위치의 하단 지지 후보가 {support['touches']}회 관찰됩니다.",
                        "고점이 점진적으로 낮아지는 구조가 관찰됩니다.",
                        "매도 압력이 점차 강해지는 형태 후보입니다.",
                    ],
                    breakout_direction="downside_candidate",
                    confirmation_condition=PATTERN_DEFINITIONS["descending_triangle"]["confirmationCondition"],
                    invalidation_condition=PATTERN_DEFINITIONS["descending_triangle"]["invalidationCondition"],
                    entry_logic=PATTERN_DEFINITIONS["descending_triangle"]["entryLogic"],
                    risk_level=_risk_from_context("medium", breakout_ready, support["touches"], context["indicators"].get("volume", {}).get("status") == "increasing"),
                    score_parts={
                        "structureScore": 28,
                        "touchCountScore": _touch_score(support["touches"]),
                        "slopeScore": 14,
                        "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
                        "indicatorConfluenceScore": indicator_score,
                        "breakoutReadinessScore": breakout_ready,
                    },
                    touches=support["touches"],
                    indicator_conflict=indicator_conflict,
                    internal_levels={"confirmationLevel": _round(support["level"]), "invalidationLevel": _round(upper_now)},
                )
            )

    return candidates


def _find_double_low(swings: list[SwingPoint], tolerance: float) -> tuple[SwingPoint, SwingPoint] | None:
    if len(swings) < 2:
        return None
    recent = swings[-5:]
    for left_index in range(len(recent) - 1):
        for right_index in range(left_index + 1, len(recent)):
            left = recent[left_index]
            right = recent[right_index]
            if right["index"] - left["index"] < 3:
                continue
            if abs(left["price"] - right["price"]) <= tolerance * 2:
                return left, right
    return None


def _find_double_high(swings: list[SwingPoint], tolerance: float) -> tuple[SwingPoint, SwingPoint] | None:
    if len(swings) < 2:
        return None
    recent = swings[-5:]
    for left_index in range(len(recent) - 1):
        for right_index in range(left_index + 1, len(recent)):
            left = recent[left_index]
            right = recent[right_index]
            if right["index"] - left["index"] < 3:
                continue
            if abs(left["price"] - right["price"]) <= tolerance * 2:
                return left, right
    return None


def _detect_double_patterns(context: dict[str, Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    highs = context["swings"]["highs"]
    lows = context["swings"]["lows"]
    current_price = context["current_price"]
    if current_price is None:
        return candidates

    double_low = _find_double_low(lows, context["tolerance"])
    if double_low:
        left, right = double_low
        neckline_points = [point for point in highs if left["index"] < point["index"] < right["index"]]
        if neckline_points:
            neckline = max(neckline_points, key=lambda point: point["price"])
            breakout_ready = _breakout_readiness_score(current_price, neckline["price"], context["tolerance"])
            indicator_score, indicator_conflict = _indicator_confluence("upside_candidate", context["indicators"], "double_bottom")
            evidence = [
                "비슷한 가격대의 저점이 2회 관찰됩니다.",
                "두 번째 저점 이후 반등 흐름이 보입니다.",
                "중간 고점이 넥라인 후보 역할을 합니다.",
            ]
            rsi_status = str((context["indicators"].get("rsi") or {}).get("status") or "").lower()
            if rsi_status in {"rebound_candidate", "oversold"}:
                evidence.append("RSI가 저점 구간에서 반등 후보로 관찰되어 보조 근거가 추가됩니다.")
            candidates.append(
                _build_candidate(
                    name="double_bottom",
                    evidence=evidence,
                    breakout_direction="upside_candidate",
                    confirmation_condition=PATTERN_DEFINITIONS["double_bottom"]["confirmationCondition"],
                    invalidation_condition=PATTERN_DEFINITIONS["double_bottom"]["invalidationCondition"],
                    entry_logic=PATTERN_DEFINITIONS["double_bottom"]["entryLogic"],
                    risk_level=_risk_from_context("high" if breakout_ready < 10 else "medium", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
                    score_parts={
                        "structureScore": 28,
                        "touchCountScore": _touch_score(2),
                        "slopeScore": 10,
                        "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
                        "indicatorConfluenceScore": indicator_score,
                        "breakoutReadinessScore": breakout_ready,
                    },
                    touches=2,
                    indicator_conflict=indicator_conflict,
                    internal_levels={
                        "confirmationLevel": _round(neckline["price"]),
                        "invalidationLevel": _round(right["price"]),
                        "patternHeight": _round(neckline["price"] - min(left["price"], right["price"])),
                    },
                )
            )

    double_high = _find_double_high(highs, context["tolerance"])
    if double_high:
        left, right = double_high
        neckline_points = [point for point in lows if left["index"] < point["index"] < right["index"]]
        if neckline_points:
            neckline = min(neckline_points, key=lambda point: point["price"])
            breakout_ready = _breakout_readiness_score(current_price, neckline["price"], context["tolerance"])
            indicator_score, indicator_conflict = _indicator_confluence("downside_candidate", context["indicators"], "double_top")
            evidence = [
                "비슷한 가격대의 고점이 2회 관찰됩니다.",
                "두 번째 고점 이후 하락 흐름이 보입니다.",
                "중간 저점이 넥라인 후보 역할을 합니다.",
            ]
            rsi_status = str((context["indicators"].get("rsi") or {}).get("status") or "").lower()
            if rsi_status == "overbought":
                evidence.append("RSI 과열 구간이 보조 근거로 관찰됩니다.")
            candidates.append(
                _build_candidate(
                    name="double_top",
                    evidence=evidence,
                    breakout_direction="downside_candidate",
                    confirmation_condition=PATTERN_DEFINITIONS["double_top"]["confirmationCondition"],
                    invalidation_condition=PATTERN_DEFINITIONS["double_top"]["invalidationCondition"],
                    entry_logic=PATTERN_DEFINITIONS["double_top"]["entryLogic"],
                    risk_level=_risk_from_context("high" if breakout_ready < 10 else "medium", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
                    score_parts={
                        "structureScore": 28,
                        "touchCountScore": _touch_score(2),
                        "slopeScore": 10,
                        "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
                        "indicatorConfluenceScore": indicator_score,
                        "breakoutReadinessScore": breakout_ready,
                    },
                    touches=2,
                    indicator_conflict=indicator_conflict,
                    internal_levels={
                        "confirmationLevel": _round(neckline["price"]),
                        "invalidationLevel": _round(right["price"]),
                        "patternHeight": _round(max(left["price"], right["price"]) - neckline["price"]),
                    },
                )
            )

    return candidates


def _detect_head_shoulders(context: dict[str, Any], inverse: bool = False) -> dict[str, Any] | None:
    points = context["swings"]["lows"] if inverse else context["swings"]["highs"]
    counterpart_points = context["swings"]["highs"] if inverse else context["swings"]["lows"]
    if len(points) < 3 or len(counterpart_points) < 2:
        return None

    left, middle, right = points[-3], points[-2], points[-1]
    tolerance = context["tolerance"] * 2

    if inverse:
        if not (left["price"] > middle["price"] and right["price"] > middle["price"]):
            return None
    else:
        if not (left["price"] < middle["price"] and right["price"] < middle["price"]):
            return None

    if abs(left["price"] - right["price"]) > tolerance * 2:
        return None

    neckline_candidates = [
        point
        for point in counterpart_points
        if left["index"] < point["index"] < right["index"]
    ]
    if len(neckline_candidates) < 2:
        return None

    neckline_level = mean(point["price"] for point in neckline_candidates)
    current_price = context["current_price"]
    if current_price is None:
        return None

    name = "inverse_head_and_shoulders" if inverse else "head_and_shoulders"
    direction = "upside_candidate" if inverse else "downside_candidate"
    breakout_ready = _breakout_readiness_score(current_price, neckline_level, context["tolerance"])
    indicator_score, indicator_conflict = _indicator_confluence(direction, context["indicators"], name)

    evidence = [
        "좌측 어깨, 머리, 우측 어깨에 해당하는 3점 구조 후보가 관찰됩니다.",
        "가운데 포인트가 가장 극단적인 값으로 보입니다.",
        "중간 구간을 잇는 넥라인 후보가 존재합니다.",
    ]

    return _build_candidate(
        name=name,
        evidence=evidence,
        breakout_direction=direction,
        confirmation_condition=PATTERN_DEFINITIONS[name]["confirmationCondition"],
        invalidation_condition=PATTERN_DEFINITIONS[name]["invalidationCondition"],
        entry_logic=PATTERN_DEFINITIONS[name]["entryLogic"],
        risk_level=_risk_from_context("high" if breakout_ready < 10 else "medium", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
        score_parts={
            "structureScore": 27,
            "touchCountScore": _touch_score(2),
            "slopeScore": 10,
            "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
            "indicatorConfluenceScore": indicator_score,
            "breakoutReadinessScore": breakout_ready,
        },
        touches=2,
        indicator_conflict=indicator_conflict,
        key_condition_missing=len(neckline_candidates) < 2,
        internal_levels={
            "confirmationLevel": _round(neckline_level),
            "invalidationLevel": _round(right["price"]),
            "patternHeight": _round(abs(middle["price"] - neckline_level)),
        },
    )


def _detect_flag(context: dict[str, Any]) -> dict[str, Any] | None:
    impulse = _recent_impulse(context["ohlcv"], context["atr"])
    if impulse["direction"] == "unknown" or impulse["strength"] < 0.05 or impulse["retracement"] > 0.6:
        return None

    highs = context["swings"]["highs"][-3:]
    lows = context["swings"]["lows"][-3:]
    if len(highs) < 2 or len(lows) < 2:
        return None

    correction_high = max(point["price"] for point in highs)
    correction_low = min(point["price"] for point in lows)
    current_price = context["current_price"]
    if current_price is None:
        return None

    breakout_direction = impulse["direction"]
    confirmation_level = correction_high if breakout_direction == "upside_candidate" else correction_low
    breakout_ready = _breakout_readiness_score(current_price, confirmation_level, context["tolerance"])
    indicator_score, indicator_conflict = _indicator_confluence(breakout_direction, context["indicators"], "flag")

    return _build_candidate(
        name="flag",
        evidence=[
            "직전 구간에서 강한 추세성 움직임이 관찰됩니다.",
            "이후 짧은 반대 방향 조정 구간이 형성된 것으로 보입니다.",
            "조정 폭이 직전 추세 대비 상대적으로 제한적입니다.",
        ],
        breakout_direction=breakout_direction,
        confirmation_condition=PATTERN_DEFINITIONS["flag"]["confirmationCondition"],
        invalidation_condition=PATTERN_DEFINITIONS["flag"]["invalidationCondition"],
        entry_logic=PATTERN_DEFINITIONS["flag"]["entryLogic"],
        risk_level=_risk_from_context("medium", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
        score_parts={
            "structureScore": 24,
            "touchCountScore": _touch_score(2),
            "slopeScore": 10,
            "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
            "indicatorConfluenceScore": indicator_score,
            "breakoutReadinessScore": breakout_ready,
        },
        touches=2,
        indicator_conflict=indicator_conflict,
        internal_levels={
            "confirmationLevel": _round(confirmation_level),
            "invalidationLevel": _round(correction_low if breakout_direction == "upside_candidate" else correction_high),
        },
    )


def _detect_wedge(context: dict[str, Any]) -> dict[str, Any] | None:
    high_trend = context["high_trend"]
    low_trend = context["low_trend"]
    high_slope = _safe_float(high_trend["relativeSlope"])
    low_slope = _safe_float(low_trend["relativeSlope"])
    if high_slope is None or low_slope is None:
        return None

    same_direction = high_trend["direction"] == low_trend["direction"] and high_trend["direction"] in {"up", "down"}
    if not same_direction:
        return None

    last_index = len(context["ohlcv"]) - 1
    upper_now = _line_value(high_trend["line"], last_index)
    lower_now = _line_value(low_trend["line"], last_index)
    upper_past = _line_value(high_trend["line"], max(0, last_index - 20))
    lower_past = _line_value(low_trend["line"], max(0, last_index - 20))
    if None in {upper_now, lower_now, upper_past, lower_past}:
        return None

    gap_now = upper_now - lower_now
    gap_past = upper_past - lower_past
    if gap_now <= 0 or gap_now >= gap_past:
        return None

    rising = high_trend["direction"] == "up"
    breakout_direction = "downside_candidate" if rising else "upside_candidate"
    current_price = context["current_price"]
    breakout_ready = _breakout_readiness_score(
        current_price,
        lower_now if breakout_direction == "downside_candidate" else upper_now,
        context["tolerance"],
    )
    indicator_score, indicator_conflict = _indicator_confluence(breakout_direction, context["indicators"], "wedge")

    return _build_candidate(
        name="wedge",
        evidence=[
            "고점과 저점이 같은 방향으로 움직이면서 간격이 점차 줄어드는 구조가 관찰됩니다.",
            "추세선 간 수렴이 진행되어 쐐기형 후보로 해석할 수 있습니다.",
        ],
        breakout_direction=breakout_direction,
        confirmation_condition=PATTERN_DEFINITIONS["wedge"]["confirmationCondition"],
        invalidation_condition=PATTERN_DEFINITIONS["wedge"]["invalidationCondition"],
        entry_logic=PATTERN_DEFINITIONS["wedge"]["entryLogic"],
        risk_level=_risk_from_context("high" if breakout_ready < 10 else "medium", breakout_ready, 2, context["indicators"].get("volume", {}).get("status") == "increasing"),
        score_parts={
            "structureScore": 25,
            "touchCountScore": _touch_score(2),
            "slopeScore": 14,
            "volumeScore": _volume_score(context["indicators"], breakout_ready >= 10),
            "indicatorConfluenceScore": indicator_score,
            "breakoutReadinessScore": breakout_ready,
        },
        touches=2,
        indicator_conflict=indicator_conflict,
        internal_levels={
            "confirmationLevel": _round(lower_now if breakout_direction == "downside_candidate" else upper_now),
            "invalidationLevel": _round(upper_now if breakout_direction == "downside_candidate" else lower_now),
        },
    )


def _strip_internal(candidate: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in candidate.items() if not key.startswith("_") and key != "internalPatternScore"}


def detectPatternCandidates(ohlcvData: list[dict[str, Any]], indicators: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    if len(ohlcvData) < 30:
        return []

    current_price = _latest_close(ohlcvData)
    atr = calculate_atr(ohlcvData)
    tolerance = max((atr or 0) * 0.5, (current_price or 0) * 0.005)
    swings = detect_swing_points(ohlcvData, window=2)
    resistance_clusters = cluster_price_levels(swings["highs"], tolerance)
    support_clusters = cluster_price_levels(swings["lows"], tolerance)
    high_trend = calculate_trendline(swings["highs"])
    low_trend = calculate_trendline(swings["lows"])

    context = {
        "ohlcv": ohlcvData,
        "indicators": indicators or {},
        "current_price": current_price,
        "atr": atr,
        "tolerance": tolerance,
        "swings": swings,
        "high_trend": high_trend,
        "low_trend": low_trend,
    }

    raw_candidates: list[dict[str, Any]] = []

    box_range = _detect_box_range(context, resistance_clusters, support_clusters)
    if box_range:
        raw_candidates.append(box_range)

    ascending_channel = _detect_channel(context, "up")
    if ascending_channel:
        raw_candidates.append(ascending_channel)

    descending_channel = _detect_channel(context, "down")
    if descending_channel:
        raw_candidates.append(descending_channel)

    raw_candidates.extend(_detect_triangles(context, resistance_clusters, support_clusters))
    raw_candidates.extend(_detect_double_patterns(context))

    head_and_shoulders = _detect_head_shoulders(context, inverse=False)
    if head_and_shoulders:
        raw_candidates.append(head_and_shoulders)

    inverse_head_and_shoulders = _detect_head_shoulders(context, inverse=True)
    if inverse_head_and_shoulders:
        raw_candidates.append(inverse_head_and_shoulders)

    flag = _detect_flag(context)
    if flag:
        raw_candidates.append(flag)

    wedge = _detect_wedge(context)
    if wedge:
        raw_candidates.append(wedge)

    normalized = normalize_pattern_candidates(raw_candidates, image_based=False)
    normalized_by_name = {candidate["name"]: candidate for candidate in normalized}
    internals_by_name = {candidate["name"]: candidate for candidate in raw_candidates}

    merged: list[dict[str, Any]] = []
    for name, candidate in normalized_by_name.items():
        internal = internals_by_name.get(name, {})
        merged_candidate = {**candidate}
        if "internalPatternScore" in internal:
            merged_candidate["internalPatternScore"] = internal["internalPatternScore"]
        if "_internalLevels" in internal:
            merged_candidate["_internalLevels"] = internal["_internalLevels"]
        merged.append(merged_candidate)

    merged.sort(key=_candidate_sort_key, reverse=True)
    return merged


def merge_pattern_candidates(
    ai_candidates: list[dict[str, Any]] | list[Any] | None,
    data_candidates: list[dict[str, Any]] | list[Any] | None,
) -> list[dict[str, Any]]:
    normalized_ai = normalize_pattern_candidates(ai_candidates or [], image_based=True)
    normalized_data = normalize_pattern_candidates(data_candidates or [], image_based=False)
    raw_data_by_name = {
        str(candidate.get("name")): candidate
        for candidate in (data_candidates or [])
        if isinstance(candidate, dict) and candidate.get("name")
    }

    if not normalized_data:
        return normalized_ai

    ai_by_name = {candidate["name"]: candidate for candidate in normalized_ai}
    data_by_name = {candidate["name"]: candidate for candidate in normalized_data}

    merged: list[dict[str, Any]] = []
    for name, data_candidate in data_by_name.items():
        ai_candidate = ai_by_name.get(name)
        if ai_candidate:
            merged_candidate = {
                **data_candidate,
                "evidence": _unique_strings((data_candidate.get("evidence") or []) + (ai_candidate.get("evidence") or [])),
            }
        else:
            merged_candidate = dict(data_candidate)
        raw_data = raw_data_by_name.get(name) or {}
        if "internalPatternScore" in raw_data:
            merged_candidate["internalPatternScore"] = raw_data["internalPatternScore"]
        if "_internalLevels" in raw_data:
            merged_candidate["_internalLevels"] = raw_data["_internalLevels"]
        merged.append(merged_candidate)

    for name, ai_candidate in ai_by_name.items():
        if name in data_by_name:
            continue
        fallback_candidate = dict(ai_candidate)
        fallback_candidate["confidence"] = "low"
        merged.append(fallback_candidate)

    merged.sort(key=_candidate_sort_key, reverse=True)
    return merged


def backtestPatternCandidate(
    *,
    ohlcvData: list[dict[str, Any]],
    candidate: dict[str, Any],
    confirmationRule: Callable[[dict[str, Any], list[dict[str, Any]], int], bool] | None = None,
    invalidationRule: Callable[[dict[str, Any], list[dict[str, Any]], int], bool] | None = None,
    lookaheadBars: int = 20,
) -> dict[str, Any]:
    pattern_name = str(candidate.get("name") or "unknown")
    if len(ohlcvData) < 60 or lookaheadBars <= 0:
        return {
            "patternName": pattern_name,
            "confirmedCount": 0,
            "failedCount": 0,
            "averageReturnAfterConfirmation": None,
            "maxDrawdownAfterConfirmation": None,
            "winRate": None,
            "sampleSize": 0,
        }

    returns_after_confirmation: list[float] = []
    drawdowns_after_confirmation: list[float] = []
    confirmed_count = 0
    failed_count = 0
    sample_size = 0

    for end_index in range(60, len(ohlcvData) - lookaheadBars):
        history = ohlcvData[: end_index + 1]
        technical = run_technical_analysis(history)
        detected = detectPatternCandidates(history, technical)
        match = next((item for item in detected if item["name"] == pattern_name), None)
        if not match:
            continue

        sample_size += 1
        future = ohlcvData[end_index + 1 : end_index + 1 + lookaheadBars]
        internal_levels = match.get("_internalLevels") or {}
        confirmation_level = _safe_float(internal_levels.get("confirmationLevel"))
        invalidation_level = _safe_float(internal_levels.get("invalidationLevel"))
        breakout_direction = match.get("breakoutDirection")

        def default_confirmation(rule_candidate: dict[str, Any], future_bars: list[dict[str, Any]], idx: int) -> bool:
            close = _safe_float(future_bars[idx].get("close"))
            if close is None or confirmation_level is None:
                return False
            if breakout_direction == "downside_candidate":
                return close < confirmation_level
            return close > confirmation_level

        def default_invalidation(rule_candidate: dict[str, Any], future_bars: list[dict[str, Any]], idx: int) -> bool:
            close = _safe_float(future_bars[idx].get("close"))
            if close is None or invalidation_level is None:
                return False
            if breakout_direction == "downside_candidate":
                return close > invalidation_level
            return close < invalidation_level

        confirmation_fn = confirmationRule or default_confirmation
        invalidation_fn = invalidationRule or default_invalidation

        confirmation_index: int | None = None
        invalidation_index: int | None = None
        for future_index in range(len(future)):
            if confirmation_index is None and confirmation_fn(match, future, future_index):
                confirmation_index = future_index
            if invalidation_index is None and invalidation_fn(match, future, future_index):
                invalidation_index = future_index
            if confirmation_index is not None or invalidation_index is not None:
                break

        if confirmation_index is None and invalidation_index is None:
            continue
        if invalidation_index is not None and (confirmation_index is None or invalidation_index <= confirmation_index):
            failed_count += 1
            continue

        confirmation_bar = future[confirmation_index or 0]
        entry_price = _safe_float(confirmation_bar.get("close"))
        if entry_price is None:
            continue

        confirmed_count += 1
        trailing_bars = future[(confirmation_index or 0) :]
        exit_price = _safe_float(trailing_bars[-1].get("close")) or entry_price

        if breakout_direction == "downside_candidate":
            result_return = (entry_price - exit_price) / max(entry_price, 1e-6)
            worst_high = max(_safe_float(bar.get("high")) or entry_price for bar in trailing_bars)
            max_drawdown = (worst_high - entry_price) / max(entry_price, 1e-6)
        else:
            result_return = (exit_price - entry_price) / max(entry_price, 1e-6)
            worst_low = min(_safe_float(bar.get("low")) or entry_price for bar in trailing_bars)
            max_drawdown = (entry_price - worst_low) / max(entry_price, 1e-6)

        returns_after_confirmation.append(round(result_return * 100, 2))
        drawdowns_after_confirmation.append(round(max_drawdown * 100, 2))

    average_return = round(sum(returns_after_confirmation) / len(returns_after_confirmation), 2) if returns_after_confirmation else None
    average_drawdown = round(sum(drawdowns_after_confirmation) / len(drawdowns_after_confirmation), 2) if drawdowns_after_confirmation else None
    win_rate = round((confirmed_count / sample_size) * 100, 2) if sample_size else None

    return {
        "patternName": pattern_name,
        "confirmedCount": confirmed_count,
        "failedCount": failed_count,
        "averageReturnAfterConfirmation": average_return,
        "maxDrawdownAfterConfirmation": average_drawdown,
        "winRate": win_rate,
        "sampleSize": sample_size,
    }
