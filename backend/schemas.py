from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Confidence = Literal["low", "medium", "high"]
SignalConfidence = Literal["low", "medium", "high", "unavailable"]
PatternCategory = Literal["reversal", "continuation", "range", "breakout", "unknown"]
BreakoutDirection = Literal["upside_candidate", "downside_candidate", "neutral", "unknown"]
RiskLevel = Literal["low", "medium", "high"]
ChartStateHint = Literal[
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
SetupTypeHint = Literal[
    "trend_following",
    "pullback",
    "breakout_retest",
    "range_reversal",
    "risk_management",
    "wait_for_confirmation",
    "unknown",
]
TimeframeAlignmentHint = Literal["aligned", "mixed", "conflicting", "insufficient_visible_data", "unknown"]
VolatilityState = Literal["compressed", "normal", "expanded", "gap_or_spike", "uncertain"]
ObservationDirection = Literal["bullish", "bearish", "neutral", "unknown"]
QualityHint = Literal["low", "medium", "high", "unknown"]
PatternDirection = Literal["bullish", "bearish", "neutral", "uncertain"]
PatternStage = Literal["forming", "neckline_test", "breakout_test", "confirmed", "failed", "invalidated", "uncertain"]
SwingHighRole = Literal[
    "left_shoulder",
    "head",
    "right_shoulder",
    "lower_high",
    "higher_high",
    "resistance",
    "breakout_failure",
    "unknown",
]
SwingLowRole = Literal[
    "neckline_touch",
    "support",
    "higher_low",
    "lower_low",
    "breakdown_level",
    "range_low",
    "unknown",
]
LineType = Literal[
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
InterpretationBias = Literal["bullish", "bearish", "neutral", "cautious", "uncertain"]

VALID_PATTERN_CATEGORIES = {"reversal", "continuation", "range", "breakout", "unknown"}
VALID_BREAKOUT_DIRECTIONS = {"upside_candidate", "downside_candidate", "neutral", "unknown"}
VALID_RISK_LEVELS = {"low", "medium", "high"}
VALID_CONFIDENCE = {"low", "medium", "high"}

PATTERN_DEFINITIONS: dict[str, dict[str, str]] = {
    "box_range": {
        "label": "박스권",
        "category": "range",
        "confirmationCondition": "상단 저항 돌파 또는 하단 지지 이탈이 확인되어야 방향성이 강화됩니다.",
        "invalidationCondition": "중심부에서 방향성 없이 반복되거나 지지·저항 터치 횟수가 부족하면 신뢰도가 낮아집니다.",
        "entryLogic": "경계 구간 돌파 후 지지·저항 전환이 확인될 때만 진입 후보 조건으로 볼 수 있습니다.",
        "riskLevel": "high",
        "breakoutDirection": "neutral",
    },
    "ascending_channel": {
        "label": "상승 채널",
        "category": "continuation",
        "confirmationCondition": "하단 채널 지지 후 반등하거나 상단 채널 돌파가 확인되어야 합니다.",
        "invalidationCondition": "하단 채널을 종가 기준으로 이탈하면 상승 채널 후보는 약해집니다.",
        "entryLogic": "하단 채널 지지 확인 후 반등 캔들이 나올 때만 진입 후보 조건으로 볼 수 있습니다.",
        "riskLevel": "medium",
        "breakoutDirection": "upside_candidate",
    },
    "descending_channel": {
        "label": "하락 채널",
        "category": "continuation",
        "confirmationCondition": "상단 채널 저항 후 하락하거나 하단 채널 이탈이 확인되어야 합니다.",
        "invalidationCondition": "상단 채널을 돌파하면 하락 채널 후보는 무효화됩니다.",
        "entryLogic": "상단 채널 저항 확인 후 하락 전환이 나올 때만 진입 후보 조건으로 볼 수 있습니다.",
        "riskLevel": "medium",
        "breakoutDirection": "downside_candidate",
    },
    "symmetrical_triangle": {
        "label": "삼각수렴",
        "category": "breakout",
        "confirmationCondition": "수렴 상단 또는 하단 돌파와 거래량 증가가 함께 나오면 신뢰도가 높아집니다.",
        "invalidationCondition": "수렴 구간을 이탈한 뒤 반대 방향으로 강하게 재진입하면 패턴 후보가 약해집니다.",
        "entryLogic": "수렴 내부에서는 예측 진입을 피하고 돌파 방향 확인 후 진입 후보 조건으로만 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "unknown",
    },
    "ascending_triangle": {
        "label": "상승 삼각형",
        "category": "breakout",
        "confirmationCondition": "상단 수평 저항 돌파가 확인되어야 합니다.",
        "invalidationCondition": "상승 저점 라인을 종가 기준으로 이탈하면 후보가 약해집니다.",
        "entryLogic": "저항 돌파 후 눌림에서 지지 전환이 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "medium",
        "breakoutDirection": "upside_candidate",
    },
    "descending_triangle": {
        "label": "하락 삼각형",
        "category": "breakout",
        "confirmationCondition": "하단 지지 이탈이 확인되어야 합니다.",
        "invalidationCondition": "하락 고점 라인을 돌파하면 후보가 약해집니다.",
        "entryLogic": "지지 이탈 후 되돌림 저항이 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "medium",
        "breakoutDirection": "downside_candidate",
    },
    "double_bottom": {
        "label": "이중바닥",
        "category": "reversal",
        "confirmationCondition": "중간 고점인 넥라인을 종가 기준으로 돌파해야 신뢰도가 상승합니다.",
        "invalidationCondition": "두 번째 저점을 종가 기준으로 하향 이탈하면 후보는 무효화됩니다.",
        "entryLogic": "넥라인 돌파 후 눌림에서 지지 전환이 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "upside_candidate",
    },
    "double_top": {
        "label": "이중천장",
        "category": "reversal",
        "confirmationCondition": "중간 저점인 넥라인 이탈이 확인되어야 합니다.",
        "invalidationCondition": "두 번째 고점을 종가 기준으로 상향 돌파하면 후보는 무효화됩니다.",
        "entryLogic": "넥라인 이탈 후 되돌림 저항이 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "head_and_shoulders": {
        "label": "헤드앤숄더",
        "category": "reversal",
        "confirmationCondition": "넥라인 이탈과 반등 실패가 함께 확인되면 신뢰도가 상승합니다.",
        "invalidationCondition": "우어깨 이후 고점을 돌파하면 후보는 무효화됩니다.",
        "entryLogic": "넥라인 이탈 후 되돌림 저항이 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "inverse_head_and_shoulders": {
        "label": "역헤드앤숄더",
        "category": "reversal",
        "confirmationCondition": "넥라인 돌파와 거래량 증가가 함께 확인되면 신뢰도가 상승합니다.",
        "invalidationCondition": "우어깨 저점을 다시 이탈하면 후보는 무효화됩니다.",
        "entryLogic": "넥라인 돌파 후 눌림 지지가 확인될 때만 진입 후보 조건으로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "upside_candidate",
    },
    "flag": {
        "label": "플래그",
        "category": "continuation",
        "confirmationCondition": "직전 추세 방향으로 재돌파가 확인되어야 합니다.",
        "invalidationCondition": "조정 범위를 반대 방향으로 이탈하면 플래그 후보는 약해집니다.",
        "entryLogic": "급등·급락 직후 추격 대신 플래그 상단 또는 하단 재돌파 확인 후 진입 후보 조건으로 봅니다.",
        "riskLevel": "medium",
        "breakoutDirection": "unknown",
    },
    "wedge": {
        "label": "쐐기형",
        "category": "breakout",
        "confirmationCondition": "쐐기 상단 또는 하단 이탈 방향이 확인되어야 합니다.",
        "invalidationCondition": "이탈 후 반대 방향으로 강하게 재진입하면 후보는 약해집니다.",
        "entryLogic": "쐐기 내부 예측 진입은 피하고 이탈 방향 확인 후 진입 후보 조건으로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "unknown",
    },
    "rising_wedge": {
        "label": "상승 쐐기",
        "category": "reversal",
        "confirmationCondition": "상승 쐐기 하단 이탈이 확인되어야 합니다.",
        "invalidationCondition": "쐐기 상단을 회복하고 안착하면 후보가 약해집니다.",
        "entryLogic": "하단 이탈 위험이 해소되기 전까지 신규 진입은 신중하게 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "falling_wedge": {
        "label": "하락 쐐기",
        "category": "reversal",
        "confirmationCondition": "하락 쐐기 상단 돌파와 거래량 또는 모멘텀 개선이 확인되어야 합니다.",
        "invalidationCondition": "쐐기 하단을 다시 이탈하면 상승 반전 후보가 약해집니다.",
        "entryLogic": "상단 돌파 후 재지지가 확인될 때만 조건부 진입 후보로 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "upside_candidate",
    },
    "failed_breakout": {
        "label": "돌파 실패",
        "category": "reversal",
        "confirmationCondition": "돌파 가격을 회복하고 재지지가 확인되어야 합니다.",
        "invalidationCondition": "돌파 가격 위에서 재안착하면 실패 후보가 약해집니다.",
        "entryLogic": "재돌파와 안착 확인 전까지 신규 진입은 신중하게 봅니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "lower_high_reversal": {
        "label": "낮아지는 고점",
        "category": "reversal",
        "confirmationCondition": "직전 반등 고점 회복이 확인되어야 합니다.",
        "invalidationCondition": "직전 저점을 이탈하면 하락 전환 위험이 강화됩니다.",
        "entryLogic": "저항 회복 전까지 반등 둔화 위험을 우선 확인합니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "breakdown_risk": {
        "label": "지지 이탈 위험",
        "category": "reversal",
        "confirmationCondition": "이탈한 지지 가격의 회복 여부를 확인해야 합니다.",
        "invalidationCondition": "지지 가격을 회복하고 유지하면 위험 후보가 약해집니다.",
        "entryLogic": "지지 회복 전까지 신규 진입보다 위험 관리가 우선입니다.",
        "riskLevel": "high",
        "breakoutDirection": "downside_candidate",
    },
    "unknown": {
        "label": "명확한 패턴 없음",
        "category": "unknown",
        "confirmationCondition": "추가 고점·저점 형성이나 주요 지지·저항 돌파 확인이 필요합니다.",
        "invalidationCondition": "현재 구조만으로는 특정 패턴 무효화 기준을 설정하기 어렵습니다.",
        "entryLogic": "패턴 기반 진입 판단은 보류하고 지지·저항 및 보조지표 추가 확인이 필요합니다.",
        "riskLevel": "high",
        "breakoutDirection": "unknown",
    },
}

PATTERN_NAME_ALIASES = {
    "박스권": "box_range",
    "box_range": "box_range",
    "range_box": "box_range",
    "ascending_channel": "ascending_channel",
    "상승채널": "ascending_channel",
    "상승_채널": "ascending_channel",
    "descending_channel": "descending_channel",
    "하락채널": "descending_channel",
    "symmetrical_triangle": "symmetrical_triangle",
    "triangle": "symmetrical_triangle",
    "삼각수렴": "symmetrical_triangle",
    "ascending_triangle": "ascending_triangle",
    "상승삼각형": "ascending_triangle",
    "descending_triangle": "descending_triangle",
    "하락삼각형": "descending_triangle",
    "double_bottom": "double_bottom",
    "이중바닥": "double_bottom",
    "double_top": "double_top",
    "이중천장": "double_top",
    "head_and_shoulders": "head_and_shoulders",
    "헤드앤숄더": "head_and_shoulders",
    "헤드_앤_숄더": "head_and_shoulders",
    "head_&_shoulders": "head_and_shoulders",
    "head-and-shoulders": "head_and_shoulders",
    "h&s": "head_and_shoulders",
    "inverse_head_and_shoulders": "inverse_head_and_shoulders",
    "역헤드앤숄더": "inverse_head_and_shoulders",
    "flag": "flag",
    "bullish_flag": "flag",
    "bearish_flag": "flag",
    "플래그": "flag",
    "wedge": "wedge",
    "쐐기형": "wedge",
    "rising_wedge": "rising_wedge",
    "상승쐐기": "rising_wedge",
    "falling_wedge": "falling_wedge",
    "하락쐐기": "falling_wedge",
    "failed_breakout": "failed_breakout",
    "돌파실패": "failed_breakout",
    "lower_high_reversal": "lower_high_reversal",
    "낮아지는고점": "lower_high_reversal",
    "breakdown_risk": "breakdown_risk",
    "지지이탈위험": "breakdown_risk",
    "unknown": "unknown",
    "명확한 패턴 없음": "unknown",
}


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_name(raw_name: Any, raw_label: Any = None) -> str:
    candidates = [_to_text(raw_name), _to_text(raw_label)]
    for candidate in candidates:
        if not candidate:
            continue
        if candidate in PATTERN_NAME_ALIASES:
            return PATTERN_NAME_ALIASES[candidate]
        lowered = candidate.lower().replace(" ", "_")
        if lowered in PATTERN_NAME_ALIASES:
            return PATTERN_NAME_ALIASES[lowered]
        compacted = candidate.lower().replace(" ", "").replace("_", "")
        if "헤드앤숄더" in compacted or compacted in {"head&shoulders", "head-and-shoulders", "h&s"}:
            return "head_and_shoulders"
    return "unknown"


def _normalize_confidence(value: Any, *, image_based: bool = False) -> Confidence:
    normalized = _to_text(value).lower()
    if normalized not in VALID_CONFIDENCE:
        normalized = "low"
    if image_based and normalized == "high":
        return "medium"
    return normalized  # type: ignore[return-value]


def _normalize_category(value: Any, default_name: str) -> PatternCategory:
    normalized = _to_text(value).lower()
    if normalized not in VALID_PATTERN_CATEGORIES:
        normalized = PATTERN_DEFINITIONS.get(default_name, PATTERN_DEFINITIONS["unknown"])["category"]
    return normalized  # type: ignore[return-value]


def _normalize_breakout_direction(value: Any, default_name: str) -> BreakoutDirection:
    normalized = _to_text(value).lower()
    if normalized not in VALID_BREAKOUT_DIRECTIONS:
        normalized = PATTERN_DEFINITIONS.get(default_name, PATTERN_DEFINITIONS["unknown"])["breakoutDirection"]
    return normalized  # type: ignore[return-value]


def _normalize_risk_level(value: Any, default_name: str) -> RiskLevel:
    normalized = _to_text(value).lower()
    if normalized not in VALID_RISK_LEVELS:
        normalized = PATTERN_DEFINITIONS.get(default_name, PATTERN_DEFINITIONS["unknown"])["riskLevel"]
    return normalized  # type: ignore[return-value]


def _normalize_evidence(value: Any) -> list[str]:
    if isinstance(value, list):
        normalized = [_to_text(item) for item in value if _to_text(item)]
        return normalized
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _default_pattern_payload(name: str) -> dict[str, str]:
    return PATTERN_DEFINITIONS.get(name, PATTERN_DEFINITIONS["unknown"])


def normalize_pattern_candidate(raw_candidate: Any, *, image_based: bool = False) -> dict[str, Any]:
    if isinstance(raw_candidate, str):
        raw_candidate = {"name": raw_candidate}
    if not isinstance(raw_candidate, dict):
        raw_candidate = {}

    raw_name = _to_text(raw_candidate.get("name")).lower().replace(" ", "_")
    canonical_name = _normalize_name(raw_candidate.get("name"), raw_candidate.get("label"))
    defaults = _default_pattern_payload(canonical_name)
    legacy_reason = _to_text(raw_candidate.get("reason"))

    evidence = _normalize_evidence(raw_candidate.get("evidence"))
    if not evidence and legacy_reason:
        evidence = [legacy_reason]

    confirmation_condition = _to_text(raw_candidate.get("confirmationCondition")) or defaults["confirmationCondition"]
    invalidation_condition = _to_text(raw_candidate.get("invalidationCondition")) or defaults["invalidationCondition"]
    entry_logic = _to_text(raw_candidate.get("entryLogic")) or defaults["entryLogic"]

    raw_levels = raw_candidate.get("priceLevels") or raw_candidate.get("_internalLevels") or {}
    if not isinstance(raw_levels, dict):
        raw_levels = {}
    confirmation_level = raw_levels.get("confirmationLevel")
    invalidation_level = raw_levels.get("invalidationLevel")
    neckline = raw_levels.get("neckline")
    if neckline is None and canonical_name in {"head_and_shoulders", "double_top"}:
        neckline = confirmation_level
    price_levels = {
        "currentPrice": raw_levels.get("currentPrice"),
        "patternHigh": raw_levels.get("patternHigh"),
        "patternLow": raw_levels.get("patternLow"),
        "leftShoulder": raw_levels.get("leftShoulder"),
        "head": raw_levels.get("head"),
        "rightShoulder": raw_levels.get("rightShoulder"),
        "neckline": neckline,
        "support": raw_levels.get("support"),
        "resistance": raw_levels.get("resistance"),
        "breakout": raw_levels.get("breakout"),
        "breakdown": raw_levels.get("breakdown"),
        "breakoutPrice": raw_levels.get("breakoutPrice") or raw_levels.get("breakout"),
        "breakdownPrice": raw_levels.get("breakdownPrice") or raw_levels.get("breakdown"),
        "confirmationLevel": confirmation_level,
        "invalidationLevel": invalidation_level,
    }
    price_levels = {key: value for key, value in price_levels.items() if value is not None}

    source = _to_text(raw_candidate.get("source")).lower()
    if source not in {"image", "live", "mixed"}:
        source = "image" if image_based else "live"

    raw_breakout_direction = raw_candidate.get("breakoutDirection")
    if not _to_text(raw_breakout_direction):
        if raw_name == "bullish_flag":
            raw_breakout_direction = "upside_candidate"
        elif raw_name == "bearish_flag":
            raw_breakout_direction = "downside_candidate"

    direction = _to_text(raw_candidate.get("direction")).lower()
    if direction not in {"bullish", "bearish", "neutral", "uncertain"}:
        direction = "uncertain"
    stage = _to_text(raw_candidate.get("stage")).lower()
    if stage not in {"forming", "neckline_test", "breakout_test", "confirmed", "failed", "invalidated", "uncertain"}:
        stage = "uncertain"

    candidate = {
        "name": canonical_name,
        "label": _to_text(raw_candidate.get("label")) or defaults["label"],
        "category": _normalize_category(raw_candidate.get("category"), canonical_name),
        "direction": direction,
        "stage": stage,
        "confidence": _normalize_confidence(raw_candidate.get("confidence"), image_based=image_based),
        "confidenceScore": raw_candidate.get("confidenceScore"),
        "source": source,
        "priceLevels": price_levels or None,
        "evidence": evidence,
        "breakoutDirection": _normalize_breakout_direction(raw_breakout_direction, canonical_name),
        "confirmationCondition": confirmation_condition,
        "invalidationCondition": invalidation_condition,
        "entryLogic": entry_logic,
        "tradingImplication": _to_text(raw_candidate.get("tradingImplication")) or None,
        "conflictsWithMomentum": raw_candidate.get("conflictsWithMomentum") if isinstance(raw_candidate.get("conflictsWithMomentum"), bool) else None,
        "conflictExplanation": _to_text(raw_candidate.get("conflictExplanation")) or None,
        "riskLevel": _normalize_risk_level(raw_candidate.get("riskLevel"), canonical_name),
    }

    force_low = False
    if not candidate["evidence"]:
        candidate["evidence"] = ["구조 근거가 충분하지 않아 패턴 후보 신뢰도를 보수적으로 해석합니다."]
        force_low = True
    if not _to_text(raw_candidate.get("confirmationCondition")):
        force_low = True
    if not _to_text(raw_candidate.get("invalidationCondition")):
        force_low = True
    if image_based and candidate["confidence"] == "high":
        candidate["confidence"] = "medium"
    if force_low:
        candidate["confidence"] = "low"

    return candidate


def normalize_pattern_candidates(raw_candidates: Any, *, image_based: bool = False) -> list[dict[str, Any]]:
    if not raw_candidates:
        return []
    if not isinstance(raw_candidates, list):
        raw_candidates = [raw_candidates]
    return [normalize_pattern_candidate(candidate, image_based=image_based) for candidate in raw_candidates]


class SymbolDetection(BaseModel):
    detectedName: str | None
    detectedTicker: str | None
    detectedMarket: Literal["KR", "US", "UNKNOWN"]
    detectedExchange: str | None
    currency: str | None
    confidence: Confidence
    reason: str


class PatternCandidate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    label: str
    category: PatternCategory
    direction: PatternDirection | None = None
    stage: PatternStage | None = None
    confidence: Confidence
    confidenceScore: float | None = None
    source: Literal["image", "live", "mixed"] | None = None
    priceLevels: dict[str, float | None] | None = None
    evidence: list[str] = Field(default_factory=list)
    breakoutDirection: BreakoutDirection
    confirmationCondition: str
    invalidationCondition: str
    entryLogic: str
    tradingImplication: str | None = None
    conflictsWithMomentum: bool | None = None
    conflictExplanation: str | None = None
    riskLevel: RiskLevel


class SwingHigh(BaseModel):
    order: int
    price: float | None = None
    priceZone: str | None = None
    role: SwingHighRole | None = None
    confidence: Confidence | None = None
    evidence: str | None = None


class SwingLow(BaseModel):
    order: int
    price: float | None = None
    priceZone: str | None = None
    role: SwingLowRole | None = None
    confidence: Confidence | None = None
    evidence: str | None = None


class VisualStructure(BaseModel):
    swingHighs: list[SwingHigh] = Field(default_factory=list)
    swingLows: list[SwingLow] = Field(default_factory=list)
    structureSummary: str | None = None


class LineAnalysisItem(BaseModel):
    type: LineType = "unknown"
    price: float | None = None
    priceLow: float | None = None
    priceHigh: float | None = None
    priceZone: str | None = None
    confidence: Confidence | None = None
    evidence: list[str] = Field(default_factory=list)
    roleInStrategy: str | None = None


class InterpretationLayers(BaseModel):
    shortTermState: str | None = None
    higherTimeframeStructure: str | None = None
    structuralPatternRisk: str | None = None
    momentumState: str | None = None
    coexistenceSummary: str | None = None
    finalBias: InterpretationBias | None = None


class PatternMomentumConflict(BaseModel):
    exists: bool = False
    momentumBias: ObservationDirection | None = None
    patternBias: ObservationDirection | None = None
    resolutionRule: str | None = None
    explanation: str | None = None


class VisualZone(BaseModel):
    label: str
    confidence: Confidence
    note: str


class PriceEstimate(BaseModel):
    value: float | None = None
    confidence: Confidence | None = None
    note: str | None = None


class VisiblePriceLevel(BaseModel):
    value: float | None = None
    label: str
    confidence: Confidence | None = None


class PriceAxisObservations(BaseModel):
    currentPriceEstimate: PriceEstimate | None = None
    visibleSupportPrices: list[VisiblePriceLevel] = Field(default_factory=list)
    visibleResistancePrices: list[VisiblePriceLevel] = Field(default_factory=list)
    recentHighEstimate: PriceEstimate | None = None
    recentLowEstimate: PriceEstimate | None = None


class RSIReading(BaseModel):
    visible: bool = False
    valueEstimate: float | None = None
    status: str | None = None
    confidence: Confidence | None = None


class MACDReading(BaseModel):
    visible: bool = False
    status: str | None = None
    confidence: Confidence | None = None


class BollingerReading(BaseModel):
    visible: bool = False
    status: str | None = None
    reason: str | None = None
    position: str | None = None
    upperEstimate: float | None = None
    lowerEstimate: float | None = None
    confidence: Confidence | None = None


class MovingAverageReading(BaseModel):
    visible: bool = False
    status: str | None = None
    confidence: Confidence | None = None


class VolumeReading(BaseModel):
    visible: bool = False
    status: str | None = None
    confidence: Confidence | None = None


class IchimokuReading(BaseModel):
    visible: bool = False
    pricePosition: str | None = None
    cloudState: str | None = None
    status: str | None = None
    cloudPosition: str | None = None
    confidence: Confidence | None = None
    reason: str | None = None


class IndicatorReadings(BaseModel):
    rsi: RSIReading = Field(default_factory=RSIReading)
    macd: MACDReading = Field(default_factory=MACDReading)
    bollingerBands: BollingerReading = Field(default_factory=BollingerReading)
    ichimoku: IchimokuReading = Field(default_factory=IchimokuReading)
    movingAverages: MovingAverageReading = Field(default_factory=MovingAverageReading)
    volume: VolumeReading = Field(default_factory=VolumeReading)


class VolatilityContext(BaseModel):
    state: VolatilityState | None = None
    evidence: list[str] = Field(default_factory=list)
    confidence: Confidence | None = None


class DataConfidenceFactors(BaseModel):
    priceAxisVisible: bool | None = None
    timeAxisVisible: bool | None = None
    volumeVisible: bool | None = None
    indicatorsVisible: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    confidence: Confidence | None = None


class VisibleConfirmationSignal(BaseModel):
    type: str = "unknown"
    direction: ObservationDirection = "unknown"
    evidence: str = ""
    confidence: Confidence = "low"


class VisibleInvalidationClue(BaseModel):
    type: str = "unknown"
    evidence: str = ""
    confidence: Confidence = "low"


class SupportResistanceEvidence(BaseModel):
    supportEvidence: list[str] = Field(default_factory=list)
    resistanceEvidence: list[str] = Field(default_factory=list)
    roleReversalObserved: bool | None = None
    quality: QualityHint = "unknown"


class EntryScenarioEvidenceItem(BaseModel):
    observed: bool | None = None
    evidence: list[str] = Field(default_factory=list)
    missingConfirmation: list[str] = Field(default_factory=list)
    riskNotes: list[str] = Field(default_factory=list)
    confidence: Confidence | None = None


class EntryScenarioEvidence(BaseModel):
    current: EntryScenarioEvidenceItem = Field(default_factory=EntryScenarioEvidenceItem)
    pullback: EntryScenarioEvidenceItem = Field(default_factory=EntryScenarioEvidenceItem)
    breakoutRetest: EntryScenarioEvidenceItem = Field(default_factory=EntryScenarioEvidenceItem)


class AIAnalysis(BaseModel):
    symbolDetection: SymbolDetection
    chartType: str
    timeframeEstimate: str
    visualTrend: str
    visualStructure: VisualStructure | None = None
    lineAnalysis: list[LineAnalysisItem] = Field(default_factory=list)
    interpretationLayers: InterpretationLayers | None = None
    patternMomentumConflict: PatternMomentumConflict | None = None
    chartStateHint: ChartStateHint | None = None
    setupTypeHint: SetupTypeHint | None = None
    timeframeAlignmentHint: TimeframeAlignmentHint | None = None
    volatilityContext: VolatilityContext | None = None
    dataConfidenceFactors: DataConfidenceFactors | None = None
    visibleConfirmationSignals: list[VisibleConfirmationSignal] = Field(default_factory=list)
    visibleInvalidationClues: list[VisibleInvalidationClue] = Field(default_factory=list)
    supportResistanceEvidence: SupportResistanceEvidence | None = None
    entryScenarioEvidence: EntryScenarioEvidence | None = None
    patternCandidates: list[PatternCandidate] = Field(default_factory=list)
    visibleIndicators: list[str]
    visualSupportZones: list[VisualZone]
    visualResistanceZones: list[VisualZone]
    priceAxisObservations: PriceAxisObservations
    indicatorReadings: IndicatorReadings
    volumeObservation: str
    riskNotes: list[str]
    summary: str
    disclaimer: str

    @field_validator("patternCandidates", mode="before")
    @classmethod
    def _normalize_patterns(cls, value: Any) -> list[dict[str, Any]]:
        return normalize_pattern_candidates(value, image_based=True)


class MovingAverages(BaseModel):
    ma5: float | None
    ma20: float | None
    ma60: float | None
    ma120: float | None


class RSIResult(BaseModel):
    value: float | None
    status: str
    interpretation: str


class MACDResult(BaseModel):
    macd: float | None
    signal: float | None
    histogram: float | None
    status: str
    interpretation: str


class BollingerBandsResult(BaseModel):
    upper: float | None
    middle: float | None
    lower: float | None
    position: str
    interpretation: str


class RecentHighLow(BaseModel):
    recentHigh: float | None
    recentHighDate: str | None
    recentLow: float | None
    recentLowDate: str | None


class VolumeAnalysis(BaseModel):
    recentAverageVolume: float | None
    baseAverageVolume: float | None
    ratio: float | None
    status: str
    interpretation: str


class SupportResistanceResult(BaseModel):
    supportLevels: list[float]
    resistanceLevels: list[float]
    nearestSupport: float | None
    nearestResistance: float | None


class DataQuality(BaseModel):
    candleCount: int
    isEnoughData: bool
    warning: str | None


class TechnicalAnalysis(BaseModel):
    latestClose: float | None
    movingAverages: MovingAverages
    rsi: RSIResult
    macd: MACDResult
    bollingerBands: BollingerBandsResult
    recentHighLow: RecentHighLow
    volume: VolumeAnalysis
    supportResistance: SupportResistanceResult
    dataQuality: DataQuality


class CurrentPriceEstimate(BaseModel):
    value: float | None = None
    confidence: Confidence | SignalConfidence | None = None


class PriceRange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: float | None = Field(default=None, alias="from")
    to: float | None = None


class TradeZone(BaseModel):
    priceRange: PriceRange | None = None
    basis: list[str] = Field(default_factory=list)


class StopLossCandidate(BaseModel):
    price: float | None = None
    basis: str


class TargetPriceCandidate(BaseModel):
    primary: float | None = None
    secondary: float | None = None
    riskRewardRatio: float | None = None
    basis: str


class VisualBuyConditionScores(BaseModel):
    supportProximity: int
    rsiRebound: int
    macdBullish: int
    volumeIncrease: int
    trend: int
    total: int


class VisualSellConditionScores(BaseModel):
    resistanceProximity: int
    rsiOverheated: int
    macdBearish: int
    volumeIncrease: int
    bollingerUpper: int
    total: int


class ConditionScores(BaseModel):
    buy: VisualBuyConditionScores
    sell: VisualSellConditionScores


class TradeSignal(BaseModel):
    analysisType: str
    finalSignal: str
    signalLabel: str
    buyScore: int = 0
    sellScore: int = 0
    confidence: SignalConfidence
    currentPriceEstimate: CurrentPriceEstimate | None = None
    buyZone: TradeZone | None = None
    sellZone: TradeZone | None = None
    stopLossCandidate: StopLossCandidate | None = None
    targetPriceCandidate: TargetPriceCandidate | None = None
    conditionScores: ConditionScores | None = None
    warnings: list[str]


class OriginalImageInfo(BaseModel):
    filename: str
    contentType: str | None
    sizeBytes: int
    width: int
    height: int


class ProcessedFullImageInfo(BaseModel):
    format: Literal["JPEG"]
    sizeBytes: int
    width: int
    height: int
    quality: int


class ProcessedCropImageInfo(ProcessedFullImageInfo):
    cropArea: Literal["right_35_percent"]


class OptimizationInfo(BaseModel):
    originalSha256: str
    processedSha256: str
    sizeReductionPercent: float
    widthReductionPercent: float
    heightReductionPercent: float


class ImageInfo(BaseModel):
    original: OriginalImageInfo
    processedFullImage: ProcessedFullImageInfo
    processedCropImage: ProcessedCropImageInfo
    optimization: OptimizationInfo


class AnalysisResponse(BaseModel):
    aiAnalysis: AIAnalysis
    technicalAnalysis: TechnicalAnalysis | None = None
    tradeSignal: TradeSignal | None = None
    tradingReport: dict[str, Any] | None = None
    imageInfo: ImageInfo | None = None
