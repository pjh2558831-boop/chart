from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Confidence = Literal["low", "medium", "high"]
SignalConfidence = Literal["low", "medium", "high", "unavailable"]
PatternCategory = Literal["reversal", "continuation", "range", "breakout", "unknown"]
BreakoutDirection = Literal["upside_candidate", "downside_candidate", "neutral", "unknown"]
RiskLevel = Literal["low", "medium", "high"]

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
    "inverse_head_and_shoulders": "inverse_head_and_shoulders",
    "역헤드앤숄더": "inverse_head_and_shoulders",
    "flag": "flag",
    "플래그": "flag",
    "wedge": "wedge",
    "쐐기형": "wedge",
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

    canonical_name = _normalize_name(raw_candidate.get("name"), raw_candidate.get("label"))
    defaults = _default_pattern_payload(canonical_name)
    legacy_reason = _to_text(raw_candidate.get("reason"))

    evidence = _normalize_evidence(raw_candidate.get("evidence"))
    if not evidence and legacy_reason:
        evidence = [legacy_reason]

    confirmation_condition = _to_text(raw_candidate.get("confirmationCondition")) or defaults["confirmationCondition"]
    invalidation_condition = _to_text(raw_candidate.get("invalidationCondition")) or defaults["invalidationCondition"]
    entry_logic = _to_text(raw_candidate.get("entryLogic")) or defaults["entryLogic"]

    candidate = {
        "name": canonical_name,
        "label": _to_text(raw_candidate.get("label")) or defaults["label"],
        "category": _normalize_category(raw_candidate.get("category"), canonical_name),
        "confidence": _normalize_confidence(raw_candidate.get("confidence"), image_based=image_based),
        "evidence": evidence,
        "breakoutDirection": _normalize_breakout_direction(raw_candidate.get("breakoutDirection"), canonical_name),
        "confirmationCondition": confirmation_condition,
        "invalidationCondition": invalidation_condition,
        "entryLogic": entry_logic,
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
    confidence: Confidence
    evidence: list[str] = Field(default_factory=list)
    breakoutDirection: BreakoutDirection
    confirmationCondition: str
    invalidationCondition: str
    entryLogic: str
    riskLevel: RiskLevel


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


class IndicatorReadings(BaseModel):
    rsi: RSIReading = Field(default_factory=RSIReading)
    macd: MACDReading = Field(default_factory=MACDReading)
    bollingerBands: BollingerReading = Field(default_factory=BollingerReading)
    movingAverages: MovingAverageReading = Field(default_factory=MovingAverageReading)
    volume: VolumeReading = Field(default_factory=VolumeReading)


class AIAnalysis(BaseModel):
    symbolDetection: SymbolDetection
    chartType: str
    timeframeEstimate: str
    visualTrend: str
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
    imageInfo: ImageInfo | None = None
