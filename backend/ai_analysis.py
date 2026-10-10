from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)
from pydantic import ValidationError

from schemas import AIAnalysis


logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4.1-mini"
PROMPT_VERSION = "chart_analysis_v3_structure_patterns"
ENV_PATH = Path(__file__).resolve().with_name(".env")

load_dotenv(dotenv_path=ENV_PATH)


def _clean_model_name(value: str | None, fallback: str = DEFAULT_MODEL) -> str:
    configured = (value or fallback).strip().strip('"').strip("'")
    if configured.startswith("OPENAI_MODEL") and "=" in configured:
        configured = configured.split("=", 1)[1].strip().strip('"').strip("'")
    return configured or fallback


def get_openai_model_name() -> str:
    return _clean_model_name(os.getenv("OPENAI_MODEL"), DEFAULT_MODEL)


def get_model_for_plan(plan: str | None) -> str:
    normalized_plan = (plan or "free").strip().lower()
    fallback_model = get_openai_model_name()

    if normalized_plan == "pro":
        return _clean_model_name(os.getenv("OPENAI_MODEL_PRO"), fallback_model)

    if normalized_plan == "plus":
        return _clean_model_name(os.getenv("OPENAI_MODEL_PLUS"), fallback_model)

    return _clean_model_name(os.getenv("OPENAI_MODEL_FREE"), fallback_model)



SYSTEM_PROMPT = """
너는 주식 차트 이미지를 기술적으로 해석하는 분석 엔진이다.
이미지에 보이는 구조만 분석하고 실제 OHLCV 데이터에 접근한 것처럼 말하지 않는다.
모든 판단은 후보, 기술적 신호, 참고 정보로만 표현한다.
투자 조언, 매수·매도 추천, 확정 가격, 수익 보장 표현은 금지한다.
불명확한 값은 null, unknown, not_visible, low confidence로 반환한다.
볼린저밴드와 일목구름을 혼동하지 않는다.
볼린저밴드는 상단/중심/하단 3개 밴드가 명확할 때만 visible=true다.
구름 형태의 음영 영역은 일목구름으로 분류한다.
응답은 반드시 JSON 객체 하나만 반환한다.
""".strip()


USER_PROMPT = """
전송된 이미지는 분석 모드에 따라 fullImage, rightCropImage, bottomCropImage, centerChartImage 중 일부다.
fullImage는 전체 구조, rightCropImage는 가격축/최근 캔들, bottomCropImage는 RSI/MACD/거래량 등 하단 보조지표, centerChartImage는 패턴 구조 확인용이다.

필수 분석:
- chartType, timeframeEstimate, visualTrend
- 가격축 추정: currentPriceEstimate, support/resistance, recent high/low
- 보조지표: RSI, MACD, 볼린저밴드, 일목구름, 이동평균선, 거래량
- 패턴 후보 최대 3개: 박스권, 채널, 삼각형, 이중바닥/천장, 헤드앤숄더, 플래그, 쐐기, 지지/저항 리테스트, 돌파 후 눌림, 볼린저 스퀴즈, 일목구름 관련 후보
- riskNotes 최대 5개, evidence는 패턴당 최대 3개, summary는 3~5문장 이하

JSON 필드는 아래 구조를 지켜라:
{
  "symbolDetection": {
    "detectedName": string|null,
    "detectedTicker": string|null,
    "detectedMarket": "KR"|"US"|"UNKNOWN",
    "detectedExchange": string|null,
    "currency": string|null,
    "confidence": "low"|"medium"|"high",
    "reason": string
  },
  "chartType": string,
  "timeframeEstimate": string,
  "visualTrend": string,
  "patternCandidates": [
    {
      "name": string,
      "label": string,
      "category": "reversal"|"continuation"|"range"|"breakout"|"unknown",
      "confidence": "low"|"medium"|"high",
      "confidenceScore": number|null,
      "evidence": string[],
      "breakoutDirection": "upside_candidate"|"downside_candidate"|"neutral"|"unknown",
      "confirmationCondition": string,
      "invalidationCondition": string,
      "entryLogic": string,
      "tradingImplication": string|null,
      "riskLevel": "low"|"medium"|"high"
    }
  ],
  "visibleIndicators": string[],
  "visualSupportZones": [{"label": string, "confidence": "low"|"medium"|"high", "note": string}],
  "visualResistanceZones": [{"label": string, "confidence": "low"|"medium"|"high", "note": string}],
  "priceAxisObservations": {
    "currentPriceEstimate": {"value": number|null, "confidence": "low"|"medium"|"high"|null, "note": string|null},
    "visibleSupportPrices": [{"value": number|null, "label": string, "confidence": "low"|"medium"|"high"|null}],
    "visibleResistancePrices": [{"value": number|null, "label": string, "confidence": "low"|"medium"|"high"|null}],
    "recentHighEstimate": {"value": number|null, "confidence": "low"|"medium"|"high"|null, "note": string|null},
    "recentLowEstimate": {"value": number|null, "confidence": "low"|"medium"|"high"|null, "note": string|null}
  },
  "indicatorReadings": {
    "rsi": {"visible": boolean, "valueEstimate": number|null, "status": string|null, "confidence": "low"|"medium"|"high"|null},
    "macd": {"visible": boolean, "status": string|null, "confidence": "low"|"medium"|"high"|null},
    "bollingerBands": {"visible": boolean, "status": string|null, "reason": string|null, "position": string|null, "upperEstimate": number|null, "lowerEstimate": number|null, "confidence": "low"|"medium"|"high"|null},
    "ichimoku": {"visible": boolean, "pricePosition": string|null, "cloudState": string|null, "status": string|null, "cloudPosition": string|null, "confidence": "low"|"medium"|"high"|null, "reason": string|null},
    "movingAverages": {"visible": boolean, "status": string|null, "confidence": "low"|"medium"|"high"|null},
    "volume": {"visible": boolean, "status": string|null, "confidence": "low"|"medium"|"high"|null}
  },
  "volumeObservation": string,
  "riskNotes": string[],
  "summary": string,
  "disclaimer": string
}
""".strip()

# The original prompt text above is kept for reference while this runtime
# prompt focuses the model on concise Korean, action-oriented observations.
SYSTEM_PROMPT = """
너는 주식 차트 이미지를 기술적으로 해석하는 분석 엔진이다.
투자 조언이나 매수·매도 추천을 하지 말고, 모든 표현은 후보·조건·참고 정보로 작성한다.
차트에서 보이는 가격축, 지지·저항, 패턴, 보조지표만 근거로 사용한다.
불명확한 값은 null, unknown, not_visible, low confidence로 반환한다.
볼린저밴드는 상단·중심·하단 3개 밴드가 명확할 때만 visible=true로 둔다.
구름 형태의 음영 영역은 볼린저밴드가 아니라 일목균형표로 분류한다.
모든 주요 문장은 한국어로 작성하고 JSON 객체 하나만 반환한다.
""".strip()

USER_PROMPT = """
차트 이미지를 분석해 직접 매매 대응에 참고할 수 있는 원천 정보를 JSON으로 반환하라.

분석 원칙:
- 단순 설명보다 현재가, 지지·저항, 눌림목, 돌파, 손절 기준, 목표 후보에 필요한 관찰값을 우선한다.
- 패턴은 가장 유력한 후보 중심으로 최대 3개만 반환하고, 근거는 패턴당 최대 3개만 작성한다.
- 확인 불가한 지표는 메인 판단 근거로 쓰지 말고 visible=false로 둔다.
- RSI, MACD, 볼린저밴드, 일목균형표, 이동평균선, 거래량은 각각 분리해서 판단한다.
- riskNotes는 최대 5개, summary는 3~5문장 이하로 작성한다.
- 가격은 확정값이 아니라 이미지 기반 추정값으로 confidence를 함께 둔다.

반환 필드는 기존 JSON 스키마를 지켜라:
symbolDetection, chartType, timeframeEstimate, visualTrend, patternCandidates,
visibleIndicators, visualSupportZones, visualResistanceZones, priceAxisObservations,
indicatorReadings, volumeObservation, riskNotes, summary, disclaimer.
""".strip()


SYSTEM_PROMPT = """
너는 주식 차트 이미지를 기술적으로 해석하는 분석 엔진이다.
투자 조언이나 매수·매도 추천을 하지 말고, 모든 표현은 후보·조건·참고 정보로 작성한다.
차트에서 보이는 가격축, 스윙 구조, 지지·저항, 패턴 후보, 보조지표만 근거로 사용한다.
불명확한 값은 null, unknown, not_visible, low confidence로 반환한다.
패턴은 절대 확정하지 말고 항상 후보로만 표현한다.
단기 모멘텀과 상위 구조의 패턴 위험이 동시에 존재할 수 있으며, 한쪽 해석으로 다른 쪽을 삭제하지 않는다.
볼린저밴드는 상단·중심·하단 3개 밴드가 명확할 때만 visible=true로 둔다.
구름 형태의 음영 영역은 볼린저밴드가 아니라 일목균형표로 분류한다.
단기 손절 기준과 중기 관점 무효화 가격은 서로 다른 개념으로 관찰한다.
1차 저항은 돌파 후 재지지에 성공하면 전환 가격대가 될 수 있음을 근거에 반영한다.
모든 주요 문장은 한국어로 작성하고 JSON 객체 하나만 반환한다.
""".strip()

USER_PROMPT = """
차트 이미지를 분석해 직접 매매 대응에 참고할 수 있는 원천 정보를 JSON으로 반환하라.

반드시 다음 순서로 분석한다. 지표나 현재가 위치만 보고 차트 상태 또는 전략을 먼저 결정하지 않는다.
1. 전체 차트에서 주요 swing high와 swing low를 좌측부터 순서대로 최대 6개씩 추출한다.
2. support, resistance, neckline, trendline, channel, breakout/breakdown line을 최대 8개 분류한다.
3. 아래 패턴 체크리스트를 모두 검사한 뒤 가장 유력한 후보만 최대 3개 반환한다.
4. RSI, MACD, 이동평균선, 거래량 등 단기 모멘텀을 별도로 확인한다.
5. 모멘텀과 구조 패턴이 충돌하면 patternMomentumConflict에 양쪽 근거를 함께 기록한다.
6. interpretationLayers에서 단기 상태와 상위 구조 위험을 분리한 후 최종 요약을 작성한다.

구조 및 라인 원칙:
- neckline은 일반 지지선과 같은 가격이어도 패턴 구조상 역할을 별도로 기록한다.
- 스윙이나 가격이 불명확하면 값을 추측하지 말고 null과 low confidence를 사용한다.
- lineAnalysis의 가격은 단일값이 보이면 price, 범위로만 보이면 priceLow/priceHigh와 priceZone을 사용한다.

패턴 체크리스트:
- 하락 반전: head_and_shoulders, double_top, rising_wedge, failed_breakout, lower_high_reversal, descending_triangle.
- 상승 반전: inverse_head_and_shoulders, double_bottom, falling_wedge.
- 지속/중립: bullish_flag, bearish_flag, ascending_triangle, symmetrical_triangle, range_box, ascending_channel, descending_channel, consolidation.
- confidenceScore 51~70은 “의심” 또는 “후보”로 반환한다. 51 미만은 약한 참고 후보로만 둘 수 있다.
- 패턴마다 direction, stage, 핵심 priceLevels, 확인·무효화 조건, 모멘텀 충돌 여부를 작성한다.

헤드앤숄더 전용 검사:
- 선행 상승, 세 개의 고점, 중앙 고점이 가장 높음, 좌·우 어깨가 머리보다 낮음, 우어깨가 머리 영역 회복 실패, 공통 넥라인, 현재가의 넥라인 접근 여부를 확인한다.
- 세 고점, 중앙 최고점, 낮은 우어깨, 공통 넥라인, 넥라인 테스트, 우어깨 저항 회복 실패 중 의미 있는 근거가 2개 미만이면 medium/high 후보로 반환하지 않는다.
- 구조가 타당하고 현재가가 넥라인 부근이면 name=head_and_shoulders, stage=neckline_test, direction=bearish로 기록한다.
- 단기 지지 반응이나 MACD/RSI 개선이 있어도 헤드앤숄더 후보를 삭제하지 말고 conflictsWithMomentum과 conflictExplanation을 작성한다.
- 이 경우 shortTermState에는 “지지 테스트” 또는 “상승추세 눌림”, structuralPatternRisk에는 “헤드앤숄더 의심 / 넥라인 테스트”를 함께 둘 수 있다.

기존 분석 원칙:
- 단순 설명보다 현재가, 지지·저항, 눌림목, 돌파, 단기 손절, 중기 무효화, 목표 후보에 필요한 관찰값을 우선한다.
- 진입가는 넓은 범위로 쓰지 말고 눌림목 진입, 돌파 진입, 추격매수 금지 조건을 구분할 수 있게 근거를 제공한다.
- 단기 손절은 가까운 지지선, 중기 무효화는 더 먼 구조적 지지나 패턴 관점 무효화 가격으로 분리해 관찰한다.
- 목표 후보는 가까운 저항부터 먼 저항 순서로 판단할 수 있게 반환한다.
- 패턴은 가장 유력한 후보 중심으로 최대 3개만 반환하고, evidence는 패턴당 최대 3개만 작성한다.
- 쐐기형, 채널, 삼각수렴 등은 확정 표현이 아니라 “후보” 또는 “수렴형 조정 후보”처럼 표현한다.
- 확인 불가한 RSI, MACD, 볼린저밴드 등은 메인 판단 근거로 쓰지 말고 visible=false로 둔다.
- RSI, MACD, 볼린저밴드, 일목균형표, 이동평균선, 거래량은 각각 분리해서 판단한다.
- riskNotes는 최대 5개, summary는 3~5문장 이하로 작성한다.
- 가격은 이미지 기반 추정값이므로 confidence를 함께 보수적으로 둔다.

반환 필드는 기존 JSON 스키마를 지켜라:
추가 관찰 필드 작성 원칙:
- chartStateHint, setupTypeHint, timeframeAlignmentHint는 최종 매매 판단이 아니라 이미지에서 보이는 상태 힌트만 담는다.
- visibleConfirmationSignals와 visibleInvalidationClues는 실제로 보이는 캔들, 거래량, 지지/저항 반응 근거가 있을 때만 작성한다.
- entryScenarioEvidence는 현재가, 눌림목, 돌파 후 재지지 각각에 대해 보이는 근거와 부족한 확인 조건을 분리한다.
- RSI 과매수는 강한 상승 추세에서는 단독 매도 근거가 아니며, MACD는 횡보장에서 휩쏘 가능성을 함께 본다.
- 볼린저밴드 터치만으로 매수/매도를 단정하지 말고, 돌파는 종가·거래량·재지지 확인 여부를 별도로 관찰한다.
- 관찰이 불충분하면 null, unknown, 빈 배열, low confidence를 사용한다.
- 강력 매수, 무조건 매수, 확정 매수, 즉시 매수, 전량 매도, 절대 수익, 100% 같은 단정적 투자 문구를 쓰지 않는다.

반환 필드는 기존 JSON 스키마를 지켜라:
symbolDetection, chartType, timeframeEstimate, visualTrend,
visualStructure, lineAnalysis, interpretationLayers, patternMomentumConflict,
chartStateHint, setupTypeHint, timeframeAlignmentHint, volatilityContext,
dataConfidenceFactors, visibleConfirmationSignals, visibleInvalidationClues,
supportResistanceEvidence, entryScenarioEvidence, patternCandidates,
visibleIndicators, visualSupportZones, visualResistanceZones, priceAxisObservations,
indicatorReadings, volumeObservation, riskNotes, summary, disclaimer.
""".strip()


def _nullable_confidence_schema() -> dict[str, Any]:
    return {"type": ["string", "null"], "enum": ["low", "medium", "high", None]}


_CHART_STATE_HINTS = [
    "strong_uptrend",
    "uptrend_pullback",
    "uptrend_consolidation",
    "overheated_breakout",
    "range_lower_area",
    "range_upper_area",
    "downtrend_rebound",
    "resistance_test",
    "breakdown_risk",
    "high_volatility_uncertain",
    "unknown",
]
_SETUP_TYPE_HINTS = [
    "trend_following",
    "pullback",
    "breakout_retest",
    "range_reversal",
    "risk_management",
    "wait_for_confirmation",
    "unknown",
]
_TIMEFRAME_ALIGNMENT_HINTS = ["aligned", "mixed", "conflicting", "insufficient_visible_data", "unknown"]
_VOLATILITY_STATES = ["compressed", "normal", "expanded", "gap_or_spike", "uncertain"]
_OBSERVATION_DIRECTIONS = ["bullish", "bearish", "neutral", "unknown"]
_SR_QUALITY_VALUES = ["low", "medium", "high", "unknown"]
_PATTERN_DIRECTIONS = ["bullish", "bearish", "neutral", "uncertain"]
_PATTERN_STAGES = ["forming", "neckline_test", "breakout_test", "confirmed", "failed", "invalidated", "uncertain"]
_SWING_HIGH_ROLES = ["left_shoulder", "head", "right_shoulder", "lower_high", "higher_high", "resistance", "breakout_failure", "unknown"]
_SWING_LOW_ROLES = ["neckline_touch", "support", "higher_low", "lower_low", "breakdown_level", "range_low", "unknown"]
_LINE_TYPES = [
    "support",
    "resistance",
    "neckline",
    "uptrend_line",
    "downtrend_line",
    "channel_upper",
    "channel_lower",
    "breakout_line",
    "breakdown_line",
    "invalidation_line",
    "decision_zone",
    "unknown",
]
_INTERPRETATION_BIASES = ["bullish", "bearish", "neutral", "cautious", "uncertain"]


def _nullable_enum_schema(values: list[str]) -> dict[str, Any]:
    return {"type": ["string", "null"], "enum": [*values, None]}


def _confidence_schema() -> dict[str, Any]:
    return {"type": "string", "enum": ["low", "medium", "high"]}


def _entry_scenario_evidence_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "observed": {"type": ["boolean", "null"]},
            "evidence": {"type": "array", "maxItems": 4, "items": {"type": "string"}},
            "missingConfirmation": {"type": "array", "maxItems": 4, "items": {"type": "string"}},
            "riskNotes": {"type": "array", "maxItems": 4, "items": {"type": "string"}},
            "confidence": _nullable_confidence_schema(),
        },
        "required": ["observed", "evidence", "missingConfirmation", "riskNotes", "confidence"],
    }


def _swing_point_schema(roles: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "order": {"type": "integer", "minimum": 1},
            "price": {"type": ["number", "null"]},
            "priceZone": {"type": ["string", "null"]},
            "role": _nullable_enum_schema(roles),
            "confidence": _nullable_confidence_schema(),
            "evidence": {"type": ["string", "null"]},
        },
        "required": ["order", "price", "priceZone", "role", "confidence", "evidence"],
    }


def _pattern_price_levels_schema() -> dict[str, Any]:
    keys = [
        "currentPrice",
        "patternHigh",
        "patternLow",
        "leftShoulder",
        "head",
        "rightShoulder",
        "neckline",
        "support",
        "resistance",
        "breakout",
        "breakdown",
        "breakoutPrice",
        "breakdownPrice",
        "confirmationLevel",
        "invalidationLevel",
    ]
    return {
        "type": ["object", "null"],
        "additionalProperties": False,
        "properties": {key: {"type": ["number", "null"]} for key in keys},
        "required": keys,
    }


AI_ANALYSIS_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "symbolDetection": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "detectedName": {"type": ["string", "null"]},
                "detectedTicker": {"type": ["string", "null"]},
                "detectedMarket": {"type": "string", "enum": ["KR", "US", "UNKNOWN"]},
                "detectedExchange": {"type": ["string", "null"]},
                "currency": {"type": ["string", "null"]},
                "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                "reason": {"type": "string"},
            },
            "required": ["detectedName", "detectedTicker", "detectedMarket", "detectedExchange", "currency", "confidence", "reason"],
        },
        "chartType": {"type": "string"},
        "timeframeEstimate": {"type": "string"},
        "visualTrend": {"type": "string"},
        "visualStructure": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "swingHighs": {"type": "array", "maxItems": 6, "items": _swing_point_schema(_SWING_HIGH_ROLES)},
                "swingLows": {"type": "array", "maxItems": 6, "items": _swing_point_schema(_SWING_LOW_ROLES)},
                "structureSummary": {"type": ["string", "null"]},
            },
            "required": ["swingHighs", "swingLows", "structureSummary"],
        },
        "lineAnalysis": {
            "type": "array",
            "maxItems": 8,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {"type": "string", "enum": _LINE_TYPES},
                    "price": {"type": ["number", "null"]},
                    "priceLow": {"type": ["number", "null"]},
                    "priceHigh": {"type": ["number", "null"]},
                    "priceZone": {"type": ["string", "null"]},
                    "confidence": _nullable_confidence_schema(),
                    "evidence": {"type": "array", "maxItems": 3, "items": {"type": "string"}},
                    "roleInStrategy": {"type": ["string", "null"]},
                },
                "required": ["type", "price", "priceLow", "priceHigh", "priceZone", "confidence", "evidence", "roleInStrategy"],
            },
        },
        "interpretationLayers": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "shortTermState": {"type": ["string", "null"]},
                "higherTimeframeStructure": {"type": ["string", "null"]},
                "structuralPatternRisk": {"type": ["string", "null"]},
                "momentumState": {"type": ["string", "null"]},
                "coexistenceSummary": {"type": ["string", "null"]},
                "finalBias": _nullable_enum_schema(_INTERPRETATION_BIASES),
            },
            "required": ["shortTermState", "higherTimeframeStructure", "structuralPatternRisk", "momentumState", "coexistenceSummary", "finalBias"],
        },
        "patternMomentumConflict": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "exists": {"type": "boolean"},
                "momentumBias": _nullable_enum_schema(_OBSERVATION_DIRECTIONS),
                "patternBias": _nullable_enum_schema(_OBSERVATION_DIRECTIONS),
                "resolutionRule": {"type": ["string", "null"]},
                "explanation": {"type": ["string", "null"]},
            },
            "required": ["exists", "momentumBias", "patternBias", "resolutionRule", "explanation"],
        },
        "chartStateHint": _nullable_enum_schema(_CHART_STATE_HINTS),
        "setupTypeHint": _nullable_enum_schema(_SETUP_TYPE_HINTS),
        "timeframeAlignmentHint": _nullable_enum_schema(_TIMEFRAME_ALIGNMENT_HINTS),
        "volatilityContext": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "state": _nullable_enum_schema(_VOLATILITY_STATES),
                "evidence": {"type": "array", "maxItems": 4, "items": {"type": "string"}},
                "confidence": _nullable_confidence_schema(),
            },
            "required": ["state", "evidence", "confidence"],
        },
        "dataConfidenceFactors": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "priceAxisVisible": {"type": ["boolean", "null"]},
                "timeAxisVisible": {"type": ["boolean", "null"]},
                "volumeVisible": {"type": ["boolean", "null"]},
                "indicatorsVisible": {"type": "array", "maxItems": 8, "items": {"type": "string"}},
                "limitations": {"type": "array", "maxItems": 5, "items": {"type": "string"}},
                "confidence": _nullable_confidence_schema(),
            },
            "required": ["priceAxisVisible", "timeAxisVisible", "volumeVisible", "indicatorsVisible", "limitations", "confidence"],
        },
        "visibleConfirmationSignals": {
            "type": "array",
            "maxItems": 6,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {"type": "string"},
                    "direction": {"type": "string", "enum": _OBSERVATION_DIRECTIONS},
                    "evidence": {"type": "string"},
                    "confidence": _confidence_schema(),
                },
                "required": ["type", "direction", "evidence", "confidence"],
            },
        },
        "visibleInvalidationClues": {
            "type": "array",
            "maxItems": 6,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {"type": "string"},
                    "evidence": {"type": "string"},
                    "confidence": _confidence_schema(),
                },
                "required": ["type", "evidence", "confidence"],
            },
        },
        "supportResistanceEvidence": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "supportEvidence": {"type": "array", "maxItems": 5, "items": {"type": "string"}},
                "resistanceEvidence": {"type": "array", "maxItems": 5, "items": {"type": "string"}},
                "roleReversalObserved": {"type": ["boolean", "null"]},
                "quality": {"type": "string", "enum": _SR_QUALITY_VALUES},
            },
            "required": ["supportEvidence", "resistanceEvidence", "roleReversalObserved", "quality"],
        },
        "entryScenarioEvidence": {
            "type": ["object", "null"],
            "additionalProperties": False,
            "properties": {
                "current": _entry_scenario_evidence_schema(),
                "pullback": _entry_scenario_evidence_schema(),
                "breakoutRetest": _entry_scenario_evidence_schema(),
            },
            "required": ["current", "pullback", "breakoutRetest"],
        },
        "patternCandidates": {
            "type": "array",
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "label": {"type": "string"},
                    "category": {"type": "string", "enum": ["reversal", "continuation", "range", "breakout", "unknown"]},
                    "direction": _nullable_enum_schema(_PATTERN_DIRECTIONS),
                    "stage": _nullable_enum_schema(_PATTERN_STAGES),
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "confidenceScore": {"type": ["number", "null"]},
                    "priceLevels": _pattern_price_levels_schema(),
                    "evidence": {"type": "array", "maxItems": 3, "items": {"type": "string"}},
                    "breakoutDirection": {"type": "string", "enum": ["upside_candidate", "downside_candidate", "neutral", "unknown"]},
                    "confirmationCondition": {"type": "string"},
                    "invalidationCondition": {"type": "string"},
                    "entryLogic": {"type": "string"},
                    "tradingImplication": {"type": ["string", "null"]},
                    "conflictsWithMomentum": {"type": ["boolean", "null"]},
                    "conflictExplanation": {"type": ["string", "null"]},
                    "riskLevel": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": [
                    "name",
                    "label",
                    "category",
                    "direction",
                    "stage",
                    "confidence",
                    "confidenceScore",
                    "priceLevels",
                    "evidence",
                    "breakoutDirection",
                    "confirmationCondition",
                    "invalidationCondition",
                    "entryLogic",
                    "tradingImplication",
                    "conflictsWithMomentum",
                    "conflictExplanation",
                    "riskLevel",
                ],
            },
        },
        "visibleIndicators": {"type": "array", "items": {"type": "string"}},
        "visualSupportZones": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "label": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "note": {"type": "string"},
                },
                "required": ["label", "confidence", "note"],
            },
        },
        "visualResistanceZones": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "label": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "note": {"type": "string"},
                },
                "required": ["label", "confidence", "note"],
            },
        },
        "priceAxisObservations": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "currentPriceEstimate": {
                    "type": ["object", "null"],
                    "additionalProperties": False,
                    "properties": {"value": {"type": ["number", "null"]}, "confidence": _nullable_confidence_schema(), "note": {"type": ["string", "null"]}},
                    "required": ["value", "confidence", "note"],
                },
                "visibleSupportPrices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {"value": {"type": ["number", "null"]}, "label": {"type": "string"}, "confidence": _nullable_confidence_schema()},
                        "required": ["value", "label", "confidence"],
                    },
                },
                "visibleResistancePrices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {"value": {"type": ["number", "null"]}, "label": {"type": "string"}, "confidence": _nullable_confidence_schema()},
                        "required": ["value", "label", "confidence"],
                    },
                },
                "recentHighEstimate": {
                    "type": ["object", "null"],
                    "additionalProperties": False,
                    "properties": {"value": {"type": ["number", "null"]}, "confidence": _nullable_confidence_schema(), "note": {"type": ["string", "null"]}},
                    "required": ["value", "confidence", "note"],
                },
                "recentLowEstimate": {
                    "type": ["object", "null"],
                    "additionalProperties": False,
                    "properties": {"value": {"type": ["number", "null"]}, "confidence": _nullable_confidence_schema(), "note": {"type": ["string", "null"]}},
                    "required": ["value", "confidence", "note"],
                },
            },
            "required": ["currentPriceEstimate", "visibleSupportPrices", "visibleResistancePrices", "recentHighEstimate", "recentLowEstimate"],
        },
        "indicatorReadings": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "rsi": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"visible": {"type": "boolean"}, "valueEstimate": {"type": ["number", "null"]}, "status": {"type": ["string", "null"]}, "confidence": _nullable_confidence_schema()},
                    "required": ["visible", "valueEstimate", "status", "confidence"],
                },
                "macd": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"visible": {"type": "boolean"}, "status": {"type": ["string", "null"]}, "confidence": _nullable_confidence_schema()},
                    "required": ["visible", "status", "confidence"],
                },
                "bollingerBands": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "status": {"type": ["string", "null"]},
                        "reason": {"type": ["string", "null"]},
                        "position": {"type": ["string", "null"]},
                        "upperEstimate": {"type": ["number", "null"]},
                        "lowerEstimate": {"type": ["number", "null"]},
                        "confidence": _nullable_confidence_schema(),
                    },
                    "required": ["visible", "status", "reason", "position", "upperEstimate", "lowerEstimate", "confidence"],
                },
                "ichimoku": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "pricePosition": {"type": ["string", "null"]},
                        "cloudState": {"type": ["string", "null"]},
                        "status": {"type": ["string", "null"]},
                        "cloudPosition": {"type": ["string", "null"]},
                        "confidence": _nullable_confidence_schema(),
                        "reason": {"type": ["string", "null"]},
                    },
                    "required": ["visible", "pricePosition", "cloudState", "status", "cloudPosition", "confidence", "reason"],
                },
                "movingAverages": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"visible": {"type": "boolean"}, "status": {"type": ["string", "null"]}, "confidence": _nullable_confidence_schema()},
                    "required": ["visible", "status", "confidence"],
                },
                "volume": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"visible": {"type": "boolean"}, "status": {"type": ["string", "null"]}, "confidence": _nullable_confidence_schema()},
                    "required": ["visible", "status", "confidence"],
                },
            },
            "required": ["rsi", "macd", "bollingerBands", "ichimoku", "movingAverages", "volume"],
        },
        "volumeObservation": {"type": "string"},
        "riskNotes": {"type": "array", "maxItems": 5, "items": {"type": "string"}},
        "summary": {"type": "string"},
        "disclaimer": {"type": "string"},
    },
    "required": [
        "symbolDetection",
        "chartType",
        "timeframeEstimate",
        "visualTrend",
        "visualStructure",
        "lineAnalysis",
        "interpretationLayers",
        "patternMomentumConflict",
        "chartStateHint",
        "setupTypeHint",
        "timeframeAlignmentHint",
        "volatilityContext",
        "dataConfidenceFactors",
        "visibleConfirmationSignals",
        "visibleInvalidationClues",
        "supportResistanceEvidence",
        "entryScenarioEvidence",
        "patternCandidates",
        "visibleIndicators",
        "visualSupportZones",
        "visualResistanceZones",
        "priceAxisObservations",
        "indicatorReadings",
        "volumeObservation",
        "riskNotes",
        "summary",
        "disclaimer",
    ],
}


def _image_bytes_to_data_url(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _get_openai_client() -> OpenAI:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OPENAI_API_KEY 환경변수가 없습니다. backend/.env 파일에 API 키를 입력하세요.")
    # Keep the default below common platform proxy limits so the API can return
    # a JSON timeout error instead of "Application failed to respond".
    timeout = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "55"))
    max_retries = int(os.getenv("OPENAI_MAX_RETRIES", "1"))
    return OpenAI(api_key=api_key, timeout=timeout, max_retries=max_retries)


def check_openai_health() -> dict[str, Any]:
    model = get_openai_model_name()
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    configured = bool(api_key and api_key != "your_openai_api_key_here")

    if not configured:
        return {
            "ok": False,
            "configured": False,
            "model": model,
            "errorType": "missing_api_key",
            "message": "OPENAI_API_KEY가 Railway 환경변수에 설정되어 있지 않습니다.",
        }

    try:
        client = _get_openai_client()
        client.models.list()
        return {
            "ok": True,
            "configured": True,
            "model": model,
            "errorType": None,
            "message": "OpenAI API 연결이 정상입니다.",
        }
    except AuthenticationError:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "errorType": "authentication_error",
            "message": "OPENAI_API_KEY가 유효하지 않거나 만료되었습니다.",
        }
    except RateLimitError:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "errorType": "rate_limit_error",
            "message": "OpenAI 사용량 제한 또는 결제 한도에 도달했습니다.",
        }
    except APITimeoutError:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "errorType": "timeout_error",
            "message": "Railway에서 OpenAI API 응답을 기다리다 시간이 초과되었습니다.",
        }
    except APIConnectionError as exc:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "errorType": "connection_error",
            "message": f"Railway에서 OpenAI API 서버에 연결하지 못했습니다: {exc}",
        }
    except OpenAIError as exc:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "errorType": exc.__class__.__name__,
            "message": str(exc),
        }


def _extract_output_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text

    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)

    if chunks:
        return "".join(chunks)

    raise RuntimeError("OpenAI Vision API 응답에서 텍스트를 찾을 수 없습니다.")


def _normalize_image_inputs(
    full_image_bytes: bytes | None = None,
    crop_image_bytes: bytes | None = None,
    images: dict[str, bytes | None] | None = None,
) -> list[tuple[str, bytes]]:
    if images:
        ordered_names = ["fullImage", "rightCropImage", "bottomCropImage", "centerChartImage"]
        return [(name, images[name]) for name in ordered_names if images.get(name)]
    if full_image_bytes is None or crop_image_bytes is None:
        raise ValueError("분석할 이미지 bytes가 없습니다.")
    return [("fullImage", full_image_bytes), ("rightCropImage", crop_image_bytes)]


def analyze_chart_image_with_ai(
    full_image_bytes: bytes | None = None,
    crop_image_bytes: bytes | None = None,
    images: dict[str, bytes | None] | None = None,
    model_name: str | None = None,
) -> AIAnalysis:
    client = _get_openai_client()
    model = _clean_model_name(model_name, get_openai_model_name())
    image_inputs = _normalize_image_inputs(full_image_bytes, crop_image_bytes, images)

    user_content: list[dict[str, Any]] = [{"type": "input_text", "text": USER_PROMPT}]
    for label, image_bytes in image_inputs:
        user_content.append({"type": "input_text", "text": f"{label}를 참고해 분석하세요."})
        user_content.append(
            {
                "type": "input_image",
                "image_url": _image_bytes_to_data_url(image_bytes),
                "detail": "high",
            }
        )

    try:
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
                {"role": "user", "content": user_content},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "chart_visual_analysis",
                    "schema": AI_ANALYSIS_RESPONSE_SCHEMA,
                    "strict": True,
                }
            },
            max_output_tokens=3400,
        )
    except BadRequestError as exc:
        message = str(exc).lower()
        if "image" in message or "input_image" in message or "unsupported" in message:
            raise RuntimeError(
                f"OPENAI_MODEL={model} 모델이 이미지 입력을 지원하지 않거나 현재 요청 형식을 처리하지 못했습니다. "
                "backend/.env의 OPENAI_MODEL을 Vision 지원 모델로 설정하세요."
            ) from exc
        raise RuntimeError(f"OpenAI Vision API 요청이 올바르지 않습니다: {exc}") from exc
    except AuthenticationError as exc:
        raise RuntimeError("OpenAI API 키가 유효하지 않습니다. Railway의 OPENAI_API_KEY를 다시 설정하세요.") from exc
    except RateLimitError as exc:
        raise RuntimeError("OpenAI 사용량 제한 또는 결제 한도에 도달했습니다. OpenAI Billing/Usage를 확인하세요.") from exc
    except APITimeoutError as exc:
        raise RuntimeError("OpenAI Vision API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.") from exc
    except APIConnectionError as exc:
        raise RuntimeError(
            "OpenAI Vision API 서버에 연결하지 못했습니다. Railway 환경변수, outbound 네트워크, DNS, "
            f"또는 일시적인 연결 장애를 확인하세요. 원본 오류: {exc}"
        ) from exc
    except OpenAIError as exc:
        raise RuntimeError(f"OpenAI Vision API 호출에 실패했습니다: {exc}") from exc

    output_text = _extract_output_text(response)
    logger.debug("AI raw response text: %s", output_text)

    try:
        parsed = AIAnalysis.model_validate(json.loads(output_text))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError("AI 응답이 올바른 JSON 구조가 아닙니다.") from exc

    logger.info(
        "Normalized pattern candidates: count=%s names=%s confidences=%s",
        len(parsed.patternCandidates),
        [candidate.name for candidate in parsed.patternCandidates],
        [candidate.confidence for candidate in parsed.patternCandidates],
    )
    return parsed
