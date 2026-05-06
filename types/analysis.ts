import type { UsageStatus } from "./billing";

export type Confidence = "low" | "medium" | "high" | "unavailable";
export type PatternCategory = "reversal" | "continuation" | "range" | "breakout" | "unknown";
export type BreakoutDirection =
  | "upside_candidate"
  | "downside_candidate"
  | "neutral"
  | "unknown";
export type RiskLevel = "low" | "medium" | "high";
export type PatternDirection = "bullish" | "bearish" | "neutral" | "unknown";
export type PatternStage = "candidate" | "confirmed" | "failed" | "invalid";
export type PatternEntryType = "aggressive" | "conservative" | "wait" | "none";

export type ActionParameter =
  | "buy_candidate"
  | "sell_candidate"
  | "weak_buy_candidate"
  | "strong_buy_candidate"
  | "weak_sell_candidate"
  | "strong_sell_candidate"
  | "reduce_position_candidate"
  | "hold_candidate"
  | "neutral"
  | "insufficient_data"
  | "insufficient_visual_data";

export interface SymbolDetection {
  detectedName?: string | null;
  detectedTicker?: string | null;
  detectedMarket?: string | null;
  detectedExchange?: string | null;
  currency?: string | null;
  confidence?: Confidence | string;
  reason?: string | null;
}

export interface PatternCandidate {
  name: string;
  label: string;
  category: PatternCategory | string;
  direction?: PatternDirection | string;
  stage?: PatternStage | string;
  confidence: Confidence | string;
  confidenceScore?: number | null;
  baseReliability?: {
    score: number;
    reason: string;
  };
  priceLevels?: {
    currentPrice?: number | null;
    patternHigh?: number | null;
    patternLow?: number | null;
    neckline?: number | null;
    support?: number | null;
    resistance?: number | null;
    breakoutPrice?: number | null;
    breakdownPrice?: number | null;
  };
  tradePlan?: {
    entryType?: PatternEntryType | string;
    entryPriceAggressive?: number | null;
    entryPriceConservative?: number | null;
    stopLossPrice?: number | null;
    targetPrice1?: number | null;
    targetPrice2?: number | null;
    riskRewardRatio?: number | null;
  };
  evidence: string[];
  breakoutDirection: BreakoutDirection | string;
  confirmationCondition: string;
  invalidationCondition: string;
  entryLogic: string;
  exitLogic?: string;
  riskLevel: RiskLevel | string;
  warnings?: string[];
  calculation?: {
    patternHeight?: number | null;
    formula: string;
    estimated: boolean;
  };
}

export interface PatternSummary {
  primaryPattern: string | null;
  overallPatternBias: "bullish" | "bearish" | "neutral";
  bestEntryZone: string | null;
  keyInvalidationPrice: number | null;
  keyTargetPrice: number | null;
  comment: string;
}

export interface VisualZone {
  label: string;
  confidence: Confidence | string;
  note: string;
}

export interface PriceEstimate {
  value?: number | null;
  confidence?: Confidence | string | null;
  note?: string | null;
}

export interface VisiblePriceLevel {
  value?: number | null;
  label: string;
  confidence?: Confidence | string | null;
}

export interface PriceAxisObservations {
  currentPriceEstimate?: PriceEstimate | null;
  visibleSupportPrices?: VisiblePriceLevel[];
  visibleResistancePrices?: VisiblePriceLevel[];
  recentHighEstimate?: PriceEstimate | null;
  recentLowEstimate?: PriceEstimate | null;
}

export interface RSIReading {
  visible?: boolean;
  valueEstimate?: number | null;
  status?: string | null;
  confidence?: Confidence | string | null;
}

export interface MACDReading {
  visible?: boolean;
  status?: string | null;
  confidence?: Confidence | string | null;
}

export interface BollingerReading {
  visible?: boolean;
  position?: string | null;
  upperEstimate?: number | null;
  lowerEstimate?: number | null;
  confidence?: Confidence | string | null;
}

export interface MovingAverageReading {
  visible?: boolean;
  status?: string | null;
  confidence?: Confidence | string | null;
}

export interface VolumeReading {
  visible?: boolean;
  status?: string | null;
  confidence?: Confidence | string | null;
}

export interface IchimokuReading {
  visible?: boolean;
  status?: string | null;
  cloudPosition?: "above_cloud" | "inside_cloud" | "below_cloud" | "unknown" | string | null;
  confidence?: Confidence | string | null;
}

export interface IndicatorReadings {
  rsi?: RSIReading;
  macd?: MACDReading;
  bollingerBands?: BollingerReading;
  movingAverages?: MovingAverageReading;
  volume?: VolumeReading;
  ichimoku?: IchimokuReading;
}

export interface AIAnalysis {
  symbolDetection?: SymbolDetection;
  chartType: string;
  timeframeEstimate: string;
  visualTrend: string;
  patternCandidates: PatternCandidate[];
  visibleIndicators: string[];
  visualSupportZones: VisualZone[];
  visualResistanceZones: VisualZone[];
  patternSummary?: PatternSummary | null;
  priceAxisObservations?: PriceAxisObservations;
  indicatorReadings?: IndicatorReadings;
  volumeObservation: string;
  riskNotes: string[];
  summary: string;
  disclaimer: string;
}

export interface MovingAverages {
  ma5?: number | null;
  ma20?: number | null;
  ma60?: number | null;
  ma120?: number | null;
}

export interface RSIResult {
  value?: number | null;
  status?: string | null;
  interpretation?: string | null;
}

export interface MACDResult {
  macd?: number | null;
  signal?: number | null;
  histogram?: number | null;
  status?: string | null;
  interpretation?: string | null;
}

export interface BollingerBandsResult {
  upper?: number | null;
  middle?: number | null;
  lower?: number | null;
  position?: string | null;
  interpretation?: string | null;
}

export interface RecentHighLow {
  recentHigh?: number | null;
  recentHighDate?: string | null;
  recentLow?: number | null;
  recentLowDate?: string | null;
}

export interface VolumeAnalysis {
  recentAverageVolume?: number | null;
  baseAverageVolume?: number | null;
  ratio?: number | null;
  status?: string | null;
  interpretation?: string | null;
}

export interface SupportResistanceResult {
  supportLevels: number[];
  resistanceLevels: number[];
  nearestSupport?: number | null;
  nearestResistance?: number | null;
}

export interface DataQuality {
  candleCount?: number | null;
  isEnoughData?: boolean;
  warning?: string | null;
}

export interface TechnicalAnalysis {
  latestClose?: number | null;
  movingAverages: MovingAverages;
  rsi: RSIResult;
  macd: MACDResult;
  bollingerBands: BollingerBandsResult;
  recentHighLow: RecentHighLow;
  volume: VolumeAnalysis;
  supportResistance: SupportResistanceResult;
  dataQuality: DataQuality;
}

export interface PriceRange {
  from?: number | null;
  to?: number | null;
}

export interface TradeZone {
  priceRange?: PriceRange | null;
  basis?: string[];
}

export interface SummarySignal {
  actionParameter: ActionParameter;
  actionLabel: string;
  entryPriceCandidate?: {
    from?: number | null;
    to?: number | null;
    basis?: string | null;
  };
  targetPriceCandidate?: {
    primary?: number | null;
    secondary?: number | null;
    basis?: string | null;
  };
}

export interface ConditionScores {
  buy?: {
    supportProximity?: number | null;
    rsiRebound?: number | null;
    macdBullish?: number | null;
    volumeIncrease?: number | null;
    trend?: number | null;
    total?: number | null;
  } | null;
  sell?: {
    resistanceProximity?: number | null;
    rsiOverheated?: number | null;
    macdBearish?: number | null;
    volumeIncrease?: number | null;
    bollingerUpper?: number | null;
    total?: number | null;
  } | null;
}

export interface TradeSignal {
  analysisType?: string;
  finalSignal: string;
  signalLabel: string;
  buyScore?: number | null;
  sellScore?: number | null;
  confidence?: Confidence | string;
  currentPriceEstimate?: {
    value?: number | null;
    confidence?: Confidence | string | null;
  } | null;
  buyZone?: TradeZone | null;
  sellZone?: TradeZone | null;
  stopLossCandidate?: {
    price?: number | null;
    basis?: string | null;
  } | null;
  targetPriceCandidate?: {
    primary?: number | null;
    secondary?: number | null;
    riskRewardRatio?: number | null;
    basis?: string | null;
  } | null;
  summarySignal?: SummarySignal | null;
  conditionScores?: ConditionScores | null;
  warnings?: string[];
}

export interface AdvancedTradeSignal extends Partial<TradeSignal> {
  finalSignal?: string;
  holdScore?: number | null;
  decisionReason?: string[] | null;
  blockedReasons?: string[] | null;
  marketState?: string | null;
  strategyType?: string | null;
  supportResistance?: {
    supportLevels?: number[];
    resistanceLevels?: number[];
    nearestSupport?: number | null;
    nearestResistance?: number | null;
  } | null;
}

export interface VisualSummary {
  currentState?: string | null;
  marketInterpretation?: string | null;
  volatilityState?: string | null;
  pricePosition?: string | null;
  trendDirection?: string | null;
}

export interface MarketRegime {
  trendDirection?: string | null;
  volatilityState?: string | null;
  pricePosition?: string | null;
  patternState?: string | null;
  interpretation?: string | null;
}

export type SignalTone =
  | "strongPositive"
  | "positive"
  | "neutral"
  | "caution"
  | "negative"
  | "danger"
  | "unknown";

export interface AnalysisViewModel {
  signalSummary: {
    finalLabel: string;
    signalTone: SignalTone;
    currentState: string;
    strategyTypeLabel: string;
    confidenceLabel: string;
    currentPriceText: string;
    oneLineSummary: string;
  };
  priceStrategy: {
    entryZoneText: string;
    stopLossText: string;
    target1Text: string;
    target2Text: string;
    riskRewardText: string;
    priceBasisWarning: string;
  };
  decisionReasons: Array<{
    type: "positive" | "neutral" | "negative";
    text: string;
  }>;
  scoreSummary: {
    buyScore: number | null;
    sellScore: number | null;
    holdScore: number | null;
    interpretation: string;
    rows: Array<{ group: string; label: string; score: number | null | undefined }>;
  };
  marketState: {
    trendDirection: string;
    volatilityState: string;
    pricePosition: string;
    patternState: string;
    interpretation: string;
  };
  supportResistance: {
    currentPrice: number | null;
    supports: Array<{ label: string; value: number | null; distanceText: string; meaning: string }>;
    resistances: Array<{ label: string; value: number | null; distanceText: string; meaning: string }>;
  };
  patternView: {
    summaryText: string;
    candidates: PatternCandidate[];
  };
  indicatorView: Array<{
    name: string;
    status: string;
    direction: string;
    interpretation: string;
    confidence: string;
  }>;
  riskWarnings: string[];
}

export interface ImageInfo {
  original?: {
    filename?: string;
    contentType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  };
}

export interface AnalysisResponse {
  analysisId?: number;
  aiAnalysis: AIAnalysis;
  advancedTradeSignal?: AdvancedTradeSignal | null;
  visualSummary?: VisualSummary | null;
  marketRegime?: MarketRegime | null;
  technicalAnalysis?: TechnicalAnalysis | null;
  tradeSignal?: TradeSignal | null;
  imageInfo?: ImageInfo;
  usageStatus?: UsageStatus;
}
