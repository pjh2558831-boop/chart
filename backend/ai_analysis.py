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
ENV_PATH = Path(__file__).resolve().with_name(".env")

load_dotenv(dotenv_path=ENV_PATH)


SYSTEM_PROMPT = """
너는 주식 차트 이미지를 시각적으로 해석하는 보조 분석기다.
너는 실제 OHLCV 데이터, 거래소 API, 외부 가격 데이터에 접근하지 않는다.
너는 이미지에 보이는 정보만 분석한다.

중요 규칙:
- 패턴은 절대 확정하지 않는다.
- 항상 "후보"로만 해석한다.
- 애매하면 confidence는 반드시 low로 둔다.
- 지지선, 저항선, 넥라인, 추세선은 모두 후보로만 표현한다.
- RSI, MACD, 볼린저밴드, 이동평균선, 거래량은 보조 근거로만 사용하고, 단독으로 패턴을 확정하지 않는다.
- 거래량 증가가 돌파와 함께 보일 때만 보조 근거로 사용한다.
- 이미지 기반 분석은 최대 confidence를 medium까지만 허용한다.
- 손절 기준 없이 진입을 단정하지 않는다.
- 매수 추천, 매도 추천, 수익 보장, 확정 돌파 같은 표현은 금지한다.
- 결과는 기술적 지표 기반 참고 정보이며 실제 투자 판단은 사용자의 책임이라는 취지를 유지한다.
- 반드시 JSON만 반환한다.
""".strip()


PATTERN_GUIDE = """
패턴 후보 정의표:

1. box_range | 박스권 | range
- 고점과 저점이 일정 범위 안에서 반복
- 최소 2회 이상 상단 저항, 하단 지지 확인
- 확인 조건: 상단 저항 돌파 또는 하단 지지 이탈
- 무효화 조건: 중심부에서 방향성 없이 움직이거나 터치 횟수 부족
- 방향 후보: 상단 근처 upside_candidate, 하단 근처 downside_candidate, 중앙 neutral

2. ascending_channel | 상승 채널 | continuation
- 고점과 저점이 동시에 우상향
- 평행한 추세선 후보 존재
- 확인 조건: 하단 채널 지지 후 반등 또는 상단 채널 돌파
- 무효화 조건: 하단 채널 이탈

3. descending_channel | 하락 채널 | continuation
- 고점과 저점이 동시에 우하향
- 평행한 하락 추세선 후보 존재
- 확인 조건: 상단 채널 저항 후 하락 또는 하단 채널 이탈
- 무효화 조건: 상단 채널 돌파

4. symmetrical_triangle | 삼각수렴 | breakout
- 고점은 낮아지고 저점은 높아짐
- 변동폭이 점차 감소
- 확인 조건: 수렴 상단 또는 하단 돌파
- 무효화 조건: 돌파 후 반대 방향 재진입

5. ascending_triangle | 상승 삼각형 | breakout
- 고점은 비슷한 위치에서 저항 형성
- 저점은 점진적으로 상승
- 확인 조건: 상단 저항 돌파
- 무효화 조건: 상승 저점 라인 이탈

6. descending_triangle | 하락 삼각형 | breakout
- 저점은 비슷한 위치에서 지지 형성
- 고점은 점진적으로 하락
- 확인 조건: 하단 지지 이탈
- 무효화 조건: 하락 고점 라인 돌파

7. double_bottom | 이중바닥 | reversal
- 비슷한 저점이 2회 형성
- 두 번째 저점 이후 반등
- 중간 고점이 넥라인 후보
- 확인 조건: 넥라인 돌파
- 무효화 조건: 두 번째 저점 이탈

8. double_top | 이중천장 | reversal
- 비슷한 고점이 2회 형성
- 두 번째 고점 이후 하락
- 중간 저점이 넥라인 후보
- 확인 조건: 넥라인 이탈
- 무효화 조건: 두 번째 고점 돌파

9. head_and_shoulders | 헤드앤숄더 | reversal
- 좌어깨, 머리, 우어깨 구조
- 머리가 가장 높음
- 넥라인 후보 존재
- 확인 조건: 넥라인 이탈
- 무효화 조건: 우어깨 이후 고점 돌파

10. inverse_head_and_shoulders | 역헤드앤숄더 | reversal
- 좌어깨, 머리, 우어깨 구조
- 머리가 가장 낮음
- 넥라인 후보 존재
- 확인 조건: 넥라인 돌파
- 무효화 조건: 우어깨 저점 이탈

11. flag | 플래그 | continuation
- 강한 상승 또는 하락 이후 짧은 반대 방향 조정
- 조정 구간은 작고 짧음
- 확인 조건: 기존 추세 방향 재돌파
- 무효화 조건: 조정 범위 반대 방향 이탈

12. wedge | 쐐기형 | breakout
- 고점과 저점이 한 방향으로 좁아짐
- 상승 쐐기 또는 하락 쐐기 가능
- 확인 조건: 쐐기 상단 또는 하단 이탈
- 무효화 조건: 이탈 후 반대 방향 재진입

출력 규칙:
- patternCandidates는 위 패턴명만 사용
- 구조가 약하면 빈 배열 반환
- evidence는 각 후보마다 최소 2개 이상 작성 시도
- confirmationCondition, invalidationCondition, entryLogic은 반드시 채운다
- riskLevel은 low/medium/high 중 하나
- breakoutDirection은 upside_candidate/downside_candidate/neutral/unknown 중 하나
""".strip()


USER_PROMPT = f"""
첫 번째 이미지는 전체 차트이고, 두 번째 이미지는 오른쪽 35% 가격축/최근 캔들 보조 이미지다.
두 이미지를 함께 보고, 이미지에 실제로 보이는 구조만 분석하라.

{PATTERN_GUIDE}

반드시 아래 JSON 구조로만 반환하라.

필수 필드:
1. symbolDetection
2. chartType
3. timeframeEstimate
4. visualTrend
5. patternCandidates
6. visibleIndicators
7. visualSupportZones
8. visualResistanceZones
9. priceAxisObservations
10. indicatorReadings
11. volumeObservation
12. riskNotes
13. summary
14. disclaimer

priceAxisObservations 규칙:
- currentPriceEstimate.value는 우측 가격축에서 현재가가 꽤 명확히 읽힐 때만 넣고, 불명확하면 null
- visibleSupportPrices / visibleResistancePrices는 숫자가 보일 때만 value를 넣고, 아니면 null
- recentHighEstimate / recentLowEstimate도 숫자가 보일 때만 추정

indicatorReadings 규칙:
- rsi.status: oversold | rebound_candidate | neutral | overbought | unknown
- macd.status: bullish_cross_candidate | bullish | bearish_cross_candidate | bearish | unknown
- bollingerBands.position: near_lower | middle | near_upper | above_upper | below_lower | unknown
- movingAverages.status: price_above_ma | price_below_ma | short_above_long | short_below_long | mixed | unknown
- volume.status: increasing | decreasing | neutral | unknown

patternCandidates 규칙:
- 패턴이 애매하면 confidence는 low
- 이미지 기반 후보는 high 금지, 최대 medium
- evidence는 구조적 근거 중심으로 작성
- 거래량/RSI/MACD/이평/볼린저는 보조 근거일 뿐 단독 근거가 아님
- confirmationCondition에는 무엇을 확인해야 신뢰도가 올라가는지 적는다
- invalidationCondition에는 어떤 조건에서 패턴 후보가 약해지거나 무효화되는지 적는다
- entryLogic에는 "진입 후보 조건"만 적고 매수·매도 추천처럼 쓰지 않는다

명확한 패턴이 없으면:
- patternCandidates: []

summary, riskNotes, disclaimer는 한국어로 작성한다.
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
                    "label": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": ["reversal", "continuation", "range", "breakout", "unknown"],
                    },
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "evidence": {"type": "array", "items": {"type": "string"}},
                    "breakoutDirection": {
                        "type": "string",
                        "enum": ["upside_candidate", "downside_candidate", "neutral", "unknown"],
                    },
                    "confirmationCondition": {"type": "string"},
                    "invalidationCondition": {"type": "string"},
                    "entryLogic": {"type": "string"},
                    "riskLevel": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": [
                    "name",
                    "label",
                    "category",
                    "confidence",
                    "evidence",
                    "breakoutDirection",
                    "confirmationCondition",
                    "invalidationCondition",
                    "entryLogic",
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
            max_output_tokens=3600,
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
