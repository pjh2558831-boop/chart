from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Confidence = Literal["low", "medium", "high"]
SignalConfidence = Literal["low", "medium", "high", "unavailable"]


class SymbolDetection(BaseModel):
    detectedName: str | None
    detectedTicker: str | None
    detectedMarket: Literal["KR", "US", "UNKNOWN"]
    detectedExchange: str | None
    currency: str | None
    confidence: Confidence
    reason: str


class PatternCandidate(BaseModel):
    name: str
    confidence: Confidence
    reason: str


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
    visibleSupportPrices: list[VisiblePriceLevel] = []
    visibleResistancePrices: list[VisiblePriceLevel] = []
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
    rsi: RSIReading = RSIReading()
    macd: MACDReading = MACDReading()
    bollingerBands: BollingerReading = BollingerReading()
    movingAverages: MovingAverageReading = MovingAverageReading()
    volume: VolumeReading = VolumeReading()


class AIAnalysis(BaseModel):
    symbolDetection: SymbolDetection
    chartType: str
    timeframeEstimate: str
    visualTrend: str
    patternCandidates: list[PatternCandidate]
    visibleIndicators: list[str]
    visualSupportZones: list[VisualZone]
    visualResistanceZones: list[VisualZone]
    priceAxisObservations: PriceAxisObservations
    indicatorReadings: IndicatorReadings
    volumeObservation: str
    riskNotes: list[str]
    summary: str
    disclaimer: str


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
    basis: list[str] = []


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
