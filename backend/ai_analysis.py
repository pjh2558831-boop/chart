from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import BadRequestError, OpenAI, OpenAIError
from pydantic import ValidationError

from schemas import AIAnalysis


logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4.1-mini"
PROMPT_VERSION = "chart_analysis_v2_speed_optimized"
ENV_PATH = Path(__file__).resolve().with_name(".env")

load_dotenv(dotenv_path=ENV_PATH)


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


def _nullable_confidence_schema() -> dict[str, Any]:
    return {"type": ["string", "null"], "enum": ["low", "medium", "high", None]}


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
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "confidenceScore": {"type": ["number", "null"]},
                    "evidence": {"type": "array", "maxItems": 3, "items": {"type": "string"}},
                    "breakoutDirection": {"type": "string", "enum": ["upside_candidate", "downside_candidate", "neutral", "unknown"]},
                    "confirmationCondition": {"type": "string"},
                    "invalidationCondition": {"type": "string"},
                    "entryLogic": {"type": "string"},
                    "tradingImplication": {"type": ["string", "null"]},
                    "riskLevel": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": [
                    "name",
                    "label",
                    "category",
                    "confidence",
                    "confidenceScore",
                    "evidence",
                    "breakoutDirection",
                    "confirmationCondition",
                    "invalidationCondition",
                    "entryLogic",
                    "tradingImplication",
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
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OPENAI_API_KEY 환경변수가 없습니다. backend/.env 파일에 API 키를 입력하세요.")
    return OpenAI(api_key=api_key)


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
) -> AIAnalysis:
    client = _get_openai_client()
    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
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
            max_output_tokens=2600,
        )
    except BadRequestError as exc:
        message = str(exc).lower()
        if "image" in message or "input_image" in message or "unsupported" in message:
            raise RuntimeError(
                f"OPENAI_MODEL={model} 모델이 이미지 입력을 지원하지 않거나 현재 요청 형식을 처리하지 못했습니다. "
                "backend/.env의 OPENAI_MODEL을 Vision 지원 모델로 설정하세요."
            ) from exc
        raise RuntimeError(f"OpenAI Vision API 요청이 올바르지 않습니다: {exc}") from exc
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
