import type { UsageStatus } from "./billing";

export type Confidence = "low" | "medium" | "high" | "unavailable";
export type PatternCategory = "reversal" | "continuation" | "range" | "breakout" | "unknown" | string;
export type BreakoutDirection = "upside_candidate" | "downside_candidate" | "neutral" | "unknown" | string;
export type RiskLevel = "low" | "medium" | "high" | string;
export type PatternDirection = "bullish" | "bearish" | "neutral" | "unknown" | string;
export type PatternStage = "candidate" | "confirmed" | "failed" | "invalid" | string;
export type PatternEntryType = "aggressive" | "conservative" | "wait" | "none" | string;

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
  | "insufficient_visual_data"
  | string;

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
  category: PatternCategory;
  direction?: PatternDirection;
  stage?: PatternStage;
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
    entryType?: PatternEntryType;
    entryPriceAggressive?: number | null;
    entryPriceConservative?: number | null;
    stopLossPrice?: number | null;
    targetPrice1?: number | null;
    targetPrice2?: number | null;
    riskRewardRatio?: number | null;
  };
  evidence: string[];
  breakoutDirection: BreakoutDirection;
  confirmationCondition: string;
  invalidationCondition: string;
  entryLogic: string;
  tradingImplication?: string | null;
  exitLogic?: string;
  riskLevel: RiskLevel;
  warnings?: string[];
  calculation?: {
    patternHeight?: number | null;
    formula: string;
    estimated: boolean;
  };
}

export interface PatternSummary {
  primaryPattern: string | null;
  overallPatternBias: "bullish" | "bearish" | "neutral" | string;
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
  status?: string | null;
  reason?: string | null;
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
  pricePosition?: string | null;
  cloudState?: string | null;
  reason?: string | null;
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
    buyScoreText: string;
    sellScoreText: string;
    holdScoreText: string;
    buyScoreLevel: string;
    sellScoreLevel: string;
    holdScoreLevel: string;
    oneLineSummary: string;
  };
  priceStrategy: {
    entryZoneText: string;
    entryZoneBasis: string;
    stopLossText: string;
    stopLossBasis: string;
    target1Text: string;
    target1Basis: string;
    target2Text: string;
    target2Basis: string;
    riskRewardText: string;
    riskRewardBasis: string;
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
    deductions: string[];
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

export interface AnalysisMeta {
  symbol?: string;
  chartTimeframe?: string;
  currentPriceZone?: string;
  keyPivotPrice?: string;
  mainSupports?: string[];
  mainResistances?: string[];
  analyzedAt?: string;
  dataBasis?: "image_only" | "image_with_ohlcv" | "unknown";
  priceUnit?: string;
  priceUnitConfidence?: "low" | "medium" | "high";
}

export type FinalAction =
  | "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED"
  | "BREAKOUT_WAIT"
  | "WAIT_FOR_SUPPORT_CONFIRMATION"
  | "NO_NEW_ENTRY_HOLD_OK"
  | "WAIT_FOR_BREAKOUT"
  | "WAIT_FOR_PULLBACK"
  | "CONDITIONAL_BUY"
  | "PULLBACK_BUY_CANDIDATE"
  | "BREAKOUT_BUY_CANDIDATE"
  | "HOLD_AND_WATCH"
  | "PARTIAL_TAKE_PROFIT"
  | "REDUCE_POSITION"
  | "SELL_RISK"
  | "NO_TRADE"
  | "BUY_CANDIDATE"
  | "WAIT"
  | "HOLD"
  | "TAKE_PROFIT";

export type TradingActionState =
  | "STRONG_BUY"
  | "PULLBACK_ENTRY"
  | "BREAKOUT_WAIT"
  | "HOLD_ONLY"
  | "HIGH_RISK"
  | "AVOID";

export type PriceLocation =
  | "near_support"
  | "lower_range"
  | "middle_range"
  | "upper_range"
  | "near_resistance"
  | "breakout_area"
  | "overextended"
  | "unknown";

export type ChartRegime =
  | "healthy_pullback"
  | "downtrend"
  | "overextended_surge"
  | "breakout_retest_confirmed"
  | "breakout_wait"
  | "range_lower_support"
  | "range_upper_resistance"
  | "sideways"
  | "unknown";

export interface MarketContext {
  priceLocation: PriceLocation;
  rangePosition?: number | null;
  isExtendedMove?: boolean;
  nearSupport?: boolean;
  nearResistance?: boolean;
  breakoutRetestConfirmed?: boolean;
  chartRegime?: ChartRegime;
  chartRegimeConfidence?: "low" | "medium" | "high";
  chartRegimeReasons?: string[];
}

export interface NormalizedChartRegime {
  type: ChartRegime;
  confidence: "low" | "medium" | "high";
  reasons: string[];
}

export interface NormalizedFinalAction {
  title: string;
  subtitle: string;
  actionType: string;
  reason: string;
}

export interface ScoreFactor {
  label: string;
  scoreImpact: number;
  reason: string;
}

export interface EntryModeScore {
  score: number;
  label: string;
  explanation: string;
}

export interface EntryModeScores {
  currentEntry?: EntryModeScore;
  pullbackEntry?: EntryModeScore;
  breakoutEntry?: EntryModeScore;
}

export interface ScoreSummary {
  totalScore: number;
  totalLabel: string;
  label?: string;
  buyScore: number;
  buyLabel: string;
  holdScore: number;
  holdLabel: string;
  riskScore: number;
  riskLabel: string;
  explanation: string;
  entryScores?: EntryModeScores;
  scoreFactors?: {
    positive?: ScoreFactor[];
    negative?: ScoreFactor[];
    risk?: ScoreFactor[];
  };
}

export interface PriceRoles {
  current?: {
    priceZone: string;
    meaning: string;
  };
  pivot?: {
    priceZone: string;
    meaning: string;
  };
  pullbackEntry?: {
    priceZone: string;
    condition: string;
  };
  breakoutEntry?: {
    priceZone: string;
    condition: string;
  };
  stopLoss?: {
    shortTerm: string;
    conservative: string;
    invalidation: string;
  };
  targets?: {
    pullbackTargets?: string[];
    breakoutTargets?: string[];
    holderTargets?: string[];
  };
}

export interface RiskRewardDetail {
  value: number | null;
  label: string;
  interpretation: string;
}

export interface EntryStopLoss {
  priceZone: string;
  condition: string;
  explanation: string;
}

export interface TradingReport {
  analysisMeta?: AnalysisMeta;
  marketContext?: MarketContext;
  chartRegime?: NormalizedChartRegime;
  normalizedFinalAction?: NormalizedFinalAction;
  validationWarnings?: string[];
  finalSummary: {
    finalAction: FinalAction;
    actionState?: TradingActionState;
    title: string;
    oneLineConclusion: string;
    confidence: Confidence | string;
    reason: string;
  };
  scoreSummary?: ScoreSummary;
  priceRoles?: PriceRoles;
  userActionGuide: {
    nonHolder: string;
    holder: string;
    shortTermTrader: string;
    addBuyer: string;
    stopLoss: string;
  };
  tradePlan: {
    entry: {
      pullbackEntry?: { priceZone: string; condition: string; action: string };
      breakoutEntry?: { priceZone: string; condition: string; action: string };
      noChaseZone?: { priceZone: string; reason: string };
    };
    stopLoss: {
      priceZone: string;
      condition: string;
      meaning: string;
      shortTerm?: { priceZone: string; condition: string; meaning: string };
      conservative?: { priceZone: string; condition: string; meaning: string };
    };
    stopLossByEntry?: {
      currentEntry?: EntryStopLoss;
      pullbackEntry?: EntryStopLoss;
      breakoutEntry?: EntryStopLoss;
      mediumTermInvalidation?: EntryStopLoss;
    };
    targets: {
      firstTarget: { priceZone: string; action: string };
      secondTarget?: { priceZone: string; action: string };
      pullbackTargets?: {
        firstTarget?: { priceZone: string; action: string };
        secondTarget?: { priceZone: string; action: string };
        thirdTarget?: { priceZone: string; action: string };
      };
      breakoutTargets?: {
        firstTarget?: { priceZone: string; action: string };
        secondTarget?: { priceZone: string; action: string };
      };
    };
    invalidation: {
      condition: string;
      meaning: string;
      midTerm?: { priceZone: string; condition: string; meaning: string };
    };
    riskReward: RiskRewardDetail;
    riskRewardByEntry?: {
      current?: RiskRewardDetail;
      pullback?: RiskRewardDetail;
      breakout?: RiskRewardDetail;
    };
    transitionLevel?: {
      priceZone: string;
      explanation: string;
    };
  };
  keyLevels: {
    supports: Array<{ label: string; priceZone: string; meaning: string; reliability: Confidence | string }>;
    resistances: Array<{ label: string; priceZone: string; meaning: string; reliability: Confidence | string }>;
  };
  scenarios: {
    bullish: { condition: string; expectedMove: string; action: string };
    neutral: { condition: string; expectedMove: string; action: string };
    bearish: { condition: string; expectedMove: string; action: string };
  };
  patternAnalysis: {
    primaryPattern: {
      name: string;
      confidence: Confidence | string;
      reason: string;
      confirmationCondition: string;
      invalidationCondition: string;
      tradingMeaning: string;
    };
    secondaryPattern?: { name: string; confidence: Confidence | string; reason: string } | null;
    excludedPatterns?: Array<{ name: string; reason: string }>;
  };
  indicatorAnalysis: {
    confirmed: Array<{ name: string; signal: "bullish" | "bearish" | "neutral" | string; explanation: string }>;
    unavailable: Array<{ name: string; reason: string }>;
  };
  evidence: {
    positive: string[];
    negative: string[];
    riskFactors: string[];
  };
  disclaimer: string;
}

export interface AnalysisResponse {
  analysisId?: number;
  cacheHit?: boolean;
  analysisMode?: "fast" | "standard" | "precision" | string;
  appliedAnalysisMode?: "fast" | "standard" | "precision" | string;
  promptVersion?: string;
  performance?: {
    totalMs?: number;
    imageReadMs?: number;
    imageProcessingMs?: number;
    cacheLookupMs?: number;
    aiRequestMs?: number;
    postProcessMs?: number;
    dbSaveMs?: number;
  };
  aiAnalysis: AIAnalysis;
  advancedTradeSignal?: AdvancedTradeSignal | null;
  visualSummary?: VisualSummary | null;
  marketRegime?: MarketRegime | null;
  technicalAnalysis?: TechnicalAnalysis | null;
  tradeSignal?: TradeSignal | null;
  tradingReport?: TradingReport | null;
  imageInfo?: ImageInfo;
  usageStatus?: UsageStatus;
}
