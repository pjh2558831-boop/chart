from __future__ import annotations

from typing import Any


SKIPPED_MESSAGES = {
    "symbol_not_detected": "이미지에서 종목 티커를 추정하지 못해 실제 데이터 검증을 건너뛰었습니다.",
    "low_confidence_symbol": "이미지에서 종목 정보를 충분히 신뢰할 수 없어 실제 데이터 검증을 건너뛰었습니다.",
    "unknown_market": "이미지에서 시장을 확인할 수 없어 실제 데이터 검증을 건너뛰었습니다.",
    "unsupported_market": "지원하지 않는 시장으로 추정되어 실제 데이터 검증을 건너뛰었습니다.",
    "insufficient_data": "실제 데이터 캔들 수가 부족해 정량 검증을 건너뛰었습니다.",
}


def _classify_ai_trend(ai_trend: str) -> str:
    if "상승" in ai_trend:
        return "uptrend"
    if "하락" in ai_trend:
        return "downtrend"
    if "횡보" in ai_trend:
        return "sideways_or_mixed"
    return "unclear"


def _compare_trend(ai_trend: str, quant_trend: str) -> str:
    normalized_ai = _classify_ai_trend(ai_trend)
    if normalized_ai == "unclear" or quant_trend == "insufficient_data":
        return "mixed"
    if normalized_ai == quant_trend:
        return "aligned"
    if normalized_ai == "uptrend" and quant_trend == "downtrend":
        return "conflict"
    if normalized_ai == "downtrend" and quant_trend == "uptrend":
        return "conflict"
    return "mixed"


def verify_ai_with_quantitative(
    ai_analysis: dict[str, Any],
    quantitative: dict[str, Any],
    market_data_info: dict[str, Any],
) -> dict[str, Any]:
    ai_trend = ai_analysis.get("visualTrend") or "확인 불가"
    quant_trend = (quantitative.get("trend") or {}).get("status") or "insufficient_data"
    trend_status = _compare_trend(ai_trend, quant_trend)

    if trend_status == "aligned":
        comment = "이미지상 추세와 실제 데이터 기반 추세가 대체로 부합합니다."
    elif trend_status == "conflict":
        comment = "이미지상 추세와 실제 데이터 기반 추세가 서로 다르게 나타납니다."
    else:
        comment = "이미지상 추세와 실제 데이터 기반 추세가 일부만 부합하거나 명확하지 않습니다."

    indicators = ai_analysis.get("visibleIndicators") or []
    moving_averages = quantitative.get("movingAverages") or {}
    volume_analysis = quantitative.get("volume") or {}
    support_resistance = quantitative.get("supportResistance") or {}

    moving_average_available = any(value is not None for value in moving_averages.values())
    volume_available = volume_analysis.get("baseAverageVolume") is not None

    confidence = "medium" if trend_status == "aligned" else "low"

    warnings = [
        "AI가 추정한 종목 정보가 틀리면 실제 데이터 검증도 틀릴 수 있습니다.",
        "AI 이미지 분석과 실제 데이터 분석이 다를 경우 실제 OHLCV 기반 분석을 우선 참고하세요.",
        "본 검증은 기술적 지표 기반 참고 정보이며 투자 조언이 아닙니다.",
    ]
    if market_data_info.get("warning"):
        warnings.append(str(market_data_info["warning"]))
    data_warning = ((quantitative.get("dataQuality") or {}).get("warning"))
    if data_warning:
        warnings.append(str(data_warning))

    return {
        "status": "completed",
        "trendAgreement": {
            "status": trend_status,
            "aiTrend": ai_trend,
            "quantTrend": quant_trend,
            "comment": comment,
        },
        "indicatorCheck": {
            "movingAverage": "available" if "이동평균선" in indicators and moving_average_available else "not_confirmed",
            "volume": "available" if "거래량" in indicators and volume_available else "not_confirmed",
            "rsi": "calculated_by_python",
            "macd": "calculated_by_python",
        },
        "supportResistanceCheck": {
            "comment": "AI의 지지/저항은 시각적 후보이며, 실제 가격대는 Python 계산값을 우선 참고해야 합니다.",
            "pythonSupportLevels": support_resistance.get("supportLevels") or [],
            "pythonResistanceLevels": support_resistance.get("resistanceLevels") or [],
        },
        "confidence": confidence,
        "warnings": warnings,
    }


def build_skipped_verification(reason: str) -> dict[str, Any]:
    return {
        "status": "skipped",
        "reason": reason,
        "message": SKIPPED_MESSAGES.get(reason, "실제 데이터 검증을 건너뛰었습니다."),
        "confidence": "unavailable",
        "warnings": [
            "종목명이 명확히 보이는 차트 이미지를 업로드하면 실제 데이터 검증이 가능합니다.",
            "본 결과는 이미지 기반 차트 해석이며 투자 조언이 아닙니다.",
        ],
    }


def build_failed_verification(reason: str) -> dict[str, Any]:
    return {
        "status": "failed",
        "reason": reason,
        "message": "실제 데이터 검증 중 오류가 발생했습니다. AI 이미지 분석 결과만 참고하세요.",
        "confidence": "unavailable",
        "warnings": [
            "yfinance 데이터 조회 또는 정량 분석이 실패했습니다.",
            "본 결과는 투자 조언이 아닙니다.",
        ],
    }
