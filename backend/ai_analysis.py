from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import BadRequestError, OpenAI, OpenAIError
from pydantic import ValidationError

from schemas import AIAnalysis


DEFAULT_MODEL = "gpt-4.1-mini"
ENV_PATH = Path(__file__).resolve().with_name(".env")

load_dotenv(dotenv_path=ENV_PATH)


SYSTEM_PROMPT = """
You are a visual stock chart analysis assistant.
You do not access real OHLCV data or external market data.
You analyze only what is visible inside the uploaded chart images.

Rules:
- Do not give investment advice.
- Do not say buy, sell, guaranteed rise, guaranteed fall, or certain breakout.
- Treat all prices as image-based estimates only.
- If price text is unclear, return null and explain uncertainty.
- If RSI, MACD, Bollinger Bands, moving averages, or volume are not clearly visible, mark them as not visible or uncertain.
- Pattern names, support zones, resistance zones, and trend judgments must be candidates, not certainties.
- Return valid JSON only.

Important output behavior:
- Keep summary and notes in Korean.
- Use KR, US, or UNKNOWN for detectedMarket.
- Use low, medium, or high for confidence.
- If ticker or market is unclear, return null or UNKNOWN.
- If current price on the right axis is visible, estimate it numerically.
- If support or resistance prices are visible on the chart or axis, estimate them numerically.
- If recent high or recent low are visible, estimate them numerically.
- For RSI, if the number is unclear, keep valueEstimate as null and infer only a status if possible.
""".strip()


USER_PROMPT = """
첫 번째 이미지는 전체 차트 이미지이고, 두 번째 이미지는 오른쪽 35% 가격축/최근 캔들 보조 이미지입니다.
두 이미지를 함께 참고하되 이미지에 보이는 정보만 분석하세요.

반드시 아래 구조의 JSON만 반환하세요.

필수 분석 항목:
1. symbolDetection
   - detectedName
   - detectedTicker
   - detectedMarket: KR | US | UNKNOWN
   - detectedExchange
   - currency
   - confidence
   - reason

2. chartType
3. timeframeEstimate
4. visualTrend
5. patternCandidates
6. visibleIndicators
7. visualSupportZones
8. visualResistanceZones

9. priceAxisObservations
   - currentPriceEstimate: 현재가가 보이면 숫자로 추정, 아니면 null
   - visibleSupportPrices: 가격축이나 차트에서 읽히는 지지 후보 가격
   - visibleResistancePrices: 가격축이나 차트에서 읽히는 저항 후보 가격
   - recentHighEstimate
   - recentLowEstimate

10. indicatorReadings
   - rsi: visible, valueEstimate, status, confidence
   - macd: visible, status, confidence
   - bollingerBands: visible, position, upperEstimate, lowerEstimate, confidence
   - movingAverages: visible, status, confidence
   - volume: visible, status, confidence

11. volumeObservation
12. riskNotes
13. summary
14. disclaimer

값 작성 규칙:
- 모든 가격은 이미지 기반 추정값입니다.
- 가격축이 명확하지 않으면 가격 추정값은 null로 두세요.
- rsi.status 예: oversold, rebound_candidate, neutral, overbought, unknown
- macd.status 예: bullish_cross_candidate, bullish, bearish_cross_candidate, bearish, unknown
- bollingerBands.position 예: near_lower, middle, near_upper, above_upper, below_lower, unknown
- movingAverages.status 예: price_above_ma, price_below_ma, short_above_long, short_below_long, mixed, unknown
- volume.status 예: increasing, decreasing, neutral, unknown
- summary와 riskNotes는 한국어로 작성하세요.
- disclaimer는 반드시 투자 조언이 아니라는 뜻을 담은 한국어 문구로 작성하세요.
""".strip()


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
            "required": [
                "detectedName",
                "detectedTicker",
                "detectedMarket",
                "detectedExchange",
                "currency",
                "confidence",
                "reason",
            ],
        },
        "chartType": {"type": "string"},
        "timeframeEstimate": {"type": "string"},
        "visualTrend": {"type": "string"},
        "patternCandidates": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "reason": {"type": "string"},
                },
                "required": ["name", "confidence", "reason"],
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
                    "properties": {
                        "value": {"type": ["number", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        "note": {"type": ["string", "null"]},
                    },
                    "required": ["value", "confidence", "note"],
                },
                "visibleSupportPrices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "value": {"type": ["number", "null"]},
                            "label": {"type": "string"},
                            "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        },
                        "required": ["value", "label", "confidence"],
                    },
                },
                "visibleResistancePrices": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "value": {"type": ["number", "null"]},
                            "label": {"type": "string"},
                            "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        },
                        "required": ["value", "label", "confidence"],
                    },
                },
                "recentHighEstimate": {
                    "type": ["object", "null"],
                    "additionalProperties": False,
                    "properties": {
                        "value": {"type": ["number", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        "note": {"type": ["string", "null"]},
                    },
                    "required": ["value", "confidence", "note"],
                },
                "recentLowEstimate": {
                    "type": ["object", "null"],
                    "additionalProperties": False,
                    "properties": {
                        "value": {"type": ["number", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        "note": {"type": ["string", "null"]},
                    },
                    "required": ["value", "confidence", "note"],
                },
            },
            "required": [
                "currentPriceEstimate",
                "visibleSupportPrices",
                "visibleResistancePrices",
                "recentHighEstimate",
                "recentLowEstimate",
            ],
        },
        "indicatorReadings": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "rsi": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "valueEstimate": {"type": ["number", "null"]},
                        "status": {"type": ["string", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                    },
                    "required": ["visible", "valueEstimate", "status", "confidence"],
                },
                "macd": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "status": {"type": ["string", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                    },
                    "required": ["visible", "status", "confidence"],
                },
                "bollingerBands": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "position": {"type": ["string", "null"]},
                        "upperEstimate": {"type": ["number", "null"]},
                        "lowerEstimate": {"type": ["number", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                    },
                    "required": ["visible", "position", "upperEstimate", "lowerEstimate", "confidence"],
                },
                "movingAverages": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "status": {"type": ["string", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                    },
                    "required": ["visible", "status", "confidence"],
                },
                "volume": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "visible": {"type": "boolean"},
                        "status": {"type": ["string", "null"]},
                        "confidence": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                    },
                    "required": ["visible", "status", "confidence"],
                },
            },
            "required": ["rsi", "macd", "bollingerBands", "movingAverages", "volume"],
        },
        "volumeObservation": {"type": "string"},
        "riskNotes": {"type": "array", "items": {"type": "string"}},
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


def analyze_chart_image_with_ai(full_image_bytes: bytes, crop_image_bytes: bytes) -> AIAnalysis:
    client = _get_openai_client()
    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)

    try:
        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": USER_PROMPT},
                        {
                            "type": "input_image",
                            "image_url": _image_bytes_to_data_url(full_image_bytes),
                            "detail": "high",
                        },
                        {
                            "type": "input_image",
                            "image_url": _image_bytes_to_data_url(crop_image_bytes),
                            "detail": "high",
                        },
                    ],
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "chart_visual_analysis",
                    "schema": AI_ANALYSIS_RESPONSE_SCHEMA,
                    "strict": True,
                }
            },
            max_output_tokens=3000,
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

    try:
        return AIAnalysis.model_validate(json.loads(output_text))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError("AI 응답이 올바른 JSON 구조가 아닙니다.") from exc
