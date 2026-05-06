from __future__ import annotations

import re
from typing import Any


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round(value: float | None, digits: int = 4) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def parse_price_from_text(value: str) -> float | None:
    if not value:
        return None

    normalized = value.replace(",", "")
    match = re.search(r"(-?\d+(?:\.\d+)?)", normalized)
    if not match:
        return None
    return _to_float(match.group(1))


def _extract_zone_price(zone: dict[str, Any]) -> float | None:
    for candidate in (zone.get("value"), zone.get("label"), zone.get("note")):
        if isinstance(candidate, (int, float)):
            return float(candidate)
        if isinstance(candidate, str):
            parsed = parse_price_from_text(candidate)
            if parsed is not None:
                return parsed
    return None


def _nearest(price: float | None, levels: list[float], prefer: str) -> float | None:
    if not levels:
        return None
    if price is None:
        return levels[0]

    if prefer == "below":
        candidates = [level for level in levels if level <= price]
    else:
        candidates = [level for level in levels if level >= price]

    if not candidates:
        candidates = levels

    return min(candidates, key=lambda level: abs(level - price))


def _distance_percent(current_price: float | None, level: float | None) -> float | None:
    if current_price is None or level is None or level == 0:
        return None
    return ((current_price - level) / level) * 100


def extract_visual_price_levels(ai_analysis: dict[str, Any]) -> dict[str, Any]:
    observations = ai_analysis.get("priceAxisObservations") or {}
    indicators = ai_analysis.get("indicatorReadings") or {}

    current = observations.get("currentPriceEstimate") or {}
    current_price = _to_float(current.get("value"))
    current_confidence = current.get("confidence") or "unavailable"

    support_prices = [
        price
        for price in (_to_float(item.get("value")) for item in observations.get("visibleSupportPrices", []))
        if price is not None
    ]
    resistance_prices = [
        price
        for price in (_to_float(item.get("value")) for item in observations.get("visibleResistancePrices", []))
        if price is not None
    ]

    if not support_prices:
        support_prices = [
            price
            for price in (_extract_zone_price(zone) for zone in ai_analysis.get("visualSupportZones", []))
            if price is not None
        ]

    if not resistance_prices:
        resistance_prices = [
            price
            for price in (_extract_zone_price(zone) for zone in ai_analysis.get("visualResistanceZones", []))
            if price is not None
        ]

    support_prices = sorted(set(round(price, 4) for price in support_prices))
    resistance_prices = sorted(set(round(price, 4) for price in resistance_prices))

    recent_high = observations.get("recentHighEstimate") or {}
    recent_low = observations.get("recentLowEstimate") or {}
    bollinger = indicators.get("bollingerBands") or {}

    return {
        "currentPriceEstimate": current_price,
        "currentPriceConfidence": current_confidence,
        "supportPrices": support_prices,
        "resistancePrices": resistance_prices,
        "nearestSupport": _nearest(current_price, support_prices, "below"),
        "nearestResistance": _nearest(current_price, resistance_prices, "above"),
        "recentHighEstimate": _to_float(recent_high.get("value")),
        "recentLowEstimate": _to_float(recent_low.get("value")),
        "bollingerUpperEstimate": _to_float(bollinger.get("upperEstimate")),
        "bollingerLowerEstimate": _to_float(bollinger.get("lowerEstimate")),
    }


def score_visual_buy_conditions(ai_analysis: dict[str, Any], levels: dict[str, Any]) -> dict[str, Any]:
    indicators = ai_analysis.get("indicatorReadings") or {}
    rsi = indicators.get("rsi") or {}
    macd = indicators.get("macd") or {}
    volume = indicators.get("volume") or {}
    trend = (ai_analysis.get("visualTrend") or "").lower()

    scores = {
        "supportProximity": 0,
        "rsiRebound": 0,
        "macdBullish": 0,
        "volumeIncrease": 0,
        "trend": 0,
    }
    basis: list[str] = []

    current_price = levels.get("currentPriceEstimate")
    nearest_support = levels.get("nearestSupport")
    support_distance = _distance_percent(current_price, nearest_support)
    if support_distance is not None and 0 <= support_distance <= 2.5:
        scores["supportProximity"] = 30
        basis.append("현재가가 이미지상 주요 지지 후보 구간에 가깝습니다.")
    elif support_distance is not None and 2.5 < support_distance <= 5:
        scores["supportProximity"] = 15
        basis.append("현재가가 이미지상 지지 후보 구간 위쪽 5% 이내에 있습니다.")
    elif ai_analysis.get("visualSupportZones"):
        scores["supportProximity"] = 10
        basis.append("시각적 지지 후보 구간이 관찰됩니다.")

    rsi_status = (rsi.get("status") or "").lower()
    if rsi_status == "oversold":
        scores["rsiRebound"] = 20
        basis.append("RSI가 과매도 구간 후보로 보입니다.")
    elif rsi_status == "rebound_candidate":
        scores["rsiRebound"] = 25
        basis.append("RSI가 과매도권에서 반등하는 흐름 후보로 보입니다.")
    elif rsi_status == "neutral":
        scores["rsiRebound"] = 10
    elif rsi_status == "overbought":
        scores["rsiRebound"] = -20

    macd_status = (macd.get("status") or "").lower()
    if macd_status == "bullish_cross_candidate":
        scores["macdBullish"] = 25
        basis.append("MACD가 상향 교차 후보로 보입니다.")
    elif macd_status == "bullish":
        scores["macdBullish"] = 15
        basis.append("MACD가 상승 모멘텀 후보 흐름으로 보입니다.")
    elif macd_status == "bearish_cross_candidate":
        scores["macdBullish"] = -20
    elif macd_status == "bearish":
        scores["macdBullish"] = -10

    volume_status = (volume.get("status") or "").lower()
    if volume_status == "increasing":
        scores["volumeIncrease"] = 20
        basis.append("거래량이 증가하는 흐름으로 보입니다.")
    elif volume_status == "neutral":
        scores["volumeIncrease"] = 5
    elif volume_status == "decreasing":
        scores["volumeIncrease"] = -10

    if "상승 추세" in trend or "상승 후 조정" in trend or "uptrend" in trend:
        scores["trend"] = 15
        basis.append("상승 추세가 유지되거나 상승 후 조정 구간으로 보입니다.")
    elif "횡보" in trend:
        scores["trend"] = 5
    elif "하락" in trend:
        scores["trend"] = -15

    total = sum(scores.values())
    if total >= 75:
        status = "strong_buy_candidate"
    elif total >= 55:
        status = "buy_candidate"
    elif total >= 35:
        status = "weak_buy_candidate"
    else:
        status = "no_buy_signal"

    return {"scores": {**scores, "total": total}, "status": status, "basis": basis}


def score_visual_sell_conditions(ai_analysis: dict[str, Any], levels: dict[str, Any]) -> dict[str, Any]:
    indicators = ai_analysis.get("indicatorReadings") or {}
    rsi = indicators.get("rsi") or {}
    macd = indicators.get("macd") or {}
    volume = indicators.get("volume") or {}
    bollinger = indicators.get("bollingerBands") or {}

    scores = {
        "resistanceProximity": 0,
        "rsiOverheated": 0,
        "macdBearish": 0,
        "volumeIncrease": 0,
        "bollingerUpper": 0,
    }
    basis: list[str] = []

    current_price = levels.get("currentPriceEstimate")
    nearest_resistance = levels.get("nearestResistance")
    if current_price is not None and nearest_resistance is not None and current_price <= nearest_resistance:
        distance = ((nearest_resistance - current_price) / nearest_resistance) * 100
        if 0 <= distance <= 2.5:
            scores["resistanceProximity"] = 30
            basis.append("현재가가 최근 저항 후보 구간에 가깝습니다.")
        elif 2.5 < distance <= 5:
            scores["resistanceProximity"] = 15
            basis.append("현재가가 저항 후보 구간 아래 5% 이내에 있습니다.")
    elif ai_analysis.get("visualResistanceZones"):
        scores["resistanceProximity"] = 10
        basis.append("시각적 저항 후보 구간이 관찰됩니다.")

    rsi_status = (rsi.get("status") or "").lower()
    rsi_value = _to_float(rsi.get("valueEstimate"))
    if rsi_status == "overbought":
        scores["rsiOverheated"] = 25
        basis.append("RSI가 과열 구간 후보로 보입니다.")
    elif rsi_value is not None and 60 <= rsi_value < 70:
        scores["rsiOverheated"] = 15
        basis.append("RSI가 과열권에 가까운 흐름으로 보입니다.")
    elif rsi_status == "oversold":
        scores["rsiOverheated"] = -20

    macd_status = (macd.get("status") or "").lower()
    if macd_status == "bearish_cross_candidate":
        scores["macdBearish"] = 25
        basis.append("MACD가 하향 교차 후보로 보입니다.")
    elif macd_status == "bearish":
        scores["macdBearish"] = 15
        basis.append("MACD가 하락 모멘텀 후보 흐름으로 보입니다.")
    elif macd_status == "bullish_cross_candidate":
        scores["macdBearish"] = -20
    elif macd_status == "bullish":
        scores["macdBearish"] = -10

    volume_status = (volume.get("status") or "").lower()
    if volume_status == "increasing":
        scores["volumeIncrease"] = 20
        basis.append("저항 부근에서 거래량이 증가하는 흐름으로 보입니다.")
    elif volume_status == "neutral":
        scores["volumeIncrease"] = 5
    elif volume_status == "decreasing":
        scores["volumeIncrease"] = -5

    bollinger_position = (bollinger.get("position") or "").lower()
    if bollinger_position == "near_upper":
        scores["bollingerUpper"] = 15
        basis.append("볼린저밴드 상단에 가까운 구간으로 보입니다.")
    elif bollinger_position == "above_upper":
        scores["bollingerUpper"] = 20
        basis.append("볼린저밴드 상단을 넘는 과열 구간 후보로 보입니다.")
    elif bollinger_position == "near_lower":
        scores["bollingerUpper"] = -15

    total = sum(scores.values())
    if total >= 75:
        status = "strong_sell_candidate"
    elif total >= 55:
        status = "sell_candidate"
    elif total >= 35:
        status = "weak_sell_candidate"
    else:
        status = "no_sell_signal"

    return {"scores": {**scores, "total": total}, "status": status, "basis": basis}


def calculate_visual_trade_zones(ai_analysis: dict[str, Any], levels: dict[str, Any]) -> dict[str, Any]:
    current_price = levels.get("currentPriceEstimate")
    nearest_support = levels.get("nearestSupport")
    nearest_resistance = levels.get("nearestResistance")
    recent_high = levels.get("recentHighEstimate")
    recent_low = levels.get("recentLowEstimate")
    upper_band = levels.get("bollingerUpperEstimate")

    buy_range = None
    if nearest_support is not None:
        buy_to = current_price if current_price is not None else nearest_support * 1.025
        buy_range = {
            "from": _round(nearest_support),
            "to": _round(max(buy_to, nearest_support)),
        }

    sell_range = None
    if nearest_resistance is not None:
        sell_range = {
            "from": _round(nearest_resistance * 0.975),
            "to": _round(nearest_resistance),
        }

    stop_loss = None
    stop_basis = "이미지상 지지 후보 가격이 부족해 손절 기준 후보를 계산하지 못했습니다."
    if nearest_support is not None:
        stop_loss = _round(nearest_support * 0.98)
        stop_basis = "이미지상 주요 지지 후보 구간을 약 2% 이탈하는 가격입니다."
    elif recent_low is not None:
        stop_loss = _round(recent_low * 0.98)
        stop_basis = "이미지상 최근 저점 추정값을 약 2% 이탈하는 가격입니다."

    primary = _round(nearest_resistance)
    secondary = _round(upper_band if upper_band is not None else recent_high)

    if primary is None and current_price is not None and stop_loss is not None:
        risk = current_price - stop_loss
        if risk > 0:
            primary = _round(current_price + 2 * risk)
            secondary = _round(current_price + 3 * risk)

    risk_reward_ratio = None
    if current_price is not None and stop_loss is not None and primary is not None:
        risk = current_price - stop_loss
        reward = primary - current_price
        if risk > 0:
            risk_reward_ratio = _round(reward / risk, 2)

    return {
        "currentPriceEstimate": current_price,
        "currentPriceConfidence": levels.get("currentPriceConfidence"),
        "buyRange": buy_range,
        "sellRange": sell_range,
        "stopLoss": stop_loss,
        "stopBasis": stop_basis,
        "primaryTarget": primary,
        "secondaryTarget": secondary,
        "riskRewardRatio": risk_reward_ratio,
    }


def generate_visual_trade_signal(ai_analysis: dict[str, Any]) -> dict[str, Any]:
    levels = extract_visual_price_levels(ai_analysis)
    indicators = ai_analysis.get("indicatorReadings") or {}

    buy = score_visual_buy_conditions(ai_analysis, levels)
    sell = score_visual_sell_conditions(ai_analysis, levels)
    zones = calculate_visual_trade_zones(ai_analysis, levels)

    has_price_info = any(
        levels.get(key) is not None
        for key in (
            "currentPriceEstimate",
            "nearestSupport",
            "nearestResistance",
            "recentHighEstimate",
            "recentLowEstimate",
        )
    )
    has_indicator_info = any(
        (indicators.get(key) or {}).get("visible")
        for key in ("rsi", "macd", "bollingerBands", "movingAverages", "volume")
    )

    buy_score = max(0, min(100, int(buy["scores"]["total"])))
    sell_score = max(0, min(100, int(sell["scores"]["total"])))
    buy["scores"]["total"] = buy_score
    sell["scores"]["total"] = sell_score

    if not has_price_info and not has_indicator_info:
        final_signal = "insufficient_visual_data"
    elif buy_score >= 75 and buy_score > sell_score + 15:
        final_signal = "strong_buy_candidate"
    elif buy_score >= 55 and buy_score > sell_score:
        final_signal = "buy_candidate"
    elif sell_score >= 75 and sell_score > buy_score + 15:
        final_signal = "strong_sell_candidate"
    elif sell_score >= 55 and sell_score > buy_score:
        final_signal = "sell_candidate"
    else:
        final_signal = "neutral"

    label_map = {
        "strong_buy_candidate": "강한 매수 후보 신호",
        "buy_candidate": "매수 후보 신호",
        "strong_sell_candidate": "강한 매도 후보 신호",
        "sell_candidate": "매도 후보 신호",
        "neutral": "중립 신호",
        "insufficient_visual_data": "시각 정보 부족",
    }

    if final_signal == "insufficient_visual_data":
        confidence = "unavailable"
    elif has_price_info and abs(buy_score - sell_score) >= 20:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "analysisType": "visual_image_based",
        "finalSignal": final_signal,
        "signalLabel": label_map.get(final_signal, "중립 신호"),
        "buyScore": buy_score,
        "sellScore": sell_score,
        "confidence": confidence,
        "currentPriceEstimate": {
            "value": _round(zones.get("currentPriceEstimate")),
            "confidence": zones.get("currentPriceConfidence"),
        },
        "buyZone": {
            "priceRange": zones.get("buyRange"),
            "basis": buy["basis"] or ["지지 구간과 보조지표 신호가 제한적으로 확인됩니다."],
        },
        "sellZone": {
            "priceRange": zones.get("sellRange"),
            "basis": sell["basis"] or ["저항 구간과 보조지표 신호가 제한적으로 확인됩니다."],
        },
        "stopLossCandidate": {
            "price": zones.get("stopLoss"),
            "basis": zones.get("stopBasis"),
        },
        "targetPriceCandidate": {
            "primary": zones.get("primaryTarget"),
            "secondary": zones.get("secondaryTarget"),
            "riskRewardRatio": zones.get("riskRewardRatio"),
            "basis": "최근 저항 후보와 볼린저밴드 상단 추정값을 기준으로 계산했습니다.",
        },
        "conditionScores": {
            "buy": buy["scores"],
            "sell": sell["scores"],
        },
        "warnings": [
            "이 가격대는 이미지 기반 추정값입니다.",
            "실제 OHLCV 데이터 기반 계산값이 아니므로 오차가 있을 수 있습니다.",
            "본 신호는 매수·매도 추천이 아닙니다.",
        ],
    }
