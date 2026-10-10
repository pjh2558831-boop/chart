from __future__ import annotations

from typing import Any


def _round(value: float | None, digits: int = 4) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def _number(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def calculate_distance_percent(price: float, level: float) -> float:
    if level == 0:
        return 0.0
    return round(abs(price - level) / abs(level) * 100, 2)


def is_near_level(price: float, level: float, threshold_percent: float = 2.0) -> bool:
    return calculate_distance_percent(price, level) <= threshold_percent


def score_buy_conditions(technical: dict[str, Any]) -> dict[str, Any]:
    latest_close = _number(technical.get("latestClose"))
    support = _number((technical.get("supportResistance") or {}).get("nearestSupport"))
    rsi = technical.get("rsi") or {}
    macd = technical.get("macd") or {}
    volume = technical.get("volume") or {}

    scores = {"supportProximity": 0, "rsiRebound": 0, "macdBullish": 0, "volumeIncrease": 0}
    basis: list[str] = []

    if latest_close is not None and support is not None and latest_close >= support:
        distance = (latest_close - support) / support * 100
        if 0 <= distance <= 2:
            scores["supportProximity"] = 30
            basis.append("현재가가 주요 지지선 후보에 가깝습니다.")
        elif 2 < distance <= 4:
            scores["supportProximity"] = 15
            basis.append("현재가가 주요 지지선 후보에서 4% 이내에 있습니다.")

    rsi_value = _number(rsi.get("value"))
    rsi_status = rsi.get("status")
    if rsi_status == "rebound_candidate":
        scores["rsiRebound"] = 25
        basis.append("RSI가 반등 후보 구간입니다.")
    elif rsi_status == "oversold":
        scores["rsiRebound"] = 15
        basis.append("RSI가 과매도 구간입니다.")
    elif rsi_status == "neutral" and rsi_value is not None and 40 <= rsi_value <= 55:
        scores["rsiRebound"] = 10
        basis.append("RSI가 중립 회복 구간에 있습니다.")
    elif rsi_status == "overbought":
        scores["rsiRebound"] = -20

    macd_status = macd.get("status")
    if macd_status == "bullish_cross":
        scores["macdBullish"] = 25
        basis.append("MACD가 상향 돌파 후보 흐름입니다.")
    elif macd_status == "bullish":
        scores["macdBullish"] = 15
        basis.append("MACD가 상향 흐름입니다.")
    elif macd_status == "bearish_cross":
        scores["macdBullish"] = -20
    elif macd_status == "bearish":
        scores["macdBullish"] = -10

    volume_status = volume.get("status")
    if volume_status == "increasing":
        scores["volumeIncrease"] = 20
        basis.append("거래량이 평균 대비 증가했습니다.")
    elif volume_status == "neutral":
        scores["volumeIncrease"] = 5
    elif volume_status == "decreasing":
        scores["volumeIncrease"] = -10

    total = sum(scores.values())
    if total >= 70:
        status = "strong_buy_candidate"
    elif total >= 50:
        status = "buy_candidate"
    elif total >= 30:
        status = "weak_buy_candidate"
    else:
        status = "no_buy_signal"

    return {"scores": {**scores, "total": total}, "status": status, "basis": basis}


def score_sell_conditions(technical: dict[str, Any]) -> dict[str, Any]:
    latest_close = _number(technical.get("latestClose"))
    resistance = _number((technical.get("supportResistance") or {}).get("nearestResistance"))
    rsi = technical.get("rsi") or {}
    macd = technical.get("macd") or {}
    volume = technical.get("volume") or {}

    scores = {"resistanceProximity": 0, "rsiOverheated": 0, "macdBearish": 0, "volumeIncrease": 0}
    basis: list[str] = []

    if latest_close is not None and resistance is not None and latest_close <= resistance:
        distance = (resistance - latest_close) / resistance * 100
        if 0 <= distance <= 2:
            scores["resistanceProximity"] = 30
            basis.append("현재가가 주요 저항선 후보에 가깝습니다.")
        elif 2 < distance <= 4:
            scores["resistanceProximity"] = 15
            basis.append("현재가가 주요 저항선 후보에서 4% 이내에 있습니다.")

    rsi_value = _number(rsi.get("value"))
    rsi_status = rsi.get("status")
    if rsi_status == "overbought":
        scores["rsiOverheated"] = 25
        basis.append("RSI가 과열 구간입니다.")
    elif rsi_value is not None and 60 <= rsi_value < 70:
        scores["rsiOverheated"] = 15
        basis.append("RSI가 과열권에 가까운 구간입니다.")
    elif rsi_status == "oversold":
        scores["rsiOverheated"] = -20

    macd_status = macd.get("status")
    if macd_status == "bearish_cross":
        scores["macdBearish"] = 25
        basis.append("MACD가 하향 이탈 후보 흐름입니다.")
    elif macd_status == "bearish":
        scores["macdBearish"] = 15
        basis.append("MACD가 하향 흐름입니다.")
    elif macd_status == "bullish_cross":
        scores["macdBearish"] = -20
    elif macd_status == "bullish":
        scores["macdBearish"] = -10

    volume_status = volume.get("status")
    if volume_status == "increasing":
        scores["volumeIncrease"] = 20
        basis.append("저항 후보 구간 근처에서 거래량이 증가했습니다.")
    elif volume_status == "neutral":
        scores["volumeIncrease"] = 5
    elif volume_status == "decreasing":
        scores["volumeIncrease"] = -5

    total = sum(scores.values())
    if total >= 70:
        status = "strong_sell_candidate"
    elif total >= 50:
        status = "sell_candidate"
    elif total >= 30:
        status = "weak_sell_candidate"
    else:
        status = "no_sell_signal"

    return {"scores": {**scores, "total": total}, "status": status, "basis": basis}


def calculate_trade_zones(technical: dict[str, Any]) -> dict[str, Any]:
    latest_close = _number(technical.get("latestClose"))
    support_resistance = technical.get("supportResistance") or {}
    recent_high_low = technical.get("recentHighLow") or {}
    bollinger = technical.get("bollingerBands") or {}

    nearest_support = _number(support_resistance.get("nearestSupport"))
    nearest_resistance = _number(support_resistance.get("nearestResistance"))
    recent_low = _number(recent_high_low.get("recentLow"))
    recent_high = _number(recent_high_low.get("recentHigh"))
    bollinger_upper = _number(bollinger.get("upper"))

    buy_range = {"from": None, "to": None}
    if latest_close is not None and nearest_support is not None:
        buy_range = {"from": _round(nearest_support), "to": _round(max(nearest_support, latest_close))}

    sell_upper_candidates = [
        value
        for value in [recent_high, bollinger_upper]
        if value is not None and nearest_resistance is not None and value >= nearest_resistance
    ]
    sell_range = {"from": None, "to": None}
    if nearest_resistance is not None:
        sell_range = {"from": _round(nearest_resistance), "to": _round(min(sell_upper_candidates) if sell_upper_candidates else nearest_resistance)}

    stop_base = nearest_support if nearest_support is not None else recent_low
    stop_loss = _round(stop_base * 0.98) if stop_base is not None else None

    target_candidates = [
        value
        for value in [nearest_resistance, bollinger_upper, recent_high]
        if value is not None and latest_close is not None and value > latest_close
    ]
    target_candidates = sorted(set(round(value, 4) for value in target_candidates), key=lambda value: abs(value - latest_close)) if latest_close is not None else []

    return {
        "buyRange": buy_range,
        "sellRange": sell_range,
        "stopLoss": stop_loss,
        "primaryTarget": target_candidates[0] if target_candidates else None,
        "secondaryTarget": target_candidates[1] if len(target_candidates) > 1 else None,
    }


def _label_for_signal(signal: str) -> str:
    labels = {
        "strong_buy_candidate": "강한 매수 후보 신호",
        "buy_candidate": "매수 후보 신호",
        "weak_buy_candidate": "약한 매수 후보 신호",
        "strong_sell_candidate": "강한 매도 후보 신호",
        "sell_candidate": "매도 후보 신호",
        "weak_sell_candidate": "약한 매도 후보 신호",
        "neutral": "중립",
        "insufficient_data": "데이터 부족",
    }
    return labels.get(signal, "중립")


def _confidence(final_signal: str, buy_score: int, sell_score: int) -> str:
    if final_signal == "insufficient_data":
        return "unavailable"
    if abs(buy_score - sell_score) >= 35:
        return "medium"
    return "low"


def build_insufficient_trade_signal(reason: str = "OHLCV 데이터가 부족하여 기술적 매매 신호를 계산할 수 없습니다.") -> dict[str, Any]:
    return {
        "finalSignal": "insufficient_data",
        "signalLabel": "데이터 부족",
        "buyScore": 0,
        "sellScore": 0,
        "confidence": "unavailable",
        "buyZone": None,
        "sellZone": None,
        "stopLossCandidate": None,
        "targetPriceCandidate": None,
        "conditionScores": None,
        "warnings": [
            reason,
            "본 신호는 기술적 조건 점수 기반 참고 정보입니다.",
            "매수·매도 추천이 아닙니다.",
            "실제 투자 판단에는 추가 확인이 필요합니다.",
        ],
    }


def generate_final_signal(technical: dict[str, Any] | None) -> dict[str, Any]:
    if not technical or not (technical.get("dataQuality") or {}).get("isEnoughData"):
        return build_insufficient_trade_signal()

    buy = score_buy_conditions(technical)
    sell = score_sell_conditions(technical)
    zones = calculate_trade_zones(technical)
    buy_score = int(buy["scores"]["total"])
    sell_score = int(sell["scores"]["total"])

    if buy_score >= 70 and buy_score > sell_score + 15:
        final_signal = "strong_buy_candidate"
    elif buy_score >= 50 and buy_score > sell_score:
        final_signal = "buy_candidate"
    elif sell_score >= 70 and sell_score > buy_score + 15:
        final_signal = "strong_sell_candidate"
    elif sell_score >= 50 and sell_score > buy_score:
        final_signal = "sell_candidate"
    else:
        final_signal = "neutral"

    return {
        "finalSignal": final_signal,
        "signalLabel": _label_for_signal(final_signal),
        "buyScore": buy_score,
        "sellScore": sell_score,
        "confidence": _confidence(final_signal, buy_score, sell_score),
        "buyZone": {
            "priceRange": zones["buyRange"],
            "basis": buy["basis"] or ["매수 후보 구간을 뒷받침하는 조건 점수가 충분하지 않습니다."],
        },
        "sellZone": {
            "priceRange": zones["sellRange"],
            "basis": sell["basis"] or ["매도 후보 구간을 뒷받침하는 조건 점수가 충분하지 않습니다."],
        },
        "stopLossCandidate": {
            "price": zones["stopLoss"],
            "basis": "주요 지지선 후보 이탈 기준입니다." if zones["stopLoss"] is not None else "손절 기준 후보를 계산할 지지선 데이터가 부족합니다.",
        },
        "targetPriceCandidate": {
            "primary": zones["primaryTarget"],
            "secondary": zones["secondaryTarget"],
            "basis": "최근 저항선 후보와 볼린저밴드 상단을 기준으로 계산했습니다.",
        },
        "conditionScores": {
            "buy": buy["scores"],
            "sell": sell["scores"],
        },
        "warnings": [
            "본 신호는 기술적 조건 점수 기반 참고 정보입니다.",
            "매수·매도 추천이 아닙니다.",
            "실제 투자 판단에는 추가 확인이 필요합니다.",
        ],
    }
