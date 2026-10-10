from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


FinalAction = str
logger = logging.getLogger(__name__)

IMAGE_LIMIT_TEXT = "이미지 기준 추정 불가"
DISCLAIMER = (
    "본 분석은 차트 이미지 기반의 기술적 분석 참고 정보입니다. "
    "실제 투자 판단은 사용자가 직접 해야 하며, 이미지 기반 분석 특성상 실제 OHLCV 데이터와 차이가 있을 수 있습니다."
)


def _number(value: Any) -> float | None:
    try:
        if value is None:
            return None
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result and result not in (float("inf"), float("-inf")) else None


def _clamp(value: float | int | None, default: int = 0) -> int:
    if value is None:
        return default
    return max(0, min(100, int(round(value))))


def _format_price(value: float | None, *, suffix: str = "") -> str:
    if value is None or value <= 0:
        return IMAGE_LIMIT_TEXT
    if abs(value) >= 100:
        text = f"{value:,.0f}"
    elif abs(value) >= 10:
        text = f"{value:,.1f}".rstrip("0").rstrip(".")
    else:
        text = f"{value:,.2f}".rstrip("0").rstrip(".")
    return f"{text}{suffix}"


def _format_zone(value: float | None) -> str:
    return _format_price(value, suffix=" 부근") if value is not None else IMAGE_LIMIT_TEXT


def _format_estimated_zone(value: float | None) -> str:
    return _format_price(value, suffix=" 부근 추정") if value is not None else IMAGE_LIMIT_TEXT


def _looks_like_us_ticker(symbol: str | None) -> bool:
    text = (symbol or "").strip().upper()
    if not text or text == "미확인":
        return False
    if any(token in text for token in ("NYSE", "NASDAQ", "AMEX", "ETF", " US")):
        return True
    return text.isalpha() and 1 <= len(text) <= 5


def _price_unit_meta(symbol: str | None, current: float | None) -> dict[str, str]:
    if _looks_like_us_ticker(symbol) and current is not None and current > 10000:
        return {"priceUnit": "확인 필요", "priceUnitConfidence": "low"}
    if _looks_like_us_ticker(symbol) and current is not None and current > 0:
        return {"priceUnit": "달러 기준 추정", "priceUnitConfidence": "medium"}
    if current is not None and current >= 100000:
        return {"priceUnit": "이미지 축 기준 추정", "priceUnitConfidence": "low"}
    return {"priceUnit": "이미지 축 기준 추정", "priceUnitConfidence": "low"}


def _dedupe_levels(values: list[float | None], *, tolerance_percent: float = 1.0) -> list[float]:
    cleaned = sorted({round(value, 4) for value in values if value is not None and value > 0})
    merged: list[float] = []
    for value in cleaned:
        if not merged:
            merged.append(value)
            continue
        previous = merged[-1]
        if previous > 0 and abs(value - previous) / previous * 100 <= tolerance_percent:
            merged[-1] = round((previous + value) / 2, 4)
        else:
            merged.append(value)
    return merged


def _status_ko(value: str | None) -> str:
    text = (value or "").lower()
    if any(token in text for token in ["uptrend", "bull", "above", "상승"]):
        return "상승 추세"
    if any(token in text for token in ["downtrend", "bear", "below", "하락"]):
        return "하락 추세"
    if any(token in text for token in ["sideways", "range", "mixed", "횡보"]):
        return "횡보"
    return "중립"


def _clean_text(value: Any, fallback: str = "추가 확인 조건이 필요합니다.") -> str:
    if not isinstance(value, str) or not value.strip():
        return fallback
    replacements = {
        "uptrend": "상승 추세",
        "downtrend": "하락 추세",
        "sideways": "횡보",
        "breakout": "저항 돌파",
        "pullback": "눌림목",
        "support": "지지",
        "resistance": "저항",
        "volume spike": "거래량 증가",
        "Ichimoku cloud": "일목균형표 구름대",
        "Moving Average": "이동평균선",
        "risk reward": "손익비",
    }
    text = value.strip()
    for source, target in replacements.items():
        text = text.replace(source, target).replace(source.title(), target)
    return text


def _confidence(value: str | None, *, image_only: bool = True) -> str:
    if value == "high" and not image_only:
        return "high"
    if value in {"high", "medium"}:
        return "medium"
    return "low"


def _score_label(score: int) -> str:
    if score < 30:
        return "매매 부적합"
    if score < 50:
        return "신규 진입 주의"
    if score < 65:
        return "관망 우세"
    if score < 80:
        return "조건부 진입 후보"
    return "매수 우위"


def _buy_score_label(score: int) -> str:
    if score < 30:
        return "매수 부적합"
    if score < 50:
        return "매수 주의"
    if score < 65:
        return "조건부 대기"
    if score < 80:
        return "매수 후보"
    return "매수 우위"


def _hold_score_label(score: int) -> str:
    if score < 30:
        return "보유 부적합"
    if score < 50:
        return "비중 축소 고려"
    if score < 65:
        return "관망 가능"
    if score < 80:
        return "보유 우세"
    if score < 90:
        return "강한 보유 후보"
    return "강한 보유"


def _risk_score_label(score: int) -> str:
    if score < 20:
        return "낮음"
    if score < 40:
        return "보통"
    if score < 60:
        return "주의"
    if score < 80:
        return "높음"
    return "매우 높음"


def _risk_reward(entry: float | None, stop: float | None, target: float | None) -> dict[str, Any]:
    if entry is None or stop is None or target is None:
        return {
            "value": None,
            "label": "확인 필요",
            "interpretation": "진입가, 손절가, 목표가 중 일부가 명확하지 않아 손익비 계산을 보류합니다.",
        }

    risk = entry - stop
    reward = target - entry
    if risk <= 0 or reward <= 0:
        return {
            "value": None,
            "label": "진입 부적합",
            "interpretation": "목표가 대비 손절 기준이 불리하거나 목표가가 진입가보다 낮아 신규 진입에는 부적합합니다.",
        }

    ratio = round(reward / risk, 2)
    if ratio < 1:
        label = "손익비 불리"
        interpretation = "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다."
    elif ratio < 1.5:
        label = "손익비 보통"
        interpretation = "손익비가 보통 수준이므로 조건 확인 후 보수적으로 접근해야 합니다."
    elif ratio < 2:
        label = "조건부 진입 가능"
        interpretation = "조건 충족 시 진입 후보로 볼 수 있습니다."
    else:
        label = "손익비 우수"
        interpretation = "손익비가 양호해 조건 충족 시 진입 후보로 참고할 수 있습니다."
    return {"value": ratio, "label": label, "interpretation": interpretation}


def _rr_text(value: Any) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".") if isinstance(value, (int, float)) else "확인 필요"


def _entry_score_label(score: int) -> str:
    if score < 30:
        return "부적합"
    if score < 50:
        return "주의"
    if score < 65:
        return "조건부 대기"
    if score < 80:
        return "후보"
    return "우위"


def _entry_mode_score(mode_label: str, base_score: int, risk_reward: dict[str, Any], *, pullback_bonus: int = 0) -> dict[str, Any]:
    value = risk_reward.get("value")
    score = base_score + pullback_bonus
    if not isinstance(value, (int, float)):
        score -= 20 if mode_label == "현재가 진입" else 10
        explanation = f"{mode_label} 기준 진입가, 손절가, 목표가 중 일부가 명확하지 않아 확인이 필요합니다."
    elif value < 1:
        score -= 30 if mode_label == "현재가 진입" else 20
        explanation = f"{mode_label} 기준 손익비가 낮아 추격 진입에는 주의가 필요합니다."
    elif value < 1.5:
        score -= 5
        explanation = f"{mode_label} 기준 손익비는 보통 수준이므로 조건 확인 후 보수적으로 접근해야 합니다."
    elif value < 2:
        score += 12
        explanation = f"{mode_label} 기준 손익비가 일부 확보되어 조건 충족 시 후보로 볼 수 있습니다."
    else:
        score += 20
        explanation = f"{mode_label} 기준 손익비가 양호하지만 지지와 저항 확인은 필요합니다."
    score = _clamp(score)
    return {
        "score": score,
        "label": f"{mode_label} {_entry_score_label(score)}",
        "explanation": explanation,
    }


def _entry_scores(
    score_summary: dict[str, Any],
    risk_reward_by_entry: dict[str, dict[str, Any]],
    *,
    current: float | None = None,
    pivot: float | None = None,
    pullback_entry: float | None = None,
    pullback_stop: float | None = None,
    breakout_retest_confirmed: bool = False,
    near_resistance: bool = False,
    price_location: str = "unknown",
    volume_confirmed: bool = False,
) -> dict[str, Any]:
    base_score = int(score_summary.get("buyScore") or 50)
    current_score_adjustment = -20 if near_resistance else 0
    pullback_score_adjustment = 12 if pullback_entry is not None else -10
    breakout_score_adjustment = 20 if breakout_retest_confirmed else -25
    support_area = price_location in ("near_support", "lower_range")
    resistance_area = price_location in ("upper_range", "near_resistance")
    if support_area:
        pullback_score_adjustment += 15
        current_score_adjustment += 5
    if resistance_area:
        current_score_adjustment -= 10
    if current is not None and pivot is not None and current <= pivot * 1.01:
        current_score_adjustment -= 10
        breakout_score_adjustment -= 10
    if int(score_summary.get("riskScore") or 0) >= 80:
        pullback_score_adjustment -= 30

    current_entry = _entry_mode_score("현재가 진입", base_score + current_score_adjustment, risk_reward_by_entry.get("current") or {})
    pullback_entry_score = _entry_mode_score("눌림목 진입", base_score + pullback_score_adjustment, risk_reward_by_entry.get("pullback") or {}, pullback_bonus=8)
    breakout_entry = _entry_mode_score("돌파 진입", base_score + breakout_score_adjustment, risk_reward_by_entry.get("breakout") or {})

    def refresh_label(entry: dict[str, Any], mode_label: str) -> None:
        entry["score"] = _clamp(entry.get("score"), 50)
        entry["label"] = f"{mode_label} {_entry_score_label(entry['score'])}"

    def refresh_current_label() -> None:
        current_score = _clamp(current_entry.get("score"), 50)
        current_entry["score"] = current_score
        risk_score = int(score_summary.get("riskScore") or 50)
        image_limited = True
        confirmation_limited = (
            risk_score >= 60
            or not isinstance(current_rr, (int, float))
            or current_rr < 1.5
            or price_location not in ("near_support", "breakout_area")
        )
        if current_score < 30:
            current_entry["label"] = "현재가 진입 부적합"
        elif current_score < 50 and price_location in ("near_support", "lower_range"):
            current_entry["label"] = "지지 확인 필요"
        elif current_score < 50:
            current_entry["label"] = "현재가 진입 불리"
        elif current_score < 65 and price_location in ("near_support", "lower_range"):
            current_entry["label"] = "소액 조건부"
        elif current_score < 65:
            current_entry["label"] = "현재가 진입 확인 필요"
        elif price_location == "near_resistance":
            current_entry["label"] = "현재가 진입 확인 필요"
        elif breakout_retest_confirmed:
            current_entry["label"] = "돌파 후 현재가 진입 후보"
        elif price_location == "near_support":
            current_entry["label"] = "지지권 근처 소액 조건부"
        elif current_score >= 70 and confirmation_limited:
            current_entry["label"] = "현재가 조건부 진입 / 손절 짧게"
        elif current_score >= 65:
            current_entry["label"] = "현재가 진입 후보"
        else:
            current_entry["label"] = "현재가 진입 확인 필요"
        if current_score >= 70 and price_location == "near_support":
            current_entry["explanation"] = "현재가는 주요 지지권에 가까워 소액 조건부 진입은 가능하지만, 지지선 이탈 시 빠른 손절이 필요합니다."
        elif current_score >= 70 and breakout_retest_confirmed:
            current_entry["explanation"] = "돌파 후 재지지가 확인된 경우에만 현재가 진입 후보로 볼 수 있습니다."
        elif current_score >= 70 and image_limited:
            current_entry["explanation"] = "이미지 기반 추정이므로 실제 체결가와 손절 기준을 재확인해야 합니다."

    if resistance_area:
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 60)
        if not breakout_retest_confirmed:
            breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 60)
    if price_location == "overextended":
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 45)
    current_rr = (risk_reward_by_entry.get("current") or {}).get("value")
    if not isinstance(current_rr, (int, float)):
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 40)
    elif current_rr < 1:
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 50)
    if support_area and (not isinstance(current_rr, (int, float)) or current_rr >= 1):
        support_floor = 50 if isinstance(current_rr, (int, float)) and current_rr >= 1.2 else 45
        current_entry["score"] = max(_clamp(current_entry.get("score"), 50), support_floor)
        current_entry["explanation"] = "현재가가 주요 지지권에 가까워 지지 이탈 여부를 확인하며 소액 조건부로만 검토할 수 있습니다."
    current_can_exceed_70 = (
        support_area and isinstance(current_rr, (int, float)) and current_rr >= 1.2
    ) or breakout_retest_confirmed or (
        isinstance(current_rr, (int, float)) and current_rr >= 1.5 and int(score_summary.get("riskScore") or 50) < 50
    )
    if not current_can_exceed_70:
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 70)
    if pullback_entry is None:
        pullback_entry_score["score"] = min(_clamp(pullback_entry_score.get("score"), 50), 65)
    pullback_rr = (risk_reward_by_entry.get("pullback") or {}).get("value")
    if isinstance(pullback_rr, (int, float)) and pullback_rr < 1:
        pullback_entry_score["score"] = min(_clamp(pullback_entry_score.get("score"), 50), 50)
    if int(score_summary.get("riskScore") or 0) >= 70:
        pullback_entry_score["score"] = min(_clamp(pullback_entry_score.get("score"), 50), 65)
    breakout_rr = (risk_reward_by_entry.get("breakout") or {}).get("value")
    if not breakout_retest_confirmed:
        breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 60)
    if isinstance(breakout_rr, (int, float)) and breakout_rr < 1:
        breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 50)
    if not volume_confirmed:
        breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 65)
    if breakout_retest_confirmed and isinstance(breakout_rr, (int, float)) and breakout_rr >= 1:
        breakout_floor = 75 if breakout_rr >= 1.5 else 65
        breakout_entry["score"] = max(_clamp(breakout_entry.get("score"), 50), breakout_floor)
        if not volume_confirmed:
            breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 80)
        breakout_entry["explanation"] = "핵심 전환 가격 위에서 재지지가 유지되면 돌파 진입 후보로 볼 수 있습니다."

    if near_resistance:
        current_entry["explanation"] = f"현재가는 {_format_price(pivot)} 저항 또는 전환 가격에 가까워 추격 진입 손익비가 낮아질 수 있습니다."
    if support_area:
        current_entry["explanation"] = "현재가가 지지권에 가까워 일부 익절보다 지지 반응 확인이 우선입니다."
    if pullback_entry_score["score"] >= 65:
        pullback_entry_score["explanation"] = "주요 지지 구간에서 눌림목 지지가 확인되면 손절 기준을 짧게 둘 수 있어 현재가 진입보다 유리합니다."
    if not breakout_retest_confirmed:
        breakout_entry["explanation"] = "돌파 후 재지지가 아직 확인되지 않아 돌파 진입은 대기 구간입니다."
    support_broken = current is not None and pullback_entry is not None and current < pullback_entry * 0.995
    overextended_like = (
        price_location == "overextended"
        or (
            price_location in ("upper_range", "near_resistance")
            and isinstance(current_rr, (int, float))
            and current_rr < 1
            and int(score_summary.get("riskScore") or 50) >= 55
        )
    )
    downtrend_like = (
        support_broken
        or (
            not breakout_retest_confirmed
            and (
                (current is not None and pivot is not None and current < pivot * 0.985 and int(score_summary.get("riskScore") or 50) >= 65)
                or (int(score_summary.get("riskScore") or 50) >= 70 and int(score_summary.get("holdScore") or 50) < 65)
            )
        )
    )
    if downtrend_like:
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 30 if support_broken else 45)
        pullback_entry_score["score"] = min(_clamp(pullback_entry_score.get("score"), 50), 35 if support_broken else 55)
        breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 60 if breakout_retest_confirmed else 50)
        current_entry["explanation"] = "하락 추세에서는 지지권 반등만으로 현재가 진입을 강하게 보기 어렵습니다."
        pullback_entry_score["explanation"] = "하락 추세에서는 지지권 반등 가능성은 참고하되, 주요 저항 회복 또는 추세 전환 확인이 필요합니다."
        breakout_entry["explanation"] = "주요 저항 회복과 돌파 후 재지지가 확인되기 전까지는 돌파 진입을 보류합니다."
    elif overextended_like:
        current_entry["score"] = min(_clamp(current_entry.get("score"), 50), 40)
        breakout_entry["score"] = min(_clamp(breakout_entry.get("score"), 50), 60 if breakout_retest_confirmed else 55)
        if pullback_entry is None or pullback_stop is None or not isinstance(pullback_rr, (int, float)) or pullback_rr < 1:
            pullback_entry_score["score"] = min(_clamp(pullback_entry_score.get("score"), 50), 60)
        current_entry["explanation"] = "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리합니다."
        pullback_entry_score["explanation"] = "눌림목 진입은 가격이 주요 지지 구간까지 내려와 반등이 확인될 때만 후보로 봅니다."
        breakout_entry["explanation"] = "급등 후에는 추가 돌파보다 재지지 또는 눌림 확인이 먼저 필요합니다."

    refresh_current_label()
    refresh_label(pullback_entry_score, "눌림목 진입")
    refresh_label(breakout_entry, "돌파 진입")
    if not breakout_retest_confirmed and pivot is not None and isinstance(breakout_rr, (int, float)) and breakout_rr >= 1 and _clamp(breakout_entry.get("score"), 50) >= 30:
        breakout_entry["score"] = max(_clamp(breakout_entry.get("score"), 50), 40)
        breakout_entry["label"] = "돌파 확인 필요"
        breakout_entry["explanation"] = "돌파 후 재지지가 확인되기 전까지는 부적합보다 확인 대기 구간으로 보는 것이 자연스럽습니다."
    if overextended_like:
        pullback_entry_score["label"] = "눌림 대기"

    return {
        "currentEntry": current_entry,
        "pullbackEntry": pullback_entry_score,
        "breakoutEntry": breakout_entry,
    }

def _entry_preference_explanation(
    score_summary: dict[str, Any],
    *,
    pivot: float | None,
    pullback_entry: float | None,
) -> str:
    entry_scores = score_summary.get("entryScores") or {}
    current_score = _clamp((entry_scores.get("currentEntry") or {}).get("score"), 0)
    pullback_score = _clamp((entry_scores.get("pullbackEntry") or {}).get("score"), 0)
    breakout_score = _clamp((entry_scores.get("breakoutEntry") or {}).get("score"), 0)
    pivot_text = _format_price(pivot)
    pullback_text = _format_zone(pullback_entry)
    parts: list[str] = []
    if current_score < 50:
        parts.append(f"현재가는 {pivot_text} 저항 또는 전환 가격 부근으로 추격 진입 점수가 낮습니다.")
    if pullback_score >= 65:
        parts.append(f"{pullback_text}에서 눌림목 지지가 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 점수가 상대적으로 높습니다.")
    if breakout_score < 65:
        parts.append(f"{pivot_text} 돌파 후 재지지가 아직 부족해 돌파 진입은 확인 대기입니다.")
    elif breakout_score >= 70:
        parts.append(f"{pivot_text} 돌파 후 재지지가 확인되면 돌파 진입 후보로 볼 수 있습니다.")
    return " ".join(parts) or str(score_summary.get("explanation") or "현재가, 눌림목, 돌파 진입 조건을 분리해 확인해야 하는 구간입니다.")


def _entry_preference_explanation_clean(
    score_summary: dict[str, Any],
    *,
    pivot: float | None,
    pullback_entry: float | None,
    short_stop: float | None,
    breakout_target: float | None,
    near_resistance: bool = False,
    breakout_retest_confirmed: bool = False,
) -> str:
    entry_scores = score_summary.get("entryScores") or {}
    current_score = _clamp((entry_scores.get("currentEntry") or {}).get("score"), 0)
    pullback_score = _clamp((entry_scores.get("pullbackEntry") or {}).get("score"), 0)
    breakout_score = _clamp((entry_scores.get("breakoutEntry") or {}).get("score"), 0)
    hold_score = _clamp(score_summary.get("holdScore"), 60)
    risk_score = _clamp(score_summary.get("riskScore"), 50)
    pivot_text = _format_price(pivot)
    pullback_text = _format_zone(pullback_entry)
    stop_text = _format_price(short_stop)
    target_text = _format_price(breakout_target)
    parts: list[str] = []
    if current_score < 50:
        parts.append(f"현재가는 {pivot_text} 부근의 저항 또는 전환 가격에 가까워 추격매수 손익비가 낮습니다.")
    else:
        parts.append("현재가 진입은 핵심 가격대와 손절 기준을 함께 확인해야 합니다.")
    if pullback_score >= 65:
        parts.append(f"{pullback_text}에서 반등이 확인되면 {stop_text}를 기준으로 손절을 짧게 둘 수 있어 눌림목 진입 조건이 상대적으로 유리합니다.")
    else:
        parts.append(f"{pullback_text} 지지 반응을 확인하기 전까지는 눌림목 진입도 확인 대기 구간입니다.")
    if breakout_score >= 70:
        parts.append(f"{pivot_text} 돌파 후 재지지에 성공하면 돌파 진입 후보가 되며, 다음 목표는 {target_text} 부근입니다.")
    else:
        parts.append(f"{pivot_text} 돌파 후 재지지가 아직 충분히 확인되지 않아 돌파 진입은 확인 대기가 필요합니다.")
    if hold_score < 50:
        parts.append("주요 지지선 이탈 또는 위험 증가로 보유자는 비중 축소를 고려해야 합니다.")
    elif hold_score >= 80 and near_resistance:
        parts.append("주요 지지선 이탈 전까지 보유 관망은 가능하지만, 저항 구간이 가까워 일부 익절 또는 돌파 확인이 필요합니다.")
    elif hold_score >= 70 and not breakout_retest_confirmed:
        parts.append("상승 흐름은 유지되지만 돌파 확인 전이므로 보유 관망 중심으로 대응하는 것이 적절합니다.")
    elif hold_score >= 60:
        parts.append(f"보유자는 {stop_text} 이탈 전까지 관망 가능하지만, {pivot_text} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.")
    if risk_score >= 60:
        parts.append("다만 위험 점수가 높아 저항 근접, 손익비 부족, 이미지 기반 분석 한계를 함께 관리해야 합니다.")
    return " ".join(parts)


def _first_target_above(entry: float | None, targets: list[float], *, min_gap_percent: float = 0.1) -> float | None:
    if entry is None:
        return None
    threshold = entry * (1 + min_gap_percent / 100)
    for target in sorted(targets):
        if target > threshold:
            return target
    return None


def _stop_below_entry(entry: float | None, candidates: list[float | None]) -> float | None:
    if entry is None:
        return None
    valid = [candidate for candidate in candidates if candidate is not None and candidate < entry]
    if not valid:
        return None
    return max(valid)


def _current_price(
    ai_analysis: dict[str, Any],
    technical_analysis: dict[str, Any] | None,
    trade_signal: dict[str, Any] | None,
    data_provenance: dict[str, Any] | None = None,
) -> float | None:
    observations = ai_analysis.get("priceAxisObservations") or {}
    allow_live = not data_provenance or bool(data_provenance.get("shouldMergeLiveLevels", True))
    return (
        _number(((trade_signal or {}).get("currentPriceEstimate") or {}).get("value"))
        or _number((observations.get("currentPriceEstimate") or {}).get("value"))
        or (_number((technical_analysis or {}).get("latestClose")) if allow_live else None)
    )


def _collect_levels(
    ai_analysis: dict[str, Any],
    technical_analysis: dict[str, Any] | None,
    trade_signal: dict[str, Any] | None,
    data_provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    observations = ai_analysis.get("priceAxisObservations") or {}
    allow_live = not data_provenance or bool(data_provenance.get("shouldMergeLiveLevels", True))
    support_resistance = ((technical_analysis or {}).get("supportResistance") or {}) if allow_live else {}
    current = _current_price(ai_analysis, technical_analysis, trade_signal, data_provenance)
    stop_candidate = (trade_signal or {}).get("stopLossCandidate") or {}
    target_candidate = (trade_signal or {}).get("targetPriceCandidate") or {}

    support_values = [
        *[_number(value) for value in support_resistance.get("supportLevels", [])],
        _number(support_resistance.get("nearestSupport")),
        *[_number(item.get("value")) for item in observations.get("visibleSupportPrices", []) if isinstance(item, dict)],
        _number((observations.get("recentLowEstimate") or {}).get("value")),
        _number(stop_candidate.get("price")),
    ]
    resistance_values = [
        *[_number(value) for value in support_resistance.get("resistanceLevels", [])],
        _number(support_resistance.get("nearestResistance")),
        *[_number(item.get("value")) for item in observations.get("visibleResistancePrices", []) if isinstance(item, dict)],
        _number((observations.get("recentHighEstimate") or {}).get("value")),
        _number(target_candidate.get("primary")),
        _number(target_candidate.get("secondary")),
    ]

    supports = _dedupe_levels(support_values)
    resistances = _dedupe_levels(resistance_values)

    if current is not None:
        supports = sorted([level for level in supports if level <= current * 1.005], reverse=True)[:3]
        resistances = sorted([level for level in resistances if level >= current * 0.995])[:3]
    else:
        supports = supports[:3]
        resistances = resistances[:3]

    return {
        "current": current,
        "supports": supports,
        "resistances": resistances,
        "shortStop": supports[0] if supports else None,
        "conservativeStop": supports[1] if len(supports) > 1 else None,
        "midInvalidation": supports[2] if len(supports) > 2 else None,
        "pivot": resistances[0] if resistances else None,
    }


def _sorted_targets(resistances: list[float], trade_signal: dict[str, Any] | None, current: float | None) -> list[float]:
    target_candidate = (trade_signal or {}).get("targetPriceCandidate") or {}
    values = [
        *resistances,
        _number(target_candidate.get("primary")),
        _number(target_candidate.get("secondary")),
    ]
    targets = _dedupe_levels(values)
    if current is not None:
        targets = [target for target in targets if target >= current * 0.995]
    return sorted(targets)[:2]


def _near_resistance(current: float | None, resistance: float | None) -> bool:
    if current is None or resistance is None or resistance <= 0:
        return False
    distance = (resistance - current) / resistance * 100
    return 0 <= distance <= 2.5


def _market_context(
    *,
    current: float | None,
    supports: list[float],
    resistances: list[float],
    pivot: float | None,
    current_risk_reward: float | None,
    breakout_retest_confirmed: bool,
    breakout_target: float | None = None,
    breakout_risk_reward: float | None = None,
) -> dict[str, Any]:
    support = supports[0] if supports else None
    resistance = pivot or (resistances[0] if resistances else None)
    range_position: float | None = None
    near_support = False
    near_resistance = False
    is_extended_move = False
    price_location = "unknown"

    if current is not None and support is not None and current > 0:
        support_distance = abs(current - support) / current * 100
        near_support = 0 <= (current - support) / current * 100 <= 3.0 or support_distance <= 2.0
    if current is not None and resistance is not None and resistance > 0:
        near_resistance = 0 <= (resistance - current) / resistance * 100 <= 2.5

    if current is not None and support is not None and resistance is not None and resistance > support:
        range_position = max(0.0, min(1.0, (current - support) / (resistance - support)))

    support_gap = None
    if current is not None and support is not None and current > 0:
        support_gap = max(0.0, (current - support) / current * 100)
    is_extended_move = bool(
        near_resistance
        and current_risk_reward is not None
        and current_risk_reward < 1
        and support_gap is not None
        and support_gap >= 8
    )
    if (
        not breakout_retest_confirmed
        and current is not None
        and pivot is not None
        and current >= pivot * 0.998
        and breakout_target is not None
        and breakout_target > current * 1.003
        and breakout_risk_reward is not None
        and breakout_risk_reward >= 1
    ):
        breakout_retest_confirmed = True

    if breakout_retest_confirmed:
        price_location = "breakout_area"
    elif is_extended_move:
        price_location = "overextended"
    elif near_support:
        price_location = "near_support"
    elif range_position is not None:
        if range_position <= 0.35:
            price_location = "lower_range"
        elif range_position < 0.70:
            price_location = "middle_range"
        elif near_resistance:
            price_location = "near_resistance"
        else:
            price_location = "upper_range"
    elif near_resistance:
        price_location = "near_resistance"

    return {
        "priceLocation": price_location,
        "rangePosition": round(range_position, 3) if range_position is not None else None,
        "isExtendedMove": is_extended_move,
        "nearSupport": near_support,
        "nearResistance": near_resistance,
        "breakoutRetestConfirmed": breakout_retest_confirmed,
    }


def _chart_regime(
    *,
    market_context: dict[str, Any],
    score_summary: dict[str, Any],
    current: float | None,
    pivot: float | None,
    short_stop: float | None,
    pullback_entry: float | None,
    pullback_stop: float | None,
    pullback_target: float | None,
    current_risk_reward: dict[str, Any],
    pullback_risk_reward: dict[str, Any],
    breakout_risk_reward: dict[str, Any],
    support_broken: bool,
    trend_text: str = "",
) -> dict[str, Any]:
    price_location = str(market_context.get("priceLocation") or "unknown")
    risk_score = int(score_summary.get("riskScore") or 50)
    hold_score = int(score_summary.get("holdScore") or 50)
    current_rr = current_risk_reward.get("value")
    pullback_rr = pullback_risk_reward.get("value")
    breakout_rr = breakout_risk_reward.get("value")
    support_gap = (
        ((current - pullback_entry) / current) * 100
        if current is not None and pullback_entry is not None and current > 0
        else None
    )
    pullback_far_below = support_gap is not None and support_gap >= 8
    upper_or_resistance = bool(market_context.get("nearResistance")) or price_location in ("upper_range", "near_resistance", "overextended")
    poor_current_rr = isinstance(current_rr, (int, float)) and current_rr < 1
    below_pivot = current is not None and pivot is not None and current < pivot * 0.985
    failed_reclaim = current is not None and pivot is not None and current < pivot * 1.005 and not market_context.get("breakoutRetestConfirmed")
    text = trend_text.lower()
    downtrend_text = any(token in text for token in ["하락", "급락", "약세", "lower high", "lower low", "downtrend", "decline", "매물", "구름 아래"])
    uptrend_text = any(token in text for token in ["상승", "우상향", "상승추세", "상승 추세", "higher high", "higher low", "uptrend", "bullish", "rising", "정배열", "구름 지지"])
    strong_uptrend_text = any(token in text for token in ["강한 상승", "뚜렷한 상승", "상승추세", "상승 추세", "higher high", "higher low", "정배열", "rising support", "cloud support", "구름 지지"])
    range_text = any(token in text for token in ["박스", "횡보", "range", "sideways", "레인지", "box"])
    rebound_after_decline = (
        downtrend_text
        and any(token in text for token in ["반등", "회복", "rebound", "recover"])
    )
    weak_support_bounce = price_location in ("near_support", "lower_range") and (not isinstance(pullback_rr, (int, float)) or pullback_rr < 1.5)
    pullback_plan_valid = (
        pullback_entry is not None
        and pullback_stop is not None
        and pullback_target is not None
        and pullback_stop < pullback_entry
        and pullback_target > pullback_entry
    )
    downtrend_score = sum([
        bool(support_broken),
        bool(below_pivot),
        bool(failed_reclaim),
        risk_score >= 65,
        hold_score < 60,
        weak_support_bounce,
        not pullback_plan_valid,
    ])
    overextended_score = sum([
        bool(market_context.get("isExtendedMove")),
        upper_or_resistance,
        poor_current_rr,
        pullback_far_below,
        risk_score >= 60,
    ])
    surge_text = "급등" in text or "과열" in text or "surge" in text or "spike" in text
    overextended_confirmed = surge_text and (bool(market_context.get("isExtendedMove")) or pullback_far_below or risk_score >= 60 or price_location == "overextended")
    uptrend_evidence = strong_uptrend_text or (uptrend_text and not downtrend_text)
    downtrend_rebound_evidence = rebound_after_decline or (
        not market_context.get("breakoutRetestConfirmed")
        and failed_reclaim
        and (upper_or_resistance or below_pivot)
        and downtrend_text
    )
    range_structure_likely = range_text or (
        market_context.get("rangePosition") is not None
        and not uptrend_evidence
        and not downtrend_rebound_evidence
        and not downtrend_text
        and risk_score < 65
        and hold_score >= 45
    )
    target_or_resistance_close = upper_or_resistance and (poor_current_rr or failed_reclaim or (isinstance(current_rr, (int, float)) and current_rr < 1.2))
    clear_downtrend_evidence = (
        support_broken
        or downtrend_text
        or (risk_score >= 70 and below_pivot and failed_reclaim and weak_support_bounce and not upper_or_resistance)
    )
    rebound_should_take_priority = (
        downtrend_rebound_evidence
        and upper_or_resistance
        and risk_score < 70
        and downtrend_score < 6
    )

    if support_broken:
        return {"regime": "support_breakdown", "confidence": "high" if risk_score >= 65 else "medium", "reasons": ["주요 지지선 이탈이 우선 확인됩니다."]}
    if not market_context.get("breakoutRetestConfirmed") and clear_downtrend_evidence and downtrend_score >= 4 and not rebound_should_take_priority:
        reasons = []
        if below_pivot or failed_reclaim:
            reasons.append("피벗 회복 실패 또는 하락 흐름 근거가 남아 있습니다.")
        if weak_support_bounce:
            reasons.append("지지권 반등 가능성은 있으나 추세 전환 확인은 부족합니다.")
        if not reasons:
            reasons.append("하락 위험 요인이 복수로 확인됩니다.")
        return {"regime": "downtrend", "confidence": "high" if support_broken or downtrend_score >= 6 else "medium", "reasons": reasons}
    if not market_context.get("breakoutRetestConfirmed") and downtrend_rebound_evidence:
        reasons = ["하락 이후 반등 구간으로, 주요 저항 회복 확인이 필요합니다."]
        if upper_or_resistance or failed_reclaim:
            reasons.append("현재가는 저항권 또는 전환 가격 테스트 성격이 강합니다.")
        return {"regime": "downtrend_rebound", "confidence": "medium" if upper_or_resistance else "low", "reasons": reasons}
    if overextended_confirmed and upper_or_resistance and poor_current_rr:
        reasons = ["단기 급등 후 저항 또는 목표 구간에 가까워 현재가 손익비가 낮습니다."]
        if pullback_far_below:
            reasons.append("가까운 지지선과의 이격이 커 눌림 확인 전 추격매수 부담이 큽니다.")
        return {"regime": "overextended_surge", "confidence": "high" if overextended_score >= 5 else "medium", "reasons": reasons}
    if market_context.get("breakoutRetestConfirmed"):
        confidence = "high" if isinstance(breakout_rr, (int, float)) and breakout_rr >= 1.5 else "medium"
        return {"regime": "breakout_retest_confirmed", "confidence": confidence, "reasons": ["핵심 전환 가격 위에서 버티는 돌파 후 재지지 구간입니다."]}
    if not market_context.get("breakoutRetestConfirmed") and target_or_resistance_close:
        return {"regime": "resistance_test", "confidence": "medium" if poor_current_rr else "low", "reasons": ["주요 저항 또는 목표 구간을 테스트하고 있어 돌파 후 재지지 확인이 우선입니다."]}
    if market_context.get("nearResistance") and not market_context.get("breakoutRetestConfirmed"):
        return {"regime": "breakout_wait", "confidence": "medium", "reasons": ["저항 또는 전환 가격 근처지만 돌파 후 재지지가 아직 확인되지 않았습니다."]}
    if uptrend_evidence and price_location in ("near_support", "lower_range") and pullback_plan_valid:
        return {"regime": "uptrend_pullback", "confidence": "high" if strong_uptrend_text else "medium", "reasons": ["상승 흐름 속 지지 구간으로 눌림 반응 확인이 우선입니다."]}
    if uptrend_evidence and price_location != "overextended":
        return {"regime": "uptrend_consolidation", "confidence": "medium", "reasons": ["상승 흐름 이후 조정 구간으로 지지 유지와 재상승 확인이 필요합니다."]}
    if price_location in ("upper_range", "near_resistance"):
        return {"regime": "range_upper_resistance" if range_structure_likely else "resistance_test", "confidence": "medium", "reasons": ["박스권 상단 또는 저항권에 가까운 구간입니다."]}
    if price_location in ("near_support", "lower_range") and range_structure_likely:
        return {"regime": "range_lower_support", "confidence": "medium" if pullback_plan_valid else "low", "reasons": ["주요 지지 또는 박스권 하단에 가까워 지지 반응 확인이 우선입니다."]}
    if pullback_plan_valid and isinstance(pullback_rr, (int, float)) and pullback_rr >= 1.2 and risk_score < 70 and uptrend_evidence:
        return {"regime": "healthy_pullback", "confidence": "medium", "reasons": ["눌림목 진입 가격, 손절, 목표가가 비교적 분리되어 있습니다."]}
    if price_location == "middle_range":
        return {"regime": "sideways", "confidence": "low", "reasons": ["지지와 저항 사이에서 방향 확인이 필요한 구간입니다."]}
    return {"regime": "unknown", "confidence": "low", "reasons": ["차트 상태를 분류할 가격 정보가 제한적입니다."]}


def _support_broken(current: float | None, short_stop: float | None) -> bool:
    return current is not None and short_stop is not None and current < short_stop


def _visible_indicator_count(ai_analysis: dict[str, Any]) -> int:
    readings = ai_analysis.get("indicatorReadings") or {}
    return sum(1 for item in readings.values() if isinstance(item, dict) and item.get("visible"))


def _indicator_status(ai_analysis: dict[str, Any], key: str) -> str:
    item = (ai_analysis.get("indicatorReadings") or {}).get(key) or {}
    return str(item.get("status") or item.get("position") or item.get("pricePosition") or item.get("cloudPosition") or "").lower()


def _flatten_observation_text(value: Any, *, limit: int = 32) -> list[str]:
    if limit <= 0 or value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        if not text or text.lower() in {"unknown", "not_visible", "null", "none"}:
            return []
        normalized = text.replace("_", " ")
        return [normalized] if normalized else []
    if isinstance(value, (int, float, bool)):
        return []
    if isinstance(value, list):
        items: list[str] = []
        for item in value:
            items.extend(_flatten_observation_text(item, limit=limit - len(items)))
            if len(items) >= limit:
                break
        return items[:limit]
    if isinstance(value, dict):
        items = []
        for item in value.values():
            items.extend(_flatten_observation_text(item, limit=limit - len(items)))
            if len(items) >= limit:
                break
        return items[:limit]
    return []


def _ai_observation_hint_text(ai_analysis: dict[str, Any]) -> str:
    fields = [
        ai_analysis.get("chartStateHint"),
        ai_analysis.get("setupTypeHint"),
        ai_analysis.get("timeframeAlignmentHint"),
        ai_analysis.get("volatilityContext"),
        ai_analysis.get("visibleConfirmationSignals"),
        ai_analysis.get("visibleInvalidationClues"),
        ai_analysis.get("supportResistanceEvidence"),
        ai_analysis.get("entryScenarioEvidence"),
    ]
    parts: list[str] = []
    for field in fields:
        parts.extend(_flatten_observation_text(field, limit=32 - len(parts)))
        if len(parts) >= 32:
            break
    return " ".join(parts[:32])


def _ai_data_confidence_limitations(ai_analysis: dict[str, Any]) -> list[str]:
    factors = ai_analysis.get("dataConfidenceFactors")
    if not isinstance(factors, dict):
        return []
    limitations = factors.get("limitations")
    if not isinstance(limitations, list):
        return []
    notes = [str(item).strip() for item in limitations if str(item or "").strip()]
    return notes[:2]


def _fallback_score_summary(reason: str = "score calculation failed") -> dict[str, Any]:
    return {
        "totalScore": 50,
        "totalLabel": _score_label(50),
        "label": _score_label(50),
        "buyScore": 50,
        "buyLabel": _buy_score_label(50),
        "holdScore": 50,
        "holdLabel": _hold_score_label(50),
        "riskScore": 50,
        "riskLabel": _risk_score_label(50),
        "explanation": "점수 계산 중 일부 데이터가 부족해 기본 관망 점수로 표시합니다.",
        "scoreFactors": {
            "positive": [],
            "negative": [{"label": "점수 계산 제한", "scoreImpact": 0, "reason": reason}],
            "risk": [],
        },
    }


def _has_validated_pattern_certainty(
    ai_analysis: dict[str, Any],
    pattern_risk_profile: dict[str, Any] | None,
) -> bool:
    if (
        pattern_risk_profile
        and pattern_risk_profile.get("shouldAffectDecision") is True
        and pattern_risk_profile.get("shouldAffectScore") is not False
        and pattern_risk_profile.get("validationLevel") in {"decision", "strong"}
    ):
        return True

    for candidate in ai_analysis.get("patternCandidates") or []:
        if not isinstance(candidate, dict):
            continue
        direction = str(candidate.get("direction") or "").lower()
        breakout_direction = str(candidate.get("breakoutDirection") or "").lower()
        if direction != "bullish" and breakout_direction != "upside_candidate":
            continue
        if _pattern_confidence_score(candidate) < 51:
            continue
        stage = str(candidate.get("stage") or "").lower()
        if stage not in {"forming", "neckline_test", "breakout_test", "confirmed"}:
            continue
        evidence = candidate.get("evidence")
        if not isinstance(evidence, list) or not any(str(item or "").strip() for item in evidence):
            continue
        if not str(candidate.get("confirmationCondition") or "").strip() or not str(candidate.get("invalidationCondition") or "").strip():
            continue
        levels = candidate.get("priceLevels")
        if not isinstance(levels, dict) or not any(
            _number(levels.get(key)) is not None
            for key in ("confirmationLevel", "invalidationLevel", "breakout", "breakoutPrice", "resistance", "support")
        ):
            continue
        return True
    return False


def _calculate_scores(
    *,
    ai_analysis: dict[str, Any],
    current: float | None,
    pivot: float | None,
    short_stop: float | None,
    risk_reward: dict[str, Any],
    support_broken: bool,
    near_resistance: bool,
    breakout_retest_confirmed: bool = False,
    pattern_is_certain: bool = False,
    risk_reward_mode: str = "진입 기준",
) -> dict[str, Any]:
    total_score = 50
    buy_score = 50
    current_entry_score = 50
    pullback_entry_score = 50
    breakout_entry_score = 50
    hold_score = 50
    risk_score = 40
    positive_factors: list[dict[str, Any]] = []
    negative_factors: list[dict[str, Any]] = []
    risk_factors: list[dict[str, Any]] = []
    trend = _status_ko(ai_analysis.get("visualTrend"))
    visible_indicators = _visible_indicator_count(ai_analysis)
    rr_value = risk_reward.get("value")
    ma_status = _indicator_status(ai_analysis, "movingAverages")
    volume_status = _indicator_status(ai_analysis, "volume")
    pattern_uncertain = not pattern_is_certain
    current_text = _format_estimated_zone(current)
    pivot_text = _format_zone(pivot)
    support_text = _format_zone(short_stop)
    unit_meta = _price_unit_meta(
        (ai_analysis.get("symbolDetection") or {}).get("detectedTicker")
        or (ai_analysis.get("symbolDetection") or {}).get("detectedName"),
        current,
    )

    if trend == "상승 추세":
        total_score += 15
        buy_score += 10
        hold_score += 15
        positive_factors.append({"label": "상승 추세 유지", "scoreImpact": 15, "reason": f"{current_text} 기준으로 표시된 차트의 방향성이 아직 상승 쪽으로 해석됩니다."})
    if current is not None and short_stop is not None and current > short_stop:
        total_score += 10
        hold_score += 15
        risk_score -= 10
        positive_factors.append({"label": f"{support_text} 지지 후보 유지", "scoreImpact": 10, "reason": f"현재가가 {support_text} 단기 지지 후보를 아직 이탈하지 않은 상태로 해석됩니다."})
    if any(token in ma_status for token in ["up", "above", "bull", "상승"]):
        total_score += 10
        hold_score += 10
        positive_factors.append({"label": "이동평균선 흐름 우호적", "scoreImpact": 10, "reason": f"{current_text} 부근 가격 흐름이 이동평균선 기준으로 추세 유지 근거를 일부 보강합니다."})
    if any(token in volume_status for token in ["increase", "spike", "high", "증가"]):
        total_score += 5
        buy_score += 10
        risk_score -= 10
        positive_factors.append({"label": "거래량 동반 상승", "scoreImpact": 5, "reason": f"{pivot_text} 돌파 신뢰도를 판단할 때 거래량 증가가 일부 보조 근거가 됩니다."})
    if near_resistance:
        total_score -= 15
        buy_score -= 20
        hold_score -= 5
        risk_score += 15
        negative_factors.append({"label": f"{pivot_text} 저항 구간 근접", "scoreImpact": -15, "reason": f"현재가가 {pivot_text} 핵심 전환 가격 또는 저항 구간에 가까워 현재가 추격매수 손익비가 낮아질 수 있습니다."})
        risk_factors.append({"label": f"{pivot_text} 돌파 실패 위험", "scoreImpact": 15, "reason": f"{pivot_text} 위에서 재지지에 실패하면 단기 변동성이 커질 수 있습니다."})
    if rr_value is None or rr_value < 1:
        total_score -= 15
        buy_score -= 20
        risk_score += 20
        rr_label = "손익비 확인 필요" if rr_value is None else f"{risk_reward_mode} 손익비 {_rr_text(rr_value)} 부족"
        negative_factors.append({"label": rr_label, "scoreImpact": -15, "reason": risk_reward.get("interpretation") or f"{current_text} 기준 목표 대비 손절폭이 커질 수 있어 신규 진입에는 불리합니다."})
        risk_factors.append({"label": rr_label, "scoreImpact": 20, "reason": f"{support_text} 손절 기준 대비 목표 여지가 부족하면 진입 후 변동성 부담이 커질 수 있습니다."})
    elif rr_value >= 1.5:
        buy_score += 15
        risk_score -= 10
        positive_factors.append({"label": f"{risk_reward_mode} 손익비 {_rr_text(rr_value)}", "scoreImpact": 15, "reason": f"{support_text} 단기 손절 기준 대비 목표 여지가 일부 확보됩니다."})
    if visible_indicators < 3:
        total_score -= 5
        buy_score -= 5
        risk_score += 5
        negative_factors.append({"label": "주요 보조지표 확인 제한", "scoreImpact": -5, "reason": "RSI/MACD 등 주요 지표가 명확하지 않아 보수적으로 봅니다."})
        risk_factors.append({"label": "보조지표 확인 제한", "scoreImpact": 5, "reason": "과매수 여부와 모멘텀 판단이 제한됩니다."})
    if pattern_uncertain:
        total_score -= 5
        buy_score -= 10
        risk_score += 10
        negative_factors.append({"label": "패턴 방향 미확정", "scoreImpact": -5, "reason": "패턴은 후보 단계이며 돌파 방향 확인이 필요합니다."})
        risk_factors.append({"label": "패턴 방향 미확정", "scoreImpact": 10, "reason": "패턴 내부 예측 진입은 위험도가 높습니다."})
    if False and support_broken:
        return "SELL_RISK", "손절 위험", "단기 지지선을 이탈해 신규 진입보다 손절 기준과 비중 관리가 우선입니다."
    if False and current_entry_score < 30 and pullback_entry_score < 30 and breakout_entry_score < 30 and hold_score < 40 and risk_score >= 70:
        return "NO_TRADE", "매매 부적합", "현재가, 눌림목, 돌파 진입 조건과 보유 조건이 모두 약해 기술적 대응이 불리합니다."
    if False and risk_score >= 80:
        return "SELL_RISK", "손절 위험", "위험 점수가 높아 신규 진입보다 손절 기준과 비중 관리가 우선입니다."
    if False and breakout_entry_score >= 70 and breakout_retest_confirmed and breakout_rr_value is not None and breakout_rr_value >= 1.5:
        return "BREAKOUT_BUY_CANDIDATE", "돌파 매수 후보", "돌파 후 재지지와 손익비 조건이 확인되면 돌파 진입 후보로 볼 수 있습니다."
    if False and pullback_entry_score >= 70 and current_entry_score < 50 and breakout_entry_score < 65:
        return "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "현재가 진입 불리 / 눌림목 대기 우선", "현재가 진입 손익비는 낮지만 지지 구간에서 눌림목이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입이 더 유리합니다."
    if False and pullback_entry_score >= 65 and current_entry_score >= 50 and risk_score < 60:
        return "PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "현재가보다 주요 지지 확인 후 접근하는 눌림목 진입 조건이 우선입니다."
    if False and breakout_entry_score < 65 and pivot_exists and near_resistance:
        return "BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파와 재지지가 아직 부족해 돌파 확인 후 대응하는 것이 유리합니다."
    if False and current_entry_score < 40 and pullback_entry_score < 50 and hold_score >= 60:
        return "NO_NEW_ENTRY_HOLD_OK", "신규 진입보다 보유 관망 우세", "현재가 신규 진입 조건은 약하지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다."
    if support_broken:
        total_score -= 30
        hold_score -= 30
        risk_score += 30
        negative_factors.append({"label": f"{support_text} 주요 지지선 이탈", "scoreImpact": -30, "reason": f"현재가가 {support_text} 단기 손절 기준을 이탈한 상태로 해석됩니다."})
        risk_factors.append({"label": f"{support_text} 지지 이탈 위험", "scoreImpact": 30, "reason": "단기 상승 관점이 약화되며 손절 또는 비중 축소 기준을 먼저 확인해야 합니다."})

    total_score -= 5
    risk_score += 5
    negative_factors.append({"label": "이미지 기반 분석 한계", "scoreImpact": -5, "reason": f"{current_text} 가격과 지지/저항은 이미지 축 기준 추정값이므로 실제 OHLCV 검증 전까지 보수적으로 봅니다."})
    risk_factors.append({"label": "가격 단위/이미지 추정 한계", "scoreImpact": 5, "reason": f"가격 단위는 {unit_meta['priceUnit']}이며 실제 시세 단위와 차이가 있을 수 있습니다."})

    total = _clamp(total_score, 50)
    buy_score = _clamp(buy_score, 50)
    hold_score = _clamp(hold_score, 50)
    risk_score = _clamp(risk_score, 40)

    if near_resistance or rr_value is None or rr_value < 1:
        buy_score = min(buy_score, 55)
        total = min(total, 64)
    if risk_score >= 60:
        total = min(total, 64)
    if risk_score >= 70:
        total = min(total, 49)
    if hold_score >= 60 and buy_score < 50:
        hold_score = max(hold_score, 60)

    volume_confirmed = any(token in volume_status for token in ["increase", "spike", "high", "증가", "동반"])
    image_only = True
    if near_resistance:
        hold_score = min(hold_score, 85)
    if not breakout_retest_confirmed:
        hold_score = min(hold_score, 82)
    if not volume_confirmed:
        hold_score = min(hold_score, 85)
    if image_only:
        hold_score = min(hold_score, 85)
    if risk_score >= 60:
        hold_score = min(hold_score, 75)
    if risk_score >= 70:
        hold_score = min(hold_score, 65)
    if support_broken:
        hold_score = min(hold_score, 45)

    total_label = _score_label(total)
    return {
        "totalScore": total,
        "totalLabel": total_label,
        "label": total_label,
        "buyScore": buy_score,
        "buyLabel": _buy_score_label(buy_score),
        "holdScore": hold_score,
        "holdLabel": _hold_score_label(hold_score),
        "riskScore": risk_score,
        "riskLabel": _risk_score_label(risk_score),
        "explanation": _score_explanation(trend, near_resistance, buy_score, hold_score, risk_score, pivot),
        "scoreFactors": {
            "positive": positive_factors[:5],
            "negative": negative_factors[:5],
            "risk": risk_factors[:5],
        },
    }


def _score_explanation(trend: str, near_resistance: bool, buy_score: int, hold_score: int, risk_score: int, pivot: float | None) -> str:
    if near_resistance:
        return f"{trend}는 유지될 수 있지만 현재 가격이 {_format_price(pivot)} 저항 구간에 가까워 신규 진입 점수는 낮고, 보유 관망 점수가 상대적으로 높습니다."
    if risk_score >= 70:
        return "위험 점수가 높아 신규 진입보다 손절 기준과 리스크 관리가 우선입니다."
    if hold_score > buy_score and hold_score >= 60:
        return f"{trend}를 참고할 수 있지만 신규 진입보다 보유 관망 쪽 점수가 더 높습니다."
    return "가격대와 손익비 조건을 함께 확인해야 하는 구간입니다."


def _final_action(
    *,
    score_summary: dict[str, Any],
    risk_reward: dict[str, Any],
    pullback_risk_reward: dict[str, Any],
    breakout_risk_reward: dict[str, Any],
    near_resistance: bool,
    near_support: bool,
    price_location: str,
    is_extended_move: bool,
    breakout_retest_confirmed: bool,
    support_broken: bool,
    pivot_exists: bool,
    chart_regime: str = "unknown",
) -> tuple[FinalAction, str, str]:
    rr_value = risk_reward.get("value")
    current_rr_value = rr_value if isinstance(rr_value, (int, float)) else None
    pullback_rr_value = pullback_risk_reward.get("value")
    breakout_rr_value = breakout_risk_reward.get("value")
    best_entry_rr_value = max(
        [value for value in [pullback_rr_value, breakout_rr_value] if isinstance(value, (int, float))],
        default=None,
    )
    buy_score = _clamp(score_summary.get("buyScore"), 50)
    hold_score = _clamp(score_summary.get("holdScore"), 50)
    risk_score = _clamp(score_summary.get("riskScore"), 50)
    entry_scores = score_summary.get("entryScores") or {}
    current_entry_score = _clamp((entry_scores.get("currentEntry") or {}).get("score"), 0)
    pullback_entry_score = _clamp((entry_scores.get("pullbackEntry") or {}).get("score"), 0)
    breakout_entry_score = _clamp((entry_scores.get("breakoutEntry") or {}).get("score"), 0)
    support_area = price_location in ("near_support", "lower_range")
    partial_profit_area = price_location in ("upper_range", "near_resistance", "overextended")
    partial_profit_allowed = (
        near_resistance
        and partial_profit_area
        and current_rr_value is not None
        and current_rr_value < 1
        and hold_score >= 60
        and not support_area
    )
    overextended = is_extended_move or price_location == "overextended"

    if chart_regime == "support_breakdown":
        return "SELL_RISK", "위험 관리 / 신규 진입 보류", "주요 지지선 이탈이 확인되어 신규 진입보다 손절 기준과 비중 관리가 우선입니다."
    if chart_regime == "downtrend":
        if support_area:
            return "WAIT_FOR_SUPPORT_CONFIRMATION", "하락 추세 반등 대기 / 지지 확인 필요", "현재 구간은 기술적 반등 가능성은 있으나, 추세 전환 확인 전까지 신규 진입은 신중해야 합니다."
        if near_resistance:
            return "BREAKOUT_WAIT", "추세 전환 확인 대기", "주요 저항 회복 또는 돌파 후 재지지 확인 전까지 신규 진입은 보류하는 것이 유리합니다."
        return "WAIT_FOR_SUPPORT_CONFIRMATION", "하락 추세 / 신규 진입 보류", "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다. 주요 저항 회복 또는 추세 전환 확인이 필요합니다."
    if chart_regime == "downtrend_rebound":
        title = "저항권 테스트 / 추격매수 주의" if near_resistance else "하락추세 반등 / 돌파 확인 대기"
        return "BREAKOUT_WAIT", title, "하락 이후 반등 구간은 추세 전환 확인 전까지 저항 돌파와 재지지 확인이 우선입니다."
    if chart_regime == "overextended_surge":
        if pullback_entry_score >= 65 and isinstance(pullback_rr_value, (int, float)) and pullback_rr_value >= 1.2:
            return "WAIT_FOR_PULLBACK", "급등 후 눌림 대기 / 지지 확인 시 관심", "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리하고, 주요 지지 구간까지 눌림과 반등 확인이 필요합니다."
        title = "보유자는 일부 익절 고려 / 미보유자는 눌림 대기" if hold_score >= 60 else "급등 후 저항 근접 / 추격매수 주의"
        return "PARTIAL_TAKE_PROFIT", title, "보유자는 일부 익절을 고려할 수 있지만, 미보유자는 주요 지지 구간까지 눌림을 기다리는 전략이 유리합니다."
    if chart_regime == "breakout_retest_confirmed":
        if breakout_entry_score >= 75 and isinstance(breakout_rr_value, (int, float)) and breakout_rr_value >= 1.5:
            return "BREAKOUT_BUY_CANDIDATE", "돌파 후 재지지 확인 / 돌파 매수 후보", "핵심 전환 가격 위에서 재지지가 유지되고 손익비가 충족되면 조건부 돌파 진입 후보로 볼 수 있습니다."
        if breakout_entry_score >= 65:
            return "BREAKOUT_WAIT", "돌파 후 지지 전환 후보 / 확인 필요", "피벗 위에서 버티는 흐름은 확인되지만 이미지 기반 신뢰도와 손익비를 추가 확인해야 합니다."
        return "BREAKOUT_WAIT", "돌파 실패 위험 / 재이탈 주의", "핵심 전환 가격 위 재지지가 약하면 재이탈 시 돌파 실패로 볼 수 있습니다."
    if chart_regime == "resistance_test":
        return "BREAKOUT_WAIT", "저항권 테스트 / 돌파 확인 대기", "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다."
    if chart_regime == "breakout_wait":
        if pullback_entry_score >= 65:
            return "BREAKOUT_WAIT", "돌파 확인 대기 / 눌림목 지지 확인 시 관심", "핵심 전환 가격 돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다."
        return "BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다."
    if chart_regime == "range_upper_resistance":
        if partial_profit_allowed:
            title = "급등 후 저항 근접 / 일부 익절 고려" if overextended else "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의"
            return "PARTIAL_TAKE_PROFIT", title, "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다."
        return "BREAKOUT_WAIT", "돌파 확인 대기", "박스권 상단 또는 저항권에서는 추격매수보다 돌파 후 재지지 확인이 우선입니다."
    if chart_regime == "range_lower_support":
        strong_pullback_setup = pullback_entry_score >= 60 or (pullback_rr_value is not None and pullback_rr_value >= 1.2)
        if strong_pullback_setup:
            return "PULLBACK_BUY_CANDIDATE", "지지권 눌림목 매수 후보", "주요 지지권에서 손절과 목표가가 비교적 분리되어 있어 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다."
        return "WAIT_FOR_SUPPORT_CONFIRMATION", "지지 확인 대기", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다."
    if chart_regime == "uptrend_pullback":
        return "PULLBACK_BUY_CANDIDATE", "상승추세 눌림 / 지지 확인 시 관심", "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다."
    if chart_regime == "uptrend_consolidation":
        return "WAIT_FOR_PULLBACK", "상승추세 조정 / 지지 확인 필요", "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다."
    if chart_regime == "healthy_pullback":
        return "PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다."
    if chart_regime == "sideways":
        return "WAIT_FOR_SUPPORT_CONFIRMATION", "방향 확인 대기", "지지와 저항 사이 중간 구간이어서 돌파 또는 지지 반응 확인이 필요합니다."
    if support_broken:
        return "SELL_RISK", "손절 위험", "단기 지지선을 이탈해 신규 진입보다 손절 기준과 비중 관리가 우선입니다."
    if current_entry_score < 30 and pullback_entry_score < 30 and breakout_entry_score < 30 and hold_score < 40 and risk_score >= 70:
        return "NO_TRADE", "매매 부적합", "현재가, 눌림목, 돌파 진입 조건과 보유 조건이 모두 약하고 위험도가 높습니다."
    if support_area:
        strong_pullback_setup = pullback_entry_score >= 75 or (pullback_rr_value is not None and pullback_rr_value >= 1.5)
        if chart_regime != "range_lower_support" and (pullback_entry_score >= 60 or (pullback_rr_value is not None and pullback_rr_value >= 1.2)):
            return "PULLBACK_BUY_CANDIDATE", "지지권 눌림목 매수 후보", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 지지 반응 확인 후 눌림목 진입을 우선 검토할 수 있습니다."
        if chart_regime == "range_lower_support" and strong_pullback_setup:
            return "PULLBACK_BUY_CANDIDATE", "지지권 눌림목 매수 후보", "주요 지지권에서 손절과 목표가가 비교적 분리되어 있어 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다."
        return "WAIT_FOR_SUPPORT_CONFIRMATION", "지지 확인 대기", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다."
    if risk_score >= 75:
        if hold_score >= 60:
            return "REDUCE_POSITION", "위험 관리 우선 / 신규 진입 보류", "위험 점수가 높아 신규 진입보다 보유 비중 조절과 단기 손절 기준 확인이 우선입니다."
        return "SELL_RISK", "손절 위험", "위험 점수가 높고 보유 조건도 약해 관점 재검토가 필요합니다."
    if breakout_entry_score >= 70 and breakout_retest_confirmed and breakout_rr_value is not None and breakout_rr_value >= 1.5:
        return "BREAKOUT_BUY_CANDIDATE", "돌파 매수 후보", "핵심 전환 가격 돌파 후 재지지가 확인되고 손익비가 충족되면 돌파 진입 후보로 볼 수 있습니다."
    if current_entry_score >= 60 and current_rr_value is not None and current_rr_value >= 1.2 and risk_score < 55 and not overextended:
        return "CONDITIONAL_BUY", "현재가 소액 조건부 진입 / 손절 짧게", "현재가 기준 손익비는 일부 확보되지만 변동성에 대비해 짧은 손절 기준이 필요합니다."
    if pullback_entry_score >= 75 and pullback_entry_score >= current_entry_score and pullback_entry_score >= breakout_entry_score:
        return "PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다."
    if current_entry_score < 50 and pullback_entry_score >= 70 and pullback_entry_score > breakout_entry_score:
        return "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "현재가 진입 불리 / 눌림목 대기 우선", "현재가는 저항 또는 전환 가격에 가까워 손익비가 낮고, 주요 지지 구간에서 반등 확인 후 접근하는 편이 더 유리합니다."
    if breakout_entry_score < 65 and pullback_entry_score >= 65 and pivot_exists and not breakout_retest_confirmed:
        return "BREAKOUT_WAIT", "돌파 확인 대기 / 눌림목 지지 확인 시 관심", "핵심 전환 가격 돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다."
    if breakout_entry_score < 65 and pivot_exists and not breakout_retest_confirmed:
        return "BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다."
    if partial_profit_allowed:
        title = "급등 후 저항 근접 / 일부 익절 고려" if overextended else "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의"
        return "PARTIAL_TAKE_PROFIT", title, "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다."
    if hold_score >= 70 and current_entry_score < hold_score and pullback_entry_score < hold_score:
        return "HOLD_AND_WATCH", "신규 진입보다 보유 관망 우세", "신규 진입 손익비는 제한적이지만, 보유자는 주요 지지선 이탈 전까지 관망할 수 있습니다."
    if near_support and buy_score >= 60 and pullback_rr_value is not None and pullback_rr_value >= 1.2:
        return "PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "주요 지지 부근에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다."
    if buy_score >= 70 and best_entry_rr_value is not None and best_entry_rr_value >= 1.5 and not near_resistance:
        if pullback_entry_score >= breakout_entry_score:
            return "PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "현재가 추격보다 지지 확인 후 눌림목 진입을 우선 검토할 수 있는 구간입니다."
        return "BREAKOUT_WAIT", "돌파 확인 대기", "돌파 진입은 핵심 전환 가격 돌파 후 재지지 확인까지 기다리는 편이 안전합니다."
    if buy_score < 50 and risk_score >= 50:
        if hold_score >= 60:
            return "NO_NEW_ENTRY_HOLD_OK", "신규 진입보다 보유 관망 우세", "신규 진입 조건은 약하지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다."
        return "BREAKOUT_WAIT", "돌파 확인 대기", "위험 요인이 남아 있어 돌파 또는 지지 확인 전까지 신규 진입은 주의가 필요합니다."
    return "WAIT_FOR_PULLBACK", "현재가 진입 불리 / 눌림목 대기 우선", "추가 확인 조건이 나오기 전까지는 주요 지지 구간의 눌림목 반응을 기다리는 편이 보수적입니다."


def _action_state(
    *,
    final_action: str,
    chart_regime: str,
    score_summary: dict[str, Any],
    support_broken: bool,
) -> str:
    entry_scores = score_summary.get("entryScores") or {}
    current_score = _clamp((entry_scores.get("currentEntry") or {}).get("score"), 0)
    pullback_score = _clamp((entry_scores.get("pullbackEntry") or {}).get("score"), 0)
    breakout_score = _clamp((entry_scores.get("breakoutEntry") or {}).get("score"), 0)
    risk_score = _clamp(score_summary.get("riskScore"), 50)

    if final_action == "NO_TRADE" or support_broken or chart_regime == "support_breakdown" or (risk_score >= 85 and max(current_score, pullback_score, breakout_score) <= 40):
        return "AVOID"
    if final_action in {"SELL_RISK", "REDUCE_POSITION"} or chart_regime == "overextended_surge" or risk_score >= 75:
        return "HIGH_RISK"
    if chart_regime == "breakout_retest_confirmed" and breakout_score >= 65 and risk_score < 60:
        return "STRONG_BUY"
    if chart_regime in {"breakout_wait", "range_upper_resistance", "resistance_test", "downtrend_rebound"} or final_action in {"BREAKOUT_WAIT", "WAIT_FOR_BREAKOUT"}:
        return "BREAKOUT_WAIT"
    if chart_regime == "downtrend":
        return "BREAKOUT_WAIT" if breakout_score >= max(current_score, pullback_score) else "HOLD_ONLY"
    if final_action in {"HOLD_AND_WATCH", "NO_NEW_ENTRY_HOLD_OK", "HOLD"}:
        return "HOLD_ONLY"
    if chart_regime in {"uptrend_pullback", "uptrend_consolidation", "range_lower_support", "healthy_pullback"} or final_action in {"PULLBACK_BUY_CANDIDATE", "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED"}:
        return "PULLBACK_ENTRY"
    if final_action in {"BREAKOUT_BUY_CANDIDATE", "CONDITIONAL_BUY", "BUY_CANDIDATE"} and risk_score < 55:
        return "STRONG_BUY"
    return "BREAKOUT_WAIT"

PATTERN_LABELS = {
    "box_range": "박스권 후보",
    "rectangle_breakout": "박스권 돌파 후보",
    "ascending_channel": "상승 채널 후보",
    "descending_channel": "하락 채널 후보",
    "triangle_consolidation": "삼각 수렴 후보",
    "ascending_triangle": "상승 삼각형 후보",
    "descending_triangle": "하락 삼각형 후보",
    "double_bottom": "이중바닥 후보",
    "double_top": "이중천장 후보",
    "head_and_shoulders": "헤드앤숄더 후보",
    "inverse_head_and_shoulders": "역헤드앤숄더 후보",
    "bull_flag": "상승 깃발형 후보",
    "bear_flag": "하락 깃발형 후보",
    "wedge": "쐐기형 후보",
    "support_retest": "지지 재확인 후보",
    "resistance_retest": "저항 재확인 후보",
    "breakout_pullback": "돌파 후 눌림목 후보",
    "breakdown_retest": "지지 이탈 후 되돌림 후보",
    "unknown": "명확한 패턴 없음",
}


def _candidate_name(candidate: dict[str, Any] | None) -> str | None:
    if not candidate:
        return None
    canonical = str(candidate.get("name") or "").strip()
    if canonical in PATTERN_LABELS:
        return PATTERN_LABELS[canonical]
    label = str(candidate.get("label") or "").strip()
    return label or canonical or None


def _ensure_candidate_label(name: str | None) -> str:
    label = (name or "명확한 패턴 없음").strip()
    if label == "명확한 패턴 없음" or "후보" in label or "시나리오" in label:
        return label
    return f"{label} 후보"


def _pattern_analysis(ai_analysis: dict[str, Any]) -> dict[str, Any]:
    candidates = [item for item in ai_analysis.get("patternCandidates") or [] if isinstance(item, dict)]
    primary = candidates[0] if candidates else None
    secondary = candidates[1] if len(candidates) > 1 else None
    primary_evidence = primary.get("evidence") if primary else []
    primary_is_weak = (
        not primary
        or primary.get("confidence") == "low"
        or str(primary.get("name") or "").lower() == "unknown"
        or not primary_evidence
    )

    if not primary_is_weak and primary:
        primary_payload = {
            "name": _ensure_candidate_label(_candidate_name(primary)),
            "confidence": _confidence(primary.get("confidence")),
            "reason": _clean_text(" / ".join((primary.get("evidence") or [])[:3]), "가격 구조상 참고 가능한 패턴 후보입니다."),
            "confirmationCondition": _clean_text(primary.get("confirmationCondition"), "주요 저항 돌파 또는 지지 확인이 필요합니다."),
            "invalidationCondition": _clean_text(primary.get("invalidationCondition"), "주요 지지선 이탈 시 패턴 후보가 약화됩니다."),
            "tradingMeaning": _clean_text(primary.get("tradingImplication") or primary.get("entryLogic"), "패턴 내부 예측 진입보다 이탈 방향 확인 후 대응하는 것이 보수적입니다."),
        }
    else:
        primary_payload = {
            "name": "명확한 패턴 없음",
            "confidence": "low",
            "reason": "현재 이미지에서는 우선순위가 높은 확정 패턴 후보가 뚜렷하지 않습니다.",
            "confirmationCondition": "주요 지지선 또는 저항선에서 추가 반응 확인이 필요합니다.",
            "invalidationCondition": "현재 구조만으로 별도 패턴 무효화 가격을 산정하기 어렵습니다.",
            "tradingMeaning": "패턴보다 지지, 저항, 손익비를 우선 확인해야 하는 구간입니다.",
        }

    return {
        "primaryPattern": primary_payload,
        "secondaryPattern": {
            "name": _ensure_candidate_label(_candidate_name(secondary)),
            "confidence": _confidence(secondary.get("confidence")),
            "reason": _clean_text(" / ".join((secondary.get("evidence") or [])[:2]), "보조 시나리오로만 참고하며, 실제 대응은 지지 확인 또는 저항 돌파 후 재지지 여부를 우선합니다."),
        } if secondary else None,
        "excludedPatterns": [
            {
                "name": _ensure_candidate_label(_candidate_name(item)),
                "reason": "주요 패턴 후보보다 우선순위가 낮아 참고 항목으로 분류했습니다.",
            }
            for item in candidates[2:5]
        ],
    }


BEARISH_PATTERN_NAMES = {
    "head_and_shoulders",
    "double_top",
    "descending_triangle",
    "rising_wedge",
    "failed_breakout",
    "lower_high_reversal",
    "breakdown_risk",
}


def _pattern_confidence_score(candidate: dict[str, Any]) -> int:
    numeric = _number(candidate.get("confidenceScore"))
    if numeric is not None:
        if 0 < numeric <= 1:
            numeric *= 100
        return _clamp(numeric, 30)
    return {"high": 80, "medium": 60, "low": 30}.get(str(candidate.get("confidence") or "").lower(), 30)


def _pattern_level(candidate: dict[str, Any], *keys: str) -> float | None:
    levels = candidate.get("priceLevels") or {}
    if not isinstance(levels, dict):
        return None
    for key in keys:
        value = _number(levels.get(key))
        if value is not None and value > 0:
            return value
    return None


def _canonical_bearish_pattern(candidate: dict[str, Any]) -> str | None:
    name = str(candidate.get("name") or "").strip().lower()
    direction = str(candidate.get("breakoutDirection") or "").strip().lower()
    evidence = " ".join(str(item or "") for item in candidate.get("evidence") or []).lower()
    if name == "wedge" and direction == "downside_candidate":
        return "rising_wedge"
    if name in BEARISH_PATTERN_NAMES:
        return name
    if "failed breakout" in evidence or "돌파 실패" in evidence:
        return "failed_breakout"
    if "lower high" in evidence or "낮아지는 고점" in evidence:
        return "lower_high_reversal"
    return None


def _line_analysis_level(ai_analysis: dict[str, Any], line_type: str) -> float | None:
    for line in ai_analysis.get("lineAnalysis") or []:
        if not isinstance(line, dict) or str(line.get("type") or "").lower() != line_type:
            continue
        price = _number(line.get("price"))
        if price is not None and price > 0:
            return price
        low = _number(line.get("priceLow"))
        high = _number(line.get("priceHigh"))
        if low is not None and high is not None and low > 0 and high > 0:
            return (low + high) / 2
        if low is not None and low > 0:
            return low
        if high is not None and high > 0:
            return high
    return None


def _visual_role_levels(ai_analysis: dict[str, Any], collection: str, role: str) -> list[float]:
    structure = ai_analysis.get("visualStructure") or {}
    if not isinstance(structure, dict):
        return []
    values: list[float] = []
    for point in structure.get(collection) or []:
        if not isinstance(point, dict) or str(point.get("role") or "").lower() != role:
            continue
        price = _number(point.get("price"))
        if price is not None and price > 0:
            values.append(price)
    return values


def _visual_neckline_level(ai_analysis: dict[str, Any]) -> float | None:
    line_level = _line_analysis_level(ai_analysis, "neckline")
    if line_level is not None:
        return line_level
    touches = _visual_role_levels(ai_analysis, "swingLows", "neckline_touch")
    if len(touches) >= 2:
        return sum(touches) / len(touches)
    return None


def _candidate_or_visual_level(
    ai_analysis: dict[str, Any],
    candidate: dict[str, Any],
    level_key: str,
    visual_role: str,
) -> float | None:
    candidate_level = _pattern_level(candidate, level_key)
    if candidate_level is not None:
        return candidate_level
    values = _visual_role_levels(ai_analysis, "swingHighs", visual_role)
    return values[-1] if values else None


def _meaningful_pattern_evidence(candidate: dict[str, Any]) -> list[str]:
    placeholders = (
        "구조 근거가 충분하지 않아",
        "확인 필요",
        "visual resemblance",
        "looks like",
    )
    return [
        str(item).strip()
        for item in candidate.get("evidence") or []
        if str(item).strip() and not any(token in str(item).lower() for token in placeholders)
    ]


def _candidate_decision_levels(
    ai_analysis: dict[str, Any],
    candidate: dict[str, Any],
    canonical: str,
) -> tuple[float | None, float | None, dict[str, float | None]]:
    structural_levels: dict[str, float | None] = {}
    if canonical == "head_and_shoulders":
        structural_levels = {
            "leftShoulder": _candidate_or_visual_level(ai_analysis, candidate, "leftShoulder", "left_shoulder"),
            "head": _candidate_or_visual_level(ai_analysis, candidate, "head", "head"),
            "rightShoulder": _candidate_or_visual_level(ai_analysis, candidate, "rightShoulder", "right_shoulder"),
        }
        neckline = _pattern_level(candidate, "neckline", "breakdown", "breakdownPrice", "confirmationLevel")
        if neckline is None:
            neckline = _visual_neckline_level(ai_analysis)
        structural_levels["neckline"] = neckline
        invalidation = _pattern_level(candidate, "invalidationLevel", "rightShoulder", "resistance", "patternHigh")
        if invalidation is None:
            invalidation = structural_levels["rightShoulder"]
        return neckline, invalidation, structural_levels

    key_keys: dict[str, tuple[str, ...]] = {
        "double_top": ("neckline", "breakdown", "breakdownPrice", "confirmationLevel", "support"),
        "descending_triangle": ("breakdown", "breakdownPrice", "confirmationLevel", "support"),
        "rising_wedge": ("breakdown", "breakdownPrice", "confirmationLevel", "support"),
        "failed_breakout": ("breakout", "breakoutPrice", "confirmationLevel", "resistance"),
        "lower_high_reversal": ("breakdown", "breakdownPrice", "confirmationLevel", "support"),
        "breakdown_risk": ("breakdown", "breakdownPrice", "confirmationLevel", "support"),
    }
    invalidation_keys: dict[str, tuple[str, ...]] = {
        "double_top": ("invalidationLevel", "resistance", "patternHigh"),
        "descending_triangle": ("invalidationLevel", "resistance", "patternHigh"),
        "rising_wedge": ("invalidationLevel", "resistance", "patternHigh"),
        "failed_breakout": ("invalidationLevel", "breakout", "breakoutPrice", "resistance"),
        "lower_high_reversal": ("invalidationLevel", "resistance", "patternHigh"),
        "breakdown_risk": ("invalidationLevel", "resistance", "patternHigh"),
    }
    key_level = _pattern_level(candidate, *key_keys.get(canonical, ("confirmationLevel", "support")))
    invalidation_level = _pattern_level(candidate, *invalidation_keys.get(canonical, ("invalidationLevel", "resistance")))
    if key_level is None and canonical == "double_top":
        key_level = _visual_neckline_level(ai_analysis)
    if key_level is None:
        line_type = "resistance" if canonical == "failed_breakout" else "breakdown_line"
        key_level = _line_analysis_level(ai_analysis, line_type)
    if invalidation_level is None:
        invalidation_level = _line_analysis_level(ai_analysis, "invalidation_line")
    return key_level, invalidation_level, structural_levels


def _validate_pattern_candidate_for_decision(
    ai_analysis: dict[str, Any],
    candidate: dict[str, Any],
    canonical: str,
    *,
    current: float | None,
    breakout_retest_confirmed: bool = False,
) -> dict[str, Any]:
    confidence = _pattern_confidence_score(candidate)
    key_level, invalidation_level, structural_levels = _candidate_decision_levels(
        ai_analysis, candidate, canonical
    )
    stage_candidate = dict(candidate)
    if str(stage_candidate.get("stage") or "").lower() == "breakdown_attempt":
        stage_candidate["stage"] = "breakout_test"
    stage = _resolve_pattern_stage(stage_candidate, canonical, current, key_level, invalidation_level)
    direction = str(candidate.get("direction") or "").lower()
    evidence = _meaningful_pattern_evidence(candidate)
    missing: list[str] = []
    reasons: list[str] = []
    warnings: list[str] = []

    if confidence < 51:
        missing.append("CONFIDENCE_BELOW_51")
    else:
        reasons.append("CONFIDENCE_THRESHOLD_MET")
    if direction != "bearish":
        missing.append("BEARISH_DIRECTION_MISSING")
    else:
        reasons.append("BEARISH_DIRECTION_CONFIRMED")
    if not evidence:
        missing.append("MEANINGFUL_EVIDENCE_MISSING")
    else:
        reasons.append("MEANINGFUL_EVIDENCE_PRESENT")
    if stage == "uncertain":
        missing.append("MEANINGFUL_STAGE_MISSING")
    elif stage == "invalidated":
        reasons.append("PATTERN_INVALIDATED")
    else:
        reasons.append("STAGE_SUPPORTS_REVIEW")

    if canonical == "head_and_shoulders":
        left = structural_levels.get("leftShoulder")
        head = structural_levels.get("head")
        right = structural_levels.get("rightShoulder")
        neckline = structural_levels.get("neckline")
        if left is None:
            missing.append("LEFT_SHOULDER_MISSING")
        if head is None:
            missing.append("HEAD_MISSING")
        if right is None:
            missing.append("RIGHT_SHOULDER_MISSING")
        if neckline is None:
            missing.append("NECKLINE_MISSING")
            warnings.append("PATTERN_HS_SCORE_WITHOUT_NECKLINE")
        if left is not None and head is not None and right is not None:
            if head <= max(left, right) * 1.005:
                missing.append("HEAD_NOT_CLEARLY_ABOVE_SHOULDERS")
            else:
                reasons.append("HEAD_ABOVE_BOTH_SHOULDERS")
        if invalidation_level is None:
            missing.append("INVALIDATION_LEVEL_MISSING")
        if any(item in missing for item in ("LEFT_SHOULDER_MISSING", "HEAD_MISSING", "RIGHT_SHOULDER_MISSING")):
            warnings.append("PATTERN_HS_INCOMPLETE_STRUCTURE")
    else:
        if key_level is None:
            missing.append("DECISION_KEY_LEVEL_MISSING")
        if invalidation_level is None:
            missing.append("INVALIDATION_LEVEL_MISSING")
        if key_level is None or invalidation_level is None:
            warnings.append("PATTERN_MISSING_DECISION_LEVELS")

    complete = not missing
    strong_evidence = complete and (confidence >= 71 or stage in {"confirmed", "failed"})
    if breakout_retest_confirmed and not strong_evidence:
        missing.append("CONFIRMED_BREAKOUT_PROTECTION")
        warnings.append("WEAK_PATTERN_BLOCKED_BY_CONFIRMED_BREAKOUT")
        complete = False
        reasons.append("CONFIRMED_BREAKOUT_PRESERVED")

    should_affect = complete and stage != "invalidated"
    if should_affect:
        validation_level = "strong" if strong_evidence else "decision"
        false_positive_risk = "low"
        reasons.append("STRUCTURE_COMPLETE")
    elif stage == "invalidated":
        validation_level = "none"
        false_positive_risk = "low"
        warnings.append("INVALIDATED_PATTERN_SCORE_CAP_BLOCKED")
    elif confidence >= 51:
        validation_level = "watch"
        false_positive_risk = "high" if canonical == "head_and_shoulders" else "medium"
    else:
        validation_level = "weak"
        false_positive_risk = "high"

    if should_affect and not reasons:
        warnings.append("PATTERN_SCORE_WITHOUT_VALIDATION_REASONS")
    return {
        "validationLevel": validation_level,
        "decisionImpactLevel": validation_level if validation_level in {"decision", "strong"} else "watch" if validation_level == "watch" else "none",
        "shouldAffectDecision": should_affect,
        "shouldAffectScore": should_affect,
        "validationReasons": list(dict.fromkeys(reasons)),
        "missingRequirements": list(dict.fromkeys(missing)),
        "validationWarnings": list(dict.fromkeys(warnings)),
        "falsePositiveRisk": false_positive_risk,
        "confidence": confidence,
        "stage": stage,
        "keyLevelValue": key_level,
        "invalidationLevelValue": invalidation_level,
    }


def _fallback_head_shoulders_candidate(ai_analysis: dict[str, Any], current: float | None) -> dict[str, Any] | None:
    layers = ai_analysis.get("interpretationLayers") or {}
    if not isinstance(layers, dict):
        return None
    structural_risk = str(layers.get("structuralPatternRisk") or "").lower().replace(" ", "")
    if not any(token in structural_risk for token in ("헤드앤숄더", "head_and_shoulders", "head&shoulders", "headandshoulders", "head-and-shoulders", "h&s")):
        return None

    left_values = _visual_role_levels(ai_analysis, "swingHighs", "left_shoulder")
    head_values = _visual_role_levels(ai_analysis, "swingHighs", "head")
    right_values = _visual_role_levels(ai_analysis, "swingHighs", "right_shoulder")
    neckline = _visual_neckline_level(ai_analysis)
    if not left_values or not head_values or not right_values or neckline is None:
        return None

    left_shoulder = left_values[-1]
    head = max(head_values)
    right_shoulder = right_values[-1]
    if head <= max(left_shoulder, right_shoulder) * 1.005:
        return None

    stage = "forming"
    if current is not None:
        distance = abs(current - neckline) / max(abs(neckline), 1)
        if current < neckline * 0.995:
            stage = "confirmed"
        elif distance <= 0.015:
            stage = "neckline_test"

    conflict = ai_analysis.get("patternMomentumConflict") or {}
    has_conflict = isinstance(conflict, dict) and conflict.get("exists") is True
    conflict_explanation = str(conflict.get("explanation") or "").strip() if isinstance(conflict, dict) else ""
    return {
        "name": "head_and_shoulders",
        "label": "헤드앤숄더 의심",
        "category": "reversal",
        "direction": "bearish",
        "stage": stage,
        "confidence": "medium",
        "confidenceScore": 60,
        "source": "image",
        "priceLevels": {
            "leftShoulder": left_shoulder,
            "head": head,
            "rightShoulder": right_shoulder,
            "neckline": neckline,
            "confirmationLevel": neckline,
            "invalidationLevel": right_shoulder,
        },
        "evidence": [
            "왼어깨·머리·오른어깨 역할의 세 고점이 구조화되었습니다.",
            "머리 고점이 양쪽 어깨보다 높고 공통 넥라인 후보가 관찰됩니다.",
        ],
        "breakoutDirection": "downside_candidate",
        "confirmationCondition": f"{_format_price(neckline)} 부근 넥라인 이탈 여부를 확인합니다.",
        "invalidationCondition": f"{_format_price(right_shoulder)} 부근 우어깨 저항 회복 시 패턴 위험이 약화됩니다.",
        "entryLogic": "넥라인 반응과 패턴 무효화 여부 확인 전까지 신규 진입은 신중하게 봅니다.",
        "tradingImplication": str(layers.get("coexistenceSummary") or "").strip() or None,
        "conflictsWithMomentum": has_conflict,
        "conflictExplanation": conflict_explanation or None,
        "riskLevel": "high",
    }


def _resolve_pattern_stage(
    candidate: dict[str, Any],
    canonical: str,
    current: float | None,
    key_level: float | None,
    invalidation_level: float | None,
) -> str:
    explicit = str(candidate.get("stage") or "").lower()
    if explicit == "breakdown_attempt":
        explicit = "breakout_test"
    valid_stages = {"forming", "neckline_test", "breakout_test", "confirmed", "failed", "invalidated", "uncertain"}
    explicit = explicit if explicit in valid_stages else "uncertain"
    if explicit == "failed" and canonical != "failed_breakout":
        explicit = "invalidated"
    if explicit == "invalidated":
        return "invalidated"

    if current is not None and invalidation_level is not None and current >= invalidation_level * 1.005:
        return "invalidated"
    if canonical == "failed_breakout":
        return "failed"
    if current is not None and key_level is not None:
        distance = abs(current - key_level) / max(abs(key_level), 1)
        if current < key_level * 0.995:
            return "confirmed"
        if distance <= 0.015:
            return "neckline_test" if canonical in {"head_and_shoulders", "double_top"} else "breakout_test"
        if explicit in {"confirmed", "neckline_test", "breakout_test", "invalidated"}:
            return "forming"
        return explicit if explicit in {"forming", "uncertain"} else "forming"
    return explicit if explicit in valid_stages else "forming"


def _build_pattern_risk_profile(
    ai_analysis: dict[str, Any],
    *,
    current: float | None,
    supports: list[float],
    resistances: list[float],
    pivot: float | None,
    breakout_retest_confirmed: bool = False,
) -> dict[str, Any] | None:
    ranked: list[tuple[int, int, int, dict[str, Any], str, dict[str, Any]]] = []
    for candidate in ai_analysis.get("patternCandidates") or []:
        if not isinstance(candidate, dict):
            continue
        canonical = _canonical_bearish_pattern(candidate)
        if not canonical:
            continue
        direction = str(candidate.get("breakoutDirection") or "").lower()
        pattern_direction = str(candidate.get("direction") or "").lower()
        if direction not in {"downside_candidate", "neutral", "unknown", ""} or pattern_direction == "bullish":
            continue
        validation = _validate_pattern_candidate_for_decision(
            ai_analysis,
            candidate,
            canonical,
            current=current,
            breakout_retest_confirmed=breakout_retest_confirmed,
        )
        impact_rank = {"none": 0, "weak": 1, "watch": 2, "decision": 3, "strong": 4}.get(
            str(validation.get("validationLevel")), 0
        )
        stage_rank = 2 if validation.get("stage") in {"confirmed", "failed"} else 1
        ranked.append((impact_rank, stage_rank, int(validation["confidence"]), candidate, canonical, validation))

    fallback_candidate = _fallback_head_shoulders_candidate(ai_analysis, current)
    if fallback_candidate is not None:
        fallback_validation = _validate_pattern_candidate_for_decision(
            ai_analysis,
            fallback_candidate,
            "head_and_shoulders",
            current=current,
            breakout_retest_confirmed=breakout_retest_confirmed,
        )
        impact_rank = {"none": 0, "weak": 1, "watch": 2, "decision": 3, "strong": 4}.get(
            str(fallback_validation.get("validationLevel")), 0
        )
        stage_rank = 2 if fallback_validation.get("stage") in {"confirmed", "failed"} else 1
        ranked.append((impact_rank, stage_rank, int(fallback_validation["confidence"]), fallback_candidate, "head_and_shoulders", fallback_validation))

    if not ranked:
        return None

    _, _, confidence, candidate, canonical, validation = max(ranked, key=lambda item: item[:3])
    key_level = validation.get("keyLevelValue")
    invalidation_level = validation.get("invalidationLevelValue")
    stage = str(validation.get("stage") or "uncertain")
    active = bool(validation.get("shouldAffectDecision"))
    strong = active and str(validation.get("validationLevel")) == "strong"

    display_key_level = key_level
    display_invalidation_level = invalidation_level
    if display_key_level is None and not active:
        display_key_level = supports[0] if supports else pivot
    if display_invalidation_level is None and not active:
        display_invalidation_level = pivot or (resistances[0] if resistances else None)

    labels = {
        "head_and_shoulders": "헤드앤숄더",
        "double_top": "이중천장",
        "descending_triangle": "하락 삼각형",
        "rising_wedge": "상승 쐐기",
        "failed_breakout": "돌파 실패",
        "lower_high_reversal": "낮아지는 고점 / 반등 둔화",
        "breakdown_risk": "지지 이탈 위험",
    }
    base_label = labels[canonical]
    pattern_label = f"{base_label} 확인" if stage in {"confirmed", "failed"} else f"{base_label} 의심"
    if canonical == "head_and_shoulders":
        if strong:
            strategy_impact = "하락 전환 위험 / 위험 관리"
            hero_summary = f"{pattern_label} · 넥라인 {_format_price(display_key_level)} 이탈 위험"
        else:
            strategy_impact = "넥라인 확인 / 신규 진입 보류"
            hero_summary = f"{pattern_label} · 넥라인 {_format_price(display_key_level)}"
    elif canonical == "double_top":
        strategy_impact = "저항 돌파 실패 / 지지 이탈 확인"
        hero_summary = f"{pattern_label} · 지지 {_format_price(display_key_level)} 확인"
    elif canonical == "descending_triangle":
        strategy_impact = "하단 지지 이탈 주의"
        hero_summary = f"{pattern_label} · 하단 {_format_price(display_key_level)}"
    elif canonical == "rising_wedge":
        strategy_impact = "과열 상승 둔화 / 이탈 주의"
        hero_summary = f"{pattern_label} · 하단 이탈 확인"
    elif canonical == "failed_breakout":
        strategy_impact = "돌파 실패 / 재돌파 확인"
        hero_summary = f"{pattern_label} · {_format_price(display_invalidation_level or display_key_level)} 회복 확인"
    else:
        strategy_impact = "반등 둔화 / 저항 회복 확인"
        hero_summary = f"{pattern_label} · 저항 회복 확인"

    score_caps = None
    if active:
        score_caps = {
            "currentEntryMax": 25 if strong else 35,
            "pullbackEntryMax": 30 if strong else 45,
            "breakoutRetestMax": 40 if strong else 55,
            "totalSignalMax": 40 if strong else 50,
            "riskScoreMin": 70 if strong else 55,
        }

    confidence_label = "높음" if confidence >= 71 else "보통" if confidence >= 51 else "낮음"
    confirmation = _clean_text(candidate.get("confirmationCondition"), "주요 가격대 회복 또는 지지 확인이 필요합니다.")
    invalidation = _clean_text(candidate.get("invalidationCondition"), "패턴 무효화 가격 확인이 필요합니다.")
    return {
        "primaryPattern": canonical,
        "patternLabel": pattern_label,
        "directionBias": "bearish",
        "confidence": confidence,
        "confidenceLabel": confidence_label,
        "stage": stage,
        "keyLevel": _format_zone(display_key_level),
        "necklineLevel": _format_zone(display_key_level) if canonical in {"head_and_shoulders", "double_top"} else None,
        "breakoutLevel": _format_zone(display_invalidation_level) if canonical == "failed_breakout" else None,
        "invalidationLevel": _format_zone(display_invalidation_level),
        "confirmationCondition": confirmation,
        "invalidationCondition": invalidation,
        "strategyImpact": strategy_impact,
        "riskImpact": "entry_cap" if active else "none",
        "shouldAffectDecision": active,
        "shouldAffectScore": bool(validation.get("shouldAffectScore")),
        "validationLevel": validation.get("validationLevel"),
        "decisionImpactLevel": validation.get("decisionImpactLevel"),
        "validationReasons": validation.get("validationReasons") or [],
        "missingRequirements": validation.get("missingRequirements") or [],
        "validationWarnings": validation.get("validationWarnings") or [],
        "falsePositiveRisk": validation.get("falsePositiveRisk"),
        "scoreCaps": score_caps,
        "heroSummary": hero_summary if active else None,
        "explanation": _clean_text(
            candidate.get("conflictExplanation") or candidate.get("tradingImplication") or candidate.get("entryLogic"),
            "패턴 위험이 해소되기 전까지 신규 진입보다 확인이 우선입니다.",
        ),
        "conflictsWithMomentum": candidate.get("conflictsWithMomentum"),
        "conflictExplanation": candidate.get("conflictExplanation"),
        "source": candidate.get("source"),
    }


def _apply_pattern_score_caps(score_summary: dict[str, Any], profile: dict[str, Any] | None) -> None:
    if not profile or not profile.get("shouldAffectDecision") or profile.get("shouldAffectScore") is False:
        return
    caps = profile.get("scoreCaps") or {}
    entry_scores = score_summary.get("entryScores") or {}
    mapping = [
        ("currentEntry", "currentEntryMax", "패턴 확인 전 현재가 신규 진입은 신중하게 봅니다."),
        ("pullbackEntry", "pullbackEntryMax", "하락 반전 패턴 위험이 있어 지지 반응 확인이 필요합니다."),
        ("breakoutEntry", "breakoutRetestMax", "패턴 무효화 가격 회복과 재지지 전까지 돌파 진입을 제한합니다."),
    ]
    for entry_key, cap_key, explanation in mapping:
        entry = entry_scores.get(entry_key)
        cap = caps.get(cap_key)
        if not isinstance(entry, dict) or not isinstance(cap, (int, float)):
            continue
        entry["score"] = min(_clamp(entry.get("score"), 50), int(cap))
        entry["label"] = "신규 진입 보류" if entry_key == "currentEntry" else "패턴 확인 우선"
        entry["explanation"] = explanation
    score_summary["entryScores"] = entry_scores
    total_cap = caps.get("totalSignalMax")
    risk_floor = caps.get("riskScoreMin")
    if isinstance(total_cap, (int, float)):
        score_summary["totalScore"] = min(_clamp(score_summary.get("totalScore"), 50), int(total_cap))
        score_summary["totalLabel"] = _score_label(score_summary["totalScore"])
        score_summary["label"] = score_summary["totalLabel"]
    if isinstance(risk_floor, (int, float)):
        score_summary["riskScore"] = max(_clamp(score_summary.get("riskScore"), 50), int(risk_floor))
        score_summary["riskLabel"] = _risk_score_label(score_summary["riskScore"])
    warnings = score_summary.setdefault("scoreWarnings", [])
    _append_unique(warnings, "PATTERN_RISK_SCORE_CAPPED")


def _apply_pattern_report_alignment(report: dict[str, Any], profile: dict[str, Any] | None) -> None:
    if not profile or not profile.get("shouldAffectDecision"):
        return
    pattern_name = str(profile.get("primaryPattern") or "")
    stage = str(profile.get("stage") or "uncertain")
    strong = stage in {"confirmed", "failed"} or _clamp(profile.get("confidence"), 0) >= 71
    key_level = _clean_text(profile.get("necklineLevel") or profile.get("keyLevel"), "핵심 가격대")
    invalidation = _clean_text(profile.get("invalidationLevel"), "패턴 무효화 가격")
    final_summary = report.setdefault("finalSummary", {})
    if pattern_name == "head_and_shoulders":
        if strong:
            final_summary.update({
                "finalAction": "SELL_RISK",
                "actionState": "HIGH_RISK",
                "title": "하락 전환 위험 / 위험 관리",
                "oneLineConclusion": f"헤드앤숄더 위험이 확인되어 {key_level} 회복 전까지 신규 진입보다 위험 관리가 우선입니다.",
            })
        else:
            final_summary.update({
                "finalAction": "BREAKOUT_WAIT",
                "actionState": "BREAKOUT_WAIT",
                "title": "넥라인 확인 / 신규 진입 보류",
                "oneLineConclusion": f"헤드앤숄더 의심 구간으로 {key_level} 지지 확인 또는 {invalidation} 회복 전까지 신규 진입은 신중해야 합니다.",
            })
    elif strong:
        final_summary.update({
            "finalAction": "SELL_RISK",
            "actionState": "HIGH_RISK",
            "title": profile.get("strategyImpact") or "하락 전환 위험 / 위험 관리",
            "oneLineConclusion": f"{profile.get('patternLabel')} 위험이 확인되어 신규 진입보다 위험 관리가 우선입니다.",
        })
    else:
        final_summary.update({
            "finalAction": "BREAKOUT_WAIT",
            "actionState": "BREAKOUT_WAIT",
            "title": profile.get("strategyImpact") or "패턴 확인 대기",
            "oneLineConclusion": f"{profile.get('patternLabel')} 후보가 있어 확인 조건 충족 전까지 신규 진입은 신중해야 합니다.",
        })

    guide = report.setdefault("userActionGuide", {})
    guide.update({
        "nonHolder": f"신규 진입은 {key_level} 확인 또는 {invalidation} 회복 전까지 보류합니다.",
        "addBuyer": "패턴 위험이 약화되고 주요 가격대 회복이 확인된 뒤 분할 접근을 검토합니다.",
        "newEntryGuidance": f"{profile.get('strategyImpact')} 기준으로 확인 전 신규 진입은 신중하게 봅니다.",
        "mustConfirmCondition": profile.get("confirmationCondition"),
        "mustNotTradeReason": f"{profile.get('patternLabel')} 위험이 아직 무효화되지 않았습니다.",
        "nextReviewCondition": f"{key_level} 반응 / {invalidation} 회복 여부",
    })
    if strong:
        guide["holderGuidance"] = "보유자는 패턴 핵심 가격 이탈 여부를 확인하고, 회복 실패 시 비중 축소를 검토합니다."

    entry_plan = ((report.get("tradePlan") or {}).get("entry") or {})
    if isinstance(entry_plan.get("currentEntry"), dict):
        entry_plan["currentEntry"]["action"] = "신규 진입 보류"
        entry_plan["currentEntry"]["statusLabel"] = "패턴 확인 우선"
    if isinstance(entry_plan.get("pullbackEntry"), dict):
        entry_plan["pullbackEntry"]["action"] = "지지 반응과 패턴 무효화 확인 후 재검토"
        entry_plan["pullbackEntry"]["statusLabel"] = "패턴 확인 우선"
    if isinstance(entry_plan.get("breakoutEntry"), dict):
        entry_plan["breakoutEntry"]["action"] = "패턴 무효화 가격 회복 후 재지지 확인"
        entry_plan["breakoutEntry"]["statusLabel"] = "저항 회복 확인"

    scenarios = report.get("scenarios") or {}
    bearish = scenarios.get("bearish")
    if isinstance(bearish, dict):
        bearish["condition"] = f"{key_level} 이탈 또는 회복 실패"
        bearish["action"] = "신규 진입보다 손절 기준과 위험 관리를 우선 확인"
    evidence = report.setdefault("evidence", {}).setdefault("riskFactors", [])
    _append_unique(evidence, f"{profile.get('patternLabel')} · {profile.get('strategyImpact')}")
    reasons = report.setdefault("marketContext", {}).setdefault("chartRegimeReasons", [])
    _append_unique(reasons, f"{profile.get('patternLabel')} 패턴 위험이 최종 판단에 반영되었습니다.")


def _indicator_explanation(key: str, raw: str, signal: str) -> str:
    text = raw.lower()
    if key == "rsi":
        if signal == "bullish":
            return "RSI는 과매도권 해소 또는 반등 가능성을 참고할 수 있지만 가격 지지 확인이 함께 필요합니다."
        if signal == "bearish":
            return "RSI가 과열 부담을 시사하면 현재 구간의 신규 진입 부담이 커질 수 있습니다."
        return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아 방향성 판단에는 제한적입니다."
    if key == "macd":
        if signal == "bullish":
            return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다."
        if signal == "bearish":
            return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다."
        return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않습니다."
    if key == "volume":
        if any(token in text for token in ["increase", "spike", "high", "상승", "증가"]):
            return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다."
        if any(token in text for token in ["low", "weak", "decrease", "부족", "감소"]):
            return "뚜렷한 돌파 거래량이 부족해 저항 돌파 신뢰도는 아직 약합니다."
        return "거래량만으로는 강한 매수세를 확인하기 어렵습니다."
    if key == "movingAverages":
        if signal == "bullish":
            return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다."
        if signal == "bearish":
            return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다."
        return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다."
    if key == "ichimoku":
        if any(token in text for token in ["above", "up", "bull", "구름 위", "상승"]):
            return "가격이 구름대 위에 있어 추세상 우호적입니다."
        if any(token in text for token in ["inside", "neutral", "구름 안", "within"]):
            return "가격이 구름대 안에 있어 방향성 확인이 필요합니다."
        if any(token in text for token in ["below", "down", "bear", "구름 아래", "하락"]):
            return "가격이 구름대 아래에 있어 상승 전환 신뢰도는 낮습니다."
        return "일목균형표는 확인되지만 구름대 기준 방향성은 추가 확인이 필요합니다."
    if key == "bollingerBands":
        if signal == "bullish":
            return "볼린저밴드 확장이 확인되면 돌파 흐름을 보조하는 근거가 될 수 있습니다."
        if signal == "bearish":
            return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다."
        return "볼린저밴드만으로는 방향성보다 변동성 확인에 가깝습니다."
    return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인해야 합니다."


def _indicator_explanation_clean(key: str, raw: str, signal: str) -> str:
    text = raw.lower()
    if key == "rsi":
        if signal == "bullish":
            return "RSI는 과매도 해소 또는 매수세 회복 여부를 보조적으로 확인하는 지표입니다."
        if signal == "bearish":
            return "RSI가 과열 구간에 가깝다면 현재가 추격매수 부담이 커질 수 있습니다."
        return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아, 단독으로 진입 타이밍을 판단하기는 어렵습니다."
    if key == "macd":
        if signal == "bullish":
            return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다."
        if signal == "bearish":
            return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다."
        return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아, 돌파 신뢰도를 강하게 보강하기는 어렵습니다."
    if key == "volume":
        if any(token in text for token in ["increase", "spike", "high", "상승", "증가"]):
            return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다."
        if any(token in text for token in ["low", "weak", "decrease", "부족", "감소"]):
            return "뚜렷한 돌파 거래량이 부족해 저항 돌파 신뢰도는 아직 제한적입니다."
        return "거래량만으로는 강한 매수세를 확인하기 어렵습니다."
    if key == "movingAverages":
        if signal == "bullish":
            return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다."
        if signal == "bearish":
            return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다."
        return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다."
    if key == "ichimoku":
        if any(token in text for token in ["above", "up", "bull", "구름 위", "상승"]):
            return "가격이 구름대 위에 있어 추세상 우호적입니다."
        if any(token in text for token in ["inside", "neutral", "구름 안", "within"]):
            return "가격이 구름대 안에 있어 방향성 확인이 필요합니다."
        if any(token in text for token in ["below", "down", "bear", "구름 아래", "하락"]):
            return "가격이 구름대 아래에 있어 상승 전환 신뢰도는 낮습니다."
        return "일목균형표는 이미지 기준으로 일부만 확인되므로 지지/저항 판단은 보조적으로 봐야 합니다."
    if key == "bollingerBands":
        if signal == "bullish":
            return "볼린저밴드 확장이 확인되면 돌파 흐름을 보조하는 근거가 될 수 있습니다."
        if signal == "bearish":
            return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다."
        return "볼린저밴드만으로는 방향성보다 변동성 확인에 가깝습니다."
    return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인하는 보조 근거로 보는 것이 적절합니다."


def _unavailable_indicator_reason_clean(key: str) -> str:
    reasons = {
        "rsi": "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.",
        "macd": "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
        "volume": "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한적입니다.",
        "movingAverages": "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한적입니다.",
        "ichimoku": "일목균형표가 이미지에서 명확히 확인되지 않아 지지/저항 판단에는 제한적입니다.",
        "bollingerBands": "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.",
    }
    return reasons.get(key, "이미지에서 명확히 확인되지 않아 판단에는 제한적입니다.")


def _timeframe_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text or text.lower() == "unknown" or "추정 불가" in text:
        return "이미지 기준 추정"
    if any(marker in text for marker in ["추정", "이미지 기준", "표시된 차트 기준"]):
        return text
    return f"{text} 추정"


def _indicator_analysis(ai_analysis: dict[str, Any]) -> dict[str, list[dict[str, str]]]:
    readings = ai_analysis.get("indicatorReadings") or {}
    labels = {
        "rsi": "RSI",
        "macd": "MACD",
        "bollingerBands": "볼린저밴드",
        "ichimoku": "일목균형표",
        "movingAverages": "이동평균선",
        "volume": "거래량",
    }
    confirmed: list[dict[str, str]] = []
    unavailable: list[dict[str, str]] = []
    for key, label in labels.items():
        item = readings.get(key) or {}
        if item.get("visible"):
            raw = str(item.get("status") or item.get("position") or item.get("pricePosition") or item.get("cloudPosition") or "")
            signal = "bullish" if any(token in raw.lower() for token in ["up", "above", "bull", "상승"]) else "bearish" if any(token in raw.lower() for token in ["down", "below", "bear", "하락"]) else "neutral"
            reason = _indicator_explanation_clean(key, raw, signal)
            confirmed.append({"name": label, "signal": signal, "explanation": _clean_text(reason)})
        else:
            unavailable_reasons = {
                "rsi": "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.",
                "macd": "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
                "volume": "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한적입니다.",
                "movingAverages": "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한적입니다.",
                "ichimoku": "일목균형표 구름대가 이미지에서 명확히 확인되지 않아 구름대 기준 판단은 제한적입니다.",
                "bollingerBands": "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.",
            }
            unavailable.append({"name": label, "reason": _unavailable_indicator_reason_clean(key)})
    return {"confirmed": confirmed, "unavailable": unavailable}


def _analysis_meta(ai_analysis: dict[str, Any], levels: dict[str, Any]) -> dict[str, Any]:
    symbol = (ai_analysis.get("symbolDetection") or {}).get("detectedTicker") or (ai_analysis.get("symbolDetection") or {}).get("detectedName") or "미확인"
    analyzed_at = datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M KST")
    return {
        "symbol": symbol,
        "chartTimeframe": _timeframe_text(ai_analysis.get("timeframeEstimate")),
        "currentPriceZone": _format_estimated_zone(levels["current"]),
        "keyPivotPrice": _format_zone(levels["pivot"]),
        "mainSupports": [_format_zone(value) for value in levels["supports"]],
        "mainResistances": [_format_zone(value) for value in levels["resistances"]],
        "analyzedAt": analyzed_at,
        "dataBasis": "image_only",
        **_price_unit_meta(symbol, levels["current"]),
    }


def _targets_after_pivot(targets: list[float], pivot: float | None) -> list[float]:
    if pivot is None:
        return targets[:2]
    return [target for target in targets if target > pivot * 1.01][:2]


def _price_roles(
    levels: dict[str, Any],
    pullback_targets: list[float],
    breakout_targets: list[float],
    *,
    pullback_stop: float | None = None,
) -> dict[str, Any]:
    supports = [_format_zone(value) for value in levels["supports"]]
    resistances = [_format_zone(value) for value in levels["resistances"]]
    short_value = pullback_stop if pullback_stop is not None else levels["shortStop"]
    conservative_value = levels["conservativeStop"]
    if (
        short_value is not None
        and conservative_value is not None
        and abs(conservative_value - short_value) / max(abs(short_value), 1) * 100 <= 1
    ):
        conservative_value = _distinct_lower_stop(short_value, [*levels["supports"], levels["midInvalidation"]])
    return {
        "current": {
            "priceZone": _format_zone(levels["current"]),
            "meaning": "이미지의 마지막 가격 기준으로 추정한 현재가입니다.",
        },
        "pivot": {
            "priceZone": _format_zone(levels["pivot"]),
            "meaning": "아래에서는 저항, 돌파 후 재지지에 성공하면 지지 전환 근거가 되는 가격대입니다.",
        },
        "pullbackEntry": {
            "priceZone": supports[0] if supports else IMAGE_LIMIT_TEXT,
            "condition": "주요 지지 구간에서 반등 확인 시",
        },
        "breakoutEntry": {
            "priceZone": _format_zone(levels["pivot"]),
            "condition": "핵심 전환 가격 돌파 후 재지지 확인 시",
        },
        "stopLoss": {
            "shortTerm": _format_price(short_value),
            "conservative": _format_price(conservative_value),
            "invalidation": _format_price(levels["midInvalidation"]),
        },
        "targets": {
            "pullbackTargets": [_format_price(target) for target in pullback_targets[:3]],
            "breakoutTargets": [_format_price(target) for target in breakout_targets[:2]],
            "holderTargets": resistances[:3],
        },
    }


def _distinct_lower_stop(entry: float | None, candidates: list[float | None]) -> float | None:
    if entry is None:
        return None
    valid = [
        value for value in candidates
        if value is not None and value > 0 and value < entry * 0.995
    ]
    return max(valid) if valid else None


def _stop_loss_by_entry(
    *,
    current: float | None,
    pullback_entry: float | None,
    pivot: float | None,
    supports: list[float],
    current_stop: float | None,
    pullback_stop: float | None,
    breakout_stop: float | None,
    mid_invalidation: float | None,
    current_rr: dict[str, Any],
) -> dict[str, Any]:
    support_candidates = list(supports)
    current_value = current_stop or _distinct_lower_stop(current, support_candidates)
    pullback_value = pullback_stop or _distinct_lower_stop(pullback_entry, support_candidates)
    breakout_value = breakout_stop or _distinct_lower_stop(pivot, support_candidates)
    current_rr_value = current_rr.get("value")
    current_entry_poor = not isinstance(current_rr_value, (int, float)) or current_rr_value < 1

    current_payload = (
        {
            "priceZone": "손절 기준 확인 필요",
            "condition": "현재가 진입 손익비 확인 필요",
            "explanation": "현재가 진입이 불리한 구간이면 먼저 진입 가능 여부와 짧은 손절 기준을 다시 확인해야 합니다.",
        }
        if current_entry_poor or current_value is None
        else {
            "priceZone": _format_price(current_value),
            "condition": f"{_format_price(current_value)} 이탈",
            "explanation": "현재가 진입을 검토한다면 가까운 단기 지지 이탈을 우선 방어 기준으로 봅니다.",
        }
    )

    pullback_payload = (
        {
            "priceZone": _format_price(pullback_value),
            "condition": f"{_format_price(pullback_value)} 이탈",
            "explanation": "눌림목 진입은 진입 지지선과 같은 가격이 아니라 한 단계 아래 지지 이탈을 실패 기준으로 보는 것이 자연스럽습니다.",
        }
        if pullback_value is not None and pullback_entry is not None and pullback_value < pullback_entry * 0.995
        else {
            "priceZone": "확인 필요",
            "condition": "눌림목 진입 기준 하단 지지 추가 확인 필요",
            "explanation": "눌림목 진입가와 손절가가 같아지면 손익비가 왜곡되므로 별도 하단 지지 확인이 필요합니다.",
        }
    )

    pivot_text = _format_price(pivot)
    breakout_price_text = pivot_text if pivot is not None else _format_price(breakout_value)
    breakout_condition = (
        f"{pivot_text} 재이탈"
        if pivot is not None
        else f"{breakout_price_text} 이탈"
    )
    if pivot is not None and breakout_value is not None and breakout_value < pivot * 0.995:
        breakout_condition = f"{pivot_text} 재이탈 또는 {_format_price(breakout_value)} 이탈"
    return {
        "currentEntry": current_payload,
        "pullbackEntry": pullback_payload,
        "breakoutEntry": {
            "priceZone": breakout_price_text,
            "condition": breakout_condition,
            "explanation": "돌파 진입은 핵심 전환 가격 재이탈 또는 그 아래 지지 이탈을 돌파 실패 기준으로 봅니다.",
        },
        "mediumTermInvalidation": {
            "priceZone": _format_price(mid_invalidation),
            "condition": f"{_format_price(mid_invalidation)} 이탈" if mid_invalidation is not None else "중기 무효화 가격 확인 필요",
            "explanation": "중기 관점 무효화 가격은 단기 손익비 계산에 사용하지 않고 큰 관점 재검토 기준으로만 봅니다.",
        },
    }


def _append_unique(items: list[str], value: str | None) -> None:
    text = str(value or "").strip()
    if text and text not in items:
        items.append(text)


def _same_price_zone(first: float | None, second: float | None, *, tolerance_percent: float = 0.75) -> bool:
    first_value = _number(first)
    second_value = _number(second)
    if first_value is None or second_value is None or second_value <= 0:
        return False
    return abs(first_value - second_value) / max(abs(second_value), 1) * 100 <= tolerance_percent


def _valid_price_text(value: float | None, fallback: str = "확인 필요") -> str:
    text = _format_price(value)
    return fallback if text == IMAGE_LIMIT_TEXT else text


def _valid_zone_text(value: float | None, fallback: str = "확인 필요") -> str:
    text = _format_zone(value)
    return fallback if text == IMAGE_LIMIT_TEXT else text


def _first_distinct_target(
    *,
    entry: float | None,
    pivot: float | None,
    resistance: float | None,
    candidates: list[float],
    min_gap_percent: float = 0.75,
) -> float | None:
    baseline = max([value for value in [entry, pivot, resistance] if value is not None], default=None)
    if baseline is None:
        return candidates[0] if candidates else None
    threshold = baseline * (1 + min_gap_percent / 100)
    for candidate in sorted({round(item, 4) for item in candidates if item is not None and item > 0}):
        if candidate > threshold:
            return candidate
    return None


def _guard_user_facing_text(value: Any) -> Any:
    if isinstance(value, str):
        replacements = {
            "강력 매수": "확인 후 접근",
            "무조건 매수": "확인 후 접근",
            "확정 매수": "확인 후 접근",
            "즉시 매수": "확인 후 접근",
            "적극 매수": "확인 후 접근",
            "전량 매도": "비중 축소 검토",
            "확정 매도": "비중 축소 검토",
            "절대 수익": "조건부 대응",
            "수익 보장": "조건부 대응",
            "보장 수익": "조건부 대응",
            "100%": "조건부",
        }
        text = value
        for source, target in replacements.items():
            text = text.replace(source, target)
        return text
    if isinstance(value, list):
        return [_guard_user_facing_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _guard_user_facing_text(item) for key, item in value.items()}
    return value


def _entry_completeness_warnings(
    *,
    confirmation: str,
    stop_loss: float | None,
    invalidation: float | None,
    target: float | None,
    risk_reward: dict[str, Any],
) -> list[str]:
    warnings: list[str] = []
    if not confirmation or confirmation == "확인 필요":
        _append_unique(warnings, "MISSING_CONFIRMATION")
    if stop_loss is None and invalidation is None:
        _append_unique(warnings, "MISSING_INVALIDATION")
    if target is None:
        _append_unique(warnings, "MISSING_TARGET")
    rr_value = risk_reward.get("value") if isinstance(risk_reward, dict) else None
    if not isinstance(rr_value, (int, float)) or rr_value < 1:
        _append_unique(warnings, "LOW_RR_ENTRY")
    if warnings:
        warnings.insert(0, "SCENARIO_INCOMPLETE")
    return warnings


def _entry_status_label(score_item: dict[str, Any] | None, fallback: str) -> str:
    if not isinstance(score_item, dict):
        return fallback
    return _clean_text(score_item.get("label"), fallback)


def _entry_short_explanation(score_item: dict[str, Any] | None, fallback: str) -> str:
    if not isinstance(score_item, dict):
        return fallback
    return _clean_text(score_item.get("explanation"), fallback)


def _risk_reward_display(risk_reward: dict[str, Any]) -> str:
    value = risk_reward.get("value") if isinstance(risk_reward, dict) else None
    label = risk_reward.get("label") if isinstance(risk_reward, dict) else None
    if isinstance(value, (int, float)):
        return f"{_rr_text(value)} : 1 / {_clean_text(label, '조건부 확인')}"
    return _clean_text(label, "확인 필요")


def _merge_entry_payload(
    existing: dict[str, Any] | None,
    *,
    score_item: dict[str, Any] | None,
    entry_trigger: str,
    confirmation: str,
    stop_loss: float | None,
    invalidation: float | None,
    target1: float | None,
    target2: float | None,
    risk_reward: dict[str, Any],
    position_sizing_hint: str,
    failure_condition: str,
    short_explanation: str,
) -> dict[str, Any]:
    payload = dict(existing or {})
    warnings = _entry_completeness_warnings(
        confirmation=confirmation,
        stop_loss=stop_loss,
        invalidation=invalidation,
        target=target1,
        risk_reward=risk_reward,
    )
    payload.update(
        {
            "entryTrigger": _clean_text(entry_trigger, "확인 필요"),
            "confirmationCondition": _clean_text(confirmation, "확인 필요"),
            "stopLoss": _valid_price_text(stop_loss, "손절 기준 확인 필요"),
            "invalidation": _valid_price_text(invalidation, "무효화 기준 확인 필요"),
            "target1": _valid_price_text(target1, "목표 확인 필요"),
            "target2": _valid_price_text(target2, "확장 목표 확인 필요"),
            "riskReward": _risk_reward_display(risk_reward),
            "positionSizingHint": _clean_text(position_sizing_hint, "비중 제한 / 조건 확인"),
            "failureCondition": _clean_text(failure_condition, "조건 실패 기준 확인 필요"),
            "shortExplanation": _clean_text(short_explanation, "조건 충족 여부를 먼저 확인해야 합니다."),
            "statusLabel": _entry_status_label(score_item, "조건부 확인"),
            "isComplete": not warnings,
            "completenessWarnings": warnings,
        }
    )
    return _guard_user_facing_text(payload)


def _price_role_warning_payload(
    *,
    current: float | None,
    pivot: float | None,
    supports: list[float],
    resistances: list[float],
    targets: list[float],
    current_stop: float | None,
    pullback_stop: float | None,
    short_stop: float | None,
    mid_invalidation: float | None,
) -> tuple[list[str], float | None, str | None]:
    warnings: list[str] = []
    resistance = pivot or (resistances[0] if resistances else None)
    target = targets[0] if targets else None
    promoted_target = _first_distinct_target(
        entry=current,
        pivot=pivot,
        resistance=resistance,
        candidates=targets,
    )
    target_status: str | None = None

    if current is not None and target is not None:
        if target <= current:
            _append_unique(warnings, "TARGET_NOT_ABOVE_ENTRY")
            target_status = "추가 목표 확인 필요"
        if _same_price_zone(current, target):
            _append_unique(warnings, "TARGET_TOO_CLOSE")
            _append_unique(warnings, "PRICE_ROLE_COLLAPSE")
            target_status = "목표 여유 낮음"
    if resistance is not None and current is not None and _same_price_zone(current, resistance):
        _append_unique(warnings, "RESISTANCE_TOO_CLOSE")
    if resistance is not None and target is not None and _same_price_zone(resistance, target):
        _append_unique(warnings, "PRICE_ROLE_COLLAPSE")
        target_status = target_status or "상단 저항 재확인 필요"
    if pivot is not None and target is not None and _same_price_zone(pivot, target):
        _append_unique(warnings, "BREAKOUT_TARGET_OVERLAP")
        target_status = target_status or "추가 목표 확인 필요"

    stop_candidates = [current_stop, pullback_stop, short_stop, mid_invalidation]
    for support in supports[:2]:
        if any(_same_price_zone(support, stop, tolerance_percent=0.5) for stop in stop_candidates):
            _append_unique(warnings, "SUPPORT_STOP_OVERLAP")
            break

    if target_status and promoted_target is not None and target is not None and promoted_target > target and not _same_price_zone(promoted_target, target):
        target_status = None
    return warnings, promoted_target, target_status


def _update_target_status(
    report: dict[str, Any],
    *,
    promoted_target: float | None,
    target_status: str | None,
    warnings: list[str],
) -> None:
    if not warnings and not target_status:
        return
    price_roles = report.setdefault("priceRoles", {})
    existing_warnings = list(price_roles.get("warnings") or [])
    for warning in warnings:
        _append_unique(existing_warnings, warning)
    price_roles["warnings"] = existing_warnings
    if target_status:
        price_roles["targetStatus"] = target_status

    targets_payload = ((report.get("tradePlan") or {}).get("targets") or {})
    first_target = targets_payload.get("firstTarget")
    if isinstance(first_target, dict) and target_status:
        first_target["status"] = target_status
        if promoted_target is None:
            first_target["priceZone"] = target_status
            first_target["action"] = "상단 목표 재확인 필요"
    if isinstance(first_target, dict) and promoted_target is not None and target_status is None:
        first_target["priceZone"] = _format_price(promoted_target)
        first_target["action"] = "중복 가격대를 제외한 다음 목표 후보"


def _score_from_rr(risk_reward: dict[str, Any]) -> int | None:
    value = risk_reward.get("value") if isinstance(risk_reward, dict) else None
    if not isinstance(value, (int, float)):
        return None
    if value < 1:
        return 30
    if value < 1.3:
        return 45
    if value < 1.7:
        return 60
    if value < 2.5:
        return 74
    return 82


def _score_by_regime(regime: str, *, positive: int, neutral: int, defensive: int) -> int:
    if regime in {"support_breakdown", "downtrend"}:
        return defensive
    if regime in {"downtrend_rebound", "resistance_test", "range_upper_resistance", "overextended_surge", "overheated_breakout"}:
        return neutral
    if regime in {"uptrend_pullback", "uptrend_consolidation", "healthy_pullback", "breakout_retest_confirmed"}:
        return positive
    return neutral


def _normalize_score_summary(
    report: dict[str, Any],
    *,
    risk_reward_by_entry: dict[str, dict[str, Any]],
    price_warnings: list[str],
    entry_warnings: list[str],
    support_broken: bool,
    near_resistance: bool,
    breakout_retest_confirmed: bool,
) -> None:
    score_summary = report.setdefault("scoreSummary", {})
    market_context = report.get("marketContext") or {}
    final_summary = report.get("finalSummary") or {}
    regime = str(market_context.get("chartRegime") or "unknown")
    risk_score = _clamp(score_summary.get("riskScore"), 50)
    total_score = _clamp(score_summary.get("totalScore"), 50)
    score_warnings = list(score_summary.get("scoreWarnings") or [])
    confidence = str(final_summary.get("confidence") or "low").lower()
    best_rr_score = max(
        [score for score in (_score_from_rr(item) for item in risk_reward_by_entry.values()) if score is not None],
        default=None,
    )

    trend_score = _score_by_regime(regime, positive=72, neutral=48, defensive=28)
    location_score = 42 if near_resistance else _score_by_regime(regime, positive=66, neutral=54, defensive=30)
    sr_quality_score = 72
    breakout_reliability_score = _clamp(((score_summary.get("entryScores") or {}).get("breakoutEntry") or {}).get("score"), 50)
    risk_reward_score = best_rr_score
    data_confidence_score = 78 if confidence == "high" else 62 if confidence == "medium" else 40

    if support_broken or regime in {"support_breakdown", "downtrend"} or risk_score >= 70:
        trend_score = min(trend_score, 35)
        location_score = min(location_score, 35)
        _append_unique(score_warnings, "SCORE_CAPPED_BY_STATE")
        if total_score > 49:
            _append_unique(score_warnings, "BEARISH_STATE_WITH_HIGH_SCORE")
    if regime in {"downtrend_rebound", "resistance_test", "range_upper_resistance"} and not breakout_retest_confirmed:
        _append_unique(score_warnings, "CURRENT_ENTRY_SCORE_CAPPED")
    if regime in {"overextended_surge", "overheated_breakout"} and not breakout_retest_confirmed:
        _append_unique(score_warnings, "SCORE_CAPPED_BY_STATE")
    if confidence == "low":
        data_confidence_score = min(data_confidence_score, 45)
        _append_unique(score_warnings, "SCORE_CAPPED_BY_CONFIDENCE")
    if entry_warnings:
        _append_unique(score_warnings, "SCORE_CAPPED_BY_INCOMPLETE_SCENARIO")
    if any(code in price_warnings for code in ["TARGET_TOO_CLOSE", "TARGET_NOT_ABOVE_ENTRY", "PRICE_ROLE_COLLAPSE"]):
        sr_quality_score = min(sr_quality_score, 40)
        risk_reward_score = min(risk_reward_score or 40, 40)
        _append_unique(score_warnings, "SCORE_CAPPED_BY_PRICE_COLLAPSE")
    if "BREAKOUT_TARGET_OVERLAP" in price_warnings:
        breakout_reliability_score = min(breakout_reliability_score, 55)
        _append_unique(score_warnings, "BREAKOUT_SCORE_CAPPED")
    if risk_reward_score is not None and risk_reward_score < 45:
        _append_unique(score_warnings, "SCORE_CAPPED_BY_LOW_RR")

    score_summary.update(
        {
            "trendScore": _clamp(trend_score, 50),
            "locationScore": _clamp(location_score, 50),
            "momentumScore": _clamp(score_summary.get("buyScore"), 50),
            "volumeScore": None,
            "srQualityScore": _clamp(sr_quality_score, 60),
            "breakoutReliabilityScore": _clamp(breakout_reliability_score, 50),
            "riskRewardScore": risk_reward_score,
            "volatilityRiskScore": _clamp(score_summary.get("riskScore"), 50),
            "dataConfidenceScore": _clamp(data_confidence_score, 50),
            "scoreWarnings": score_warnings,
        }
    )


def _add_user_action_guidance(
    report: dict[str, Any],
    *,
    pivot: float | None,
    pullback_entry: float | None,
    short_stop: float | None,
    conservative_stop: float | None,
    mid_invalidation: float | None,
    target: float | None,
    support_broken: bool,
    near_resistance: bool,
    price_warnings: list[str],
    entry_warnings: list[str],
) -> None:
    guide = dict(report.get("userActionGuide") or {})
    market_context = report.get("marketContext") or {}
    score_summary = report.get("scoreSummary") or {}
    regime = str(market_context.get("chartRegime") or "unknown")
    final_action = str((report.get("finalSummary") or {}).get("finalAction") or "")
    risk_score = _clamp(score_summary.get("riskScore"), 50)
    pivot_text = _valid_price_text(pivot, "핵심 전환 가격 확인 필요")
    pullback_text = _valid_zone_text(pullback_entry, "주요 지지 확인 필요")
    short_stop_text = _valid_price_text(short_stop, "손절 기준 확인 필요")
    conservative_text = _valid_price_text(conservative_stop, "보수적 기준 확인 필요")
    invalidation_text = _valid_price_text(mid_invalidation, "무효화 기준 확인 필요")
    target_text = _valid_price_text(target, "추가 목표 확인 필요")

    if support_broken or regime == "support_breakdown" or risk_score >= 70:
        new_entry = "신규 진입은 보류하고 손절 기준과 위험 관리가 우선입니다."
        holder = f"보유자는 {short_stop_text} 회복 여부를 확인하고, 회복 실패 시 비중 축소를 검토합니다."
        must_confirm = f"{short_stop_text} 회복 또는 새 지지 확인"
        must_not_trade = "지지 이탈 또는 위험 점수가 높아 확인 전 진입은 불리합니다."
        next_review = f"{short_stop_text} 회복 여부 / {invalidation_text} 이탈 여부"
    elif regime in {"downtrend", "downtrend_rebound", "resistance_test", "range_upper_resistance"} or near_resistance:
        new_entry = f"신규 진입은 {pivot_text} 돌파 후 재지지 확인 전까지 신중하게 봅니다."
        holder = f"보유자는 {pullback_text} 이탈 여부를 기준으로 방어적으로 대응하고, {pivot_text} 돌파 전 추가 매수는 신중합니다."
        must_confirm = f"{pivot_text} 돌파 후 재지지"
        must_not_trade = "저항권 근접 또는 목표 여유 부족으로 추격 진입은 불리합니다." if near_resistance or price_warnings else ""
        next_review = f"{pivot_text} 안착 여부 / {pullback_text} 지지 여부"
    elif regime in {"overextended_surge", "overheated_breakout"} or final_action == "PARTIAL_TAKE_PROFIT":
        new_entry = f"미보유자는 {pullback_text} 눌림 또는 {pivot_text} 재지지 확인 후 접근이 유리합니다."
        holder = "보유자는 저항 반응이 강하면 일부 비중 축소를 검토하되, 재지지가 유지되면 잔여 물량은 관망할 수 있습니다."
        must_confirm = f"{pullback_text} 지지 반응 또는 {pivot_text} 재지지"
        must_not_trade = "단기 과열 또는 목표 근접 구간에서는 추격 진입 부담이 큽니다."
        next_review = f"{target_text} 반응 / {pullback_text} 눌림 여부"
    elif regime in {"uptrend_pullback", "healthy_pullback", "range_lower_support", "uptrend_consolidation"}:
        new_entry = f"{pullback_text} 지지 반응이 확인되면 조건부 진입 후보로 볼 수 있습니다."
        holder = f"보유자는 {short_stop_text} 이탈 전까지 관망 가능하되, {pivot_text} 부근 반응을 확인합니다."
        must_confirm = f"{pullback_text} 지지 반응 확인"
        must_not_trade = "확인 조건이 부족한 경우 선진입보다 분할 접근이 필요합니다." if entry_warnings else ""
        next_review = f"{pullback_text} 지지 유지 / {target_text} 도달 여부"
    else:
        new_entry = "신규 진입은 지지 확인 또는 돌파 후 재지지 확인 이후가 보수적입니다."
        holder = f"보유자는 {short_stop_text} 이탈 여부를 기준으로 대응합니다."
        must_confirm = f"{pullback_text} 지지 또는 {pivot_text} 돌파"
        must_not_trade = "핵심 가격대 또는 손익비가 불명확하면 신규 진입은 신중해야 합니다." if entry_warnings or price_warnings else ""
        next_review = f"{pullback_text} / {pivot_text} 반응 확인"

    guide.update(
        {
            "newEntryGuidance": new_entry,
            "holderGuidance": holder,
            "mustConfirmCondition": must_confirm,
            "mustNotTradeReason": must_not_trade or None,
            "nextReviewCondition": next_review,
            "riskManagementNote": f"단기 {short_stop_text} / 보수적 {conservative_text} / 중기 {invalidation_text} 기준을 분리합니다.",
        }
    )
    report["userActionGuide"] = _guard_user_facing_text(guide)


def _align_trading_report_consistency(
    report: dict[str, Any],
    *,
    current: float | None,
    pivot: float | None,
    supports: list[float],
    resistances: list[float],
    targets: list[float],
    pullback_targets: list[float],
    breakout_targets: list[float],
    current_stop: float | None,
    pullback_stop: float | None,
    breakout_stop: float | None,
    short_stop: float | None,
    conservative_stop: float | None,
    mid_invalidation: float | None,
    risk_reward_by_entry: dict[str, dict[str, Any]],
    support_broken: bool,
    near_resistance: bool,
    breakout_retest_confirmed: bool,
) -> dict[str, Any]:
    all_targets = sorted({round(item, 4) for item in [*targets, *pullback_targets, *breakout_targets] if item is not None and item > 0})
    price_warnings, promoted_target, target_status = _price_role_warning_payload(
        current=current,
        pivot=pivot,
        supports=supports,
        resistances=resistances,
        targets=all_targets,
        current_stop=current_stop,
        pullback_stop=pullback_stop,
        short_stop=short_stop,
        mid_invalidation=mid_invalidation,
    )
    _update_target_status(report, promoted_target=promoted_target, target_status=target_status, warnings=price_warnings)

    entry_scores = (report.get("scoreSummary") or {}).get("entryScores") or {}
    trade_plan = report.setdefault("tradePlan", {})
    entry_plan = trade_plan.setdefault("entry", {})
    final_summary = report.get("finalSummary") or {}
    regime = str((report.get("marketContext") or {}).get("chartRegime") or "unknown")
    target1 = promoted_target or (all_targets[0] if all_targets else None)
    target2 = all_targets[1] if len(all_targets) > 1 and all_targets[1] != target1 else None
    pivot_text = _valid_price_text(pivot, "핵심 전환 가격 확인 필요")
    support_text = _valid_zone_text(supports[0] if supports else None, "주요 지지 확인 필요")

    entry_plan["currentEntry"] = _merge_entry_payload(
        entry_plan.get("currentEntry"),
        score_item=entry_scores.get("currentEntry"),
        entry_trigger="현재가 부근 소액 검토" if regime not in {"support_breakdown", "downtrend"} else "신규 진입 보류",
        confirmation="손절 기준과 목표 여유가 함께 확인되는 경우" if not near_resistance else f"{pivot_text} 돌파 후 재지지 확인",
        stop_loss=current_stop or short_stop,
        invalidation=mid_invalidation,
        target1=target1,
        target2=target2,
        risk_reward=risk_reward_by_entry.get("current") or {},
        position_sizing_hint="소액/분할 접근" if not support_broken and not near_resistance else "신규 진입 신중",
        failure_condition=f"{_valid_price_text(current_stop or short_stop, '손절 기준')} 이탈",
        short_explanation=_entry_short_explanation(entry_scores.get("currentEntry"), "현재가 진입은 손절 기준과 목표 여유를 함께 확인해야 합니다."),
    )
    entry_plan["pullbackEntry"] = _merge_entry_payload(
        entry_plan.get("pullbackEntry"),
        score_item=entry_scores.get("pullbackEntry"),
        entry_trigger=f"{support_text} 반등 확인",
        confirmation=f"{support_text}에서 하락이 멈추고 반등이 확인되는 경우",
        stop_loss=pullback_stop or short_stop,
        invalidation=mid_invalidation,
        target1=pullback_targets[0] if pullback_targets else target1,
        target2=pullback_targets[1] if len(pullback_targets) > 1 else target2,
        risk_reward=risk_reward_by_entry.get("pullback") or {},
        position_sizing_hint="분할 접근 / 지지 이탈 시 축소",
        failure_condition=f"{_valid_price_text(pullback_stop or short_stop, '하단 지지')} 이탈",
        short_explanation=_entry_short_explanation(entry_scores.get("pullbackEntry"), "눌림목은 지지 반응 확인 후 조건부로만 봅니다."),
    )
    entry_plan["breakoutEntry"] = _merge_entry_payload(
        entry_plan.get("breakoutEntry"),
        score_item=entry_scores.get("breakoutEntry"),
        entry_trigger=f"{pivot_text} 돌파 후 재지지",
        confirmation=f"{pivot_text} 위 안착과 재지지 확인",
        stop_loss=breakout_stop or pivot,
        invalidation=pullback_stop or mid_invalidation,
        target1=breakout_targets[0] if breakout_targets else target1,
        target2=breakout_targets[1] if len(breakout_targets) > 1 else target2,
        risk_reward=risk_reward_by_entry.get("breakout") or {},
        position_sizing_hint="안착 확인 후 분할 접근",
        failure_condition=f"{pivot_text} 재이탈",
        short_explanation=_entry_short_explanation(entry_scores.get("breakoutEntry"), "돌파 진입은 재지지가 확인될 때만 후보로 봅니다."),
    )

    entry_warnings: list[str] = []
    for payload in entry_plan.values():
        if isinstance(payload, dict):
            for warning in payload.get("completenessWarnings") or []:
                _append_unique(entry_warnings, warning)

    _add_user_action_guidance(
        report,
        pivot=pivot,
        pullback_entry=supports[0] if supports else None,
        short_stop=short_stop,
        conservative_stop=conservative_stop,
        mid_invalidation=mid_invalidation,
        target=target1,
        support_broken=support_broken,
        near_resistance=near_resistance,
        price_warnings=price_warnings,
        entry_warnings=entry_warnings,
    )
    _normalize_score_summary(
        report,
        risk_reward_by_entry=risk_reward_by_entry,
        price_warnings=price_warnings,
        entry_warnings=entry_warnings,
        support_broken=support_broken,
        near_resistance=near_resistance,
        breakout_retest_confirmed=breakout_retest_confirmed,
    )

    if final_summary:
        report["finalSummary"] = _guard_user_facing_text(final_summary)
    if "scenarios" in report:
        report["scenarios"] = _guard_user_facing_text(report["scenarios"])
    report["tradePlan"]["entry"] = _guard_user_facing_text(entry_plan)
    return report


def generate_trading_report(
    *,
    ai_analysis: dict[str, Any],
    trade_signal: dict[str, Any] | None,
    technical_analysis: dict[str, Any] | None = None,
    data_provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    levels = _collect_levels(ai_analysis, technical_analysis, trade_signal, data_provenance)
    current = levels["current"]
    supports = levels["supports"]
    resistances = levels["resistances"]
    short_stop = levels["shortStop"]
    conservative_stop = levels["conservativeStop"]
    mid_invalidation = levels["midInvalidation"]
    pivot = levels["pivot"]
    targets = _sorted_targets(resistances, trade_signal, current)
    pullback_targets = targets[:3]
    breakout_targets = _targets_after_pivot(targets, pivot)
    current_target = _first_target_above(current, targets)
    first_target = breakout_targets[0] if breakout_targets else None
    second_target = breakout_targets[1] if len(breakout_targets) > 1 else None
    pullback_entry = supports[0] if supports else None
    current_stop = _stop_below_entry(current, [short_stop, conservative_stop])
    pullback_stop = _stop_below_entry(pullback_entry, [short_stop, conservative_stop, mid_invalidation])
    breakout_stop = _stop_below_entry(pivot, [short_stop, conservative_stop])
    risk_reward_by_entry = {
        "current": _risk_reward(current, current_stop, current_target),
        "pullback": _risk_reward(pullback_entry, pullback_stop, pullback_targets[0] if pullback_targets else None),
        "breakout": _risk_reward(pivot, breakout_stop, first_target),
    }
    risk_reward = max(
        [item for item in risk_reward_by_entry.values() if isinstance(item.get("value"), (int, float))],
        key=lambda item: item["value"],
        default=risk_reward_by_entry["breakout"],
    )
    risk_reward_mode = next(
        (
            label
            for key, label in [("current", "현재가 기준"), ("pullback", "눌림목 기준"), ("breakout", "돌파 기준")]
            if risk_reward_by_entry[key] is risk_reward
        ),
        "진입 기준",
    )
    near_resistance = _near_resistance(current, pivot)
    near_support = current is not None and short_stop is not None and current > 0 and 0 <= (current - short_stop) / current * 100 <= 3.0
    breakout_retest_confirmed = current is not None and pivot is not None and current >= pivot * 1.005
    current_rr_value = risk_reward_by_entry["current"].get("value")
    market_context = _market_context(
        current=current,
        supports=supports,
        resistances=resistances,
        pivot=pivot,
        current_risk_reward=current_rr_value if isinstance(current_rr_value, (int, float)) else None,
        breakout_retest_confirmed=breakout_retest_confirmed,
        breakout_target=first_target,
        breakout_risk_reward=risk_reward_by_entry["breakout"].get("value") if isinstance(risk_reward_by_entry["breakout"].get("value"), (int, float)) else None,
    )
    breakout_retest_confirmed = bool(market_context["breakoutRetestConfirmed"])
    near_resistance = bool(market_context["nearResistance"])
    near_support = bool(market_context["nearSupport"])
    support_broken = _support_broken(current, short_stop)
    pattern = _pattern_analysis(ai_analysis)
    pattern_risk_profile = _build_pattern_risk_profile(
        ai_analysis,
        current=current,
        supports=supports,
        resistances=resistances,
        pivot=pivot,
        breakout_retest_confirmed=breakout_retest_confirmed,
    )
    try:
        score_summary = _calculate_scores(
            ai_analysis=ai_analysis,
            current=current,
            pivot=pivot,
            short_stop=short_stop,
            risk_reward=risk_reward,
            support_broken=support_broken,
            near_resistance=near_resistance,
            breakout_retest_confirmed=breakout_retest_confirmed,
            pattern_is_certain=_has_validated_pattern_certainty(ai_analysis, pattern_risk_profile),
            risk_reward_mode=risk_reward_mode,
        )
    except Exception as exc:
        logger.exception("score calculation failed")
        score_summary = _fallback_score_summary(str(exc))
    score_summary["entryScores"] = _entry_scores(
        score_summary,
        risk_reward_by_entry,
        current=current,
        pivot=pivot,
        pullback_entry=pullback_entry,
        pullback_stop=pullback_stop,
        breakout_retest_confirmed=breakout_retest_confirmed,
        near_resistance=near_resistance,
        price_location=str(market_context["priceLocation"]),
        volume_confirmed=any(
            token in _indicator_status(ai_analysis, "volume").lower()
            for token in ["bullish", "increase", "spike", "high", "상승", "동반", "증가"]
        ),
    )
    score_summary["explanation"] = _entry_preference_explanation_clean(
        score_summary,
        pivot=pivot,
        pullback_entry=pullback_entry,
        short_stop=short_stop,
        breakout_target=breakout_targets[0] if breakout_targets else None,
        near_resistance=near_resistance,
        breakout_retest_confirmed=breakout_retest_confirmed,
    )
    observation_hint_text = _ai_observation_hint_text(ai_analysis)
    chart_regime = _chart_regime(
        market_context=market_context,
        score_summary=score_summary,
        current=current,
        pivot=pivot,
        short_stop=short_stop,
        pullback_entry=pullback_entry,
        pullback_stop=pullback_stop,
        pullback_target=pullback_targets[0] if pullback_targets else None,
        current_risk_reward=risk_reward_by_entry["current"],
        pullback_risk_reward=risk_reward_by_entry["pullback"],
        breakout_risk_reward=risk_reward_by_entry["breakout"],
        support_broken=support_broken,
        trend_text=" ".join(
            str(item or "")
            for item in [
                ai_analysis.get("visualTrend"),
                ai_analysis.get("summary"),
                observation_hint_text,
                *(ai_analysis.get("riskNotes") or []),
            ]
        ),
    )
    market_context.update({
        "chartRegime": chart_regime["regime"],
        "chartRegimeConfidence": chart_regime["confidence"],
        "chartRegimeReasons": chart_regime["reasons"],
    })
    regime_name = str(chart_regime["regime"])
    entry_scores_for_regime = score_summary.get("entryScores") or {}

    def cap_entry_score(key: str, cap: int, mode_label: str, explanation: str | None = None) -> None:
        entry = entry_scores_for_regime.get(key) or {}
        entry["score"] = min(_clamp(entry.get("score"), 50), cap)
        entry["label"] = f"{mode_label} {_entry_score_label(entry['score'])}"
        if explanation:
            entry["explanation"] = explanation
        entry_scores_for_regime[key] = entry

    def floor_entry_score(key: str, floor: int, mode_label: str, explanation: str | None = None) -> None:
        entry = entry_scores_for_regime.get(key) or {}
        entry["score"] = max(_clamp(entry.get("score"), 50), floor)
        entry["label"] = f"{mode_label} {_entry_score_label(entry['score'])}"
        if explanation:
            entry["explanation"] = explanation
        entry_scores_for_regime[key] = entry

    if regime_name == "support_breakdown":
        cap_entry_score("currentEntry", 30, "현재가 진입", "주요 지지선 이탈이 확인되어 현재가 신규 진입보다 위험 관리가 우선입니다.")
        cap_entry_score("pullbackEntry", 35, "눌림목 진입", "지지선 회복 전까지 눌림목 진입도 보수적으로 제한해야 합니다.")
        cap_entry_score("breakoutEntry", 40, "돌파 진입", "지지 회복과 저항 돌파 후 재지지 전까지 돌파 진입은 보류합니다.")
    elif regime_name == "downtrend":
        cap_entry_score("currentEntry", 30 if support_broken else 45, "현재가 진입", "하락 추세에서는 지지권 반등만으로 현재가 진입을 강하게 보기 어렵습니다.")
        cap_entry_score("pullbackEntry", 35 if support_broken else 55, "눌림목 진입", "하락 추세에서는 지지권 반등 가능성은 참고하되, 주요 저항 회복 또는 추세 전환 확인이 필요합니다.")
        cap_entry_score("breakoutEntry", 60 if breakout_retest_confirmed else 50, "돌파 진입", "주요 저항 회복과 돌파 후 재지지가 확인되기 전까지는 돌파 진입을 보류합니다.")
    elif regime_name == "downtrend_rebound":
        cap_entry_score("currentEntry", 45, "현재가 진입", "하락 이후 반등 구간에서는 현재가 진입보다 저항 회복 확인이 우선입니다.")
        cap_entry_score("pullbackEntry", 60, "눌림목 진입", "눌림목은 미래 지지 확인 시 관심 구간이며 즉시 매수 우위로 보기는 어렵습니다.")
        cap_entry_score("breakoutEntry", 65 if breakout_retest_confirmed else 60, "돌파 진입", "주요 저항 돌파 후 재지지가 확인되어야 추세 전환 후보로 볼 수 있습니다.")
    elif regime_name == "overextended_surge":
        cap_entry_score("currentEntry", 40, "현재가 진입", "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리합니다.")
        cap_entry_score("breakoutEntry", 60 if breakout_retest_confirmed else 55, "돌파 진입", "급등 후에는 추가 돌파보다 재지지 또는 눌림 확인이 먼저 필요합니다.")
        pullback_entry_score = entry_scores_for_regime.get("pullbackEntry") or {}
        if pullback_entry_score:
            pullback_entry_score["label"] = "눌림 대기"
            pullback_entry_score["explanation"] = "눌림목 진입은 가격이 주요 지지 구간까지 내려와 반등이 확인될 때만 후보로 봅니다."
            entry_scores_for_regime["pullbackEntry"] = pullback_entry_score
    elif regime_name == "breakout_retest_confirmed":
        breakout_rr_value = risk_reward_by_entry["breakout"].get("value")
        if isinstance(breakout_rr_value, (int, float)) and breakout_rr_value >= 1:
            floor_entry_score("breakoutEntry", 75 if breakout_rr_value >= 1.5 else 65, "돌파 진입", "핵심 전환 가격 위에서 재지지가 유지되면 돌파 진입 후보로 볼 수 있습니다.")
    elif regime_name == "resistance_test":
        cap_entry_score("currentEntry", 40, "현재가 진입", "저항권 테스트 구간에서는 현재가 추격매수보다 돌파 후 재지지 확인이 우선입니다.")
        cap_entry_score("pullbackEntry", 65, "눌림목 진입", "눌림목은 향후 지지 구간까지 내려온 뒤 확인할 미래 관심 구간입니다.")
        cap_entry_score("breakoutEntry", 65 if breakout_retest_confirmed else 60, "돌파 진입", "저항 돌파와 재지지가 확인되기 전까지는 돌파 확인 대기가 우선입니다.")
    elif regime_name == "uptrend_pullback":
        floor_entry_score("pullbackEntry", 65, "눌림목 진입", "상승 흐름 속 눌림 구간으로, 지지 반응 확인 시 눌림목 진입 후보로 볼 수 있습니다.")
    elif regime_name == "uptrend_consolidation":
        floor_entry_score("pullbackEntry", 60, "눌림목 진입", "상승 흐름 이후 조정 구간으로 지지 유지와 반등 확인이 필요합니다.")

    score_summary["entryScores"] = entry_scores_for_regime
    _apply_pattern_score_caps(score_summary, pattern_risk_profile)
    final_action, title, conclusion = _final_action(
        score_summary=score_summary,
        risk_reward=risk_reward,
        pullback_risk_reward=risk_reward_by_entry["pullback"],
        breakout_risk_reward=risk_reward_by_entry["breakout"],
        near_resistance=near_resistance,
        near_support=near_support,
        price_location=str(market_context["priceLocation"]),
        is_extended_move=bool(market_context["isExtendedMove"]),
        breakout_retest_confirmed=breakout_retest_confirmed,
        support_broken=support_broken,
        pivot_exists=pivot is not None,
        chart_regime=str(chart_regime["regime"]),
    )

    distinct_conservative_stop = conservative_stop
    if (
        distinct_conservative_stop is not None
        and pullback_stop is not None
        and abs(distinct_conservative_stop - pullback_stop) / max(abs(pullback_stop), 1) * 100 <= 1
    ):
        distinct_conservative_stop = _distinct_lower_stop(pullback_stop, [*supports, mid_invalidation])
    short_stop_text = _format_price(pullback_stop if pullback_stop is not None else short_stop)
    conservative_stop_text = _format_price(distinct_conservative_stop)
    mid_invalidation_text = _format_price(mid_invalidation)
    pivot_text = _format_price(pivot)
    first_target_text = _format_price(first_target)
    second_target_text = _format_price(second_target)
    pullback_target_text = _format_price(pullback_targets[0] if pullback_targets else None)
    pullback_second_target_text = _format_price(pullback_targets[1] if len(pullback_targets) > 1 else None)
    pullback_text = _format_zone(supports[0] if supports else None)
    stop_loss_by_entry = _stop_loss_by_entry(
        current=current,
        pullback_entry=pullback_entry,
        pivot=pivot,
        supports=supports,
        current_stop=current_stop,
        pullback_stop=pullback_stop,
        breakout_stop=breakout_stop,
        mid_invalidation=mid_invalidation,
        current_rr=risk_reward_by_entry["current"],
    )
    transition_note = (
        f"{pivot_text}는 핵심 전환 가격대입니다. 아래에서는 저항으로 작용하지만, 돌파 후 재지지에 성공하면 단기 상승 지속 근거가 됩니다."
        if pivot
        else "핵심 전환 가격은 이미지 기준으로 명확히 산정하기 어렵습니다."
    )
    stop_summary = f"단기 {short_stop_text} 이탈 / 보수적 {conservative_stop_text} 이탈"

    targets_payload: dict[str, Any] = {
        "firstTarget": {
            "priceZone": first_target_text,
            "action": "돌파 진입 기준 1차 목표 후보",
        }
    }
    if second_target is not None:
        targets_payload["secondTarget"] = {
            "priceZone": second_target_text,
            "action": "돌파 진입 기준 2차 목표 후보",
        }
    bullish_targets = [text for text in [first_target_text, second_target_text] if text != IMAGE_LIMIT_TEXT]
    bullish_move_text = (
        f"{' → '.join(bullish_targets)} 순서로 상승 시도 가능"
        if bullish_targets
        else "상단 저항이 확인될 때까지 돌파 지지 여부를 우선 확인"
    )
    support_area = market_context["priceLocation"] in ("near_support", "lower_range")
    profit_area = market_context["priceLocation"] in ("upper_range", "near_resistance", "overextended")
    if support_area and final_action in {"PULLBACK_BUY_CANDIDATE", "WAIT_FOR_SUPPORT_CONFIRMATION", "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "WAIT_FOR_PULLBACK"}:
        support_condition_text = pullback_text if pullback_text != IMAGE_LIMIT_TEXT else short_stop_text
        if support_condition_text != IMAGE_LIMIT_TEXT and support_condition_text not in title:
            title = f"{title} / {support_condition_text} 지지 확인 필요"
        if short_stop_text != IMAGE_LIMIT_TEXT and "이탈 시 관점 약화" not in conclusion:
            conclusion = f"{conclusion} {short_stop_text} 이탈 시 관점 약화에 유의해야 합니다."
    if chart_regime["regime"] == "breakout_retest_confirmed":
        user_action_guide = {
            "nonHolder": "돌파 후 재지지가 유지되면 조건부 진입 후보로 볼 수 있습니다.",
            "holder": "핵심 전환 가격 위에서 유지되는 동안 보유 관망이 가능하며, 다음 저항까지 상승 여지를 볼 수 있습니다.",
            "shortTermTrader": "돌파 가격 재이탈을 손절 기준으로 짧게 대응할 수 있습니다.",
            "addBuyer": "추가 매수는 돌파 가격 위에서 지지가 재확인될 때 분할로 접근하는 것이 유리합니다.",
            "stopLoss": f"{pivot_text} 재이탈 시 돌파 실패로 보고 짧게 대응합니다.",
        }
    elif chart_regime["regime"] == "downtrend":
        user_action_guide = {
            "nonHolder": "추세 전환 확인 전까지 신규 진입은 보류하는 것이 유리합니다.",
            "holder": "주요 지지선 이탈 여부를 우선 확인하고, 반등 시 비중 축소도 고려할 수 있습니다.",
            "shortTermTrader": "반등 매매는 짧은 손절 기준이 필요하며, 무리한 추격 진입은 피하는 것이 좋습니다.",
            "addBuyer": "추가 매수는 주요 저항 회복 또는 돌파 후 재지지 확인 이후가 안전합니다.",
            "stopLoss": "단기 지지 이탈 시 손절, 하위 지지 이탈 시 관점 약화로 구분합니다.",
        }
    elif chart_regime["regime"] == "overextended_surge":
        user_action_guide = {
            "nonHolder": "단기 급등 후 저항 구간에 가까워 추격매수는 피하고, 눌림 또는 돌파 후 재지지 확인까지 대기하는 것이 유리합니다.",
            "holder": "보유자는 일부 익절을 고려할 수 있지만, 돌파 후 재지지가 유지되면 잔여 물량은 관망할 수 있습니다.",
            "shortTermTrader": "급등 이후 변동성이 커질 수 있어 짧은 손절 기준 없이 추격 진입하는 것은 불리합니다.",
            "addBuyer": f"추가 매수는 {pullback_text} 지지 확인 또는 {pivot_text} 돌파 후 재지지 확인 이후가 안전합니다.",
            "stopLoss": stop_summary,
        }
    elif support_area:
        user_action_guide = {
            "nonHolder": "주요 지지 구간에서 반등 확인 후 눌림목 진입을 검토할 수 있습니다.",
            "holder": "주요 지지선 이탈 전까지 보유 관망이 가능하며, 저항 돌파 전까지는 무리한 추가 매수보다 확인이 우선입니다.",
            "shortTermTrader": "지지 구간 반등 확인 시 짧은 손절 기준을 두고 대응할 수 있습니다.",
            "addBuyer": "추가 매수는 지지 반응 확인 후 분할로 접근하는 것이 유리합니다.",
            "stopLoss": "단기 지지 이탈 시 손절, 하위 지지 이탈 시 관점 약화로 구분합니다.",
        }
    elif profit_area:
        user_action_guide = {
            "nonHolder": "추격매수는 불리하며, 돌파 후 재지지 또는 눌림목 확인 전까지 대기가 유리합니다.",
            "holder": "저항 구간에서는 일부 익절을 고려하되, 돌파 후 재지지에 성공하면 잔여 물량은 보유할 수 있습니다.",
            "shortTermTrader": f"{pivot_text} 부근에서는 짧은 손절 기준 없이 진입하면 손익비가 불리합니다.",
            "addBuyer": f"{pullback_text} 지지 확인 또는 {pivot_text} 돌파 후 재지지 확인 이후가 유리합니다.",
            "stopLoss": stop_summary,
        }
    else:
        user_action_guide = {
            "nonHolder": f"{pullback_text} 지지 확인 또는 {pivot_text} 돌파 후 재지지까지 기다리는 것이 보수적입니다.",
            "holder": f"주요 지지선 이탈 전까지 보유 관망이 가능하며, {pivot_text} 부근에서는 돌파 확인이 필요합니다.",
            "shortTermTrader": f"{pivot_text} 부근에서는 짧은 손절 기준 없이 추격 진입하면 손익비가 불리할 수 있습니다.",
            "addBuyer": f"{pullback_text} 지지 확인 또는 {pivot_text} 돌파 후 재지지 확인 전까지 추가 매수는 보류합니다.",
            "stopLoss": stop_summary,
        }
    action_state = _action_state(
        final_action=final_action,
        chart_regime=str(chart_regime["regime"]),
        score_summary=score_summary,
        support_broken=support_broken,
    )

    report = {
        "analysisMeta": _analysis_meta(ai_analysis, levels),
        "dataProvenance": data_provenance,
        "patternRiskProfile": pattern_risk_profile,
        "marketContext": market_context,
        "finalSummary": {
            "finalAction": final_action,
            "actionState": action_state,
            "title": title,
            "oneLineConclusion": conclusion,
            "confidence": "medium" if _visible_indicator_count(ai_analysis) >= 3 and current else "low",
            "reason": transition_note,
        },
        "scoreSummary": score_summary,
        "userActionGuide": user_action_guide,
        "tradePlan": {
            "entry": {
                "pullbackEntry": {
                    "priceZone": pullback_text,
                    "condition": "주요 지지 구간에서 하락이 멈추고 반등을 확인하는 경우",
                    "action": "눌림목 지지 확인 후 진입 후보로만 참고",
                },
                "breakoutEntry": {
                    "priceZone": f"{pivot_text} 돌파 후 재지지",
                    "condition": "주요 저항 돌파 후 해당 가격 위에서 버티는 경우",
                    "action": "돌파 후 안착 확인 시 진입 후보로 참고",
                },
                "noChaseZone": {
                    "priceZone": _format_zone(pivot),
                    "reason": "현재 가격이 저항 또는 목표가에 가까우면 추격매수보다 확인이 우선입니다.",
                },
            },
            "stopLoss": {
                "priceZone": stop_summary,
                "condition": "단기 지지선 또는 다음 하단 지지선 이탈",
                "meaning": "단기 손절과 중기 무효화 조건을 분리합니다.",
                "shortTerm": {
                    "priceZone": short_stop_text,
                    "condition": f"{short_stop_text} 이탈",
                    "meaning": "단기 매매 관점의 손절 기준입니다.",
                },
                "conservative": {
                    "priceZone": conservative_stop_text,
                    "condition": f"{conservative_stop_text} 이탈" if distinct_conservative_stop else "보수적 손절 가격 추가 확인 필요",
                    "meaning": "보수적 리스크 관리 기준입니다.",
                },
            },
            "stopLossByEntry": stop_loss_by_entry,
            "targets": targets_payload,
            "invalidation": {
                "condition": f"{mid_invalidation_text} 이탈 시 중기 상승 관점을 폐기합니다." if mid_invalidation else IMAGE_LIMIT_TEXT,
                "meaning": "중기 관점 무효화 가격은 단기 손익비 계산에 사용하지 않습니다.",
                "midTerm": {
                    "priceZone": mid_invalidation_text,
                    "condition": f"{mid_invalidation_text} 이탈" if mid_invalidation else IMAGE_LIMIT_TEXT,
                    "meaning": "중기 상승 관점 무효화 기준입니다.",
                },
            },
            "riskReward": risk_reward,
            "riskRewardByEntry": risk_reward_by_entry,
            "transitionLevel": {
                "priceZone": _format_zone(pivot),
                "explanation": transition_note,
            },
        },
        "keyLevels": {
            "supports": [
                {
                    "label": f"{index + 1}차 지지",
                    "priceZone": _format_zone(value),
                    "meaning": "이탈 시 단기 추세가 약화될 수 있는 가격대입니다.",
                    "reliability": "medium" if index == 0 else "low",
                }
                for index, value in enumerate(supports[:3])
            ],
            "resistances": [
                {
                    "label": f"{index + 1}차 저항",
                    "priceZone": _format_zone(value),
                    "meaning": transition_note if index == 0 else ("돌파 진입 기준 1차 목표 후보입니다." if index == 1 else "확장 목표 후보입니다."),
                    "reliability": "medium" if index == 0 else "low",
                }
                for index, value in enumerate(resistances[:3])
            ],
        },
        "scenarios": {
            "bullish": {
                "condition": f"{pivot_text} 돌파 후 재지지",
                "expectedMove": bullish_move_text,
                "action": "돌파 후 안착 확인 시 진입 후보로 참고",
            },
            "neutral": {
                "condition": f"{pullback_text} ~ {_format_zone(pivot)} 사이 등락",
                "expectedMove": "박스권 또는 방향 탐색 구간 지속",
                "action": "상단 추격매수보다 하단 지지 확인 우선",
            },
            "bearish": {
                "condition": f"{short_stop_text} 이탈",
                "expectedMove": "단기 상승 관점 약화",
                "action": f"단기 손절 또는 비중 축소를 고려하고, 중기 무효화는 {mid_invalidation_text} 이탈 기준으로 별도 확인합니다.",
            },
        },
        "patternAnalysis": pattern,
        "indicatorAnalysis": _indicator_analysis(ai_analysis),
        "evidence": {
            "positive": [
                f"{_status_ko(ai_analysis.get('visualTrend'))} 흐름을 참고할 수 있습니다.",
                f"{pullback_text} 지지 후보가 확인됩니다.",
            ],
            "negative": [
                f"{_format_zone(pivot)} 저항 후보가 가까워 추격 진입은 불리할 수 있습니다.",
                risk_reward["interpretation"],
            ],
            "riskFactors": [
                "이미지 기반 추정값이므로 실제 가격과 차이가 있을 수 있습니다.",
                "확인되지 않은 보조지표는 메인 판단 근거로 강하게 사용하지 않습니다.",
                *_ai_data_confidence_limitations(ai_analysis),
            ],
        },
        "disclaimer": DISCLAIMER,
    }
    report["priceRoles"] = _price_roles(levels, pullback_targets, breakout_targets, pullback_stop=pullback_stop)
    guide_pivot = _format_zone(pivot)
    guide_pullback = _format_zone(pullback_entry)
    guide_short_stop = _format_price(short_stop)
    guide_conservative_stop = _format_price(conservative_stop)
    guide_invalidation = _format_price(mid_invalidation)
    if final_action == "BREAKOUT_WAIT" and title == "돌파 확인 대기 / 눌림목 지지 확인 시 관심":
        report["userActionGuide"] = {
            "nonHolder": "돌파 확인 전까지 무리한 진입은 피하되, 주요 지지 구간에서 반등이 확인되면 눌림목 진입을 검토할 수 있습니다.",
            "holder": "주요 지지선 이탈 전까지 보유 관망이 가능하며, 핵심 전환 가격 돌파 여부를 확인해야 합니다.",
            "shortTermTrader": "지지 반응이 나오면 짧은 손절 기준을 두고 대응할 수 있습니다.",
            "addBuyer": "추가 매수는 지지 반응 확인 또는 돌파 후 재지지 확인 이후가 유리합니다.",
            "stopLoss": f"단기 {guide_short_stop} / 보수적 {guide_conservative_stop} / 중기 무효화 {guide_invalidation}를 분리해서 대응합니다.",
        }
    else:
        report["userActionGuide"] = {
            "nonHolder": f"현재가가 {guide_pivot}에 가까우면 추격매수는 불리합니다. {guide_pullback} 지지 확인 또는 돌파 후 재지지까지 기다리는 전략이 유리합니다.",
            "holder": f"주요 지지선 이탈 전까지 보유 관망이 가능하며, {guide_pivot} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.",
            "shortTermTrader": f"{guide_pivot} 부근에서는 짧은 손절 기준 없이 진입하면 손익비가 불리합니다.",
            "addBuyer": f"추가 매수는 현재가보다 {guide_pullback} 지지 확인 또는 {guide_pivot} 돌파 후 재지지 확인 이후가 유리합니다.",
            "stopLoss": f"단기 {guide_short_stop} / 보수적 {guide_conservative_stop} / 중기 무효화 {guide_invalidation}를 분리해서 대응합니다.",
        }
    report["tradePlan"]["targets"]["pullbackTargets"] = {
        "firstTarget": {"priceZone": pullback_target_text, "action": "눌림목 진입 기준 1차 목표"},
        "secondTarget": {"priceZone": pullback_second_target_text, "action": "눌림목 진입 기준 2차 목표"},
    }
    _align_trading_report_consistency(
        report,
        current=current,
        pivot=pivot,
        supports=supports,
        resistances=resistances,
        targets=targets,
        pullback_targets=pullback_targets,
        breakout_targets=breakout_targets,
        current_stop=current_stop,
        pullback_stop=pullback_stop,
        breakout_stop=breakout_stop,
        short_stop=short_stop,
        conservative_stop=conservative_stop,
        mid_invalidation=mid_invalidation,
        risk_reward_by_entry=risk_reward_by_entry,
        support_broken=support_broken,
        near_resistance=near_resistance,
        breakout_retest_confirmed=breakout_retest_confirmed,
    )
    _apply_pattern_score_caps(report.get("scoreSummary") or {}, pattern_risk_profile)
    _apply_pattern_report_alignment(report, pattern_risk_profile)
    return report

