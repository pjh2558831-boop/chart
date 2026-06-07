import { normalizeTradingReport } from "./tradingReportViewModel";
import type {
  AnalysisResponse,
  ChartRegime,
  Confidence,
  RiskRewardDetail,
  TradingActionState,
  TradingReport,
} from "../types/analysis";

export type SignalTone = "buy" | "watch" | "caution" | "hold" | "risk" | "neutral";
export type EntryTone = "positive" | "neutral" | "caution" | "risk";
export type ScenarioTone = "positive" | "neutral" | "risk";
export type IndicatorTone = "positive" | "neutral" | "caution" | "risk";
export type PatternDisplayCategory = "continuation" | "reversal" | "range" | "breakout" | "no_clear_pattern" | "unknown";
type DisplayedEntryMode = "current" | "pullback_wait" | "breakout_wait" | "breakout_confirmed" | "risk" | "none";
export type ReportDecisionTone = "buy" | "watch" | "caution" | "risk" | "neutral";
export type ReportDecisionEntryMode = "current" | "pullback" | "breakout" | "wait" | "risk";
export type ReportDecisionBreakoutState =
  | "none"
  | "breakout_wait"
  | "breakout_attempt"
  | "breakout_confirmed"
  | "breakout_retest_confirmed"
  | "failed_breakout";
export type ReportDecisionTrendOpportunity =
  | "none"
  | "bullish_breakout_attempt"
  | "uptrend_continuation"
  | "controlled_uptrend_entry";
export type ReportDecisionRefinedRegime =
  | "healthy_uptrend_pullback"
  | "overheated_pullback"
  | "sharp_pullback"
  | "trend_damage_warning"
  | "support_shock_test"
  | "parabolic_risk"
  | "normal_breakout_attempt"
  | "confirmed_breakout"
  | "failed_breakout"
  | "existing_regime";

export type InstrumentRiskProfile = {
  symbol: string;
  isLeveraged: boolean;
  leverageFactor: 1 | 2 | 3;
  volatilityRisk: "normal" | "elevated" | "high";
  reason?: string;
};

export type CandleRiskProfile = {
  largeBearishCandle: boolean;
  sharpDrop: boolean;
  highVolumeDrop: boolean;
  peakToCurrentDropRisk: "low" | "medium" | "high";
  parabolicAdvance: boolean;
  firstPullbackAfterSurge: boolean;
  trendDamageRisk: "low" | "medium" | "high";
};

export type TargetProfile = {
  firstTarget: number | null;
  extensionTarget: number | null;
  targetQuality: "clear" | "close" | "extended" | "uncertain";
  targetNote: string;
};

type DisplayedEntrySignal = {
  score: number | null;
  label: string;
  mode: DisplayedEntryMode;
  explanation: string;
};

export type EntryModeCard = {
  score: number | null;
  label: string;
  condition: string;
  stopLoss: string;
  target: string;
  riskReward: string;
  explanation: string;
  tone: EntryTone;
};

export type DisplayPrice = {
  text: string;
  value: number | null;
  status?: string;
};

export type EntryStrategyDecision = {
  mode: "current" | "pullback" | "breakout";
  score: number | null;
  label: string;
  condition: string;
  stop: string;
  target: string;
  riskReward: string;
  explanation: string;
  tone: EntryTone;
  isFutureSetup: boolean;
  entryTrigger?: string;
  confirmationCondition?: string;
  invalidation?: string;
  target1?: string;
  target2?: string;
  positionSizingHint?: string;
  failureCondition?: string;
  shortExplanation?: string;
  isComplete?: boolean;
  completenessWarnings?: string[];
};

export interface ReportDecision {
  chartRegime: string;
  breakoutState: ReportDecisionBreakoutState;
  trendOpportunity?: ReportDecisionTrendOpportunity;
  refinedRegime?: ReportDecisionRefinedRegime;
  instrumentRiskProfile?: InstrumentRiskProfile;
  candleRiskProfile?: CandleRiskProfile;
  targetProfile?: TargetProfile;
  finalActionState: string;
  finalActionLabel: string;
  finalActionTone: ReportDecisionTone;
  primaryStrategy: {
    title: string;
    summary: string;
    entry: string;
    stop: string;
    target: string;
    badges: string[];
  };
  priceRoles: {
    currentPrice: DisplayPrice;
    mainSupport: DisplayPrice;
    secondarySupport?: DisplayPrice;
    mainResistance: DisplayPrice;
    breakoutLevel?: DisplayPrice;
    stopLoss?: DisplayPrice;
    invalidation?: DisplayPrice;
    target?: DisplayPrice;
    targetStatus?: string;
  };
  entryStrategies: {
    current: EntryStrategyDecision;
    pullback: EntryStrategyDecision;
    breakout: EntryStrategyDecision;
  };
  displayedEntrySignal: {
    mode: ReportDecisionEntryMode;
    label: string;
    score: number | null;
    explanation: string;
  };
  signalSummary: {
    overallScore: number | null;
    trendScore?: number | null;
    locationScore?: number | null;
    momentumScore: number | null;
    volumeScore?: number | null;
    srQualityScore?: number | null;
    breakoutScore: number | null;
    breakoutReliabilityScore?: number | null;
    riskRewardScore?: number | null;
    volatilityRiskScore?: number | null;
    dataConfidenceScore?: number | null;
    riskScore: number | null;
    entryPerspective: string;
    scoreWarnings?: string[];
  };
  newEntryDecision?: string;
  holderDecision?: string;
  mustConfirmCondition?: string;
  mustNotTradeReason?: string;
  nextReviewCondition?: string;
  consistencyWarnings?: string[];
}

export type ScenarioCard = {
  title: string;
  condition: string;
  probability: string;
  expectedMove: string;
  interpretation: string;
  tone: ScenarioTone;
};

export type IndicatorRow = {
  name: string;
  value: string;
  interpretation: string;
  signal: string;
  tone: IndicatorTone;
};

export type DisplayIdentityConfidence = "high" | "medium" | "low";

export type DisplayIdentity = {
  ticker: string;
  companyName: string;
  marketLabel: string;
  companyLine: string;
  currencyUnitLabel: string;
  priceText: string;
  priceUnitNote: string;
  identityConfidence: DisplayIdentityConfidence;
};

export interface InstitutionalReportViewModel {
  hero: {
    stockName: string;
    ticker: string;
    marketTag: string;
    displayIdentity: DisplayIdentity;
    displayTitle: string;
    companyLine: string;
    displayMarket: string;
    currentPrice: string;
    currencyOrUnit: string;
    displayCurrencyUnit: string;
    priceChange: string;
    confidenceScore: number | null;
    confidenceLabel: string;
    trendLabel: string;
    trendDescription: string;
    miniChartData?: Array<{ label: string; value: string }>;
    signalLabel: string;
    signalTone: SignalTone;
  };
  basisSummary: {
    chartBasis: string;
    currentPrice: string;
    pivotPrice: string;
    recentSupport: string;
    recentResistance: string;
    currentLocation: string;
    priceUnit: string;
    preferredStrategy: string;
  };
  finalAction: {
    title: string;
    subtitle: string;
    reason: string;
    actionType: string;
  };
  entryMode: {
    currentEntry: EntryModeCard;
    pullbackEntry: EntryModeCard;
    breakoutEntry: EntryModeCard;
  };
  scorePanel: {
    overallScore: number | null;
    momentumScore: number | null;
    breakoutScore: number | null;
    riskScore: number | null;
    entryScore: number | null;
    entryScoreLabel: string;
    entryScoreMode: DisplayedEntryMode;
    entryScoreExplanation: string;
  };
  keyLevels: {
    currentPrice: string;
    mainSupport: string;
    secondarySupport: string;
    mainResistance: string;
    breakoutTrigger: string;
    upperBreakoutTarget: string;
    stopLoss: string;
    target: string;
    invalidation: string;
    targetGapLabel: string;
    targetGapExplanation: string;
  };
  marketSummary: {
    observation: string;
    coreInterpretation: string;
    supportResistanceInterpretation: string;
    riskPoint: string;
  };
  scenarios: {
    bullish: ScenarioCard;
    neutral: ScenarioCard;
    bearish: ScenarioCard;
  };
  indicators: IndicatorRow[];
  pattern: {
    category: PatternDisplayCategory;
    confidence: string;
    detectedStructure: string;
    continuationProbability: string;
    metrics: Array<{ label: string; value: string }>;
    interpretation: string;
  };
  insightNotes: string[];
  riskNotice: string[];
  reportDecision: ReportDecision;
}

type PriceContext = {
  currentText: string;
  heroPrice: string;
  current: number | null;
  pivotText: string;
  pivot: number | null;
  breakoutLevelText: string;
  breakoutLevel: number | null;
  supportText: string;
  support: number | null;
  secondarySupportText: string;
  resistanceText: string;
  resistance: number | null;
  targetText: string;
  target: number | null;
  extensionTargetText: string;
  targetStatus: string;
  targetRoleCollapsed: boolean;
  chartRegime: ChartRegime;
  breakoutRetestConfirmed: boolean;
  currentRiskReward: number | null;
  pullbackRiskReward: number | null;
  breakoutRiskReward: number | null;
  currentLocation: string;
  targetGapLabel: string;
  targetGapExplanation: string;
  preferredStrategy: string;
};

const FALLBACK = {
  unknown: "미확인",
  needsCheck: "확인 필요",
  imageEstimate: "이미지 기준 추정",
  noStop: "가장 가까운 확인 지지선 이탈 시 손절",
  noUnit: "가격 단위 확인 필요",
  noLevels: "주요 지지/저항 확인 필요",
};

const chartRegimeLabels: Record<ChartRegime, string> = {
  uptrend_pullback: "상승추세 눌림",
  uptrend_consolidation: "상승추세 조정",
  downtrend_rebound: "하락추세 반등",
  resistance_test: "저항권 리테스트",
  support_breakdown: "붕괴 위험",
  downtrend: "하락 추세",
  overextended_surge: "급등 과열",
  overheated_breakout: "과열권 돌파 후 조정 대기",
  breakout_retest_confirmed: "돌파 후 재지지",
  breakout_wait: "돌파 확인 대기",
  range_lower_support: "박스권 하단 반등",
  range_upper_resistance: "박스권 상단 저항",
  healthy_pullback: "건전한 눌림",
  sideways: "방향 확인",
  unknown: "상태 확인 필요",
};

function isInvalidDisplayText(text: string) {
  return /^(undefined|null|nan|infinity|\[object object\])$/i.test(text.trim());
}

function safeText(value: unknown, fallback = "-") {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || isInvalidDisplayText(text) || /\b(undefined|null|NaN|Infinity)\b/.test(text)) return fallback;
  if (text.includes("[object Object]")) return fallback;
  return text;
}

function compactAnalysisBasis(...values: unknown[]) {
  const source = values
    .map((value) => safeText(value, ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!source) return "분석 기준 추정 불가";

  const text = source.toLowerCase();
  let horizon: "단기" | "중기" | "장기" | null = null;
  let candle: "분봉" | "일봉" | "주봉" | null = null;

  if (/단기/.test(source)) horizon = "단기";
  else if (/중기/.test(source)) horizon = "중기";
  else if (/장기/.test(source)) horizon = "장기";
  else if (/(intraday|very\s*short|scalp|day\s*trade|장중|분봉|\b(?:1|3|5|10|15|30|60|120|240)\s*m(?:in(?:ute)?s?)?\b|\b(?:1|2|4|6|12)\s*h(?:our)?\b)/i.test(text)) horizon = "단기";
  else if (/(weekly|week|\b1\s*w\b|position|longer|long\s*term|주봉|월봉|monthly|month|year|년)/i.test(text)) horizon = "장기";
  else if (/(daily|day|\b1\s*d\b|swing|few\s*weeks|few\s*months|일봉|개월|월)/i.test(text)) horizon = "중기";

  if (/(weekly|week|\b1\s*w\b|주봉|월봉|monthly|month)/i.test(text)) candle = "주봉";
  else if (/(intraday|minute|minutes|\b(?:1|3|5|10|15|30|60|120|240)\s*m(?:in(?:ute)?s?)?\b|\b(?:1|2|4|6|12)\s*h(?:our)?\b|분봉|시간봉|장중)/i.test(text)) candle = "분봉";
  else if (/(daily|day|\b1\s*d\b|일봉)/i.test(text)) candle = "일봉";

  if (!horizon && candle) {
    horizon = candle === "분봉" ? "단기" : candle === "주봉" ? "장기" : "중기";
  }
  if (!candle && horizon) {
    candle = horizon === "단기" ? "분봉" : horizon === "장기" ? "주봉" : "일봉";
  }

  if (!horizon || !candle) return "분석 기준 추정 불가";
  return `${horizon} · ${candle} 추정`;
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceFromText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlainNumericText(value: unknown) {
  if (typeof value !== "string") return false;
  return /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value.trim());
}

function safeScore(value: unknown) {
  const number = safeNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatPrice(value: unknown) {
  const number = safeNumber(value);
  if (number === null) return safeText(value, "-");
  return number.toLocaleString("ko-KR", {
    maximumFractionDigits: Math.abs(number) >= 100 ? 0 : 2,
  });
}

function firstText(values: unknown[], fallback = "-") {
  for (const value of values) {
    const text = safeText(value, "");
    if (text) return text;
  }
  return fallback;
}

function firstForwardPriceText(values: unknown[], current: number | null, fallback = "-") {
  if (current !== null) {
    for (const value of values) {
      const text = safeText(value, "");
      const price = parsePriceFromText(text);
      if (text && price !== null && price > current * (1 + BREAKOUT_PRICE_TOLERANCE)) return text;
    }
  }
  return firstText(values, fallback);
}

type DisplayIdentityAlias = {
  ticker: string;
  companyName: string;
  marketLabel: "US" | "KR";
  aliases: string[];
};

const DISPLAY_IDENTITY_TITLE_FALLBACK = "티커 필요";
const DISPLAY_IDENTITY_MARKET_FALLBACK = "시장 확인 필요";
const DISPLAY_IDENTITY_COMPANY_FALLBACK = "종목명을 확인해 주세요";

const DISPLAY_IDENTITY_ALIASES: DisplayIdentityAlias[] = [
  { ticker: "AAPL", companyName: "Apple", marketLabel: "US", aliases: ["애플", "Apple", "Apple Inc"] },
  { ticker: "MSFT", companyName: "Microsoft", marketLabel: "US", aliases: ["마이크로소프트", "Microsoft"] },
  { ticker: "NVDA", companyName: "NVIDIA", marketLabel: "US", aliases: ["엔비디아", "Nvidia", "NVIDIA"] },
  { ticker: "AVGO", companyName: "Broadcom", marketLabel: "US", aliases: ["브로드컴", "Broadcom"] },
  { ticker: "PLTR", companyName: "Palantir", marketLabel: "US", aliases: ["팔란티어", "Palantir"] },
  { ticker: "NOW", companyName: "ServiceNow", marketLabel: "US", aliases: ["ServiceNow", "서비스나우"] },
  { ticker: "CRWV", companyName: "CoreWeave", marketLabel: "US", aliases: ["CoreWeave", "코어위브"] },
  { ticker: "LITE", companyName: "Lumentum", marketLabel: "US", aliases: ["루멘텀", "Lumentum"] },
  {
    ticker: "CRDO",
    companyName: "Credo Technology",
    marketLabel: "US",
    aliases: [
      "Credo",
      "Credo Technology",
      "Credo Technology Group",
      "Credo Technology Group Holding",
      "Credo Technology Group Holding Ltd",
      "크레도",
      "크리드",
      "크리드 테크놀로지",
      "크리드 테크놀로지 그룹",
      "크리드 테크놀로지 그룹 홀딩",
    ],
  },
  { ticker: "005930", companyName: "삼성전자", marketLabel: "KR", aliases: ["Samsung Electronics", "삼성전자"] },
  { ticker: "SPY", companyName: "SPY", marketLabel: "US", aliases: ["SPY"] },
  { ticker: "QQQ", companyName: "QQQ", marketLabel: "US", aliases: ["QQQ"] },
  { ticker: "SOXL", companyName: "SOXL", marketLabel: "US", aliases: ["SOXL"] },
];

function isPlaceholderText(value: unknown) {
  const text = safeText(value, "").trim();
  return !text || text === "-" || /^(미확인|확인 필요|티커 필요|추정 불가|이미지 기준 추정 불가|시장 확인 필요|종목명을 확인해 주세요|티커 확인 필요|종목 확인|종목 정보 확인 필요|unknown|n\/a|na)$/i.test(text);
}

function cleanDisplayText(value: unknown) {
  const text = safeText(value, "").trim();
  return isPlaceholderText(text) ? "" : text;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isKoreanStockCode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

function isUsTicker(value: string) {
  const text = value.trim().toUpperCase();
  if (!text || /^(US|KR|NYSE|NASDAQ|AMEX|KOSPI|KOSDAQ|ETF)$/.test(text)) return false;
  return /^[A-Z]{1,6}(?:[.-][A-Z])?$/.test(text);
}

function isValidDisplayTicker(value: string) {
  const text = value.trim();
  return isKoreanStockCode(text) || (text === text.toUpperCase() && isUsTicker(text));
}

function normalizeDisplayTicker(value: string, allowLowercaseUsTicker = false) {
  const text = value.trim();
  if (isKoreanStockCode(text)) return text;
  const upper = text.toUpperCase();
  if (!allowLowercaseUsTicker && !isValidDisplayTicker(text)) return "";
  return isUsTicker(upper) ? upper : "";
}

function extractDisplaySymbol(value: unknown) {
  const text = cleanDisplayText(value);
  if (!text) return "";
  const trimmed = text.trim();
  const direct = normalizeDisplayTicker(trimmed);
  if (direct) return direct;

  const koreanCodeWithSuffix = trimmed.match(/^(\d{6})(?:\.(?:KS|KQ))?$/i);
  if (koreanCodeWithSuffix) return koreanCodeWithSuffix[1];

  const exchangePrefixed = trimmed.match(/^(?:NASDAQ|NYSE|AMEX|ARCA|NYSEARCA|KOSPI|KOSDAQ|KRX)\s*[:：]\s*([A-Z]{1,6}(?:[.-][A-Z])?|\d{6})(?:\.(?:KS|KQ))?$/i);
  if (exchangePrefixed) return normalizeDisplayTicker(exchangePrefixed[1], true);

  const parenthesized = trimmed.match(/\(([A-Z]{1,6}(?:[.-][A-Z])?|\d{6})(?:\.(?:KS|KQ))?\)\s*$/i);
  if (parenthesized) return normalizeDisplayTicker(parenthesized[1], true);

  const slashPrefixed = trimmed.match(/^([A-Z]{1,6}(?:[.-][A-Z])?|\d{6})(?:\.(?:KS|KQ))?\s*[\/|·•-]\s*.+$/i);
  if (slashPrefixed) return normalizeDisplayTicker(slashPrefixed[1]);

  return "";
}

function compactCompanyName(value: unknown, ticker: string) {
  let text = cleanDisplayText(value);
  if (!text) return "";
  if (ticker && ticker !== DISPLAY_IDENTITY_TITLE_FALLBACK) {
    text = text
      .replace(new RegExp(`\\b${escapeRegExp(ticker)}\\b`, "gi"), "")
      .replace(/[()|·•-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!text || isPlaceholderText(text) || text.toUpperCase() === ticker.toUpperCase()) return "";
  return text.length > 36 ? text.slice(0, 36).trim() : text;
}

function normalizeAliasText(value: unknown) {
  return cleanDisplayText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function findDisplayIdentityAlias(values: unknown[]) {
  const normalizedValues = values.map(normalizeAliasText).filter(Boolean);
  for (const alias of DISPLAY_IDENTITY_ALIASES) {
    for (const rawAlias of alias.aliases) {
      const normalizedAlias = normalizeAliasText(rawAlias);
      if (!normalizedAlias) continue;
      if (normalizedValues.some((value) => value === normalizedAlias || (normalizedAlias.length >= 3 && value.includes(normalizedAlias)))) {
        return alias;
      }
    }
  }
  return null;
}

function getRawIdentityCandidates(rawReport: AnalysisResponse, report: TradingReport) {
  const rawAny = rawReport as AnalysisResponse & Record<string, unknown>;
  const symbolDetection = rawReport.aiAnalysis?.symbolDetection as Record<string, unknown> | undefined;
  const rawTradingReport = rawAny.tradingReport as Record<string, unknown> | undefined;
  const rawAnalysisMeta = (rawTradingReport?.analysisMeta || rawAny.analysisMeta) as Record<string, unknown> | undefined;
  return [
    symbolDetection?.detectedTicker,
    symbolDetection?.ticker,
    symbolDetection?.symbol,
    symbolDetection?.stockSymbol,
    symbolDetection?.code,
    report.analysisMeta?.symbol,
    rawAnalysisMeta?.symbol,
    rawAny.symbol,
    rawAny.ticker,
    rawAny.stockSymbol,
    rawAny.code,
  ];
}

function getRawCompanyCandidates(rawReport: AnalysisResponse, report: TradingReport) {
  const rawAny = rawReport as AnalysisResponse & Record<string, unknown>;
  const symbolDetection = rawReport.aiAnalysis?.symbolDetection as Record<string, unknown> | undefined;
  const rawTradingReport = rawAny.tradingReport as Record<string, unknown> | undefined;
  const rawAnalysisMeta = (rawTradingReport?.analysisMeta || rawAny.analysisMeta) as Record<string, unknown> | undefined;
  return [
    symbolDetection?.detectedName,
    symbolDetection?.companyName,
    symbolDetection?.stockName,
    rawAnalysisMeta?.companyName,
    rawAnalysisMeta?.stockName,
    report.analysisMeta?.symbol,
  ];
}

function normalizeDisplayMarket(value: unknown) {
  const rawText = cleanDisplayText(value);
  const lowerText = rawText.toLowerCase();
  if (!rawText || /^(unknown|n\/a|na)$/.test(lowerText)) return "";
  const text = rawText.toUpperCase();
  if (/^(US|USA|NASDAQ|NYSE|AMEX|NYSEARCA|ARCA)$/.test(text)) return "US";
  if (/^(KR|KOREA|KOSPI|KOSDAQ|KRX)$/.test(text)) return "KR";
  return "";
}

function getDetectedMarket(rawReport: AnalysisResponse) {
  return normalizeDisplayMarket(rawReport.aiAnalysis?.symbolDetection?.detectedMarket)
    || normalizeDisplayMarket(rawReport.aiAnalysis?.symbolDetection?.detectedExchange);
}

function formatDisplayPrice(value: unknown, fallback = "가격 확인 필요") {
  if (typeof value === "number" && Number.isFinite(value)) return formatPrice(value);
  const text = cleanDisplayText(value);
  if (!text) return fallback;
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return fallback;
  const rawNumber = match[0];
  const numeric = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return fallback;
  const decimals = rawNumber.includes(".") ? Math.min(rawNumber.split(".")[1]?.length ?? 0, 2) : 0;
  return numeric.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals || (Math.abs(numeric) >= 100 ? 0 : 2),
  });
}

function getDisplayCurrencyUnit(
  rawReport: AnalysisResponse,
  report: TradingReport,
  ticker: string,
  market: string,
  currentPrice: number | null,
) {
  const existingUnit = cleanDisplayText(report.analysisMeta?.priceUnit);
  const rawCurrency = cleanDisplayText(rawReport.aiAnalysis?.symbolDetection?.currency);
  const rawTradingReport = (rawReport as AnalysisResponse & { tradingReport?: TradingReport; analysisMeta?: TradingReport["analysisMeta"] }).tradingReport;
  const rawAnalysisMeta = rawTradingReport?.analysisMeta
    || (rawReport as AnalysisResponse & { analysisMeta?: TradingReport["analysisMeta"] }).analysisMeta;
  const confidence = rawAnalysisMeta?.priceUnitConfidence || report.analysisMeta?.priceUnitConfidence;
  const reliableSymbolMarket = isUsTicker(ticker) || isKoreanStockCode(ticker) || market === "US" || market === "KR";
  const lowConfidence = confidence === "low" || (!reliableSymbolMarket && /확인 필요|이미지|축 기준|추정 불가/.test(existingUnit));

  if (lowConfidence) return "이미지 축 기준 추정";
  if (market === "US" || isUsTicker(ticker)) {
    return /달러|USD/i.test(existingUnit || rawCurrency) ? (existingUnit || rawCurrency) : "달러 기준 추정";
  }
  if (market === "KR" || isKoreanStockCode(ticker)) {
    return /원|KRW/i.test(existingUnit || rawCurrency) ? (existingUnit || rawCurrency) : "원 기준 추정";
  }
  return "이미지 축 기준 추정";
}

function buildDisplayIdentity(rawReport: AnalysisResponse, report: TradingReport, context: PriceContext): DisplayIdentity {
  const identityCandidates = getRawIdentityCandidates(rawReport, report);
  const companyCandidates = getRawCompanyCandidates(rawReport, report);
  const symbol = identityCandidates.map(extractDisplaySymbol).find(Boolean) || "";
  const alias = findDisplayIdentityAlias([...identityCandidates, ...companyCandidates]);
  const ticker = symbol || alias?.ticker || DISPLAY_IDENTITY_TITLE_FALLBACK;
  const hasResolvedTicker = ticker !== DISPLAY_IDENTITY_TITLE_FALLBACK;
  const marketLabel = isKoreanStockCode(ticker)
    ? "KR"
    : isUsTicker(ticker)
      ? "US"
      : alias?.marketLabel || getDetectedMarket(rawReport) || DISPLAY_IDENTITY_MARKET_FALLBACK;
  const companyName = compactCompanyName(alias?.companyName, ticker)
    || companyCandidates.map((value) => compactCompanyName(value, ticker)).find(Boolean)
    || (hasResolvedTicker ? ticker : "");
  const companyLine = !hasResolvedTicker && !alias && marketLabel === DISPLAY_IDENTITY_MARKET_FALLBACK
    ? DISPLAY_IDENTITY_COMPANY_FALLBACK
    : companyName
    ? `${companyName} · ${marketLabel}`
    : hasResolvedTicker
      ? `${ticker} · ${marketLabel}`
      : DISPLAY_IDENTITY_COMPANY_FALLBACK;
  const rawEstimate = safeNumber(rawReport.aiAnalysis?.priceAxisObservations?.currentPriceEstimate?.value);
  const priceText = formatDisplayPrice(rawEstimate ?? context.current ?? context.heroPrice ?? context.currentText);
  const currencyUnitLabel = getDisplayCurrencyUnit(rawReport, report, ticker, marketLabel, context.current);
  const identityConfidence: DisplayIdentityConfidence = symbol ? "high" : alias ? "medium" : "low";

  return {
    ticker,
    companyName: companyName || DISPLAY_IDENTITY_TITLE_FALLBACK,
    marketLabel,
    companyLine,
    currencyUnitLabel,
    priceText,
    priceUnitNote: currencyUnitLabel,
    identityConfidence,
  };
}

function joinZones(values: unknown[], fallback = FALLBACK.unknown) {
  const zones = values.map((value) => safeText(value, "")).filter(Boolean);
  return zones.length ? zones.slice(0, 3).join(" / ") : fallback;
}

function confidenceLabel(value?: Confidence | string | null, score?: number | null) {
  if (typeof score === "number") {
    if (score >= 70) return "높음";
    if (score >= 40) return "보통";
    return "낮음";
  }
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  if (value === "low") return "낮음";
  if (value === "unavailable") return "확인 제한";
  return safeText(value, "판단 제한");
}

function percentGap(from: number | null, to: number | null) {
  if (from === null || to === null || from === 0) return null;
  const value = (Math.abs(to - from) / Math.abs(from)) * 100;
  return Number.isFinite(value) ? value : null;
}

function samePriceZone(a: number | null, b: number | null, tolerancePercent = 0.8) {
  if (a === null || b === null) return false;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  const absoluteTolerance = scale >= 100 ? 0.5 : 0.01;
  return Math.abs(a - b) <= Math.max((scale * tolerancePercent) / 100, absoluteTolerance);
}

type PriceCandidate = {
  text: string;
  value: number;
};

function priceCandidate(value: unknown): PriceCandidate | null {
  const numeric = parsePriceFromText(value);
  if (numeric === null) return null;
  const text = typeof value === "number" ? formatPrice(value) : safeText(value, "");
  return text ? { text, value: numeric } : null;
}

function uniquePriceCandidates(values: unknown[]) {
  const candidates: PriceCandidate[] = [];
  for (const value of values) {
    const candidate = priceCandidate(value);
    if (!candidate) continue;
    if (candidates.some((item) => samePriceZone(item.value, candidate.value, 0.3))) continue;
    candidates.push(candidate);
  }
  return candidates.sort((a, b) => a.value - b.value);
}

function collectTargetCandidates(report: TradingReport, rawReport: AnalysisResponse) {
  return uniquePriceCandidates([
    report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
    report.tradePlan.targets.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.thirdTarget?.priceZone,
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    ...(report.priceRoles?.targets?.holderTargets ?? []),
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    ...(report.analysisMeta?.mainResistances ?? []),
    ...(report.keyLevels.resistances ?? []).map((item) => item.priceZone),
    rawReport.tradeSignal?.targetPriceCandidate?.primary,
    rawReport.tradeSignal?.targetPriceCandidate?.secondary,
    rawReport.tradeSignal?.summarySignal?.targetPriceCandidate?.primary,
    rawReport.tradeSignal?.summarySignal?.targetPriceCandidate?.secondary,
    rawReport.advancedTradeSignal?.targetPriceCandidate?.primary,
    rawReport.advancedTradeSignal?.targetPriceCandidate?.secondary,
    rawReport.aiAnalysis?.patternSummary?.keyTargetPrice,
    rawReport.aiAnalysis?.priceAxisObservations?.recentHighEstimate?.value,
    ...(rawReport.aiAnalysis?.priceAxisObservations?.visibleResistancePrices ?? []).map((item) => item.value),
    ...(rawReport.technicalAnalysis?.supportResistance?.resistanceLevels ?? []),
    rawReport.technicalAnalysis?.recentHighLow?.recentHigh,
  ]);
}

function aboveRole(candidate: PriceCandidate, role: number | null) {
  return role === null || candidate.value > role * 1.008;
}

function validatePriceRoleSeparation(
  report: TradingReport,
  rawReport: AnalysisResponse,
  roles: {
    current: number | null;
    pivot: number | null;
    resistance: number | null;
    breakout: number | null;
    stop: number | null;
    rawTarget: number | null;
  },
) {
  const candidates = collectTargetCandidates(report, rawReport);
  const collapsedWithCurrent = samePriceZone(roles.rawTarget, roles.current) || (roles.rawTarget !== null && roles.current !== null && roles.rawTarget <= roles.current);
  const collapsedWithResistance = samePriceZone(roles.rawTarget, roles.resistance);
  const collapsedWithPivot = samePriceZone(roles.rawTarget, roles.pivot);
  const collapsedWithBreakout = samePriceZone(roles.rawTarget, roles.breakout);
  const currentNearResistance = samePriceZone(roles.current, roles.resistance) || (
    roles.current !== null &&
    roles.resistance !== null &&
    roles.resistance >= roles.current * 0.995 &&
    (percentGap(roles.current, roles.resistance) ?? 100) <= 1.5
  );
  const roleCollapsed = collapsedWithCurrent || collapsedWithResistance || collapsedWithPivot || collapsedWithBreakout;
  const baseline = Math.max(
    roles.current ?? Number.NEGATIVE_INFINITY,
    roles.pivot ?? Number.NEGATIVE_INFINITY,
    roles.breakout ?? Number.NEGATIVE_INFINITY,
    roles.resistance ?? Number.NEGATIVE_INFINITY,
  );
  const validTargets = candidates.filter((candidate) => (
    candidate.value > baseline * 1.008 &&
    aboveRole(candidate, roles.current) &&
    aboveRole(candidate, roles.pivot) &&
    aboveRole(candidate, roles.breakout) &&
    aboveRole(candidate, roles.resistance) &&
    !samePriceZone(candidate.value, roles.stop)
  ));
  const firstForwardTarget = validTargets[0] ?? null;
  const extensionTarget = firstForwardTarget
    ? validTargets.find((candidate) => candidate.value > firstForwardTarget.value * 1.008) ?? null
    : null;
  const fallbackTarget = currentNearResistance || roleCollapsed
    ? "목표가 근접"
    : "상단 목표 미확인 / 돌파 후 다음 저항 확인 필요";

  return {
    targetText: firstForwardTarget?.text ?? fallbackTarget,
    target: firstForwardTarget?.value ?? null,
    extensionTargetText: extensionTarget?.text ?? "다음 저항 확인 필요",
    targetStatus: firstForwardTarget?.text ?? fallbackTarget,
    roleCollapsed,
    currentNearResistance,
  };
}

function currentPriceTexts(rawReport: AnalysisResponse, normalizedReport: TradingReport) {
  const rawEstimate = safeNumber(rawReport.aiAnalysis?.priceAxisObservations?.currentPriceEstimate?.value);
  const zoneText = firstText(
    [normalizedReport.analysisMeta?.currentPriceZone, normalizedReport.priceRoles?.current?.priceZone],
    FALLBACK.imageEstimate,
  );

  if (rawEstimate !== null) {
    return {
      heroPrice: formatPrice(rawEstimate),
      summaryPrice: zoneText !== FALLBACK.imageEstimate ? zoneText : `${formatPrice(rawEstimate)} 부근`,
      numeric: rawEstimate,
    };
  }

  const plainCandidate = [normalizedReport.priceRoles?.current?.priceZone, normalizedReport.analysisMeta?.currentPriceZone]
    .find((value) => isPlainNumericText(value));

  if (plainCandidate) {
    const numeric = safeNumber(plainCandidate);
    return {
      heroPrice: formatPrice(numeric),
      summaryPrice: formatPrice(numeric),
      numeric,
    };
  }

  return {
    heroPrice: "-",
    summaryPrice: zoneText === "-" ? FALLBACK.imageEstimate : zoneText,
    numeric: parsePriceFromText(zoneText),
  };
}

function getActionState(report: TradingReport): TradingActionState {
  if (report.finalSummary.actionState) return report.finalSummary.actionState;
  const action = report.finalSummary.finalAction;
  if (["CURRENT_PARTIAL_ENTRY", "CURRENT_STARTER_POSITION", "MOMENTUM_CONTINUATION_ENTRY", "PRE_BREAKOUT_AGGRESSIVE_ENTRY"].includes(action)) {
    return action as TradingActionState;
  }
  if (["BREAKOUT_BUY_CANDIDATE", "BUY_CANDIDATE", "CONDITIONAL_BUY"].includes(action)) return "STRONG_BUY";
  if (["PULLBACK_BUY_CANDIDATE", "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "WAIT_FOR_PULLBACK"].includes(action)) return "PULLBACK_ENTRY";
  if (["BREAKOUT_WAIT", "WAIT_FOR_BREAKOUT", "WAIT_FOR_SUPPORT_CONFIRMATION", "WAIT"].includes(action)) return "BREAKOUT_WAIT";
  if (["HOLD_AND_WATCH", "NO_NEW_ENTRY_HOLD_OK", "HOLD"].includes(action)) return "HOLD_ONLY";
  if (["SELL_RISK", "REDUCE_POSITION", "PARTIAL_TAKE_PROFIT", "TAKE_PROFIT"].includes(action)) return "HIGH_RISK";
  return "AVOID";
}

function deriveLocation(context: Omit<PriceContext, "currentLocation" | "targetGapLabel" | "targetGapExplanation" | "preferredStrategy">) {
  const priceLocation = context.chartRegime;
  if (context.current === null) return "가격 위치 확인 필요";
  if (context.breakoutRetestConfirmed || priceLocation === "breakout_retest_confirmed") return "돌파 확인 구간";
  if (priceLocation === "support_breakdown") return "지지선 이탈";
  if (priceLocation === "resistance_test") return "저항권 테스트";
  if (priceLocation === "overheated_breakout") return "목표가 근접";
  if (priceLocation === "downtrend_rebound") {
    const resistanceGap = percentGap(context.current, context.resistance);
    return resistanceGap !== null && resistanceGap <= 3 ? "저항권 테스트" : "하락추세 반등 구간";
  }
  if (priceLocation === "uptrend_pullback") return "상승추세 눌림 구간";
  if (priceLocation === "uptrend_consolidation") return "상승추세 조정 구간";

  const targetGap = percentGap(context.current, context.target);
  if (context.target !== null && context.target >= context.current * 0.995 && targetGap !== null && targetGap <= 1.5) {
    return "목표가 근접";
  }

  const resistanceGap = percentGap(context.current, context.resistance);
  if (context.resistance !== null && context.resistance >= context.current * 0.995 && resistanceGap !== null && resistanceGap <= 1.5) {
    return "저항 바로 아래";
  }

  const supportGap = percentGap(context.current, context.support);
  if (context.support !== null && context.current >= context.support && supportGap !== null && supportGap <= 3) {
    return "지지권 근처";
  }

  if (context.support !== null && context.resistance !== null && context.resistance > context.support) {
    const rangePosition = (context.current - context.support) / (context.resistance - context.support);
    if (Number.isFinite(rangePosition)) {
      if (rangePosition <= 0.35) return "박스권 하단";
      if (rangePosition < 0.7) return "박스권 중단";
      return "박스권 상단";
    }
  }

  return "가격 위치 확인 필요";
}

function deriveTargetRoom(context: Omit<PriceContext, "targetGapLabel" | "targetGapExplanation" | "preferredStrategy">) {
  const current = context.current;
  const upper = context.target ?? context.resistance;
  const support = context.support;
  const currentNearResistance = current !== null && context.resistance !== null && (
    samePriceZone(current, context.resistance) ||
    (context.resistance >= current * 0.995 && (percentGap(current, context.resistance) ?? 100) <= 1.5)
  );

  if (current !== null && currentNearResistance && !context.breakoutRetestConfirmed) {
    return {
      label: "목표 여유 낮음",
      explanation: "현재가와 1차 저항이 거의 같아 현재가 진입 손익비가 낮습니다. 돌파 후 다음 저항 확인이 필요합니다.",
    };
  }

  if (current === null || upper === null) {
    return {
      label: "상단 목표 미확인",
      explanation: "상단 목표가 명확하지 않아 돌파 후 다음 저항 확인이 필요합니다.",
    };
  }

  if (upper <= current) {
    return {
      label: "목표 여유 낮음",
      explanation: "목표가와 현재가가 거의 같거나 목표가가 현재가보다 낮아 추격매수는 불리합니다.",
    };
  }

  const upperText = context.target !== null ? context.targetText : context.resistanceText;
  const targetGapPercent = percentGap(current, upper);
  const supportGap = support !== null ? current - support : null;
  const calculatedRiskReward = supportGap !== null && supportGap > 0 ? (upper - current) / supportGap : null;
  const riskReward = context.currentRiskReward ?? calculatedRiskReward;

  if ((targetGapPercent !== null && targetGapPercent <= 1.5) || (riskReward !== null && riskReward < 1)) {
    return {
      label: "목표 여유 낮음",
      explanation: `현재가와 ${upperText} 구간의 거리가 가까워 현재가 진입 손익비가 낮습니다.`,
    };
  }

  if (riskReward !== null && riskReward >= 1.5) {
    return {
      label: "목표 여유 있음",
      explanation: `주요 지지에서 반등 확인 시 ${upperText} 구간까지 상승 여지를 볼 수 있습니다.`,
    };
  }

  return {
    label: "목표 여유 보통",
    explanation: "현재가 기준 목표 여유는 일부 있으나 손절 기준과 지지 반응 확인이 필요합니다.",
  };
}

function derivePreferredStrategy(context: Pick<PriceContext, "chartRegime" | "currentLocation" | "targetGapLabel" | "pullbackRiskReward" | "breakoutRetestConfirmed">) {
  if (context.chartRegime === "support_breakdown") return "위험 관리와 지지 회복 확인";
  if (context.chartRegime === "downtrend") return "추세 전환 확인 전 신규 진입 보류";
  if (context.chartRegime === "downtrend_rebound") return "저항 회복과 돌파 후 재지지 확인";
  if (context.chartRegime === "resistance_test") return "추격매수보다 돌파 후 재지지 확인";
  if (context.chartRegime === "overheated_breakout") return "추격매수보다 눌림 또는 재지지 확인";
  if (context.chartRegime === "uptrend_pullback") return "눌림목 지지 확인 후 관심";
  if (context.chartRegime === "uptrend_consolidation") return "지지 반응 또는 돌파 확인";
  if (context.chartRegime === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) return "돌파 후 재지지 유지 여부 확인";
  if (context.currentLocation === "목표가 근접" || context.currentLocation === "저항 바로 아래" || context.targetGapLabel === "목표 여유 낮음") {
    return "추격매수보다 돌파 후 재지지 확인";
  }
  if (context.currentLocation === "지지권 근처" || context.currentLocation === "박스권 하단" || (context.pullbackRiskReward ?? 0) >= 1.2) {
    return "눌림목 지지 확인 후 관심";
  }
  return FALLBACK.noLevels;
}

function buildPriceContext(rawReport: AnalysisResponse, report: TradingReport): PriceContext {
  const current = currentPriceTexts(rawReport, report);
  const supportText = firstText(
    [report.analysisMeta?.mainSupports?.[0], report.keyLevels.supports[0]?.priceZone],
    FALLBACK.unknown,
  );
  const secondarySupportText = firstText(
    [report.analysisMeta?.mainSupports?.[1], report.keyLevels.supports[1]?.priceZone],
    FALLBACK.unknown,
  );
  const resistanceText = firstText(
    [report.analysisMeta?.mainResistances?.[0], report.keyLevels.resistances[0]?.priceZone],
    FALLBACK.unknown,
  );
  const pivotText = firstText(
    [report.analysisMeta?.keyPivotPrice, report.priceRoles?.pivot?.priceZone, report.tradePlan.entry.breakoutEntry?.priceZone],
    FALLBACK.unknown,
  );
  const breakoutTriggerText = firstText([pivotText, report.tradePlan.entry.breakoutEntry?.priceZone, resistanceText], FALLBACK.unknown);
  const rawTargetText = firstForwardPriceText(
    [
      report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
      report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
      report.tradePlan.targets.firstTarget?.priceZone,
      report.priceRoles?.targets?.pullbackTargets?.[0],
      report.priceRoles?.targets?.breakoutTargets?.[0],
    ],
    current.numeric,
    FALLBACK.unknown,
  );
  const validatedTarget = validatePriceRoleSeparation(report, rawReport, {
    current: current.numeric,
    pivot: parsePriceFromText(pivotText),
    resistance: parsePriceFromText(resistanceText),
    breakout: parsePriceFromText(breakoutTriggerText),
    stop: parsePriceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.priceZone),
    rawTarget: parsePriceFromText(rawTargetText),
  });

  const partial = {
    currentText: current.summaryPrice,
    heroPrice: current.heroPrice,
    current: current.numeric,
    pivotText,
    pivot: parsePriceFromText(pivotText),
    breakoutLevelText: breakoutTriggerText,
    breakoutLevel: parsePriceFromText(breakoutTriggerText),
    supportText,
    support: parsePriceFromText(supportText),
    secondarySupportText,
    resistanceText,
    resistance: parsePriceFromText(resistanceText),
    targetText: validatedTarget.targetText,
    target: validatedTarget.target,
    extensionTargetText: validatedTarget.extensionTargetText,
    targetStatus: validatedTarget.targetStatus,
    targetRoleCollapsed: validatedTarget.roleCollapsed,
    chartRegime: report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown",
    breakoutRetestConfirmed: Boolean(report.marketContext?.breakoutRetestConfirmed),
    currentRiskReward: report.tradePlan.riskRewardByEntry?.current?.value ?? null,
    pullbackRiskReward: report.tradePlan.riskRewardByEntry?.pullback?.value ?? null,
    breakoutRiskReward: report.tradePlan.riskRewardByEntry?.breakout?.value ?? null,
  };
  const currentLocation = deriveLocation(partial);
  const targetRoom = deriveTargetRoom({ ...partial, currentLocation });

  return {
    ...partial,
    currentLocation,
    targetGapLabel: targetRoom.label,
    targetGapExplanation: targetRoom.explanation,
    preferredStrategy: derivePreferredStrategy({
      ...partial,
      currentLocation,
      targetGapLabel: targetRoom.label,
    }),
  };
}

function deriveFinalAction(report: TradingReport, context: PriceContext): InstitutionalReportViewModel["finalAction"] {
  const actionState = getActionState(report);
  if (context.chartRegime === "support_breakdown") {
    return {
      title: "지지선 이탈 / 위험 관리",
      subtitle: "주요 지지선 이탈이 확인되어 반등 확인 전까지 신규 진입보다 손절 기준과 비중 관리가 우선입니다.",
      reason: "지지선 이탈 구간에서는 신규 진입보다 위험 관리가 우선입니다.",
      actionType: "SUPPORT_BREAKDOWN_RISK",
    };
  }
  if (context.chartRegime === "downtrend") {
    return {
      title: "하락 추세 / 신규 진입 보류",
      subtitle: "기술적 반등 가능성은 있으나 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.",
      reason: "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다.",
      actionType: "DOWNTREND_CAUTION",
    };
  }
  if (actionState === "CURRENT_PARTIAL_ENTRY") {
    return {
      title: "현재가 분할 진입 가능 / 손절 짧게",
      subtitle: "추세는 우호적이지만 저항 부담이 있어, 현재가는 소액으로만 접근하고 눌림목에서 추가 진입을 검토합니다.",
      reason: "공격형: 현재가 1차 소액 분할 진입 가능. 일반형: 주요 지지 재확인 후 추가 분할 진입. 보수형: 돌파 후 재지지 확인 시 진입.",
      actionType: "CURRENT_PARTIAL_ENTRY",
    };
  }
  if (actionState === "CURRENT_STARTER_POSITION") {
    return {
      title: "현재가 소액 진입 가능 / 확인 병행",
      subtitle: "확인 조건은 남아 있지만 추세가 유지되고 있어, 손절을 짧게 전제로 한 소액 진입은 가능합니다.",
      reason: "공격형: 현재가 소액 진입 가능. 일반형: 눌림목 지지 확인 후 분할 진입. 보수형: 돌파 후 재지지 또는 확정 신호 확인 후 접근.",
      actionType: "CURRENT_STARTER_POSITION",
    };
  }
  if (actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    return {
      title: "모멘텀 추세추종 / 분할 접근",
      subtitle: "추세와 모멘텀이 유지되고 있어 눌림만 기다리기보다 일부 추세추종 진입도 검토할 수 있습니다.",
      reason: "공격형: 모멘텀 추세추종 소액 진입 가능. 일반형: 눌림목에서 추가 진입. 보수형: 핵심 가격 위 재지지 확인 후 접근.",
      actionType: "MOMENTUM_CONTINUATION_ENTRY",
    };
  }
  if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    return {
      title: "돌파 전 소액 선진입 / 고위험",
      subtitle: "돌파 전 선진입은 실패 위험이 있으므로, 손절을 짧게 두는 소액 전략으로만 접근해야 합니다.",
      reason: "공격형: 돌파 전 소액 선진입 가능. 일반형: 저항 돌파 확인 후 분할 진입. 보수형: 돌파 후 재지지 확인 전까지 대기.",
      actionType: "PRE_BREAKOUT_AGGRESSIVE_ENTRY",
    };
  }
  if (context.chartRegime === "downtrend_rebound") {
    return {
      title: "하락추세 반등 / 돌파 확인 대기",
      subtitle: "현재가는 저항권에 가까워 돌파 후 재지지 확인 전까지 신규 진입은 신중해야 합니다.",
      reason: "반등 구간에서는 눌림목 우위보다 저항 회복 여부가 우선입니다.",
      actionType: "DOWNTREND_REBOUND_WAIT",
    };
  }

  if (context.chartRegime === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) {
    return {
      title: "돌파 후 재지지 확인 / 돌파 매수 후보",
      subtitle: "핵심 전환 가격 위에서 지지가 유지되면 다음 저항까지 상승 여지를 볼 수 있습니다.",
      reason: "돌파 가격 위에서 재지지 여부가 핵심 조건입니다.",
      actionType: "BREAKOUT_RETEST",
    };
  }

  if (context.chartRegime === "resistance_test") {
    const currentScore = safeScore(report.scoreSummary?.entryScores?.currentEntry?.score);
    const riskScore = safeScore(report.scoreSummary?.riskScore) ?? 50;
    const allowSmallOnly = currentScore !== null && currentScore >= 45 && currentScore <= 65 && riskScore < 60;
    return {
      title: allowSmallOnly ? "저항권 테스트 / 소액만 가능" : "저항권 테스트 / 돌파 확인 우선",
      subtitle: allowSmallOnly
        ? "현재가는 저항권에 가까워 전량 진입은 부담이 크며, 짧은 손절 전제의 소액 접근만 검토합니다."
        : "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.",
      reason: "저항권에서는 현재가 추격보다 돌파와 재지지 확인을 먼저 봅니다.",
      actionType: allowSmallOnly ? "RESISTANCE_TEST_SMALL_ONLY" : "RESISTANCE_TEST_WAIT",
    };
  }

  if (context.chartRegime === "overheated_breakout") {
    return {
      title: "추격매수 주의 / 재지지 확인",
      subtitle: "급등 돌파 이후 과열 신호가 있어 현재가 추격보다 눌림 또는 돌파 후 재지지 확인이 우선입니다.",
      reason: "과열권 돌파 구간에서는 모멘텀은 우호적이어도 손익비와 재지지 확인이 중요합니다.",
      actionType: "OVERHEATED_BREAKOUT_RETEST_WAIT",
    };
  }

  if ((context.currentLocation === "목표가 근접" || context.targetGapLabel === "목표 여유 낮음") && context.currentLocation !== "지지권 근처") {
    return {
      title: "목표가 근접 / 추격매수 주의",
      subtitle: "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 필요합니다.",
      reason: context.targetGapExplanation,
      actionType: "TARGET_CLOSE_CHASE_RISK",
    };
  }

  if (context.chartRegime === "range_upper_resistance") {
    return {
      title: "박스권 상단 / 추격매수 주의",
      subtitle: "현재가는 상단 저항에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.",
      reason: "박스권 상단에서는 추격매수보다 저항 돌파와 안착 확인이 필요합니다.",
      actionType: "RANGE_UPPER_CAUTION",
    };
  }

  if (context.currentLocation === "저항 바로 아래" || context.currentLocation === "박스권 상단") {
    return {
      title: "저항 근접 / 보유자는 일부 익절, 미보유자는 대기",
      subtitle: "보유자는 일부 익절 또는 돌파 안착 여부를 확인하고, 미보유자는 추격매수를 피하는 것이 유리합니다.",
      reason: "저항권에서는 신규 진입보다 보유자 대응과 돌파 확인이 우선입니다.",
      actionType: "RESISTANCE_HOLDER_ONLY",
    };
  }

  if (context.chartRegime === "uptrend_pullback") {
    return {
      title: "상승추세 눌림 / 지지 확인",
      subtitle: "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.",
      reason: "상승추세 눌림은 지지 확인 후 조건부 진입으로 보는 것이 자연스럽습니다.",
      actionType: "UPTREND_PULLBACK_INTEREST",
    };
  }

  if (context.chartRegime === "uptrend_consolidation") {
    return {
      title: "상승추세 조정 / 방향 확인",
      subtitle: "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다.",
      reason: "상승 이후 조정 구간에서는 지지 유지와 재상승 확인이 핵심입니다.",
      actionType: "UPTREND_CONSOLIDATION_WAIT",
    };
  }

  if (context.chartRegime === "range_lower_support") {
    return {
      title: "박스권 하단 / 지지 확인",
      subtitle: "박스권 하단 지지가 유지되는지 확인되면 손절 기준을 짧게 두고 진입 후보로 볼 수 있습니다.",
      reason: "박스권 하단에서는 지지 반응 확인이 우선입니다.",
      actionType: "RANGE_LOWER_SUPPORT_WAIT",
    };
  }

  if (context.currentLocation === "지지권 근처" || context.currentLocation === "박스권 하단" || context.chartRegime === "healthy_pullback") {
    return {
      title: "눌림목 대기 / 지지 확인 시 관심",
      subtitle: "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 두고 진입 후보로 볼 수 있습니다.",
      reason: "지지 확인 전에는 즉시 진입보다 반등 확인이 필요합니다.",
      actionType: "PULLBACK_WAIT",
    };
  }

  if (context.pivot !== null && !context.breakoutRetestConfirmed) {
    return {
      title: "돌파 확인 대기",
      subtitle: "핵심 전환 가격 돌파 후 위에서 버티는지 확인 전까지는 신규 진입보다 대기가 유리합니다.",
      reason: "돌파 후 재지지가 아직 확인되지 않았습니다.",
      actionType: "BREAKOUT_WAIT",
    };
  }

  return {
    title: safeText(report.normalizedFinalAction?.title, safeText(report.finalSummary.title, "최종 판단 확인 필요")),
    subtitle: safeText(report.normalizedFinalAction?.subtitle, safeText(report.finalSummary.oneLineConclusion, FALLBACK.noLevels)),
    reason: safeText(report.normalizedFinalAction?.reason, safeText(report.finalSummary.reason, FALLBACK.noLevels)),
    actionType: safeText(report.normalizedFinalAction?.actionType, safeText(report.finalSummary.finalAction, "REPORT_FALLBACK")),
  };
}

function riskRewardText(detail?: RiskRewardDetail | null) {
  if (detail?.value !== null && detail?.value !== undefined && Number.isFinite(detail.value)) {
    if (detail.value <= 0) return "진입 부적합";
    if (detail.value < 1) return "불리";
    if (detail.value < 1.5) return "보통";
    return `약 ${detail.value.toFixed(1)} / 조건부 가능`;
  }
  return safeText(detail?.label, FALLBACK.needsCheck);
}

function isVagueTradingText(value: unknown) {
  const text = safeText(value, "");
  const blocked = ["확인 필요", "분석" + " 불가", "손익비", "위험 관리 필요", "상황에 따라"];
  return !text || blocked.some((item) => text.includes(item)) || /undefined|null|NaN|Infinity|\[object Object\]/i.test(text);
}

function stopConditionFromZone(zone: unknown, suffix = "이탈 시 손절") {
  const text = safeText(zone, "");
  if (!text) return "";
  if (/이탈|재이탈|붕괴|손절|실패/.test(text)) return text;
  return `${text} ${suffix}`;
}

function practicalStopLoss(
  mode: "current" | "pullback" | "breakout",
  report: TradingReport,
  context: PriceContext,
) {
  const stops = report.tradePlan.stopLossByEntry ?? {};
  const stop = mode === "current" ? stops.currentEntry : mode === "pullback" ? stops.pullbackEntry : stops.breakoutEntry;
  const suffix = mode === "breakout" ? "재이탈 시 돌파 실패" : mode === "pullback" ? "이탈 시 눌림목 실패" : "이탈 시 단기 손절";
  const direct = [stop?.condition, stop?.priceZone]
    .map((item) => safeText(item, ""))
    .find((item) => item && !isVagueTradingText(item));
  if (direct) return stopConditionFromZone(direct, suffix);

  if (mode === "breakout" && context.pivotText !== FALLBACK.unknown) {
    return stopConditionFromZone(context.pivotText, "재이탈 시 돌파 실패");
  }

  const supportFallback = [
    context.supportText,
    context.secondarySupportText,
    report.tradePlan.stopLoss.shortTerm?.priceZone,
    report.tradePlan.stopLoss.conservative?.priceZone,
    report.tradePlan.stopLoss.priceZone,
  ].find((item) => safeText(item, "") && safeText(item, "") !== FALLBACK.unknown);

  if (supportFallback) {
    const prefix = mode === "current" ? "현재가 진입 시 " : "";
    return `${prefix}${stopConditionFromZone(supportFallback, suffix)}`;
  }
  return FALLBACK.noStop;
}

function practicalRiskRewardText(
  detail: RiskRewardDetail | null | undefined,
  context: PriceContext,
  mode: "current" | "pullback" | "breakout",
) {
  const value = typeof detail?.value === "number" && Number.isFinite(detail.value) ? detail.value : (
    mode === "current" ? context.currentRiskReward : mode === "pullback" ? context.pullbackRiskReward : context.breakoutRiskReward
  );

  if (mode === "current" && (context.targetGapLabel === "목표 여유 낮음" || (value !== null && value < 1))) {
    return "불리 - 목표가와 현재가가 가까워 보상 대비 위험이 큼";
  }
  if (value !== null && Number.isFinite(value)) {
    if (value < 1) return "불리 - 손절 폭 대비 목표 여유가 작음";
    if (value < 1.5) return "보통 - 진입 전 지지 반응 확인 필요";
    if (value < 2.5) return "유리 - 목표 구간까지 여유가 있고 손절 기준이 명확함";
    return "유리 - 손익비는 좋지만 이미지 기준 추정값 재확인 필요";
  }
  if (mode === "breakout") return "보통 - 돌파 후 안착 여부가 핵심";
  if (mode === "pullback") return "보통 - 지지 반응 확인 후 손익비 재점검";
  return "불리 - 현재가 진입은 손절 기준 재확인이 필요";
}

function entryTone(label: string): EntryTone {
  if (/부적합|불리|회피/.test(label)) return "risk";
  if (/선진입/.test(label)) return "caution";
  if (/확인|대기|주의|조건부/.test(label)) return "caution";
  if (/미래/.test(label)) return "caution";
  if (/분할|소액|모멘텀/.test(label)) return "positive";
  if (/후보|관심|가능|유리/.test(label)) return "positive";
  return "neutral";
}

function entryScoreLabel(score: number | null) {
  if (score === null) return FALLBACK.needsCheck;
  if (score <= 19) return "부적합";
  if (score <= 39) return "불리";
  if (score <= 54) return "확인 필요";
  if (score <= 69) return "조건부";
  if (score <= 84) return "후보";
  return "유리";
}

function buildEntryModes(report: TradingReport, context: PriceContext): InstitutionalReportViewModel["entryMode"] {
  const entries = report.scoreSummary?.entryScores ?? {};
  const currentScore = safeScore(entries.currentEntry?.score);
  const pullbackScore = safeScore(entries.pullbackEntry?.score);
  const rawBreakoutScore = safeScore(entries.breakoutEntry?.score);
  const breakoutScore = context.breakoutRetestConfirmed && rawBreakoutScore !== null
    ? Math.max(rawBreakoutScore, 65)
    : rawBreakoutScore;
  const actionState = getActionState(report);
  const currentUnfavorable =
    context.currentLocation === "목표가 근접" ||
    context.currentLocation === "저항 바로 아래" ||
    context.chartRegime === "downtrend_rebound" ||
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "support_breakdown" ||
    context.targetGapLabel === "목표 여유 낮음" ||
    (context.currentRiskReward !== null && context.currentRiskReward < 1);
  const futurePullbackOnly = context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test";

  const currentLabel = actionState === "CURRENT_PARTIAL_ENTRY"
    ? "현재가 분할 진입"
    : actionState === "CURRENT_STARTER_POSITION"
      ? "현재가 소액 진입"
      : actionState === "MOMENTUM_CONTINUATION_ENTRY"
        ? "모멘텀 진입"
        : actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY"
          ? "돌파 전 소액 선진입"
          : currentUnfavorable
            ? currentScore !== null && currentScore < 30 ? "부적합" : "불리"
            : safeText(entries.currentEntry?.label, entryScoreLabel(currentScore));
  const currentCondition = actionState === "CURRENT_PARTIAL_ENTRY"
    ? "손절 기준을 짧게 두고 전량이 아닌 분할 접근"
    : actionState === "CURRENT_STARTER_POSITION"
      ? "확인 조건이 남아 있어 소액과 짧은 손절 전제"
      : actionState === "MOMENTUM_CONTINUATION_ENTRY"
        ? "추세와 모멘텀이 유지되고 목표 여유가 남아 있을 때"
        : actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY"
          ? "돌파 실패 시 빠른 손절을 전제로 한 소액 선진입"
          : currentUnfavorable ? "돌파 후 재지지 확인 전까지 신규 진입은 신중" : "짧은 손절 기준 확인 시 제한적으로 검토";
  const currentExplanation = actionState === "CURRENT_PARTIAL_ENTRY"
    ? "현재가는 추격 구간에 가까울 수 있지만, 손절 기준을 짧게 잡을 수 있어 소액 분할 진입은 검토 가능합니다."
    : actionState === "CURRENT_STARTER_POSITION"
      ? "확인 조건은 남아 있지만 추세가 유지되고 있어, 손절을 짧게 전제로 한 소액 진입은 가능합니다."
      : actionState === "MOMENTUM_CONTINUATION_ENTRY"
        ? "추세와 모멘텀이 유지되고 있어 눌림만 기다리기보다 일부 추세추종 진입도 검토할 수 있습니다."
        : actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY"
          ? "돌파 전 선진입은 실패 위험이 있으므로, 손절을 짧게 두는 소액 전략으로만 접근해야 합니다."
          : currentUnfavorable
            ? `현재가가 ${context.resistanceText !== FALLBACK.unknown ? context.resistanceText : context.targetText} 저항 또는 목표 구간에 가까워 목표 여유가 작습니다.`
            : safeText(entries.currentEntry?.explanation, "현재가 진입은 지지와 손절 기준 확인이 필요합니다.");
  let pullbackLabel = safeText(entries.pullbackEntry?.label, entryScoreLabel(pullbackScore));
  if (actionState === "CURRENT_PARTIAL_ENTRY" || actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    pullbackLabel = "눌림목 추가 진입";
  } else if (actionState === "CURRENT_STARTER_POSITION") {
    pullbackLabel = "분할 2차 진입";
  } else if (futurePullbackOnly && (pullbackScore ?? 0) >= 50) {
    pullbackLabel = "미래 눌림목 관심";
  } else if (context.chartRegime === "uptrend_pullback" && (pullbackScore ?? 0) >= 60) {
    pullbackLabel = "지지 확인 시 관심";
  } else if (context.chartRegime === "uptrend_consolidation" && (pullbackScore ?? 0) >= 55) {
    pullbackLabel = "눌림 대기";
  } else if (context.supportText !== FALLBACK.unknown && (pullbackScore ?? 0) >= 65) {
    pullbackLabel = "지지 확인 시 관심";
  }

  let breakoutLabel = safeText(entries.breakoutEntry?.label, entryScoreLabel(breakoutScore));
  if (actionState === "MOMENTUM_CONTINUATION_ENTRY" && context.breakoutRetestConfirmed) {
    breakoutLabel = "돌파 후 재지지 진입";
  } else if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    breakoutLabel = "돌파 전 소액 선진입";
  } else if (futurePullbackOnly) {
    breakoutLabel = "돌파 후 재지지 확인 우선";
  } else if (context.breakoutRetestConfirmed && (breakoutScore ?? 0) >= 65) {
    breakoutLabel = "돌파 매수 후보";
  } else if (context.pivotText !== FALLBACK.unknown) {
    breakoutLabel = "돌파 확인 필요";
  }

  return {
    currentEntry: {
      score: currentScore,
      label: currentLabel,
      condition: currentCondition,
      stopLoss: practicalStopLoss("current", report, context),
      target: context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText,
      riskReward: practicalRiskRewardText(report.tradePlan.riskRewardByEntry?.current, context, "current"),
      explanation: currentExplanation,
      tone: entryTone(currentLabel),
    },
    pullbackEntry: {
      score: pullbackScore,
      label: pullbackLabel,
      condition: firstText([report.tradePlan.entry.pullbackEntry?.condition, `${context.supportText} 부근 지지 확인 시 관심`], FALLBACK.needsCheck),
      stopLoss: practicalStopLoss("pullback", report, context),
      target: context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText,
      riskReward: practicalRiskRewardText(report.tradePlan.riskRewardByEntry?.pullback, context, "pullback"),
      explanation: context.supportText !== FALLBACK.unknown
        ? `${context.supportText} 부근 지지 반응이 확인되면 현재가 추격보다 조건이 개선될 수 있습니다.`
        : "명확한 지지 가격 확인이 필요합니다.",
      tone: entryTone(pullbackLabel),
    },
    breakoutEntry: {
      score: breakoutScore,
      label: breakoutLabel,
      condition: firstText([report.tradePlan.entry.breakoutEntry?.condition, `${context.pivotText} 돌파 후 위에서 재지지`], FALLBACK.needsCheck),
      stopLoss: practicalStopLoss("breakout", report, context),
      target: firstText([report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone, context.targetText], FALLBACK.needsCheck),
      riskReward: practicalRiskRewardText(report.tradePlan.riskRewardByEntry?.breakout, context, "breakout"),
      explanation: context.breakoutRetestConfirmed
        ? "핵심 전환 가격 위에서 재지지가 유지되는지 확인하는 것이 핵심입니다."
        : `${context.pivotText} 돌파 후 위에서 버티는 재지지 확인이 필요합니다.`,
      tone: entryTone(breakoutLabel),
    },
  };
}

function deriveSignal(report: TradingReport, context: PriceContext, entryMode: InstitutionalReportViewModel["entryMode"]) {
  const actionState = getActionState(report);
  const currentScore = entryMode.currentEntry.score ?? 0;
  const pullbackScore = entryMode.pullbackEntry.score ?? 0;
  const breakoutScore = entryMode.breakoutEntry.score ?? 0;
  const strongestEntryScore = Math.max(currentScore, pullbackScore, breakoutScore);
  const strongestEntryMode =
    breakoutScore >= currentScore && breakoutScore >= pullbackScore
      ? "breakout"
      : pullbackScore >= currentScore
        ? "pullback"
        : "current";

  if (context.chartRegime === "support_breakdown" || actionState === "HIGH_RISK") {
    return { signalLabel: "위험 관리", signalTone: "risk" as SignalTone };
  }
  if (context.chartRegime === "downtrend") {
    return { signalLabel: "진입 보류", signalTone: "risk" as SignalTone };
  }
  if (actionState === "AVOID" || (currentScore < 30 && pullbackScore < 30 && breakoutScore < 30)) {
    return { signalLabel: "진입 보류", signalTone: "risk" as SignalTone };
  }
  if (actionState === "CURRENT_PARTIAL_ENTRY") {
    return { signalLabel: "분할 가능", signalTone: "watch" as SignalTone };
  }
  if (actionState === "CURRENT_STARTER_POSITION") {
    return { signalLabel: "소액 가능", signalTone: "watch" as SignalTone };
  }
  if (actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    return { signalLabel: "추세추종", signalTone: "buy" as SignalTone };
  }
  if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    return { signalLabel: "선진입 주의", signalTone: "caution" as SignalTone };
  }
  if (
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.chartRegime === "overextended_surge" ||
    context.chartRegime === "overheated_breakout" ||
    context.currentLocation === "저항 바로 아래" ||
    context.currentLocation === "목표가 근접" ||
    context.targetGapLabel === "목표 여유 낮음"
  ) {
    return { signalLabel: "주의", signalTone: "caution" as SignalTone };
  }
  if (context.chartRegime === "downtrend_rebound") {
    return { signalLabel: "돌파 대기", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "breakout_wait") {
    return { signalLabel: "돌파 대기", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "uptrend_pullback") {
    return { signalLabel: "눌림 대기", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "uptrend_consolidation") {
    return { signalLabel: "지지 확인", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "range_lower_support") {
    return { signalLabel: "지지 확인", signalTone: "watch" as SignalTone };
  }
  if (currentScore < 50 && strongestEntryScore >= 60) {
    return {
      signalLabel: strongestEntryMode === "breakout" ? "돌파 대기" : strongestEntryMode === "pullback" ? "눌림 대기" : "지지 확인",
      signalTone: "watch" as SignalTone,
    };
  }
  if (context.breakoutRetestConfirmed && breakoutScore >= 65 && currentScore >= 50) {
    return { signalLabel: "매수 후보", signalTone: "buy" as SignalTone };
  }
  if (actionState === "PULLBACK_ENTRY") {
    return { signalLabel: "눌림 대기", signalTone: "watch" as SignalTone };
  }
  if (actionState === "BREAKOUT_WAIT") {
    return { signalLabel: "돌파 대기", signalTone: "watch" as SignalTone };
  }
  if (actionState === "HOLD_ONLY") {
    return { signalLabel: "관망", signalTone: "hold" as SignalTone };
  }
  if (actionState === "STRONG_BUY" && currentScore >= 50 && strongestEntryScore >= 65) {
    return { signalLabel: "매수 후보", signalTone: "buy" as SignalTone };
  }
  return { signalLabel: "중립", signalTone: "neutral" as SignalTone };
}

function indicatorSignal(text: unknown): Pick<IndicatorRow, "signal" | "tone"> {
  const value = safeText(text, "").toLowerCase();
  if (/위험|붕괴|이탈|급락|breakdown|invalidation|invalid|collapse/.test(value)) return { signal: "위험", tone: "risk" };
  if (/과매수|추격매수|과열|부담|상단 밴드 근접|overbought|overheating|stretched|extended|chase risk|주의|부족|제한|over/.test(value)) {
    return { signal: "주의", tone: "caution" };
  }
  if (/bear|sell|하락|매도|negative|약세|하향|둔화/.test(value)) return { signal: "약세", tone: "risk" };
  if (/bullish|상승|매수 우위|골든크로스|우호|positive|increase|상향 돌파|상회|회복/.test(value)) {
    return { signal: "매수", tone: "positive" };
  }
  return { signal: "중립", tone: "neutral" };
}

function rsiSignal(value: unknown, fallbackText: unknown): Pick<IndicatorRow, "signal" | "tone"> {
  const rsi = safeNumber(value);
  if (rsi !== null) {
    if (rsi >= 75) return { signal: "과열 주의", tone: "caution" };
    if (rsi >= 70) return { signal: "주의", tone: "caution" };
    if (rsi >= 60) return { signal: "중립~우호", tone: "neutral" };
    if (rsi >= 45) return { signal: "중립", tone: "neutral" };
    if (rsi >= 30) return { signal: "약세", tone: "risk" };
    return { signal: "반등 관심", tone: "caution" };
  }
  return indicatorSignal(fallbackText);
}

function isIndicatorCautionContext(report: TradingReport) {
  const regime = String(report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown");
  const location = report.marketContext?.priceLocation;
  const actionText = [
    report.normalizedFinalAction?.title,
    report.normalizedFinalAction?.subtitle,
    report.finalSummary?.title,
    report.finalSummary?.oneLineConclusion,
  ].map((item) => safeText(item, "")).join(" ");

  return (
    regime === "resistance_test" ||
    regime === "overextended_surge" ||
    regime === "range_upper_resistance" ||
    regime === "breakout_wait" ||
    regime === "downtrend_rebound" ||
    regime === "overheated_breakout" ||
    location === "near_resistance" ||
    location === "upper_range" ||
    location === "overextended" ||
    Boolean(report.marketContext?.nearResistance) ||
    /목표가 근접|추격매수|주의|저항권|저항 근접|과열|대기|target_near|overheated|overextended/i.test(actionText)
  );
}

function macdSignal(interpretation: unknown, report: TradingReport, rsiValue: unknown): Pick<IndicatorRow, "signal" | "tone"> {
  const text = safeText(interpretation, "").toLowerCase();
  const bullish = /상승|상회|상향|우호|bullish|positive|골든크로스/.test(text);
  const bearish = /하락|하회|하향|약세|둔화|bearish|negative|데드크로스|이탈/.test(text);
  const cautionContext = isIndicatorCautionContext(report) || (safeNumber(rsiValue) ?? 0) >= 70;

  if (bullish && cautionContext) return { signal: "모멘텀 우호 / 추격 주의", tone: "caution" };
  if (bullish) return { signal: "상승 모멘텀 유지", tone: "positive" };
  if (bearish) return { signal: "약세", tone: "risk" };
  return indicatorSignal(interpretation);
}

function bollingerSignal(text: unknown): Pick<IndicatorRow, "signal" | "tone"> {
  const value = safeText(text, "").toLowerCase();
  if (/upper|상단/.test(value)) return { signal: "주의", tone: "caution" };
  if (/lower|하단/.test(value)) return { signal: "반등 관심", tone: "caution" };
  if (/squeeze|수축/.test(value)) return { signal: "변동성 확대 대기", tone: "neutral" };
  if (/breakdown|이탈|붕괴/.test(value)) return { signal: "위험", tone: "risk" };
  return indicatorSignal(text);
}

function formatIndicatorValue(value: unknown, fallback = "수치 확인 제한") {
  if (typeof value === "number") return Number.isFinite(value) ? formatPrice(value) : fallback;
  return safeText(value, fallback);
}

function interpretRsi(value: unknown, fallback: unknown) {
  const rsi = safeNumber(value);
  if (rsi !== null) {
    if (rsi >= 75) return "상승 모멘텀은 강하지만 단기 과열로 추격매수 부담이 있습니다.";
    if (rsi >= 70) return "과매수권에 가까워 신규 진입은 신중해야 합니다.";
    if (rsi >= 60) return "상승 우위는 있으나 과열 여부를 함께 확인해야 합니다.";
    if (rsi >= 45) return "RSI는 중립권으로 단독 진입 신호보다는 가격 위치 확인이 우선입니다.";
    if (rsi >= 30) return "RSI가 약세권에 가까워 반등 확인 전까지 보수적 접근이 필요합니다.";
    return "과매도권으로 기술적 반등 가능성은 있으나 추세 확인이 필요합니다.";
  }
  return safeText(fallback, "RSI 수치가 제한적이므로 가격 위치와 지지/저항 구조를 기준으로 중립 판단합니다.");
}

function interpretMacd(macd: unknown, signal: unknown, fallback: unknown, trendLabel: string) {
  const macdValue = safeNumber(macd);
  const signalValue = safeNumber(signal);
  if (macdValue !== null && signalValue !== null) {
    if (macdValue > signalValue) return "MACD가 시그널선을 상회해 상승 모멘텀은 일부 확인됩니다.";
    if (macdValue < signalValue) return "MACD가 시그널선을 하회해 모멘텀 둔화 또는 약세 흐름을 경계해야 합니다.";
    return "MACD와 시그널선이 근접해 방향 확인이 필요합니다.";
  }
  return safeText(fallback, `${trendLabel} 기준으로 해석하되 MACD 수치 확인은 제한적입니다.`);
}

function interpretMovingAverage(rawReport: AnalysisResponse, report: TradingReport, fallback: unknown) {
  const current = parsePriceFromText(report.analysisMeta?.currentPriceZone ?? report.priceRoles?.current?.priceZone);
  const ma20 = safeNumber(rawReport.technicalAnalysis?.movingAverages?.ma20);
  const ma60 = safeNumber(rawReport.technicalAnalysis?.movingAverages?.ma60);
  if (current !== null && ma20 !== null && ma60 !== null) {
    if (ma20 > ma60 && current > ma20) return "가격이 주요 이동평균선 위에 있고 단기선이 중기선을 상회해 흐름은 우호적입니다.";
    if (ma20 < ma60 && current < ma20) return "가격이 주요 이동평균선 아래에 있어 추세 회복 확인이 필요합니다.";
    if (current > ma20) return "가격은 단기 이동평균 위에 있으나 중기 추세 확인이 필요합니다.";
    return "가격이 단기 이동평균 아래에 있어 반등 확인 전까지 보수적 판단이 필요합니다.";
  }
  return safeText(fallback, "이동평균 수치 확인이 제한적이므로 현재 가격의 지지/저항 위치를 우선합니다.");
}

function interpretBollinger(value: unknown, fallback: unknown) {
  const text = safeText(value, "");
  const source = `${text} ${safeText(fallback, "")}`.toLowerCase();
  if (/upper|상단/.test(source)) return "상단 밴드 근접으로 단기 과열 또는 되돌림 가능성을 함께 봐야 합니다.";
  if (/lower|하단/.test(source)) return "하단 밴드 근접으로 기술적 반등 가능성이 있으나 지지 확인이 필요합니다.";
  if (/squeeze|수축/.test(source)) return "밴드 수축 구간으로 변동성 확대 전조가 있어 돌파 방향 확인이 중요합니다.";
  if (/expand|확장/.test(source)) return "밴드 확장 구간이면 추세 진행 가능성이 있으나 손절 기준을 함께 확인해야 합니다.";
  return "밴드 위치가 명확하지 않아 변동성 판단은 제한적이며, 지지/저항 돌파 여부를 우선합니다.";
}

function buildIndicators(rawReport: AnalysisResponse, report: TradingReport) {
  const readings = rawReport.aiAnalysis?.indicatorReadings;
  const technical = rawReport.technicalAnalysis;
  const rawConfirmed = rawReport.tradingReport?.indicatorAnalysis?.confirmed ?? [];
  const rawUnavailable = rawReport.tradingReport?.indicatorAnalysis?.unavailable ?? [];
  const confirmed = report.indicatorAnalysis.confirmed ?? [];
  const unavailable = report.indicatorAnalysis.unavailable ?? [];
  const scaleLimited = report.analysisMeta?.priceUnitConfidence === "low" || safeText(report.analysisMeta?.priceUnit, "").includes("확인 필요");
  const rsiValue = readings?.rsi?.valueEstimate ?? technical?.rsi?.value ?? null;

  const normalizedByName = (keyword: string) => confirmed.find((item) => safeText(item.name, "").includes(keyword));
  const unavailableByName = (keyword: string) => unavailable.find((item) => safeText(item.name, "").includes(keyword));
  const rawByName = (keyword: string) => rawConfirmed.find((item) => safeText(item.name, "").includes(keyword));
  const rawUnavailableByName = (keyword: string) => rawUnavailable.find((item) => safeText(item.name, "").includes(keyword));
  const macdValue = typeof technical?.macd?.macd === "number" || typeof technical?.macd?.signal === "number"
    ? `${formatPrice(technical?.macd?.macd)} / ${formatPrice(technical?.macd?.signal)}`
    : null;
  const maValue = typeof technical?.movingAverages?.ma20 === "number" || typeof technical?.movingAverages?.ma60 === "number"
    ? `${formatPrice(technical?.movingAverages?.ma20)} / ${formatPrice(technical?.movingAverages?.ma60)}`
    : null;
  const trendLabel = chartRegimeLabels[report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown"];
  const rsiFallback = readings?.rsi?.status ?? technical?.rsi?.interpretation ?? rawByName("RSI")?.explanation ?? normalizedByName("RSI")?.explanation ?? rawUnavailableByName("RSI")?.reason ?? unavailableByName("RSI")?.reason;

  const rows = [
    {
      name: "RSI",
      value: rsiValue,
      interpretation: interpretRsi(rsiValue, rsiFallback),
      signal: rsiSignal(rsiValue, rsiFallback),
    },
    {
      name: "MACD",
      value: scaleLimited ? "수치 확인 제한" : macdValue,
      interpretation: interpretMacd(technical?.macd?.macd, technical?.macd?.signal, readings?.macd?.status ?? technical?.macd?.interpretation ?? normalizedByName("MACD")?.explanation ?? unavailableByName("MACD")?.reason, trendLabel),
      signal: null,
    },
    {
      name: "이동평균선",
      value: scaleLimited ? "수치 확인 제한" : maValue,
      interpretation: interpretMovingAverage(rawReport, report, readings?.movingAverages?.status ?? normalizedByName("이동")?.explanation ?? unavailableByName("이동")?.reason),
      signal: null,
    },
    {
      name: "거래량",
      value: technical?.volume?.ratio ? `${technical.volume.ratio.toFixed(2)}배` : null,
      interpretation: safeText(readings?.volume?.status ?? technical?.volume?.interpretation ?? normalizedByName("거래량")?.explanation ?? rawReport.aiAnalysis?.volumeObservation, "이미지에서 명확한 거래량 급증은 확인되지 않아 돌파 신뢰도 판단은 보수적으로 봅니다."),
      signal: null,
    },
    {
      name: "볼린저 밴드",
      value: readings?.bollingerBands?.position ?? technical?.bollingerBands?.position ?? null,
      interpretation: interpretBollinger(readings?.bollingerBands?.position ?? technical?.bollingerBands?.position, readings?.bollingerBands?.status ?? readings?.bollingerBands?.reason ?? technical?.bollingerBands?.interpretation ?? unavailableByName("볼린저")?.reason),
      signal: null,
    },
  ];

  return rows.map((row) => {
    const interpretation = safeText(row.interpretation, "수치 데이터가 제한적이므로 가격 위치와 추세 구조를 기준으로 중립 판단합니다.");
    const signal = row.signal
      ?? (row.name === "MACD" ? macdSignal(interpretation, report, rsiValue) : row.name === "볼린저 밴드" ? bollingerSignal(interpretation) : indicatorSignal(interpretation));
    return {
      name: row.name,
      value: formatIndicatorValue(row.value),
      interpretation,
      signal: signal.signal,
      tone: signal.tone,
    };
  });
}

function scenarioLikelihood(tone: ScenarioTone, context: PriceContext) {
  if (tone === "positive") {
    if (context.chartRegime === "breakout_retest_confirmed" || context.chartRegime === "uptrend_pullback" || context.chartRegime === "healthy_pullback") return "높음";
    if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test" || context.chartRegime === "overextended_surge" || context.chartRegime === "overheated_breakout") return "낮음";
    return "보통";
  }
  if (tone === "risk") {
    if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance" || context.chartRegime === "overheated_breakout") return "높음";
    if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "range_lower_support" || context.chartRegime === "healthy_pullback") return "낮음";
    return "보통";
  }
  if (context.chartRegime === "sideways" || context.chartRegime === "breakout_wait" || context.chartRegime === "uptrend_consolidation") return "높음";
  return "보통";
}

function buildScenario(
  title: string,
  scenario: { condition?: string; expectedMove?: string; action?: string },
  tone: ScenarioTone,
  context: PriceContext,
): ScenarioCard {
  const support = context.supportText !== FALLBACK.unknown ? context.supportText : "주요 지지선";
  const resistance = context.resistanceText !== FALLBACK.unknown ? context.resistanceText : "주요 저항선";
  const pivot = context.pivotText !== FALLBACK.unknown ? context.pivotText : resistance;
  const invalidation = context.secondarySupportText !== FALLBACK.unknown ? context.secondarySupportText : support;
  const defaults = tone === "positive"
    ? {
        condition: `${pivot} 돌파 후 위에서 재지지 성공 시`,
        expectedMove: `${context.targetText !== FALLBACK.unknown ? context.targetText : resistance} 구간까지 상승 여지 확인`,
        action: "돌파 후 안착과 거래량 확인 시 분할 접근이 유리합니다.",
      }
    : tone === "risk"
      ? {
          condition: `${support} 이탈 시 단기 상승 관점 약화`,
          expectedMove: `${invalidation} 하위 지지 확인 구간까지 조정 가능성`,
          action: `${support} 이탈 시 단기 손절, ${invalidation} 이탈 시 중기 관점 약화로 대응합니다.`,
        }
      : {
          condition: `${support}~${resistance} 구간 등락 지속 시`,
          expectedMove: "박스권 내부에서 방향 확인 대기",
          action: "상단 돌파 또는 하단 지지 반응이 확인될 때까지 무리한 진입을 피합니다.",
        };

  return {
    title,
    condition: safeText(scenario.condition, defaults.condition),
    probability: scenarioLikelihood(tone, context),
    expectedMove: safeText(scenario.expectedMove, defaults.expectedMove),
    interpretation: safeText(scenario.action, defaults.action),
    tone,
  };
}

function isCautionFinalAction(finalAction: InstitutionalReportViewModel["finalAction"], report: TradingReport) {
  const actionText = [
    finalAction.title,
    finalAction.subtitle,
    finalAction.actionType,
    report.normalizedFinalAction?.title,
    report.normalizedFinalAction?.subtitle,
    report.finalSummary?.title,
    report.finalSummary?.oneLineConclusion,
  ].map((item) => safeText(item, "")).join(" ");
  return /주의|추격|저항권|저항 근접|목표가 근접|대기|보류|위험|CAUTION|WAIT|RISK|RESISTANCE|DOWNTREND/i.test(actionText);
}

function alignSignalAndEntryLabel(
  signal: DisplayedEntrySignal,
  report: TradingReport,
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
): DisplayedEntrySignal {
  const actionText = [
    finalAction.title,
    finalAction.subtitle,
    finalAction.actionType,
    report.finalSummary?.title,
    report.finalSummary?.oneLineConclusion,
  ].map((item) => safeText(item, "")).join(" ");
  const cautionContext =
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.chartRegime === "downtrend_rebound" ||
    context.currentLocation === "저항권 테스트" ||
    context.currentLocation === "저항 바로 아래" ||
    context.currentLocation === "목표가 근접" ||
    context.targetGapLabel === "목표 여유 낮음" ||
    /주의|추격|저항권|목표가 근접|대기|보류|위험|CAUTION|WAIT|RISK/i.test(actionText);
  const forbiddenBullishLabel = /눌림목 진입 우세|현재가 진입 우세|매수 우세/.test(signal.label);

  if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend") {
    return {
      ...signal,
      mode: "risk",
      label: "위험 관리 우선",
      explanation: "추세 또는 지지 구조가 약해 신규 진입보다 위험 관리가 우선입니다.",
    };
  }

  if (context.chartRegime === "downtrend_rebound" && (/건전한 눌림|눌림목 진입 우세/.test(signal.label) || forbiddenBullishLabel)) {
    return {
      ...signal,
      mode: "breakout_wait",
      label: "저항 돌파 확인 우선",
      explanation: "하락 이후 반등 구간은 눌림목 우위보다 저항 회복과 재지지 확인이 우선입니다.",
    };
  }

  if (cautionContext && forbiddenBullishLabel) {
    return {
      ...signal,
      mode: signal.mode === "pullback_wait" ? "pullback_wait" : "breakout_wait",
      label: context.chartRegime === "range_upper_resistance" || context.chartRegime === "resistance_test"
        ? "저항권 진입 주의"
        : "돌파 확인 우선",
      explanation: context.chartRegime === "range_upper_resistance" || context.chartRegime === "resistance_test"
        ? "현재가는 저항권에 가까워 즉시 진입보다 돌파 후 재지지 확인이 우선입니다."
        : "신규 진입은 지지 반응과 돌파 확인이 나온 뒤 접근하는 것이 안전합니다.",
    };
  }

  return signal;
}

function deriveDisplayedEntrySignal(
  report: TradingReport,
  entryMode: InstitutionalReportViewModel["entryMode"],
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
): DisplayedEntrySignal {
  const current = entryMode.currentEntry.score;
  const pullback = entryMode.pullbackEntry.score;
  const breakout = entryMode.breakoutEntry.score;
  const candidates = [
    { mode: "current" as const, score: current, label: "현재가 진입 우세", explanation: entryMode.currentEntry.explanation },
    { mode: "pullback_wait" as const, score: pullback, label: "눌림목 진입 우세", explanation: entryMode.pullbackEntry.explanation },
    { mode: "breakout_wait" as const, score: breakout, label: "돌파 진입 우세", explanation: entryMode.breakoutEntry.explanation },
  ].filter((item): item is { mode: "current" | "pullback_wait" | "breakout_wait"; score: number; label: string; explanation: string } => (
    typeof item.score === "number" && Number.isFinite(item.score)
  ));

  if (!candidates.length) {
    return { score: null, label: FALLBACK.needsCheck, mode: "none", explanation: "진입 점수 산정에 필요한 정보가 제한적입니다." };
  }

  const currentScore = current ?? 0;
  const pullbackScore = pullback ?? 0;
  const breakoutScore = breakout ?? 0;
  const isUpperResistance =
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.currentLocation === "저항권 테스트" ||
    context.currentLocation === "저항 바로 아래" ||
    context.currentLocation === "목표가 근접" ||
    context.targetGapLabel === "목표 여유 낮음";
  const finalActionCaution = isCautionFinalAction(finalAction, report);
  const actionState = getActionState(report);

  let signal: DisplayedEntrySignal;

  if (context.chartRegime === "support_breakdown") {
    signal = {
      score: Math.max(currentScore, Math.min(pullbackScore, 50), Math.min(breakoutScore, 50)),
      label: "위험 관리 우선",
      mode: "risk",
      explanation: "주요 지지선 이탈 구간에서는 신규 진입보다 위험 관리가 우선입니다.",
    };
  } else if (context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound") {
    signal = {
      score: Math.max(Math.min(currentScore, 45), Math.min(pullbackScore, 60), breakoutScore),
      label: context.chartRegime === "downtrend_rebound" ? "저항 돌파 확인 우선" : "반등 확인 대기",
      mode: "breakout_wait",
      explanation: "하락 흐름 이후에는 저항 회복과 돌파 후 재지지 확인 전까지 신규 진입은 신중해야 합니다.",
    };
  } else if (actionState === "CURRENT_PARTIAL_ENTRY") {
    signal = {
      score: currentScore,
      label: "현재가 소액 가능",
      mode: "current",
      explanation: "손절 기준을 짧게 잡을 수 있을 때 전량이 아닌 소액 분할 진입으로 해석합니다.",
    };
  } else if (actionState === "CURRENT_STARTER_POSITION") {
    signal = {
      score: currentScore,
      label: "현재가 소액 가능",
      mode: "current",
      explanation: "확인 조건이 남아 있으므로 현재가 진입은 소액과 짧은 손절 전제로만 해석합니다.",
    };
  } else if (actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    signal = {
      score: currentScore,
      label: "모멘텀 진입 우세",
      mode: "current",
      explanation: "추세와 모멘텀이 유지되는 경우 일부 추세추종 진입 점수를 우선 표시합니다.",
    };
  } else if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    signal = {
      score: Math.max(Math.min(currentScore, 62), Math.min(breakoutScore, 70)),
      label: "돌파 전 소액",
      mode: "breakout_wait",
      explanation: "돌파 전 선진입은 실패 위험이 있어 짧은 손절을 전제로 한 소액 전략으로만 표시합니다.",
    };
  } else if (isUpperResistance) {
    const futurePullbackScore = Math.min(pullbackScore, 65);
    const displayScore = Math.max(Math.min(currentScore, 45), breakoutScore, futurePullbackScore);
    const pullbackIsFutureFocus = pullbackScore >= Math.max(currentScore, breakoutScore, 65);
    signal = {
      score: displayScore,
      label: pullbackIsFutureFocus ? "미래 눌림목 관심" : "돌파 확인 우선",
      mode: pullbackIsFutureFocus ? "pullback_wait" : "breakout_wait",
      explanation: pullbackIsFutureFocus
        ? "현재가는 저항권에 가까워 즉시 진입보다 눌림목 대기가 우선입니다."
        : "현재가는 저항권에 가까워 즉시 진입보다 돌파 후 재지지 확인이 우선입니다.",
    };
    if (context.targetGapLabel === "목표 여유 낮음" && !pullbackIsFutureFocus) {
      signal.label = "저항권 진입 주의";
      signal.mode = "breakout_wait";
    }
  } else if (context.chartRegime === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) {
    signal = {
      score: breakout,
      label: "돌파 후 재지지 우세",
      mode: "breakout_confirmed",
      explanation: "돌파 가격 위 재지지 여부가 확인된 경우 돌파 진입 점수를 우선 표시합니다.",
    };
  } else if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "uptrend_consolidation") {
    const best = candidates.reduce((winner, item) => (item.score > winner.score ? item : winner), candidates[0]);
    signal = best.mode === "pullback_wait"
      ? {
          score: best.score,
          label: "눌림목 진입 우세",
          mode: "pullback_wait",
          explanation: "상승 흐름 속 조정 구간에서는 지지 반응이 유지될 때 눌림목 진입 점수를 우선 표시합니다.",
        }
      : {
          score: best.score,
          label: best.label,
          mode: best.mode,
          explanation: best.explanation,
        };
  } else if (context.chartRegime === "range_lower_support") {
    signal = {
      score: pullback,
      label: "지지 확인 시 관심",
      mode: "pullback_wait",
      explanation: "박스권 하단 또는 지지권에서는 지지 반응 확인을 전제로 눌림목 점수를 표시합니다.",
    };
  } else if (finalActionCaution) {
    signal = {
      score: Math.max(Math.min(currentScore, 55), Math.min(pullbackScore, 65), breakoutScore),
      label: breakoutScore >= Math.max(currentScore, pullbackScore) ? "돌파 확인 우선" : pullbackScore >= currentScore ? "눌림목 대기" : "진입 대기",
      mode: breakoutScore >= Math.max(currentScore, pullbackScore) ? "breakout_wait" : pullbackScore >= currentScore ? "pullback_wait" : "none",
      explanation: "최종 판단이 대기/주의 성격이므로 즉시 진입 우세가 아닌 확인 우선 라벨을 표시합니다.",
    };
  } else {
    const best = candidates.reduce((winner, item) => (item.score > winner.score ? item : winner), candidates[0]);
    const bestLabel = best.mode === "current"
      ? (context.currentLocation === "지지권 근처" || currentScore >= 55 ? "현재가 조건부 진입" : "현재가 진입 점검")
      : best.mode === "pullback_wait"
        ? "눌림목 대기"
        : context.breakoutRetestConfirmed ? "돌파 진입 우세" : "돌파 확인 우선";
    signal = {
      score: best.score,
      label: bestLabel,
      mode: context.breakoutRetestConfirmed && best.mode === "breakout_wait" ? "breakout_confirmed" : best.mode,
      explanation: best.mode === "pullback_wait"
        ? "눌림목 점수는 즉시 진입 허가가 아니라 지지 확인 후 관심 대상으로 해석합니다."
        : best.mode === "breakout_wait" && !context.breakoutRetestConfirmed
          ? "돌파 후 재지지 확인 전까지는 돌파 점수를 확인 대기 성격으로 봅니다."
          : best.explanation,
    };
  }

  return alignSignalAndEntryLabel(signal, report, context, finalAction);
}

function derivePatternCategory(rawReport: AnalysisResponse, report: TradingReport): PatternDisplayCategory {
  const primaryCandidate = rawReport.aiAnalysis?.patternCandidates?.[0];
  const candidateCategory = safeText(primaryCandidate?.category, "").toLowerCase();
  const primaryName = safeText(report.patternAnalysis.primaryPattern.name, "");
  const normalizedName = `${safeText(primaryCandidate?.name, "")} ${safeText(primaryCandidate?.label, "")} ${primaryName}`.toLowerCase();
  const confidence = report.patternAnalysis.primaryPattern.confidence;

  if (!primaryName || primaryName === "명확한 패턴 없음" || confidence === "low" || candidateCategory === "unknown") {
    return "no_clear_pattern";
  }
  if (["continuation", "reversal", "range", "breakout"].includes(candidateCategory)) {
    return candidateCategory as PatternDisplayCategory;
  }
  if (/double top|double bottom|head and shoulders|h&s|이중천장|이중바닥|헤드앤숄더|머리어깨|쌍봉|쌍바닥/.test(normalizedName)) return "reversal";
  if (/range|box|박스|횡보/.test(normalizedName)) return "range";
  if (/breakout|돌파/.test(normalizedName)) return "breakout";
  if (/triangle|flag|pennant|wedge|channel|삼각|깃발|페넌트|쐐기|채널/.test(normalizedName)) return "continuation";
  return "unknown";
}

function noClearPatternStructure(context: PriceContext) {
  if (context.chartRegime === "support_breakdown") return "지지선 이탈 구간";
  if (context.chartRegime === "downtrend_rebound") return "하락 추세 반등 구간";
  if (context.chartRegime === "resistance_test") return "저항권 테스트 구조";
  if (context.chartRegime === "uptrend_pullback") return "상승추세 눌림 구간";
  if (context.chartRegime === "uptrend_consolidation") return "상승추세 조정 구간";
  if (context.chartRegime === "downtrend") return "하락 추세 반등 구간";
  if (context.chartRegime === "breakout_wait" || context.currentLocation === "저항 바로 아래") return "돌파 대기 구조";
  if (context.currentLocation === "목표가 근접" || context.currentLocation === "박스권 상단") return "저항 근접 조정 구조";
  if (context.currentLocation === "지지권 근처" || context.currentLocation === "박스권 하단" || context.chartRegime === "healthy_pullback") return "눌림목 확인 구간";
  if (context.chartRegime === "sideways") return "단기 박스권 횡보 흐름";
  return "주요 가격대 확인 구조";
}

function buildPatternDisplay(rawReport: AnalysisResponse, report: TradingReport, context: PriceContext): InstitutionalReportViewModel["pattern"] {
  const primary = report.patternAnalysis.primaryPattern;
  const primaryCandidate = rawReport.aiAnalysis?.patternCandidates?.[0];
  const category = derivePatternCategory(rawReport, report);
  const confidence = confidenceLabel(primary.confidence);
  const detectedStructure = category === "no_clear_pattern"
    ? "명확한 패턴 없음"
    : safeText(primary.name, "명확한 패턴 없음");

  if (category === "no_clear_pattern") {
    const structure = noClearPatternStructure(context);
    return {
      category,
      confidence,
      detectedStructure: structure,
      continuationProbability: "해당 없음",
      metrics: [],
      interpretation: `현재는 ${context.pivotText !== FALLBACK.unknown ? context.pivotText : "핵심 전환 가격"} 돌파 후 재지지 여부와 ${context.supportText !== FALLBACK.unknown ? context.supportText : "주요 지지"} 반응 확인이 중요합니다.`,
    };
  }

  const continuationProbability = primaryCandidate?.confidenceScore != null && Number.isFinite(primaryCandidate.confidenceScore)
    ? `${Math.round(primaryCandidate.confidenceScore)}%`
    : "확인 필요";
  const confirmation = firstText([primary.confirmationCondition, primaryCandidate?.confirmationCondition], "주요 가격대 확인 필요");
  const invalidation = firstText([primary.invalidationCondition, primaryCandidate?.invalidationCondition], "무효화 조건 확인 필요");
  const interpretation = firstText(
    [primary.tradingMeaning, primary.reason, primaryCandidate?.tradingImplication],
    "현재는 패턴보다 주요 가격대 확인이 우선입니다.",
  );

  if (category === "reversal") {
    return {
      category,
      confidence,
      detectedStructure,
      continuationProbability: "해당 없음",
      metrics: [
        { label: "반락 위험", value: primary.confidence === "high" ? "주의" : "확인 필요" },
        { label: "확인 조건", value: confirmation },
        { label: "무효화 조건", value: invalidation },
      ],
      interpretation,
    };
  }

  const metricLabel = category === "breakout" ? "돌파 신뢰도" : category === "range" ? "박스권 신뢰도" : "추세 연속 가능성";
  return {
    category,
    confidence,
    detectedStructure,
    continuationProbability,
    metrics: [{ label: metricLabel, value: continuationProbability }],
    interpretation,
  };
}

function buildInsightNotes(report: TradingReport, context: PriceContext) {
  const support = context.supportText !== FALLBACK.unknown ? context.supportText : "";
  const resistance = context.resistanceText !== FALLBACK.unknown ? context.resistanceText : "";
  const pivot = context.pivotText !== FALLBACK.unknown ? context.pivotText : "";
  const notes: string[] = [];

  if (context.chartRegime === "support_breakdown") {
    notes.push("주요 지지선 이탈 구간에서는 신규 진입보다 위험 관리가 우선입니다.");
    notes.push("지지 회복과 재지지가 확인되기 전까지는 반등을 보수적으로 봅니다.");
  } else if (context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound") {
    notes.push("하락 추세에서는 반등만으로 매수 후보를 강하게 보기 어렵습니다.");
    notes.push("주요 저항 회복 또는 추세 전환 확인이 필요합니다.");
  } else if (context.chartRegime === "resistance_test") {
    if (resistance) notes.push(`현재가는 ${resistance} 부근 저항을 테스트하고 있어 추격매수 손익비가 낮습니다.`);
    notes.push("돌파 후 재지지가 확인되기 전까지는 신규 진입보다 대기가 유리합니다.");
  } else if (context.chartRegime === "overextended_surge" || context.chartRegime === "overheated_breakout") {
    notes.push("단기 급등 후 저항 구간에서는 미보유자의 추격매수보다 눌림 대기가 유리합니다.");
    notes.push(context.chartRegime === "overheated_breakout" ? "급등 돌파 이후에는 재지지 확인 전까지 현재가 진입은 보수적으로 봅니다." : "보유자는 일부 익절 또는 돌파 안착 여부를 확인할 수 있습니다.");
  } else if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "uptrend_consolidation") {
    if (support) notes.push(`${support} 부근 지지 반응이 확인되면 상승추세 눌림 조건이 개선됩니다.`);
    if (pivot) notes.push(`${pivot} 돌파 후 재지지가 확인되면 다음 목표 구간까지 상승 여지를 볼 수 있습니다.`);
  } else {
    if (resistance) notes.push(`현재가는 ${resistance} 부근 저항과 목표 여유를 함께 확인해야 합니다.`);
    if (support) notes.push(`${support} 부근 지지 반응이 확인되면 눌림목 진입 조건이 개선됩니다.`);
    if (pivot) notes.push(`${pivot} 돌파 후 재지지가 확인되면 다음 목표 구간까지 상승 여지를 볼 수 있습니다.`);
  }

  if (notes.length < 2) notes.push(safeText(report.chartRegime?.reasons?.[0], "주요 지지와 저항 확인 후 조건부 대응이 필요합니다."));
  return Array.from(new Set(notes.map((line) => safeText(line, "")).filter(Boolean))).slice(0, 4);
}

function buildRiskNotice(report: TradingReport) {
  const notices = [
    "본 리포트는 AI 기반 기술적 분석 결과이며, 투자 참고 자료로만 활용하시기 바랍니다.",
    "모든 투자 결정의 책임은 투자자 본인에게 있으며, 본 리포트는 투자 자문이 아닙니다.",
  ];
  if (report.analysisMeta?.dataBasis !== "image_with_ohlcv") {
    notices.push("이미지 기반 분석 특성상 실제 OHLCV 데이터와 차이가 있을 수 있습니다.");
  }
  const riskRewards = [
    report.tradePlan.riskRewardByEntry?.current?.value,
    report.tradePlan.riskRewardByEntry?.pullback?.value,
    report.tradePlan.riskRewardByEntry?.breakout?.value,
    report.tradePlan.riskReward?.value,
  ];
  if (riskRewards.some((value) => typeof value === "number" && Number.isFinite(value) && value >= 5)) {
    notices.push("이미지 기반 추정값이므로 실제 체결가와 손절 기준에 따라 재계산이 필요합니다.");
  }
  return notices;
}

function buildActionableTradingDataset(
  report: TradingReport,
  rawReport: AnalysisResponse,
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
) {
  const entryMode = buildEntryModes(report, context);
  const scenarios = {
    bullish: buildScenario("상승 시나리오", report.scenarios.bullish, "positive", context),
    neutral: buildScenario("중립 시나리오", report.scenarios.neutral, "neutral", context),
    bearish: buildScenario("하락 시나리오", report.scenarios.bearish, "risk", context),
  };
  const keyLevels = {
    currentPrice: context.currentText,
    mainSupport: context.supportText,
    secondarySupport: context.secondarySupportText,
    mainResistance: context.resistanceText,
    breakoutTrigger: firstText([report.tradePlan.entry.breakoutEntry?.priceZone, context.pivotText], FALLBACK.unknown),
    upperBreakoutTarget: context.extensionTargetText,
    stopLoss: practicalStopLoss("current", report, context),
    target: context.targetText,
    invalidation: firstText([report.tradePlan.stopLossByEntry?.mediumTermInvalidation?.condition, report.tradePlan.invalidation.midTerm?.condition, report.tradePlan.invalidation.condition], practicalStopLoss("pullback", report, context)),
    targetGapLabel: context.targetGapLabel,
    targetGapExplanation: context.targetGapExplanation,
  };

  return {
    keyLevels,
    entryMode,
    indicators: buildIndicators(rawReport, report),
    scenarios,
    pattern: buildPatternDisplay(rawReport, report, context),
    marketSummary: {
      observation: finalAction.title,
      coreInterpretation: finalAction.subtitle,
      supportResistanceInterpretation: `${context.supportText} 지지 / ${context.resistanceText} 저항 기준으로 돌파와 이탈 여부를 확인합니다.`,
      riskPoint: firstText([report.evidence.riskFactors[0], report.scoreSummary?.riskLabel], "지지 이탈 또는 저항 실패 시 변동성 확대 가능성을 경계합니다."),
    },
    insightNotes: buildInsightNotes(report, context),
  };
}

function decisionEntryMode(mode: DisplayedEntryMode): ReportDecisionEntryMode {
  if (mode === "current") return "current";
  if (mode === "pullback_wait") return "pullback";
  if (mode === "breakout_wait" || mode === "breakout_confirmed") return "breakout";
  if (mode === "risk") return "risk";
  return "wait";
}

function displayPrice(text: string, value: number | null, status?: string): DisplayPrice {
  const safe = safeText(text, FALLBACK.needsCheck);
  const parsedValue = value !== null && Number.isFinite(value) ? value : parsePriceFromText(safe);
  return {
    text: safe,
    value: parsedValue,
    ...(status ? { status: safeText(status, FALLBACK.needsCheck) } : {}),
  };
}

function collectExplicitTargetCandidates(report: TradingReport, rawReport: AnalysisResponse) {
  return uniquePriceCandidates([
    report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
    report.tradePlan.targets.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.thirdTarget?.priceZone,
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    ...(report.priceRoles?.targets?.holderTargets ?? []),
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    rawReport.tradeSignal?.targetPriceCandidate?.primary,
    rawReport.tradeSignal?.targetPriceCandidate?.secondary,
    rawReport.tradeSignal?.summarySignal?.targetPriceCandidate?.primary,
    rawReport.tradeSignal?.summarySignal?.targetPriceCandidate?.secondary,
    rawReport.advancedTradeSignal?.targetPriceCandidate?.primary,
    rawReport.advancedTradeSignal?.targetPriceCandidate?.secondary,
    rawReport.aiAnalysis?.patternSummary?.keyTargetPrice,
  ]);
}

function sameDisplayRoleZone(a: number | null, b: number | null) {
  return samePriceZone(a, b, 0.75);
}

const LONG_ROLE_MIN_GAP_RATIO = 0.0025;

function isValidLowerLongRole(value: number | null, current: number | null) {
  if (value === null || current === null || !Number.isFinite(value) || !Number.isFinite(current)) return false;
  return value < current * (1 - LONG_ROLE_MIN_GAP_RATIO);
}

function isInvalidLongRoleAtCurrent(value: number | null, current: number | null) {
  if (value === null || current === null || !Number.isFinite(value) || !Number.isFinite(current)) return false;
  return !isValidLowerLongRole(value, current);
}

function lowerLongRoleCandidates(candidates: PriceCandidate[], current: number | null) {
  if (current === null) return [...candidates].sort((a, b) => b.value - a.value);
  return candidates
    .filter((candidate) => isValidLowerLongRole(candidate.value, current))
    .sort((a, b) => b.value - a.value);
}

function hasDecisionWarning(decision: Pick<ReportDecision, "consistencyWarnings">, pattern: RegExp) {
  return (decision.consistencyWarnings ?? []).some((warning) => pattern.test(warning));
}

function targetStatusForPriceRoles(context: PriceContext, warnings: string[]) {
  if (warnings.includes("TARGET_TOO_CLOSE")) return "목표 여유 낮음";
  if (warnings.includes("TARGET_NOT_ABOVE_ENTRY")) return "추가 목표 확인 필요";
  if (warnings.includes("BREAKOUT_TARGET_OVERLAP")) return "돌파 목표 재확인 필요";
  if (warnings.includes("RESISTANCE_TOO_CLOSE")) return "상단 저항 재확인 필요";
  if (warnings.includes("LONG_STOP_RECHECK_REQUIRED")) return "손절 기준 재산정 필요";
  return safeText(context.targetStatus || context.targetGapLabel, "추가 목표 확인 필요");
}

function normalizeDecisionPriceRoles(
  report: TradingReport,
  rawReport: AnalysisResponse,
  context: PriceContext,
  dataset: ReturnType<typeof buildActionableTradingDataset>,
): { priceRoles: ReportDecision["priceRoles"]; warnings: string[] } {
  const warnings: string[] = [];
  const stopValue = parsePriceFromText(dataset.keyLevels.stopLoss);
  const invalidationValue = parsePriceFromText(dataset.keyLevels.invalidation);
  const supportCandidates = uniquePriceCandidates([
    context.supportText,
    context.secondarySupportText,
    ...(report.analysisMeta?.mainSupports ?? []),
    ...(report.keyLevels.supports ?? []).map((item) => item.priceZone),
    report.priceRoles?.pullbackEntry?.priceZone,
  ]);
  const stopCandidates = uniquePriceCandidates([
    dataset.keyLevels.stopLoss,
    dataset.keyLevels.invalidation,
    report.tradePlan.stopLossByEntry?.currentEntry?.priceZone,
    report.tradePlan.stopLossByEntry?.pullbackEntry?.priceZone,
    report.tradePlan.stopLoss.priceZone,
    report.tradePlan.stopLoss.shortTerm?.priceZone,
    report.tradePlan.stopLoss.conservative?.priceZone,
    report.tradePlan.invalidation.midTerm?.priceZone,
    report.tradePlan.invalidation.condition,
    report.priceRoles?.stopLoss?.shortTerm,
    report.priceRoles?.stopLoss?.conservative,
    report.priceRoles?.stopLoss?.invalidation,
  ]);
  const explicitTargets = collectExplicitTargetCandidates(report, rawReport);
  const allTargets = collectTargetCandidates(report, rawReport);
  const baselineValues = [context.current, context.resistance, context.breakoutLevel].filter((value): value is number => value !== null && Number.isFinite(value));
  const baseline = baselineValues.length ? Math.max(...baselineValues) : null;
  const explicitTargetCollapsed = explicitTargets.some((candidate) => (
    (context.current !== null && candidate.value <= context.current) ||
    sameDisplayRoleZone(candidate.value, context.current) ||
    sameDisplayRoleZone(candidate.value, context.resistance) ||
    sameDisplayRoleZone(candidate.value, context.breakoutLevel)
  ));
  const rawTargetNotAboveEntry = explicitTargets.some((candidate) => context.current !== null && candidate.value <= context.current);
  const rawTargetNearCurrent = explicitTargets.some((candidate) => sameDisplayRoleZone(candidate.value, context.current));
  const rawTargetNearResistance = explicitTargets.some((candidate) => sameDisplayRoleZone(candidate.value, context.resistance));
  const rawTargetNearBreakout = explicitTargets.some((candidate) => sameDisplayRoleZone(candidate.value, context.breakoutLevel));
  const currentNearResistance = sameDisplayRoleZone(context.current, context.resistance) || (
    context.current !== null &&
    context.resistance !== null &&
    context.resistance >= context.current &&
    (percentGap(context.current, context.resistance) ?? 100) <= 1.5
  );
  const supportStopOverlap =
    sameDisplayRoleZone(context.support, stopValue) ||
    sameDisplayRoleZone(context.support, invalidationValue) ||
    supportCandidates.some((support) => stopCandidates.some((stop) => sameDisplayRoleZone(support.value, stop.value)));
  const lowerSupports = lowerLongRoleCandidates(supportCandidates, context.current);
  const selectedSupport = lowerSupports[0] ?? null;
  const selectedSecondarySupport = lowerSupports.find((candidate) => selectedSupport === null || !sameDisplayRoleZone(candidate.value, selectedSupport.value)) ?? null;
  const lowerStops = lowerLongRoleCandidates(stopCandidates, context.current);
  const selectedStop = lowerStops[0] ?? null;
  const selectedInvalidation = lowerStops.find((candidate) => selectedStop === null || !sameDisplayRoleZone(candidate.value, selectedStop.value)) ?? selectedStop;
  const contextSupportInvalidForLong = isInvalidLongRoleAtCurrent(context.support, context.current);
  const stopInvalidForLong = isInvalidLongRoleAtCurrent(stopValue, context.current);
  const invalidationInvalidForLong = isInvalidLongRoleAtCurrent(invalidationValue, context.current);

  if (context.targetRoleCollapsed || explicitTargetCollapsed) warnings.push("PRICE_ROLE_COLLAPSE");
  if (rawTargetNearCurrent) warnings.push("TARGET_TOO_CLOSE");
  if (rawTargetNotAboveEntry) warnings.push("TARGET_NOT_ABOVE_ENTRY");
  if (currentNearResistance || rawTargetNearResistance) warnings.push("RESISTANCE_TOO_CLOSE");
  if (supportStopOverlap) warnings.push("SUPPORT_STOP_OVERLAP");
  if (rawTargetNearBreakout) warnings.push("BREAKOUT_TARGET_OVERLAP");
  if (contextSupportInvalidForLong) warnings.push("SUPPORT_ABOVE_CURRENT");
  if (stopInvalidForLong || invalidationInvalidForLong) warnings.push("INVALID_LONG_STOP");
  if (context.current !== null && (!selectedSupport || !selectedStop)) warnings.push("LONG_STOP_RECHECK_REQUIRED");

  const effectiveStopValue = selectedStop?.value ?? stopValue;
  const effectiveInvalidationValue = selectedInvalidation?.value ?? invalidationValue;
  const validTarget = allTargets.find((candidate) => {
    if (baseline !== null && candidate.value <= baseline * 1.0075) return false;
    if (sameDisplayRoleZone(candidate.value, context.current)) return false;
    if (sameDisplayRoleZone(candidate.value, context.resistance)) return false;
    if (sameDisplayRoleZone(candidate.value, context.breakoutLevel)) return false;
    if (sameDisplayRoleZone(candidate.value, effectiveStopValue)) return false;
    if (sameDisplayRoleZone(candidate.value, effectiveInvalidationValue)) return false;
    return true;
  });
  const targetStatus = validTarget
    ? (warnings.includes("PRICE_ROLE_COLLAPSE") ? "1차 목표 근접 / 다음 목표 사용" : safeText(context.targetStatus || context.targetGapLabel, validTarget.text))
    : targetStatusForPriceRoles(context, warnings);
  const supportStatus = contextSupportInvalidForLong ? "현재가보다 낮은 지지 재확인 필요" : undefined;
  const stopStatus = selectedStop
    ? (supportStopOverlap ? "주요 지지와 손절 기준이 같은 가격대입니다." : undefined)
    : "현재가보다 낮은 손절 기준 확인 필요";
  const invalidationStatus = selectedInvalidation
    ? (supportStopOverlap ? "주요 지지와 무효화 기준이 겹칠 수 있습니다." : undefined)
    : "무효화 기준 재확인 필요";

  return {
    priceRoles: {
      currentPrice: displayPrice(context.currentText, context.current, context.currentLocation),
      mainSupport: selectedSupport
        ? displayPrice(selectedSupport.text, selectedSupport.value, supportStatus)
        : displayPrice("현재가 기준 지지 재확인 필요", null, supportStatus),
      ...(selectedSecondarySupport
        ? { secondarySupport: displayPrice(selectedSecondarySupport.text, selectedSecondarySupport.value) }
        : {}),
      mainResistance: displayPrice(context.resistanceText, context.resistance, currentNearResistance ? "현재가와 가까운 저항권입니다." : undefined),
      breakoutLevel: displayPrice(context.breakoutLevelText, context.breakoutLevel),
      stopLoss: selectedStop
        ? displayPrice(selectedStop.text, selectedStop.value, stopStatus)
        : displayPrice("손절 기준 재산정 필요", null, stopStatus),
      invalidation: selectedInvalidation
        ? displayPrice(selectedInvalidation.text, selectedInvalidation.value, invalidationStatus)
        : displayPrice("무효화 기준 재확인 필요", null, invalidationStatus),
      target: validTarget
        ? displayPrice(validTarget.text, validTarget.value, targetStatus)
        : displayPrice(targetStatus, null, targetStatus),
      targetStatus,
    },
    warnings: Array.from(new Set(warnings)),
  };
}

const BREAKOUT_PRICE_TOLERANCE = 0.005;

function priceDiffRatio(a: number | null, b: number | null) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return (a - b) / Math.abs(b);
}

function priceAboveByTolerance(current: number | null, level: number | null, tolerance = BREAKOUT_PRICE_TOLERANCE) {
  const ratio = priceDiffRatio(current, level);
  return ratio !== null && ratio > tolerance;
}

function priceBelowByTolerance(current: number | null, level: number | null, tolerance = BREAKOUT_PRICE_TOLERANCE) {
  const ratio = priceDiffRatio(current, level);
  return ratio !== null && ratio < -tolerance;
}

function priceWithinTolerance(current: number | null, level: number | null, tolerance = BREAKOUT_PRICE_TOLERANCE) {
  const ratio = priceDiffRatio(current, level);
  return ratio !== null && Math.abs(ratio) <= tolerance;
}

function breakoutLevelValue(context: PriceContext) {
  return context.breakoutLevel ?? context.pivot ?? context.resistance;
}

function reportEvidenceText(report: TradingReport) {
  const confirmedIndicators = report.indicatorAnalysis?.confirmed ?? [];
  const unavailableIndicators = report.indicatorAnalysis?.unavailable ?? [];
  const parts: unknown[] = [
    report.finalSummary?.title,
    report.finalSummary?.oneLineConclusion,
    report.finalSummary?.reason,
    report.scoreSummary?.explanation,
    ...(report.marketContext?.chartRegimeReasons ?? []),
    ...(report.evidence?.positive ?? []),
    ...(report.evidence?.negative ?? []),
    ...(report.evidence?.riskFactors ?? []),
    report.scoreSummary?.entryScores?.currentEntry?.explanation,
    report.scoreSummary?.entryScores?.pullbackEntry?.explanation,
    report.scoreSummary?.entryScores?.breakoutEntry?.explanation,
    ...confirmedIndicators.map((item) => `${safeText(item.name, "")} ${safeText(item.explanation, "")} ${safeText(item.signal, "")}`),
    ...unavailableIndicators.map((item) => `${safeText(item.name, "")} ${safeText(item.reason, "")}`),
  ];
  return parts.map((item) => safeText(item, "")).filter(Boolean).join(" ");
}

function deriveBreakoutState(report: TradingReport, context: PriceContext): ReportDecisionBreakoutState {
  const current = context.current;
  const breakoutLevel = breakoutLevelValue(context);
  if (current === null || breakoutLevel === null) return "none";

  const evidence = reportEvidenceText(report);
  const failedBreakoutEvidence = /돌파\s*(실패|무효|재이탈|이탈)|재이탈|failed breakout|breakout failed|lost breakout|failed reclaim|reclaim failed/i.test(evidence);
  const retestEvidence = /재지지|안착|지지 전환|돌파.*유지|위에서\s*(버티|유지)|retest confirmed|hold above|held above|above pivot/i.test(evidence);
  const supportActsAsBreakoutLevel =
    context.support !== null &&
    Math.abs((context.support - breakoutLevel) / Math.max(Math.abs(breakoutLevel), 1)) <= 0.012 &&
    current >= context.support;

  if (context.breakoutRetestConfirmed) return "breakout_retest_confirmed";
  if (failedBreakoutEvidence && priceBelowByTolerance(current, breakoutLevel)) return "failed_breakout";
  if (priceAboveByTolerance(current, breakoutLevel)) {
    return retestEvidence || supportActsAsBreakoutLevel ? "breakout_retest_confirmed" : "breakout_confirmed";
  }
  if (priceWithinTolerance(current, breakoutLevel)) return "breakout_attempt";
  if (priceBelowByTolerance(current, breakoutLevel)) return "breakout_wait";
  return "none";
}

function hasUsableDecisionStop(report: TradingReport, context: PriceContext) {
  const stopText = firstText(
    [
      report.tradePlan.stopLossByEntry?.currentEntry?.priceZone,
      report.tradePlan.stopLossByEntry?.currentEntry?.condition,
      report.tradePlan.stopLossByEntry?.breakoutEntry?.priceZone,
      report.tradePlan.stopLossByEntry?.breakoutEntry?.condition,
      report.tradePlan.stopLoss.shortTerm?.priceZone,
      report.tradePlan.stopLoss.priceZone,
      context.supportText,
    ],
    "",
  );
  return Boolean(stopText && stopText !== FALLBACK.unknown && !/확인 필요|미확인|추정 불가/.test(stopText));
}

function hasValidForwardTarget(context: PriceContext) {
  return Boolean(
    context.target !== null &&
    !context.targetRoleCollapsed &&
    context.targetGapLabel !== "목표 여유 낮음" &&
    !samePriceZone(context.target, context.current) &&
    !samePriceZone(context.target, context.resistance),
  );
}

function extractRsiValue(report: TradingReport, indicators: IndicatorRow[] = []) {
  const fromIndicators = indicators.find((row) => /rsi/i.test(row.name));
  const parsedFromIndicator = parsePriceFromText(fromIndicators?.value);
  if (parsedFromIndicator !== null) return parsedFromIndicator;
  const text = reportEvidenceText(report);
  const match = text.match(/\bRSI\b[^\d]{0,16}((?:\d{1,2}|100)(?:\.\d+)?)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

const LEVERAGED_RISK_SYMBOLS: Record<string, { leverageFactor: 2 | 3; reason: string }> = {
  SOXL: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  KORU: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  TQQQ: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  SQQQ: { leverageFactor: 3, reason: "3배 인버스 ETF" },
  FNGU: { leverageFactor: 3, reason: "고변동성 레버리지 ETN" },
  LABU: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  SPXL: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  TECL: { leverageFactor: 3, reason: "3배 레버리지 ETF" },
  UVXY: { leverageFactor: 2, reason: "변동성 연동 고위험 ETF" },
};

function collectIdentityText(rawReport: AnalysisResponse, report: TradingReport) {
  const rawAny = rawReport as AnalysisResponse & Record<string, unknown>;
  const symbolDetection = rawReport.aiAnalysis?.symbolDetection as Record<string, unknown> | undefined;
  const rawTradingReport = rawAny.tradingReport as Record<string, unknown> | undefined;
  const rawAnalysisMeta = (rawTradingReport?.analysisMeta || rawAny.analysisMeta) as Record<string, unknown> | undefined;
  return [
    symbolDetection?.detectedTicker,
    symbolDetection?.ticker,
    symbolDetection?.symbol,
    symbolDetection?.detectedName,
    symbolDetection?.companyName,
    rawAnalysisMeta?.symbol,
    rawAnalysisMeta?.companyName,
    report.analysisMeta?.symbol,
    rawAny.symbol,
    rawAny.ticker,
    rawAny.stockSymbol,
  ]
    .map((value) => safeText(value, ""))
    .filter(Boolean)
    .join(" ");
}

function deriveInstrumentRiskProfile(rawReport: AnalysisResponse, report: TradingReport): InstrumentRiskProfile {
  const identityText = collectIdentityText(rawReport, report);
  const directSymbol = getRawIdentityCandidates(rawReport, report).map(extractDisplaySymbol).find(Boolean);
  const symbol =
    directSymbol ||
    Object.keys(LEVERAGED_RISK_SYMBOLS).find((ticker) => new RegExp(`\\b${ticker}\\b`, "i").test(identityText)) ||
    "";
  const leveraged = symbol ? LEVERAGED_RISK_SYMBOLS[symbol.toUpperCase()] : undefined;
  if (leveraged) {
    return {
      symbol: symbol.toUpperCase(),
      isLeveraged: true,
      leverageFactor: leveraged.leverageFactor,
      volatilityRisk: "high",
      reason: leveraged.reason,
    };
  }
  const etfLike = /\b(ETF|ETN|3X|2X|inverse|leveraged|ultra|bear|bull)\b/i.test(identityText);
  return {
    symbol: symbol ? symbol.toUpperCase() : "",
    isLeveraged: false,
    leverageFactor: 1,
    volatilityRisk: etfLike ? "elevated" : "normal",
    ...(etfLike ? { reason: "ETF/ETN 성격의 변동성 확인 필요" } : {}),
  };
}

function hasPattern(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function deriveCandleRiskProfile(
  report: TradingReport,
  context: PriceContext,
  indicators: IndicatorRow[] = [],
): CandleRiskProfile {
  const evidence = reportEvidenceText(report);
  const rsi = extractRsiValue(report, indicators);
  const lowerEvidence = evidence.toLowerCase();
  const largeBearishCandle = hasPattern(
    evidence,
    /장대음봉|긴 음봉|대형 음봉|강한 매도|매도 압력|급락|폭락|sharp drop|large bearish|selloff|panic|bearish candle/i,
  );
  const highVolumeDrop = hasPattern(
    evidence,
    /거래량[^.]{0,20}(급증|증가|확대|동반)[^.]{0,20}(하락|매도|음봉|급락)|volume[^.]{0,20}(spike|surge|heavy|high)[^.]{0,20}(drop|sell|bear|red)/i,
  );
  const sharpDrop = largeBearishCandle || hasPattern(evidence, /낙폭|하락폭|급락 후|support shock|gap down|breakdown pressure/i);
  const extendedContext = Boolean(report.marketContext?.isExtendedMove) || context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge";
  const parabolicAdvance =
    extendedContext ||
    hasPattern(evidence, /급등|수직 상승|과열|단기 과열|급등 후|parabolic|vertical|overextended|extended surge|blowoff/i) ||
    (rsi !== null && rsi >= 76 && hasPattern(lowerEvidence, /momentum|surge|breakout|extended|overheated|과열|급등/i));
  const firstPullbackAfterSurge =
    parabolicAdvance && hasPattern(evidence, /첫 조정|초기 눌림|pullback after surge|first pullback|조정 진입|눌림/i);
  const referenceHigh = [context.resistance, context.target]
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? null;
  const dropFromReference = context.current !== null && referenceHigh !== null && referenceHigh > context.current
    ? ((referenceHigh - context.current) / Math.max(Math.abs(referenceHigh), 1)) * 100
    : null;
  const peakToCurrentDropRisk =
    dropFromReference !== null && dropFromReference >= 15
      ? "high"
      : dropFromReference !== null && dropFromReference >= 8
        ? "medium"
        : "low";
  const supportPressure =
    context.support !== null &&
    context.current !== null &&
    Math.abs((context.current - context.support) / Math.max(Math.abs(context.current), 1)) <= 0.035;
  const explicitTrendDamage = hasPattern(evidence, /지지 이탈|추세 훼손|하락 전환|support breakdown|lost support|trend damage/i);
  const supportIntactEvidence = hasPattern(evidence, /지지 유지|지지 방어|support holding|support intact|held support/i);
  const trendDamageRisk =
    context.chartRegime === "support_breakdown" ||
    context.chartRegime === "downtrend" ||
    (explicitTrendDamage && !supportIntactEvidence)
      ? "high"
      : sharpDrop || highVolumeDrop || (supportPressure && peakToCurrentDropRisk !== "low")
        ? "medium"
        : "low";

  return {
    largeBearishCandle,
    sharpDrop,
    highVolumeDrop,
    peakToCurrentDropRisk,
    parabolicAdvance,
    firstPullbackAfterSurge,
    trendDamageRisk,
  };
}

function deriveTargetProfile(context: PriceContext, report: TradingReport): TargetProfile {
  const candidateValues = uniquePriceCandidates([
    context.targetText,
    context.extensionTargetText,
    context.resistanceText,
    report.tradePlan.targets.firstTarget?.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.secondTarget?.priceZone,
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    ...(report.priceRoles?.targets?.holderTargets ?? []),
    ...(report.analysisMeta?.mainResistances ?? []),
    ...(report.keyLevels.resistances ?? []).map((item) => item.priceZone),
  ])
    .filter((candidate) => context.current === null || candidate.value > context.current * 1.0075)
    .sort((a, b) => a.value - b.value);

  const first = candidateValues[0]?.value ?? null;
  const extension = candidateValues.find((candidate) => first !== null && candidate.value > first * 1.16)?.value ?? (first === null ? candidateValues[0]?.value ?? null : candidateValues[1]?.value ?? null);
  const targetGap = percentGap(context.current, first);
  const hasCollapsedTarget = context.targetRoleCollapsed || samePriceZone(context.target, context.current) || samePriceZone(context.target, context.resistance);
  const onlyFarExtension =
    first !== null &&
    context.current !== null &&
    targetGap !== null &&
    targetGap >= 24 &&
    candidateValues.length === 1;
  const targetQuality: TargetProfile["targetQuality"] = hasCollapsedTarget || (targetGap !== null && targetGap <= 1.8)
    ? "close"
    : first === null
      ? "uncertain"
      : onlyFarExtension
        ? "extended"
        : "clear";
  const targetNote =
    targetQuality === "clear"
      ? "1차 목표가 비교적 명확합니다."
      : targetQuality === "close"
        ? "1차 목표가 현재가와 가까워 목표 여유 확인이 필요합니다."
        : targetQuality === "extended"
          ? "가까운 1차 목표보다 확장 목표 성격이 강합니다."
          : "상단 목표 확인이 더 필요합니다.";

  return {
    firstTarget: onlyFarExtension ? null : first,
    extensionTarget: extension,
    targetQuality,
    targetNote,
  };
}

function deriveRefinedRegime(
  report: TradingReport,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
  instrumentRisk: InstrumentRiskProfile,
  candleRisk: CandleRiskProfile,
  targetProfile: TargetProfile,
): ReportDecisionRefinedRegime {
  const riskScore = safeScore(report.scoreSummary?.riskScore) ?? 50;
  const evidence = reportEvidenceText(report);
  const uptrendEvidence = /상승추세|상승 흐름|추세 유지|strong uptrend|uptrend|higher low|support intact/i.test(evidence);
  const supportPressure =
    context.current !== null &&
    context.support !== null &&
    Math.abs((context.current - context.support) / Math.max(Math.abs(context.current), 1)) <= 0.035;

  if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || riskScore >= 75) {
    return "trend_damage_warning";
  }
  if (breakoutState === "failed_breakout") return "failed_breakout";
  if (breakoutState === "breakout_confirmed" || breakoutState === "breakout_retest_confirmed") return "confirmed_breakout";
  if (instrumentRisk.isLeveraged && (candleRisk.largeBearishCandle || candleRisk.sharpDrop || candleRisk.highVolumeDrop) && supportPressure) {
    return "support_shock_test";
  }
  if (candleRisk.largeBearishCandle || candleRisk.sharpDrop) return "sharp_pullback";
  if (candleRisk.parabolicAdvance && targetProfile.targetQuality !== "clear") return "parabolic_risk";
  if (candleRisk.parabolicAdvance || candleRisk.firstPullbackAfterSurge) return "overheated_pullback";
  if (
    (
      context.chartRegime === "uptrend_pullback" ||
      context.chartRegime === "uptrend_consolidation" ||
      context.chartRegime === "healthy_pullback" ||
      ((context.chartRegime === "range_lower_support" || context.chartRegime === "sideways") && uptrendEvidence)
    ) &&
    context.support !== null &&
    targetProfile.targetQuality !== "uncertain" &&
    riskScore < 68
  ) {
    return "healthy_uptrend_pullback";
  }
  if (breakoutState === "breakout_attempt" || context.chartRegime === "breakout_wait") return "normal_breakout_attempt";
  return "existing_regime";
}

function deriveTrendOpportunity(
  report: TradingReport,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
  indicators: IndicatorRow[] = [],
): ReportDecisionTrendOpportunity {
  const riskScore = safeScore(report.scoreSummary?.riskScore) ?? 50;
  const currentEntryScore = safeScore(report.scoreSummary?.entryScores?.currentEntry?.score) ?? 0;
  const breakoutEntryScore = safeScore(report.scoreSummary?.entryScores?.breakoutEntry?.score) ?? 0;
  const rsi = extractRsiValue(report, indicators);
  const evidence = reportEvidenceText(report);
  const bullishEvidence = /상승|우상향|추세 유지|추세 지속|모멘텀|MACD|거래량.*(증가|확인|우호)|이동평균.*(위|지지)|cloud.*above|bullish|momentum|higher low|higher high|breakout/i.test(evidence);
  const scoreSupportedBreakoutAttempt = breakoutEntryScore >= 55 && currentEntryScore >= 35;
  const controlReady = Boolean(
    (hasUsableDecisionStop(report, context) || context.support !== null) &&
    context.target !== null &&
    !context.targetRoleCollapsed &&
    context.targetGapLabel !== "목표 여유 낮음",
  );
  const supportiveRegime =
    context.chartRegime === "uptrend_pullback" ||
    context.chartRegime === "uptrend_consolidation" ||
    context.chartRegime === "healthy_pullback" ||
    context.chartRegime === "breakout_retest_confirmed";

  if (
    context.chartRegime === "support_breakdown" ||
    context.chartRegime === "downtrend" ||
    breakoutState === "failed_breakout" ||
    riskScore >= 68 ||
    (rsi !== null && rsi >= 78)
  ) {
    return "none";
  }

  if (breakoutState === "breakout_attempt" && controlReady && (bullishEvidence || scoreSupportedBreakoutAttempt)) return "bullish_breakout_attempt";
  if ((breakoutState === "breakout_confirmed" || breakoutState === "breakout_retest_confirmed") && controlReady && bullishEvidence) return "uptrend_continuation";
  if (supportiveRegime && controlReady && bullishEvidence) return "uptrend_continuation";
  if (supportiveRegime && controlReady && currentEntryScore >= 45) return "controlled_uptrend_entry";
  return "none";
}

function finalActionTone(
  report: TradingReport,
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
): ReportDecisionTone {
  const actionState = getActionState(report);
  if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || actionState === "HIGH_RISK" || actionState === "AVOID") {
    return "risk";
  }
  if (breakoutState === "failed_breakout") return "caution";
  if (breakoutState === "breakout_retest_confirmed") return context.targetGapLabel === "목표 여유 낮음" ? "caution" : "buy";
  if (breakoutState === "breakout_confirmed" || trendOpportunity !== "none") return context.targetGapLabel === "목표 여유 낮음" ? "caution" : "watch";
  if (
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.chartRegime === "downtrend_rebound" ||
    context.chartRegime === "overheated_breakout" ||
    context.chartRegime === "overextended_surge" ||
    context.targetGapLabel === "목표 여유 낮음" ||
    isCautionFinalAction(finalAction, report)
  ) {
    return "caution";
  }
  if (actionState === "STRONG_BUY" || context.chartRegime === "breakout_retest_confirmed") return "buy";
  if (
    actionState === "CURRENT_PARTIAL_ENTRY" ||
    actionState === "CURRENT_STARTER_POSITION" ||
    actionState === "MOMENTUM_CONTINUATION_ENTRY" ||
    actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY" ||
    actionState === "PULLBACK_ENTRY" ||
    actionState === "BREAKOUT_WAIT"
  ) {
    return "watch";
  }
  return "neutral";
}

function entryStrategyDecision(
  mode: EntryStrategyDecision["mode"],
  card: EntryModeCard,
  context: PriceContext,
): EntryStrategyDecision {
  const futureSetup =
    (mode === "pullback" && (context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound")) ||
    /미래|대기|확인/.test(`${card.label} ${card.condition}`);

  return {
    mode,
    score: card.score,
    label: safeText(card.label, FALLBACK.needsCheck),
    condition: safeText(card.condition, FALLBACK.needsCheck),
    stop: safeText(card.stopLoss, FALLBACK.noStop),
    target: safeText(card.target, context.targetStatus || FALLBACK.needsCheck),
    riskReward: safeText(card.riskReward, FALLBACK.needsCheck),
    explanation: safeText(card.explanation, FALLBACK.needsCheck),
    tone: card.tone,
    isFutureSetup: futureSetup,
  };
}

function scoreInDisplayRange(score: number | null, min: number, max: number) {
  const safe = safeScore(score);
  const seeded = safe === null ? min : safe;
  return Math.max(min, Math.min(max, seeded));
}

function capDisplayScore(score: number | null, max: number) {
  const safe = safeScore(score);
  return safe === null ? null : Math.min(safe, max);
}

function patchEntryStrategy(
  entry: EntryStrategyDecision,
  patch: Partial<Omit<EntryStrategyDecision, "mode">>,
): EntryStrategyDecision {
  const label = safeText(patch.label, entry.label);
  return {
    ...entry,
    ...patch,
    score: patch.score !== undefined ? safeScore(patch.score) : entry.score,
    label,
    condition: safeText(patch.condition, entry.condition),
    stop: safeText(patch.stop, entry.stop),
    target: safeText(patch.target, entry.target),
    riskReward: safeText(patch.riskReward, entry.riskReward),
    explanation: safeText(patch.explanation, entry.explanation),
    tone: patch.tone ?? entryTone(label),
    isFutureSetup: patch.isFutureSetup ?? entry.isFutureSetup,
  };
}

function calibrateReportDecisionEntries(
  entries: ReportDecision["entryStrategies"],
  report: TradingReport,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
  tone: ReportDecisionTone,
): ReportDecision["entryStrategies"] {
  const hasDisplayStop = hasUsableDecisionStop(report, context) || context.support !== null;
  const hasDisplayTarget = Boolean(context.target !== null && !context.targetRoleCollapsed && context.targetGapLabel !== "목표 여유 낮음");
  const canRaise = tone !== "risk" && hasDisplayStop && hasDisplayTarget;
  const breakoutLevelText = context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText;
  const targetText = context.targetGapLabel === "목표 여유 낮음"
    ? safeText(context.targetStatus || context.targetGapLabel, "목표 여유 낮음")
    : safeText(context.targetText, "추가 목표 확인 필요");
  let current = entries.current;
  let pullback = entries.pullback;
  let breakout = entries.breakout;

  if (context.chartRegime === "support_breakdown" || tone === "risk") {
    current = patchEntryStrategy(current, {
      score: capDisplayScore(current.score, 30),
      label: "신규 진입 보류",
      condition: "지지 회복 확인 전 신규 진입 보류",
      target: targetText,
      explanation: "주요 지지 이탈 또는 고위험 구간에서는 현재가 진입보다 위험 관리가 우선입니다.",
      tone: "risk",
      isFutureSetup: true,
    });
    breakout = patchEntryStrategy(breakout, {
      score: capDisplayScore(breakout.score, 45),
      label: "돌파 재확인 필요",
      condition: `${breakoutLevelText} 회복 후 재지지 확인`,
      target: targetText,
      explanation: "지지 이탈 이후에는 회복 돌파와 재지지 확인 전까지 공격적 진입을 제한합니다.",
      tone: "risk",
      isFutureSetup: true,
    });
    return { current, pullback, breakout };
  }

  if (breakoutState === "failed_breakout") {
    current = patchEntryStrategy(current, {
      score: capDisplayScore(current.score, 35),
      label: "진입 신중",
      condition: "돌파 실패 후 지지 회복 확인 전 대기",
      explanation: "돌파 실패 가능성이 있어 현재가 진입은 지지 회복 확인 전까지 신중해야 합니다.",
      tone: "caution",
      isFutureSetup: true,
    });
    breakout = patchEntryStrategy(breakout, {
      score: capDisplayScore(breakout.score, 45),
      label: "돌파 실패 주의",
      condition: `${breakoutLevelText} 재회복 후 안착 확인`,
      explanation: "돌파 가격을 다시 회복하고 위에서 버티는지 확인해야 합니다.",
      tone: "caution",
      isFutureSetup: true,
    });
    return { current, pullback, breakout };
  }

  if (!canRaise && breakoutState !== "breakout_attempt" && trendOpportunity !== "bullish_breakout_attempt") {
    return { current, pullback, breakout };
  }

  if (breakoutState === "breakout_retest_confirmed") {
    current = patchEntryStrategy(current, {
      score: scoreInDisplayRange(current.score, 60, 75),
      label: "현재가 조건부",
      condition: `${breakoutLevelText} 위 재지지 유지 시 조건부 접근`,
      target: targetText,
      explanation: "돌파 가격 위 재지지가 확인된 경우 현재가 접근도 짧은 손절 전제로 검토할 수 있습니다.",
      tone: "positive",
      isFutureSetup: false,
    });
    pullback = patchEntryStrategy(pullback, {
      score: scoreInDisplayRange(pullback.score, 65, 80),
      label: "재지지 관심",
      condition: `${breakoutLevelText} 재지지 확인 시 분할 접근`,
      target: targetText,
      explanation: "돌파 가격이 지지로 전환되는 흐름이 유지되는지 확인합니다.",
      tone: "positive",
      isFutureSetup: false,
    });
    breakout = patchEntryStrategy(breakout, {
      score: scoreInDisplayRange(breakout.score, 75, 90),
      label: "돌파 후 재지지",
      condition: `${breakoutLevelText} 위 재지지 확인 후 진입 후보`,
      stop: stopConditionFromZone(breakoutLevelText, "재이탈 시 돌파 실패"),
      target: targetText,
      explanation: "돌파 후 재지지가 확인되어 돌파 진입 점수를 우선 표시합니다.",
      tone: "positive",
      isFutureSetup: false,
    });
  } else if (breakoutState === "breakout_confirmed") {
    current = patchEntryStrategy(current, {
      score: scoreInDisplayRange(current.score, 55, 70),
      label: "조건부 진입",
      condition: `${breakoutLevelText} 위 안착 유지 시 일부 접근`,
      target: targetText,
      explanation: "돌파 이후라 돌파 확인 대기보다 안착 유지와 손절 기준 확인이 핵심입니다.",
      tone: "positive",
      isFutureSetup: false,
    });
    breakout = patchEntryStrategy(breakout, {
      score: scoreInDisplayRange(breakout.score, 70, 85),
      label: "돌파 성공",
      condition: `${breakoutLevelText} 위 안착 확인`,
      stop: stopConditionFromZone(breakoutLevelText, "재이탈 시 돌파 실패"),
      target: targetText,
      explanation: "현재가가 돌파 기준 위에 있어 다음 저항까지 안착 유지 여부를 봅니다.",
      tone: "positive",
      isFutureSetup: false,
    });
  } else if (trendOpportunity === "bullish_breakout_attempt") {
    current = patchEntryStrategy(current, {
      score: scoreInDisplayRange(current.score, 45, 65),
      label: "소액 가능",
      condition: `${breakoutLevelText} 안착 실패 시 빠른 손절 전제`,
      target: targetText,
      explanation: "저항 돌파 시도 구간이므로 전량 진입보다 소액과 짧은 손절이 필요합니다.",
      tone: "caution",
      isFutureSetup: false,
    });
    breakout = patchEntryStrategy(breakout, {
      score: scoreInDisplayRange(breakout.score, 65, 80),
      label: "안착 확인",
      condition: `${breakoutLevelText} 돌파 후 위에서 버티면 진입 후보`,
      target: targetText,
      explanation: "모멘텀이 동반된 돌파 시도라 돌파 후 안착 확인을 우선 표시합니다.",
      tone: "positive",
      isFutureSetup: false,
    });
  } else if (trendOpportunity === "uptrend_continuation" || trendOpportunity === "controlled_uptrend_entry") {
    current = patchEntryStrategy(current, {
      score: scoreInDisplayRange(current.score, 50, 70),
      label: trendOpportunity === "controlled_uptrend_entry" ? "분할 가능" : "추세 우위",
      condition: "현재가 일부 접근 후 지지 이탈 시 빠른 대응",
      target: targetText,
      explanation: "추세와 지지 구조가 유지되는 동안 일부 분할 접근을 검토할 수 있습니다.",
      tone: "positive",
      isFutureSetup: false,
    });
    pullback = patchEntryStrategy(pullback, {
      score: scoreInDisplayRange(pullback.score, 60, 80),
      label: "눌림 관심",
      condition: `${context.supportText} 지지 반응 확인 시 추가 접근`,
      target: targetText,
      explanation: "추세 유지 중에는 눌림 지지 반응이 추가 진입 기준입니다.",
      tone: "positive",
      isFutureSetup: false,
    });
    breakout = patchEntryStrategy(breakout, {
      score: scoreInDisplayRange(breakout.score, 55, 75),
      label: "돌파 확인",
      condition: `${breakoutLevelText} 위 안착 확인`,
      target: targetText,
      explanation: "추세 지속 중에도 돌파 기준 위 안착 여부를 함께 확인합니다.",
      tone: "positive",
      isFutureSetup: false,
    });
  }

  return { current, pullback, breakout };
}

type ScoreBand = {
  overall: [number, number];
  current: [number, number];
  pullback: [number, number];
  breakout: [number, number];
};

const SCORE_BANDS: Record<ReportDecisionRefinedRegime, ScoreBand> = {
  healthy_uptrend_pullback: { overall: [60, 72], current: [50, 62], pullback: [60, 75], breakout: [55, 70] },
  overheated_pullback: { overall: [52, 65], current: [40, 55], pullback: [55, 68], breakout: [45, 62] },
  sharp_pullback: { overall: [38, 55], current: [25, 42], pullback: [40, 58], breakout: [35, 52] },
  trend_damage_warning: { overall: [25, 45], current: [10, 30], pullback: [25, 45], breakout: [20, 40] },
  support_shock_test: { overall: [35, 52], current: [20, 38], pullback: [35, 55], breakout: [30, 50] },
  parabolic_risk: { overall: [45, 62], current: [35, 50], pullback: [45, 62], breakout: [45, 60] },
  normal_breakout_attempt: { overall: [52, 66], current: [40, 55], pullback: [48, 62], breakout: [58, 75] },
  confirmed_breakout: { overall: [65, 80], current: [55, 72], pullback: [60, 78], breakout: [70, 88] },
  failed_breakout: { overall: [30, 48], current: [15, 35], pullback: [25, 45], breakout: [20, 45] },
  existing_regime: { overall: [0, 100], current: [0, 100], pullback: [0, 100], breakout: [0, 100] },
};

function bandMidpoint([min, max]: [number, number]) {
  return Math.round((min + max) / 2);
}

function scoreInBand(score: number | null, band: [number, number], fallback = bandMidpoint(band)) {
  const value = safeScore(score ?? fallback) ?? fallback;
  return Math.max(band[0], Math.min(band[1], value));
}

function targetQualityPenalty(targetProfile: TargetProfile) {
  if (targetProfile.targetQuality === "clear") return 0;
  if (targetProfile.targetQuality === "close") return -8;
  if (targetProfile.targetQuality === "extended") return -6;
  return -10;
}

function refinedEvidenceModifier(
  report: TradingReport,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
  instrumentRisk: InstrumentRiskProfile,
  candleRisk: CandleRiskProfile,
  targetProfile: TargetProfile,
) {
  let modifier = 0;
  if (hasUsableDecisionStop(report, context) && context.support !== null) modifier += 4;
  if (targetProfile.targetQuality === "clear") modifier += 4;
  if (breakoutState === "breakout_confirmed") modifier += 6;
  if (breakoutState === "breakout_retest_confirmed") modifier += 8;
  if ((volumeDisplayScore(report) ?? 0) >= 64) modifier += 3;
  if (instrumentRisk.isLeveraged && !candleRisk.sharpDrop && !candleRisk.largeBearishCandle) modifier -= 2;
  if (instrumentRisk.isLeveraged && (candleRisk.sharpDrop || candleRisk.largeBearishCandle || candleRisk.highVolumeDrop)) modifier -= 10;
  if (candleRisk.largeBearishCandle) modifier -= 7;
  if (candleRisk.highVolumeDrop) modifier -= 5;
  if (candleRisk.trendDamageRisk === "high") modifier -= 10;
  if (candleRisk.trendDamageRisk === "medium") modifier -= 4;
  modifier += targetQualityPenalty(targetProfile);
  return modifier;
}

function refinedEntryLabels(regime: ReportDecisionRefinedRegime) {
  switch (regime) {
    case "healthy_uptrend_pullback":
      return {
        current: "조건부 분할",
        pullback: "지지 확인",
        breakout: "돌파 확인",
        currentExplanation: "상승추세 눌림 구간이지만 지지 반응과 손절 기준 확인을 전제로 분할 접근만 검토합니다.",
        pullbackExplanation: "주요 지지 반응이 확인될 때 눌림목 진입 후보로 해석합니다.",
      };
    case "overheated_pullback":
      return {
        current: "비중 제한",
        pullback: "지지 확인",
        breakout: "재지지 확인",
        currentExplanation: "과열 후 조정 성격이 있어 즉시 비중 확대보다 지지 확인과 비중 제한이 우선입니다.",
        pullbackExplanation: "과열을 식히는 눌림에서 지지 반응이 확인될 때만 조건부로 봅니다.",
      };
    case "sharp_pullback":
      return {
        current: "신규 진입 신중",
        pullback: "반등 확인",
        breakout: "회복 확인",
        currentExplanation: "급락성 흔들림이 있어 현재가 매수보다 지지 확인과 반등 지속 여부를 먼저 봅니다.",
        pullbackExplanation: "낙폭 이후 지지선에서 반등이 유지되는지 확인해야 합니다.",
      };
    case "support_shock_test":
      return {
        current: "지지 테스트",
        pullback: "반등 확인",
        breakout: "회복 확인",
        currentExplanation: "레버리지/고변동 상품의 급락 후 지지 테스트 구간으로 현재가 진입은 보수적으로 봅니다.",
        pullbackExplanation: "지지선 방어와 거래량 안정이 확인될 때만 반등 후보로 해석합니다.",
      };
    case "trend_damage_warning":
      return {
        current: "신규 진입 보류",
        pullback: "위험 관리",
        breakout: "추세 회복 확인",
        currentExplanation: "추세 훼손 또는 지지 이탈 위험이 있어 신규 진입보다 위험 관리가 우선입니다.",
        pullbackExplanation: "지지 회복과 추세 안정이 확인되기 전까지 눌림목으로 보기 어렵습니다.",
      };
    case "parabolic_risk":
      return {
        current: "추격 주의",
        pullback: "눌림 확인",
        breakout: "목표 확인",
        currentExplanation: "급등 후 조정 구간은 추격보다 1차 목표와 지지 확인을 우선합니다.",
        pullbackExplanation: "상승 과열이 완화된 뒤 지지 반응이 확인될 때만 조건부로 봅니다.",
      };
    case "normal_breakout_attempt":
      return {
        current: "안착 확인",
        pullback: "지지 확인",
        breakout: "돌파 확인",
        currentExplanation: "돌파 시도 구간으로 즉시 진입보다 안착 여부 확인이 우선입니다.",
        pullbackExplanation: "돌파 실패 시 되돌림 지지 여부를 확인해야 합니다.",
      };
    case "confirmed_breakout":
      return {
        current: "조건부 진입",
        pullback: "재지지 확인",
        breakout: "돌파 재지지",
        currentExplanation: "돌파 이후 안착이 확인된 구간으로 손절 기준을 두고 조건부 접근을 검토합니다.",
        pullbackExplanation: "돌파 가격의 재지지가 유지되는지 확인합니다.",
      };
    default:
      return null;
  }
}

function calibrateScoresByRefinedRegime(
  entries: ReportDecision["entryStrategies"],
  report: TradingReport,
  context: PriceContext,
  refinedRegime: ReportDecisionRefinedRegime,
  breakoutState: ReportDecisionBreakoutState,
  instrumentRisk: InstrumentRiskProfile,
  candleRisk: CandleRiskProfile,
  targetProfile: TargetProfile,
): { entryStrategies: ReportDecision["entryStrategies"]; scoreWarnings: string[]; overallSeed: number | null } {
  const band = SCORE_BANDS[refinedRegime] ?? SCORE_BANDS.existing_regime;
  const warnings: string[] = refinedRegime === "existing_regime" ? [] : ["SCORE_BANDED_BY_REFINED_REGIME"];
  const modifier = refinedEvidenceModifier(report, context, breakoutState, instrumentRisk, candleRisk, targetProfile);
  const labels = refinedEntryLabels(refinedRegime);
  const targetText = targetProfile.targetQuality === "clear" && targetProfile.firstTarget !== null
    ? `${formatPrice(targetProfile.firstTarget)} 부근`
    : targetProfile.targetNote;

  let current = patchEntryStrategy(entries.current, {
    score: scoreInBand((entries.current.score ?? bandMidpoint(band.current)) + modifier, band.current),
    ...(labels ? { label: labels.current, explanation: labels.currentExplanation, target: targetText, isFutureSetup: refinedRegime !== "healthy_uptrend_pullback" && refinedRegime !== "confirmed_breakout" } : {}),
  });
  let pullback = patchEntryStrategy(entries.pullback, {
    score: scoreInBand((entries.pullback.score ?? bandMidpoint(band.pullback)) + modifier, band.pullback),
    ...(labels ? { label: labels.pullback, explanation: labels.pullbackExplanation, target: targetText } : {}),
  });
  let breakout = patchEntryStrategy(entries.breakout, {
    score: scoreInBand((entries.breakout.score ?? bandMidpoint(band.breakout)) + modifier, band.breakout),
    ...(labels ? { label: labels.breakout, target: targetText } : {}),
  });
  let overallSeed = scoreInBand((safeScore(report.scoreSummary?.totalScore) ?? bandMidpoint(band.overall)) + modifier, band.overall);

  if (instrumentRisk.isLeveraged && (candleRisk.largeBearishCandle || candleRisk.highVolumeDrop)) {
    warnings.push("LEVERAGED_SHARP_DROP_CAP");
    current = patchEntryStrategy(current, { score: capDisplayScore(current.score, 35), label: "신규 진입 신중", tone: "caution", isFutureSetup: true });
    pullback = patchEntryStrategy(pullback, { score: capDisplayScore(pullback.score, 50), label: "반등 확인", tone: "caution" });
    overallSeed = Math.min(overallSeed, 50);
  }

  if (instrumentRisk.isLeveraged && refinedRegime === "healthy_uptrend_pullback") {
    warnings.push("LEVERAGED_HEALTHY_PULLBACK_CAP");
    current = patchEntryStrategy(current, { score: capDisplayScore(current.score, 58) });
    pullback = patchEntryStrategy(pullback, { score: capDisplayScore(pullback.score, 70) });
    overallSeed = Math.min(overallSeed, 65);
  }

  if (instrumentRisk.isLeveraged && refinedRegime === "support_shock_test") {
    warnings.push("SUPPORT_SHOCK_SCORE_CAP");
    current = patchEntryStrategy(current, { score: capDisplayScore(current.score, 38), label: "지지 테스트", tone: "caution", isFutureSetup: true });
    overallSeed = Math.min(overallSeed, 52);
  }

  if (instrumentRisk.isLeveraged && refinedRegime === "trend_damage_warning") {
    warnings.push("LEVERAGED_TREND_DAMAGE_CAP");
    current = patchEntryStrategy(current, { score: capDisplayScore(current.score, 25), label: "신규 진입 보류", tone: "risk", isFutureSetup: true });
    overallSeed = Math.min(overallSeed, 39);
  }

  if (context.chartRegime === "support_breakdown") {
    warnings.push("SUPPORT_BREAKDOWN_CURRENT_CAP");
    current = patchEntryStrategy(current, { score: capDisplayScore(current.score, 25), label: "신규 진입 보류", tone: "risk", isFutureSetup: true });
    overallSeed = Math.min(overallSeed, 39);
  }

  if (targetProfile.targetQuality === "extended") warnings.push("TARGET_EXTENSION_NOT_SCORE_DRIVER");
  if (targetProfile.targetQuality === "uncertain") warnings.push("TARGET_UNCERTAINTY_CAP");
  if (refinedRegime === "parabolic_risk" && targetProfile.targetQuality !== "clear") warnings.push("PARABOLIC_TARGET_UNCERTAINTY");

  return {
    entryStrategies: { current, pullback, breakout },
    scoreWarnings: Array.from(new Set(warnings)),
    overallSeed,
  };
}

function isUsableEntryText(value: unknown) {
  const text = safeText(value, "");
  return Boolean(text && !/확인 필요|미확인|분석 불가|추정 불가|해당 없음|없음|불명확/.test(text));
}

function parseRiskRewardValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = safeText(value, "");
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function modeRiskRewardValue(entry: EntryStrategyDecision, context: PriceContext) {
  const contextValue =
    entry.mode === "current"
      ? context.currentRiskReward
      : entry.mode === "pullback"
        ? context.pullbackRiskReward
        : context.breakoutRiskReward;
  return contextValue ?? parseRiskRewardValue(entry.riskReward);
}

function defaultConfirmationForEntry(
  entry: EntryStrategyDecision,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
) {
  const breakoutLevelText = context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText;
  if (entry.mode === "breakout") {
    if (breakoutState === "breakout_retest_confirmed") return `${breakoutLevelText} 재지지 확인`;
    if (breakoutState === "breakout_confirmed") return `${breakoutLevelText} 위 안착 유지`;
    return `${breakoutLevelText} 돌파 후 안착 확인`;
  }
  if (entry.mode === "pullback") return `${context.supportText} 지지 반응 확인`;
  return `${context.supportText} 지지 유지와 손절 기준 확인`;
}

function entryHasConfirmation(
  entry: EntryStrategyDecision,
  context: PriceContext,
  breakoutState: ReportDecisionBreakoutState,
) {
  const text = `${entry.label} ${entry.condition} ${entry.explanation} ${entry.confirmationCondition ?? ""}`;
  if (/확인|재지지|안착|지지|반응|조건부|유지|돌파/.test(text)) return true;
  if (entry.mode === "breakout" && (breakoutState === "breakout_confirmed" || breakoutState === "breakout_retest_confirmed")) return true;
  if (entry.mode === "pullback" && context.support !== null) return true;
  return false;
}

function entryTargetUsable(entry: EntryStrategyDecision, priceRoles: ReportDecision["priceRoles"]) {
  const text = safeText(entry.target || priceRoles.target?.text, "");
  if (!text) return false;
  if (/목표 여유 낮음|추가 목표 확인 필요|상단 저항 재확인 필요|확인 필요|미확인/.test(text)) return false;
  return true;
}

function entryScenarioWarnings(
  entry: EntryStrategyDecision,
  context: PriceContext,
  priceRoles: ReportDecision["priceRoles"],
  breakoutState: ReportDecisionBreakoutState,
) {
  const warnings: string[] = [];
  if (!isUsableEntryText(entry.condition)) warnings.push("SCENARIO_INCOMPLETE");
  if (!entryHasConfirmation(entry, context, breakoutState)) warnings.push("MISSING_CONFIRMATION");
  if (!hasUsableStopText(entry.stop)) warnings.push("MISSING_INVALIDATION");
  if (!entryTargetUsable(entry, priceRoles)) warnings.push("MISSING_TARGET");
  const rr = modeRiskRewardValue(entry, context);
  if ((rr !== null && rr < 1.1) || /불리|위험이 큼|낮음/.test(entry.riskReward)) warnings.push("LOW_RR_ENTRY");
  if (warnings.length && !warnings.includes("SCENARIO_INCOMPLETE")) warnings.unshift("SCENARIO_INCOMPLETE");
  return Array.from(new Set(warnings));
}

function isOverheatedDecisionState(context: PriceContext) {
  return context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge";
}

function isUpperResistanceDecisionState(context: PriceContext) {
  return (
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.chartRegime === "downtrend_rebound"
  );
}

function entryDisplayScoreCap(
  entry: EntryStrategyDecision,
  context: PriceContext,
  tone: ReportDecisionTone,
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
  priceWarnings: string[],
  isComplete: boolean,
  lowConfidence: boolean,
) {
  let cap = 100;
  if (!isComplete) cap = Math.min(cap, 50);
  if (lowConfidence) cap = Math.min(cap, 45);

  if (isBearishOrRiskDecisionState(context, tone)) {
    if (entry.mode === "current") cap = Math.min(cap, 30);
    if (entry.mode === "pullback") cap = Math.min(cap, 35);
    if (entry.mode === "breakout") cap = Math.min(cap, 40);
  } else if (breakoutState === "failed_breakout") {
    if (entry.mode === "current") cap = Math.min(cap, 35);
    if (entry.mode === "pullback") cap = Math.min(cap, 45);
    if (entry.mode === "breakout") cap = Math.min(cap, 45);
  } else if (isOverheatedDecisionState(context)) {
    if (entry.mode === "current") cap = Math.min(cap, 35);
    if (entry.mode === "pullback") cap = Math.min(cap, 60);
    if (entry.mode === "breakout") cap = Math.min(cap, 60);
  } else if (isUpperResistanceDecisionState(context) && breakoutState !== "breakout_confirmed" && breakoutState !== "breakout_retest_confirmed") {
    if (entry.mode === "current") cap = Math.min(cap, context.chartRegime === "downtrend_rebound" ? 35 : 45);
    if (entry.mode === "pullback") cap = Math.min(cap, 60);
    if (entry.mode === "breakout" && trendOpportunity !== "bullish_breakout_attempt") {
      cap = Math.min(cap, context.chartRegime === "downtrend_rebound" ? 55 : 70);
    }
  }

  if (entry.mode === "current" && priceWarnings.some((warning) => /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|RESISTANCE_TOO_CLOSE/.test(warning))) {
    cap = Math.min(cap, 40);
  }
  if (entry.mode === "breakout" && priceWarnings.includes("BREAKOUT_TARGET_OVERLAP")) {
    cap = Math.min(cap, 55);
  }
  if ((entry.mode === "current" || entry.mode === "pullback") && priceWarnings.includes("SUPPORT_STOP_OVERLAP")) {
    cap = Math.min(cap, 55);
  }
  if (entry.mode === "current" && priceWarnings.some((warning) => /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/.test(warning))) {
    cap = Math.min(cap, 30);
  }
  return cap;
}

function scenarioPositionSizingHint(
  entry: EntryStrategyDecision,
  context: PriceContext,
  tone: ReportDecisionTone,
  lowConfidence: boolean,
) {
  if (isBearishOrRiskDecisionState(context, tone)) return "신규 진입 보류";
  if (lowConfidence) return "소액 또는 관망";
  if (entry.mode === "current" && (isUpperResistanceDecisionState(context) || isOverheatedDecisionState(context))) return "비중 제한 / 추격 주의";
  if (entry.mode === "breakout") return "안착 확인 후 분할";
  if (entry.mode === "pullback") return "지지 확인 후 분할";
  return "손절 기준 전제 분할";
}

function normalizeDecisionEntryStrategies(
  entries: ReportDecision["entryStrategies"],
  report: TradingReport,
  context: PriceContext,
  priceRoles: ReportDecision["priceRoles"],
  priceWarnings: string[],
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
  tone: ReportDecisionTone,
): { entryStrategies: ReportDecision["entryStrategies"]; warnings: string[] } {
  const lowConfidence = hasLowDecisionConfidence(report, context);
  const allWarnings: string[] = [];

  const normalizeOne = (entry: EntryStrategyDecision): EntryStrategyDecision => {
    let warnings = entryScenarioWarnings(entry, context, priceRoles, breakoutState);
    let isComplete = warnings.length === 0;
    const confirmationCondition = safeText(entry.confirmationCondition, defaultConfirmationForEntry(entry, context, breakoutState));
    let invalidation = hasUsableStopText(entry.stop) ? entry.stop : FALLBACK.noStop;
    const target1 = entryTargetUsable(entry, priceRoles) ? safeText(entry.target, priceRoles.target?.text ?? FALLBACK.needsCheck) : safeText(priceRoles.targetStatus, "추가 목표 확인 필요");
    const positionSizingHint = scenarioPositionSizingHint(entry, context, tone, lowConfidence);
    let label = guardUserFacingWording(entry.label);
    let condition = guardUserFacingWording(entry.condition);
    let explanation = guardUserFacingWording(entry.explanation);
    let toneOverride: EntryTone | undefined;
    let isFutureSetup = entry.isFutureSetup;
    const breakoutConfirmedOrRetested = breakoutState === "breakout_confirmed" || breakoutState === "breakout_retest_confirmed";
    const explicitOverheatState = /overheated_breakout|overextended_surge|overheated|overextended|과열|과매수/i.test(
      `${safeText(report.marketContext?.chartRegime, "")} ${safeText(report.chartRegime?.type, "")}`,
    );
    const highRiskChaseEvidence =
      (safeScore(report.scoreSummary?.riskScore) ?? 0) >= 60 &&
      (safeScore(report.scoreSummary?.entryScores?.currentEntry?.score) ?? 0) >= 45 &&
      (
        isUpperResistanceDecisionState(context) ||
        isOverheatedDecisionState(context) ||
        priceWarnings.some((warning) => /TARGET_TOO_CLOSE|RESISTANCE_TOO_CLOSE|PRICE_ROLE_COLLAPSE/.test(warning))
      );
    const overheatEvidence =
      !breakoutConfirmedOrRetested &&
      (
        isOverheatedDecisionState(context) ||
        explicitOverheatState ||
        highRiskChaseEvidence ||
        ((extractRsiValue(report) ?? 0) >= 75)
      );
    const invalidCurrentLongStop =
      entry.mode === "current" &&
      priceWarnings.some((warning) => /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/.test(warning));

    if (isBearishOrRiskDecisionState(context, tone)) {
      toneOverride = "risk";
      isFutureSetup = true;
      if (entry.mode === "current") {
        label = "신규 진입 보류";
        condition = "지지 회복 확인 전 현재가 진입 보류";
      } else if (entry.mode === "pullback") {
        label = "지지 회복 확인";
        condition = `${context.supportText} 회복과 반등 확인 후 재검토`;
      } else {
        label = "회복 돌파 확인";
        condition = `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 회복 후 재지지 확인`;
      }
      explanation = "위험 또는 지지 이탈 우선 구간에서는 신규 진입보다 손절 기준과 비중 관리가 먼저입니다.";
    } else if (overheatEvidence) {
      toneOverride = "caution";
      isFutureSetup = true;
      if (entry.mode === "current") {
        label = "추격 주의";
        condition = "현재가 추격보다 눌림 또는 재지지 확인";
      } else if (entry.mode === "pullback") {
        label = "눌림 대기";
        condition = `${context.supportText} 지지 반응 확인 후 접근`;
      } else {
        label = "안착 확인";
        condition = `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 위 재지지 확인`;
      }
      explanation = "과열 또는 목표 근접 부담이 있어 확인 전 공격적 진입은 제한합니다.";
    } else if (isUpperResistanceDecisionState(context) && breakoutState !== "breakout_confirmed" && breakoutState !== "breakout_retest_confirmed") {
      toneOverride = entry.mode === "breakout" && trendOpportunity === "bullish_breakout_attempt" ? "positive" : "caution";
      if (entry.mode === "current") {
        label = "추격 주의";
        condition = "돌파 후 재지지 확인 전 현재가 진입 신중";
        isFutureSetup = true;
      } else if (entry.mode === "pullback") {
        label = "미래 눌림목 관심";
        condition = `${context.supportText} 지지 반응 확인 시 조건부 접근`;
        isFutureSetup = true;
      } else {
        label = trendOpportunity === "bullish_breakout_attempt" ? "안착 확인" : "돌파 확인";
        condition = `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 돌파 후 안착 확인`;
      }
      explanation = "저항권에서는 즉시 진입보다 돌파·재지지 또는 지지 반응 확인이 우선입니다.";
    } else if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "healthy_pullback" || context.chartRegime === "range_lower_support") {
      if (entry.mode === "pullback") {
        label = "지지 확인";
        condition = `${context.supportText} 지지 반응 확인 후 분할 접근`;
        explanation = "눌림목은 주요 지지에서 하락이 멈추는지 확인한 뒤 판단합니다.";
      } else if (entry.mode === "current" && !/지지|확인|조건부|손절/.test(`${label} ${condition}`)) {
        label = "조건부 접근";
        condition = `${context.supportText} 지지 유지와 손절 기준 확인`;
        explanation = "현재가 접근은 지지 유지와 짧은 손절 기준이 전제입니다.";
      }
    } else if (context.chartRegime === "uptrend_consolidation" && entry.mode === "breakout") {
      label = "돌파 확인";
      condition = `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 돌파 후 재지지 확인`;
      explanation = "상승추세 조정 구간에서는 돌파 후 안착 여부가 신규 진입 판단의 핵심입니다.";
    }

    if (priceWarnings.some((warning) => /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|RESISTANCE_TOO_CLOSE/.test(warning)) && entry.mode === "current") {
      label = "확인 후 접근";
      condition = "저항 또는 목표 여유 재확인 후 접근";
      explanation = "현재가와 저항/목표가 가까워 손익비 확인 전 현재가 진입은 보수적으로 봅니다.";
      toneOverride = "caution";
      isFutureSetup = true;
    }

    if (priceWarnings.includes("BREAKOUT_TARGET_OVERLAP") && entry.mode === "breakout" && priceRoles.target?.value === null) {
      label = "돌파 목표 재확인";
      condition = "돌파 후 다음 목표 확인 전 보수적 접근";
      explanation = "돌파 기준과 목표가 겹쳐 추가 목표 확인 없이는 돌파 진입 점수를 낮춥니다.";
      toneOverride = "caution";
      warnings.push("BREAKOUT_TARGET_OVERLAP");
    }

    if (priceWarnings.includes("SUPPORT_STOP_OVERLAP") && (entry.mode === "current" || entry.mode === "pullback")) {
      explanation = `${explanation} 지지와 손절 기준이 가까워 손절 여유가 좁습니다.`;
      warnings.push("SUPPORT_STOP_OVERLAP");
    }

    if (invalidCurrentLongStop) {
      label = "재평가 필요";
      condition = "현재가보다 낮은 지지와 손절 기준 확인 후 접근";
      invalidation = safeText(priceRoles.stopLoss?.text, "손절 기준 재산정 필요");
      explanation = "현재가가 제시된 지지 또는 손절 기준을 이미 밑돌거나 기준이 불명확해 현재가 진입은 재산정이 필요합니다.";
      toneOverride = "caution";
      isFutureSetup = true;
      warnings.push("INVALID_LONG_STOP");
      if (priceWarnings.includes("SUPPORT_ABOVE_CURRENT")) warnings.push("SUPPORT_ABOVE_CURRENT");
      if (priceWarnings.includes("LONG_STOP_RECHECK_REQUIRED")) warnings.push("LONG_STOP_RECHECK_REQUIRED");
    }

    if (!isComplete && !/확인|조건부|신중|보류|대기|관심|돌파|재지지|안착/.test(label)) {
      label = "조건부 확인";
      toneOverride = "caution";
    }

    const priceSpecificWarnings = warnings.filter((warning) => /BREAKOUT_TARGET_OVERLAP|SUPPORT_STOP_OVERLAP/.test(warning));
    warnings = Array.from(new Set([
      ...entryScenarioWarnings(
        {
          ...entry,
          label,
          condition,
          stop: invalidation,
          target: target1,
          explanation,
          confirmationCondition,
        },
        context,
        priceRoles,
        breakoutState,
      ),
      ...priceSpecificWarnings,
    ]));
    isComplete = !warnings.some((warning) => /SCENARIO_INCOMPLETE|MISSING_CONFIRMATION|MISSING_INVALIDATION|MISSING_TARGET|LOW_RR_ENTRY|INVALID_LONG_STOP|SUPPORT_ABOVE_CURRENT|LONG_STOP_RECHECK_REQUIRED/.test(warning));
    const cap = entryDisplayScoreCap(entry, context, tone, breakoutState, trendOpportunity, priceWarnings, isComplete, lowConfidence);
    let normalizedScore = capDisplayScore(entry.score, cap);
    const hasCurrentPricePressure = priceWarnings.some((warning) => /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|RESISTANCE_TOO_CLOSE/.test(warning));
    const hasUsableDisplayTarget = priceRoles.target?.value !== null && priceRoles.target?.value !== undefined;
    const invalidLongPriceRole = priceWarnings.some((warning) => /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/.test(warning));
    const targetInvalidWithoutFallback = priceWarnings.includes("TARGET_NOT_ABOVE_ENTRY") && !hasUsableDisplayTarget;
    const structureInvalidForAction =
      invalidLongPriceRole ||
      targetInvalidWithoutFallback ||
      (priceWarnings.includes("PRICE_ROLE_COLLAPSE") && !hasUsableDisplayTarget);
    if (!isBearishOrRiskDecisionState(context, tone)) {
      if ((breakoutState === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) && entry.mode === "breakout") {
        normalizedScore = scoreInDisplayRange(normalizedScore, 75, 90);
      } else if ((breakoutState === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) && entry.mode === "current") {
        normalizedScore = scoreInDisplayRange(normalizedScore, 60, 75);
      } else if ((trendOpportunity === "bullish_breakout_attempt" || breakoutState === "breakout_attempt") && entry.mode === "breakout") {
        normalizedScore = scoreInDisplayRange(normalizedScore, 65, 80);
      } else if (
        (trendOpportunity === "uptrend_continuation" ||
          trendOpportunity === "controlled_uptrend_entry" ||
          context.chartRegime === "uptrend_pullback" ||
          context.chartRegime === "uptrend_consolidation" ||
          context.chartRegime === "healthy_pullback") &&
        entry.mode === "current" &&
        !(hasCurrentPricePressure && isUpperResistanceDecisionState(context))
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 50, 70);
      } else if (
        !structureInvalidForAction &&
        (context.chartRegime === "uptrend_pullback" || context.chartRegime === "healthy_pullback") &&
        entry.mode === "pullback"
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 70, 80);
      } else if (
        !structureInvalidForAction &&
        context.chartRegime === "range_lower_support" &&
        entry.mode === "pullback"
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 60, 80);
      } else if (
        !structureInvalidForAction &&
        (context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") &&
        entry.mode === "breakout" &&
        breakoutState !== "failed_breakout"
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 50, 70);
      } else if (
        !structureInvalidForAction &&
        context.chartRegime === "downtrend_rebound" &&
        entry.mode === "breakout" &&
        breakoutState !== "failed_breakout"
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 30, 55);
      } else if (
        !structureInvalidForAction &&
        isOverheatedDecisionState(context) &&
        (entry.mode === "pullback" || entry.mode === "breakout")
      ) {
        normalizedScore = scoreInDisplayRange(normalizedScore, 45, 60);
      }
    }
    if (
      !invalidCurrentLongStop &&
      !isBearishOrRiskDecisionState(context, tone) &&
      isUpperResistanceDecisionState(context) &&
      breakoutState !== "breakout_confirmed" &&
      breakoutState !== "breakout_retest_confirmed" &&
      entry.mode === "current" &&
      normalizedScore !== null
    ) {
      const minScore = context.chartRegime === "downtrend_rebound" ? 15 : 25;
      const maxScore = context.chartRegime === "downtrend_rebound" ? 35 : 45;
      normalizedScore = Math.max(minScore, Math.min(maxScore, normalizedScore));
    }
    if (overheatEvidence && entry.mode === "current" && normalizedScore !== null) {
      normalizedScore = Math.min(normalizedScore, 35);
    }
    if (
      overheatEvidence &&
      !structureInvalidForAction &&
      (entry.mode === "pullback" || entry.mode === "breakout") &&
      normalizedScore !== null
    ) {
      normalizedScore = scoreInDisplayRange(normalizedScore, 45, 60);
    }

    allWarnings.push(...warnings);
    return patchEntryStrategy(entry, {
      score: normalizedScore,
      label,
      condition,
      stop: invalidation,
      target: target1,
      explanation,
      tone: toneOverride ?? entryTone(label),
      isFutureSetup,
      entryTrigger: safeText(entry.entryTrigger, condition),
      confirmationCondition,
      invalidation,
      target1,
      target2: priceRoles.targetStatus && priceRoles.targetStatus !== target1 ? priceRoles.targetStatus : undefined,
      positionSizingHint,
      failureCondition: invalidation,
      shortExplanation: warnings.length
        ? "핵심 조건 일부가 부족해 확인 전까지 보수적으로 표시합니다."
        : explanation,
      isComplete,
      completenessWarnings: warnings.length ? Array.from(new Set(warnings)) : undefined,
    });
  };

  return {
    entryStrategies: {
      current: normalizeOne(entries.current),
      pullback: normalizeOne(entries.pullback),
      breakout: normalizeOne(entries.breakout),
    },
    warnings: Array.from(new Set(allWarnings)),
  };
}

function scoreFromRiskRewardValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value < 1) return 30;
  if (value < 1.3) return 45;
  if (value < 1.7) return 60;
  if (value < 2.5) return 74;
  return 82;
}

function chartRegimeTrendScore(context: PriceContext, breakoutState: ReportDecisionBreakoutState, tone: ReportDecisionTone) {
  if (isBearishOrRiskDecisionState(context, tone)) return 25;
  if (breakoutState === "breakout_retest_confirmed") return 82;
  if (breakoutState === "breakout_confirmed") return 76;
  if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "uptrend_consolidation" || context.chartRegime === "healthy_pullback") return 72;
  if (context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge") return 58;
  if (context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance" || context.chartRegime === "downtrend_rebound") return 45;
  if (context.chartRegime === "range_lower_support") return 60;
  if (context.chartRegime === "sideways" || context.chartRegime === "unknown") return 50;
  return 50;
}

function locationQualityScore(context: PriceContext, priceWarnings: string[]) {
  if (priceWarnings.some((warning) => /PRICE_ROLE_COLLAPSE|TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY/.test(warning))) return 35;
  if (priceWarnings.includes("RESISTANCE_TOO_CLOSE")) return 42;
  if (context.chartRegime === "support_breakdown") return 25;
  if (context.currentLocation === "지지권 근처" || context.chartRegime === "range_lower_support") return 65;
  if (context.currentLocation === "저항 바로 아래" || context.currentLocation === "목표가 근접") return 40;
  return context.current === null || context.support === null || context.resistance === null ? 45 : 58;
}

function supportResistanceQualityScore(context: PriceContext, priceWarnings: string[]) {
  if (priceWarnings.includes("PRICE_ROLE_COLLAPSE")) return 30;
  if (priceWarnings.some((warning) => /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|BREAKOUT_TARGET_OVERLAP/.test(warning))) return 40;
  if (priceWarnings.includes("SUPPORT_STOP_OVERLAP")) return 52;
  if (context.current === null || context.support === null || context.resistance === null) return 42;
  return 70;
}

function dataConfidenceDisplayScore(report: TradingReport, context: PriceContext) {
  if (hasLowDecisionConfidence(report, context)) return 40;
  const finalConfidence = safeText(report.finalSummary?.confidence, "").toLowerCase();
  const regimeConfidence = safeText(report.chartRegime?.confidence ?? report.marketContext?.chartRegimeConfidence, "").toLowerCase();
  if (finalConfidence === "high" || regimeConfidence === "high") return 78;
  if (finalConfidence === "medium" || regimeConfidence === "medium") return 62;
  return 55;
}

function volumeDisplayScore(report: TradingReport) {
  const evidence = reportEvidenceText(report);
  if (!/거래량|volume|vol\./i.test(evidence)) return null;
  if (/거래량\s*(급증|증가|확대|동반)|volume\s*(surge|increase|expansion|confirmed)/i.test(evidence)) return 68;
  if (/거래량\s*(부족|감소|약함)|volume\s*(weak|low|decline)/i.test(evidence)) return 38;
  return 52;
}

function capSignalScore(score: number | null, cap: number, warnings: string[], code: string, referenceScore: number | null = score) {
  if (referenceScore !== null && referenceScore > cap) warnings.push(code);
  if (score === null) return score;
  if (score > cap) {
    return cap;
  }
  return score;
}

function normalizeDecisionSignalSummary(
  rawReport: AnalysisResponse,
  report: TradingReport,
  context: PriceContext,
  entryStrategies: ReportDecision["entryStrategies"],
  displayedEntry: ReportDecision["displayedEntrySignal"],
  priceRoles: ReportDecision["priceRoles"],
  priceWarnings: string[],
  entryWarnings: string[],
  tone: ReportDecisionTone,
  breakoutState: ReportDecisionBreakoutState,
  totalScore: number | null,
  refinedRegime: ReportDecisionRefinedRegime = "existing_regime",
  instrumentRisk?: InstrumentRiskProfile,
  candleRisk?: CandleRiskProfile,
  targetProfile?: TargetProfile,
  refinedScoreWarnings: string[] = [],
  refinedOverallSeed: number | null = null,
): ReportDecision["signalSummary"] {
  const warnings: string[] = [];
  const rawOverall = safeScore(totalScore ?? report.scoreSummary?.totalScore);
  const rawBackendOverall = safeScore(rawReport.tradingReport?.scoreSummary?.totalScore);
  const overallReference = rawBackendOverall ?? rawOverall;
  const rawMomentum = safeScore(report.scoreSummary?.buyScore);
  const riskScore = safeScore(report.scoreSummary?.riskScore);
  const currentScore = entryStrategies.current.score;
  const breakoutScore = entryStrategies.breakout.score;
  let trendScore = chartRegimeTrendScore(context, breakoutState, tone);
  const locationScore = locationQualityScore(context, priceWarnings);
  const srQualityScore = supportResistanceQualityScore(context, priceWarnings);
  const dataConfidenceScore = dataConfidenceDisplayScore(report, context);
  const riskRewardValues = [
    context.currentRiskReward,
    context.pullbackRiskReward,
    context.breakoutRiskReward,
    modeRiskRewardValue(entryStrategies.current, context),
    modeRiskRewardValue(entryStrategies.pullback, context),
    modeRiskRewardValue(entryStrategies.breakout, context),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  const bestRiskReward = riskRewardValues.length ? Math.max(...riskRewardValues) : null;
  let riskRewardScore = scoreFromRiskRewardValue(bestRiskReward);
  let breakoutReliabilityScore = breakoutScore;
  let overallScore = rawOverall;
  const refinedBand = SCORE_BANDS[refinedRegime] ?? SCORE_BANDS.existing_regime;
  if (refinedRegime !== "existing_regime") {
    warnings.push("SCORE_BANDED_BY_REFINED_REGIME");
    overallScore = scoreInBand(refinedOverallSeed ?? rawOverall, refinedBand.overall);
    if (refinedRegime === "confirmed_breakout") trendScore = Math.max(trendScore, 76);
    if (refinedRegime === "healthy_uptrend_pullback") trendScore = Math.max(trendScore, 72);
    if (refinedRegime === "overheated_pullback" || refinedRegime === "parabolic_risk") trendScore = Math.min(Math.max(trendScore, 55), 62);
    if (refinedRegime === "sharp_pullback" || refinedRegime === "support_shock_test") trendScore = Math.min(trendScore, 45);
    if (refinedRegime === "trend_damage_warning" || refinedRegime === "failed_breakout") trendScore = Math.min(trendScore, 32);
  }
  warnings.push(...refinedScoreWarnings);
  if (targetProfile?.targetQuality === "extended") {
    warnings.push("TARGET_EXTENSION_NOT_SCORE_DRIVER");
    riskRewardScore = capSignalScore(riskRewardScore ?? 55, 55, warnings, "SCORE_CAPPED_BY_LOW_RR", overallReference);
    overallScore = capSignalScore(overallScore, 62, warnings, "TARGET_EXTENSION_NOT_SCORE_DRIVER", overallReference);
  } else if (targetProfile?.targetQuality === "uncertain") {
    warnings.push("TARGET_UNCERTAINTY_CAP");
    riskRewardScore = capSignalScore(riskRewardScore ?? 45, 45, warnings, "SCORE_CAPPED_BY_LOW_RR", overallReference);
    overallScore = capSignalScore(overallScore, 58, warnings, "TARGET_UNCERTAINTY_CAP", overallReference);
  }
  if (instrumentRisk?.isLeveraged && candleRisk && (candleRisk.largeBearishCandle || candleRisk.highVolumeDrop)) {
    overallScore = capSignalScore(overallScore, 50, warnings, "LEVERAGED_SHARP_DROP_CAP", overallReference);
  }
  if (instrumentRisk?.isLeveraged && refinedRegime === "support_shock_test") {
    overallScore = capSignalScore(overallScore, 52, warnings, "SUPPORT_SHOCK_SCORE_CAP", overallReference);
  }
  if (instrumentRisk?.isLeveraged && refinedRegime === "trend_damage_warning") {
    overallScore = capSignalScore(overallScore, 39, warnings, "LEVERAGED_TREND_DAMAGE_CAP", overallReference);
  }
  const displayedTargetValue = priceRoles.target?.value ?? null;
  const targetBaselineValues = [context.current, context.resistance, context.breakoutLevel].filter((value): value is number => value !== null && Number.isFinite(value));
  const targetBaseline = targetBaselineValues.length ? Math.max(...targetBaselineValues) : null;
  const displayTargetIsForward =
    displayedTargetValue !== null &&
    (targetBaseline === null || displayedTargetValue > targetBaseline * 1.0075) &&
    !sameDisplayRoleZone(displayedTargetValue, context.current) &&
    !sameDisplayRoleZone(displayedTargetValue, context.resistance) &&
    !sameDisplayRoleZone(displayedTargetValue, context.breakoutLevel);
  const hardPriceCollapse =
    priceWarnings.some((warning) => /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY/.test(warning)) ||
    (priceWarnings.includes("PRICE_ROLE_COLLAPSE") && !displayTargetIsForward);
  const incompleteCount = [entryStrategies.current, entryStrategies.pullback, entryStrategies.breakout].filter((entry) => entry.isComplete === false).length;
  const preferredIncomplete =
    displayedEntry.mode === "current"
      ? entryStrategies.current.isComplete === false
      : displayedEntry.mode === "pullback"
        ? entryStrategies.pullback.isComplete === false
        : displayedEntry.mode === "breakout"
          ? entryStrategies.breakout.isComplete === false
          : false;

  if (hardPriceCollapse) {
    riskRewardScore = capSignalScore(riskRewardScore ?? 40, 40, warnings, "SCORE_CAPPED_BY_PRICE_COLLAPSE");
    overallScore = capSignalScore(overallScore, 60, warnings, "SCORE_CAPPED_BY_PRICE_COLLAPSE", overallReference);
  }

  if ((riskRewardScore ?? 100) <= 40) {
    warnings.push("SCORE_CAPPED_BY_LOW_RR");
    overallScore = capSignalScore(overallScore, 60, warnings, "SCORE_CAPPED_BY_LOW_RR", overallReference);
  }

  if (priceWarnings.includes("BREAKOUT_TARGET_OVERLAP")) {
    breakoutReliabilityScore = capSignalScore(breakoutReliabilityScore, 55, warnings, "BREAKOUT_SCORE_CAPPED");
  }

  if (priceWarnings.includes("RESISTANCE_TOO_CLOSE") && breakoutState !== "breakout_confirmed" && breakoutState !== "breakout_retest_confirmed") {
    warnings.push("CURRENT_ENTRY_SCORE_CAPPED");
    overallScore = capSignalScore(overallScore, 64, warnings, "CURRENT_ENTRY_SCORE_CAPPED", overallReference);
  }

  if (entryWarnings.some((warning) => /SCENARIO_INCOMPLETE|MISSING_CONFIRMATION|MISSING_INVALIDATION|MISSING_TARGET|LOW_RR_ENTRY/.test(warning)) || incompleteCount >= 2 || preferredIncomplete) {
    overallScore = capSignalScore(overallScore, 60, warnings, "SCORE_CAPPED_BY_INCOMPLETE_SCENARIO", overallReference);
  }

  if (isBearishOrRiskDecisionState(context, tone)) {
    overallScore = capSignalScore(overallScore, 49, warnings, "SCORE_CAPPED_BY_STATE", overallReference);
  } else if (
    (context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") &&
    breakoutState !== "breakout_confirmed" &&
    breakoutState !== "breakout_retest_confirmed"
  ) {
    overallScore = capSignalScore(overallScore, 64, warnings, "SCORE_CAPPED_BY_STATE", overallReference);
  } else if (
    (context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge") &&
    breakoutState !== "breakout_retest_confirmed"
  ) {
    overallScore = capSignalScore(overallScore, 59, warnings, "SCORE_CAPPED_BY_STATE", overallReference);
  }

  const lowDecisionConfidence = hasLowDecisionConfidence(report, context);
  if (lowDecisionConfidence) {
    overallScore = capSignalScore(overallScore, 55, warnings, "SCORE_CAPPED_BY_CONFIDENCE", overallReference);
  }

  const hasInvalidLongRole = priceWarnings.some((warning) => /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/.test(warning));
  const canApplyActionableFloor =
    overallScore !== null &&
    !lowDecisionConfidence &&
    !hardPriceCollapse &&
    !hasInvalidLongRole &&
    !isBearishOrRiskDecisionState(context, tone);
  if (canApplyActionableFloor && overallScore !== null) {
    if (breakoutState === "breakout_retest_confirmed" || breakoutState === "breakout_confirmed") {
      overallScore = Math.max(overallScore, 60);
    } else if (context.chartRegime === "uptrend_pullback" || context.chartRegime === "uptrend_consolidation" || context.chartRegime === "healthy_pullback") {
      overallScore = Math.max(overallScore, 55);
    } else if (context.chartRegime === "range_lower_support") {
      overallScore = Math.max(overallScore, 52);
    } else if (context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") {
      overallScore = Math.max(overallScore, 40);
    } else if (context.chartRegime === "downtrend_rebound") {
      overallScore = Math.max(overallScore, 35);
    } else if (context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge") {
      overallScore = Math.max(overallScore, 40);
    }
  }

  if (
    refinedRegime === "confirmed_breakout" &&
    overallScore !== null &&
    targetProfile?.targetQuality !== "uncertain" &&
    (breakoutReliabilityScore ?? 0) >= 70 &&
    !lowDecisionConfidence &&
    !isBearishOrRiskDecisionState(context, tone)
  ) {
    overallScore = Math.max(overallScore, 65);
  }

  return {
    overallScore,
    trendScore,
    locationScore,
    momentumScore: rawMomentum,
    volumeScore: volumeDisplayScore(report),
    srQualityScore,
    breakoutScore,
    breakoutReliabilityScore,
    riskRewardScore,
    volatilityRiskScore: riskScore,
    dataConfidenceScore,
    riskScore,
    entryPerspective: displayedEntry.label,
    ...(warnings.length ? { scoreWarnings: Array.from(new Set(warnings)) } : {}),
  };
}

function normalizeDecisionEntrySignal(
  displayedEntry: DisplayedEntrySignal,
  report: TradingReport,
  context: PriceContext,
  tone: ReportDecisionTone,
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
  entries: ReportDecision["entryStrategies"],
): ReportDecision["displayedEntrySignal"] {
  const label = safeText(displayedEntry.label, FALLBACK.needsCheck);
  const explanation = safeText(displayedEntry.explanation, FALLBACK.needsCheck);
  const currentEntry = entries.current.score ?? safeScore(report.scoreSummary?.entryScores?.currentEntry?.score) ?? 0;
  const pullbackEntry = entries.pullback.score ?? safeScore(report.scoreSummary?.entryScores?.pullbackEntry?.score) ?? 0;
  const breakoutEntry = entries.breakout.score ?? safeScore(report.scoreSummary?.entryScores?.breakoutEntry?.score) ?? 0;
  const isPositiveBreakout =
    breakoutState === "breakout_confirmed" ||
    breakoutState === "breakout_retest_confirmed" ||
    trendOpportunity === "bullish_breakout_attempt" ||
    trendOpportunity === "uptrend_continuation" ||
    trendOpportunity === "controlled_uptrend_entry";
  const pullbackIsFutureFocus =
    pullbackEntry >= Math.max(currentEntry + 10, 60) &&
    !isPositiveBreakout &&
    (context.chartRegime === "resistance_test" ||
      context.chartRegime === "range_upper_resistance" ||
      context.chartRegime === "downtrend_rebound" ||
      context.currentLocation === "목표가 근접" ||
      context.currentLocation === "저항 바로 아래" ||
      context.targetGapLabel === "목표 여유 낮음");

  if (tone === "risk" || context.chartRegime === "support_breakdown") {
    return {
      mode: "risk",
      label: "위험 관리 우선",
      score: displayedEntry.score,
      explanation: "위험 또는 지지 이탈 가능성이 우선이므로 신규 진입보다 손절 기준과 비중 관리가 먼저입니다.",
    };
  }

  if (breakoutState === "failed_breakout") {
    return {
      mode: "wait",
      label: "돌파 실패 주의",
      score: Math.max(Math.min(currentEntry, 35), Math.min(breakoutEntry, 45)),
      explanation: "돌파 기준을 회복하고 위에서 안착하기 전까지 신규 진입은 신중해야 합니다.",
    };
  }

  if (breakoutState === "breakout_retest_confirmed") {
    return {
      mode: "breakout",
      label: "재지지 확인",
      score: entries.breakout.score,
      explanation: "돌파 가격 위 재지지가 확인되어 돌파/재지지 진입 후보로 해석합니다.",
    };
  }

  if (breakoutState === "breakout_confirmed") {
    return {
      mode: "breakout",
      label: "돌파 성공",
      score: entries.breakout.score,
      explanation: "현재가가 돌파 기준 위에 있어 돌파 확인 대기보다 안착 유지 여부가 핵심입니다.",
    };
  }

  if (trendOpportunity === "bullish_breakout_attempt") {
    return {
      mode: "breakout",
      label: "안착 확인",
      score: entries.breakout.score,
      explanation: "모멘텀이 동반된 돌파 시도 구간으로, 돌파 후 안착 여부를 우선 확인합니다.",
    };
  }

  if (trendOpportunity === "uptrend_continuation" || trendOpportunity === "controlled_uptrend_entry") {
    const useCurrent = (entries.current.score ?? 0) >= 50;
    return {
      mode: useCurrent ? "current" : "pullback",
      label: useCurrent ? "분할 가능" : "지지 확인",
      score: useCurrent ? entries.current.score : entries.pullback.score,
      explanation: useCurrent
        ? "추세와 목표 여유가 유지되어 손절 기준을 전제로 일부 분할 접근을 검토할 수 있습니다."
        : "추세는 유지되지만 진입은 주요 지지 반응 확인을 기준으로 봅니다.",
    };
  }

  if (pullbackIsFutureFocus) {
    return {
      mode: "pullback",
      label: "미래 눌림목 관심",
      score: displayedEntry.score,
      explanation: "현재가는 저항권에 가까워 즉시 진입보다 눌림목 대기가 우선입니다.",
    };
  }

  if (hasLowDecisionConfidence(report, context)) {
    return {
      mode: "wait",
      label: "확인 후 접근",
      score: displayedEntry.score,
      explanation: "차트 또는 가격 정보 신뢰도가 낮아 추가 확인 후 접근합니다.",
    };
  }

  if ((tone === "caution" || context.targetGapLabel === "목표 여유 낮음") && /매수 우세|진입 우세|현재가 진입 우세|눌림목 진입 우세/.test(label)) {
    return {
      mode: context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound" ? "breakout" : "wait",
      label: context.targetGapLabel === "목표 여유 낮음" ? "재지지 확인" : "돌파 확인 우선",
      score: displayedEntry.score,
      explanation: context.targetGapLabel === "목표 여유 낮음"
        ? "목표 여유가 크지 않아 즉시 진입보다 재지지 확인이 우선입니다."
        : "신규 진입은 돌파와 지지 확인이 나온 뒤 접근하는 것이 안전합니다.",
    };
  }

  return {
    mode: decisionEntryMode(displayedEntry.mode),
    label,
    score: displayedEntry.score,
    explanation,
  };
}

function uniqueBadges(values: string[]) {
  return Array.from(new Set(values.map((value) => safeText(value, "")).filter(Boolean))).slice(0, 3);
}

function buildDecisionPrimaryStrategy(
  report: TradingReport,
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
  entries: ReportDecision["entryStrategies"],
  displayedEntry: ReportDecision["displayedEntrySignal"],
  tone: ReportDecisionTone,
  breakoutState: ReportDecisionBreakoutState,
  trendOpportunity: ReportDecisionTrendOpportunity,
  refinedRegime: ReportDecisionRefinedRegime = "existing_regime",
  targetProfile?: TargetProfile,
): ReportDecision["primaryStrategy"] {
  const actionState = getActionState(report);
  const targetCollapsed =
    context.targetRoleCollapsed ||
    samePriceZone(context.target, context.current) ||
    samePriceZone(context.target, context.resistance) ||
    context.targetGapLabel === "목표 여유 낮음";

  let title = safeText(finalAction.title, "최종 판단 확인 필요");
  let summary = safeText(finalAction.subtitle, safeText(finalAction.reason, "주요 지지와 저항 확인 후 접근이 필요합니다."));
  let entryOverride = "";
  let stopOverride = "";
  const badgeOverrides: string[] = [];
  const breakoutLevelText = context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText;
  const refinedTargetText = targetProfile?.targetQuality === "clear" && targetProfile.firstTarget !== null
    ? `${formatPrice(targetProfile.firstTarget)} 부근`
    : targetProfile?.targetNote;

  if (context.chartRegime === "support_breakdown" || tone === "risk") {
    title = "위험 관리 / 신규 진입 보류";
    summary = `${context.supportText} 이탈 여부가 핵심입니다. 지지 회복 또는 추세 안정 확인 전까지 신규 진입보다 위험 관리가 우선입니다.`;
    entryOverride = "신규 진입 보류";
    badgeOverrides.push("위험 관리", "신규 진입 보류");
  } else if (breakoutState === "failed_breakout") {
    title = "돌파 실패 주의 / 신규 진입 신중";
    summary = `${breakoutLevelText} 돌파 실패 또는 재이탈 가능성이 있어, 회복 후 안착 확인 전까지 신규 진입은 신중해야 합니다.`;
    entryOverride = `${breakoutLevelText} 재회복 후 안착 확인`;
    stopOverride = stopConditionFromZone(context.supportText, "이탈 시 반등 실패");
    badgeOverrides.push("돌파 실패 주의", "신규 진입 신중");
  } else if (breakoutState === "breakout_retest_confirmed") {
    title = "돌파 후 재지지 확인 / 진입 후보";
    summary = `${breakoutLevelText} 위 재지지가 확인되어, 손절 기준을 짧게 두면 돌파/재지지 진입 후보로 볼 수 있습니다.`;
    entryOverride = `${breakoutLevelText} 재지지 확인 후`;
    stopOverride = stopConditionFromZone(breakoutLevelText, "재이탈 시 돌파 실패");
    badgeOverrides.push("재지지 확인", "진입 후보");
  } else if (breakoutState === "breakout_confirmed") {
    title = "돌파 성공 / 안착 확인";
    summary = `현재가가 ${breakoutLevelText} 위에 있어 단순 돌파 대기보다 안착 유지와 재이탈 여부를 확인하는 전략이 우선입니다.`;
    entryOverride = `${breakoutLevelText} 위 안착 유지 시 조건부 접근`;
    stopOverride = stopConditionFromZone(breakoutLevelText, "재이탈 시 돌파 실패");
    badgeOverrides.push("돌파 성공", "안착 확인");
  } else if (trendOpportunity === "bullish_breakout_attempt") {
    title = "돌파 시도 / 안착 확인";
    summary = `모멘텀이 동반된 돌파 시도 구간입니다. 전량 추격보다 ${breakoutLevelText} 안착 확인과 짧은 손절을 기준으로 접근합니다.`;
    entryOverride = `${breakoutLevelText} 안착 확인 후`;
    stopOverride = stopConditionFromZone(context.supportText, "이탈 시 선진입 실패");
    badgeOverrides.push("안착 확인", "소액 접근");
  } else if (trendOpportunity === "uptrend_continuation") {
    title = "상승 지속 매수 후보";
    summary = "추세와 모멘텀, 목표 여유가 유지되어 눌림만 기다리기보다 일부 추세추종 또는 분할 접근을 검토할 수 있습니다.";
    entryOverride = "현재가 일부 또는 지지 반응 확인 후 분할 접근";
    badgeOverrides.push("추세 유지", "분할 접근");
  } else if (trendOpportunity === "controlled_uptrend_entry") {
    title = "추세 유지 / 분할 접근 가능";
    summary = "상승 흐름은 유지되지만 확인 조건이 남아 있어 현재가는 소액 또는 분할 접근으로 제한하는 것이 적절합니다.";
    entryOverride = "현재가 일부 접근 후 지지 확인 시 추가";
    badgeOverrides.push("분할 접근", "손절 엄수");
  } else if (context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") {
    title = "돌파 확인 대기";
    summary = `현재가는 ${context.resistanceText} 부근 저항권을 테스트하고 있습니다. 추격보다 ${breakoutLevelText} 돌파 후 안착 확인 시 조건부 접근을 봅니다.`;
    entryOverride = `${breakoutLevelText} 돌파 후 재지지 확인`;
    badgeOverrides.push("돌파 확인", "조건부 접근");
  } else if (context.chartRegime === "downtrend_rebound") {
    title = "저항 회복 확인";
    summary = `하락 이후 반등 과정이므로 현재가 추격보다 ${breakoutLevelText} 회복과 재지지 확인 후 접근이 우선입니다.`;
    entryOverride = `${breakoutLevelText} 회복 후 재지지 확인`;
    badgeOverrides.push("전환 확인", "신중 접근");
  } else if (targetCollapsed && /분할|소액|매수 후보|매수 우세|진입 우세/.test(title)) {
    title = "추격매수 주의 / 목표 여유 낮음";
    summary = "현재가와 목표 또는 저항 구간이 가까워 즉시 진입 손익비가 낮습니다. 돌파 후 재지지 또는 눌림목 확인이 우선입니다.";
  } else if (actionState === "CURRENT_PARTIAL_ENTRY") {
    title = "현재가 분할 진입 가능 / 손절 짧게";
  } else if (actionState === "CURRENT_STARTER_POSITION") {
    title = "현재가 소액 진입 가능 / 확인 병행";
  } else if (actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    title = "모멘텀 추세추종 / 분할 접근";
  } else if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    title = "돌파 전 소액 선진입 / 고위험";
  }

  const canUseRefinedPrimaryOverride =
    refinedRegime !== "existing_regime" &&
    refinedRegime !== "confirmed_breakout" &&
    refinedRegime !== "failed_breakout" &&
    context.chartRegime !== "support_breakdown" &&
    tone !== "risk" &&
    breakoutState !== "breakout_confirmed" &&
    breakoutState !== "breakout_retest_confirmed" &&
    breakoutState !== "failed_breakout";
  if (canUseRefinedPrimaryOverride) {
    if (refinedRegime === "support_shock_test") {
      title = "급락 후 지지 테스트 / 반등 확인";
      summary = "고변동 상품의 급락 후 지지 테스트 구간입니다. 현재가 추격보다 지지 방어와 반등 지속 여부 확인이 우선입니다.";
      entryOverride = `${context.supportText} 지지 반응 확인 후 조건부 접근`;
      stopOverride = stopConditionFromZone(context.supportText, "지지 이탈");
      badgeOverrides.push("반등 확인", "비중 제한");
    } else if (refinedRegime === "sharp_pullback") {
      title = "급락 후 지지 확인 / 신규 진입 신중";
      summary = "낙폭이 큰 조정 구간으로, 현재가 매수보다 지지 확인과 반등 지속 여부를 먼저 확인해야 합니다.";
      entryOverride = `${context.supportText} 지지 반응 확인 후`;
      stopOverride = stopConditionFromZone(context.supportText, "반등 실패");
      badgeOverrides.push("지지 확인", "신규 진입 신중");
    } else if (refinedRegime === "parabolic_risk") {
      title = "급등 후 조정 / 1차 목표 확인";
      summary = "급등 이후 조정 성격이 있어 확장 목표만 보고 추격하기보다 1차 목표와 지지 반응을 함께 확인합니다.";
      entryOverride = "눌림과 지지 반응 확인 후 비중 제한";
      stopOverride = stopConditionFromZone(context.supportText, "과열 조정 실패");
      badgeOverrides.push("추격 주의", "목표 확인");
    } else if (refinedRegime === "overheated_pullback") {
      title = "과열 후 조정 / 지지 확인";
      summary = "상승 과열이 일부 식는 과정으로, 즉시 비중 확대보다 지지 확인과 조건부 접근이 적절합니다.";
      entryOverride = `${context.supportText} 지지 확인 후 조건부`;
      stopOverride = stopConditionFromZone(context.supportText, "지지 이탈");
      badgeOverrides.push("추격 주의", "지지 확인");
    } else if (refinedRegime === "healthy_uptrend_pullback") {
      title = "상승추세 눌림 / 분할진입 후보";
      summary = "추세는 유지되는 눌림 구간으로 보이며, 주요 지지 반응과 손절 기준이 확인될 때 분할 접근 후보가 됩니다.";
      entryOverride = `${context.supportText} 지지 반응 확인 후 분할`;
      stopOverride = stopConditionFromZone(context.supportText, "지지 이탈");
      badgeOverrides.push("조건부 분할", "지지 확인");
    } else if (refinedRegime === "normal_breakout_attempt") {
      title = "돌파 시도 / 안착 확인";
      summary = "저항 돌파를 시도하는 구간으로, 즉시 추격보다 돌파 후 안착과 재지지 확인을 우선합니다.";
      entryOverride = `${breakoutLevelText} 돌파 후 안착 확인`;
      stopOverride = stopConditionFromZone(context.supportText, "돌파 실패");
      badgeOverrides.push("안착 확인", "조건부 접근");
    }
  }

  const entry =
    displayedEntry.mode === "current"
      ? entries.current.condition
      : displayedEntry.mode === "pullback"
        ? entries.pullback.condition
        : displayedEntry.mode === "breakout"
          ? entries.breakout.condition
          : displayedEntry.mode === "risk"
            ? "신규 진입 보류"
            : "확인 후 접근";
  const stop =
    stopOverride ||
    (displayedEntry.mode === "breakout"
      ? entries.breakout.stop
      : displayedEntry.mode === "pullback"
        ? entries.pullback.stop
        : entries.current.stop);
  const target = targetCollapsed
    ? safeText(context.targetStatus || context.targetGapLabel, "추가 목표 확인 필요")
    : safeText(refinedTargetText || context.targetText, "추가 목표 확인 필요");

  const toneBadge = tone === "risk"
    ? "위험 관리"
    : tone === "caution"
      ? "신규 진입 신중"
      : tone === "buy"
        ? "진입 후보"
        : "조건부 확인";

  return {
    title,
    summary,
    entry: safeText(entryOverride || entry, FALLBACK.needsCheck),
    stop: safeText(stop, FALLBACK.noStop),
    target,
    badges: uniqueBadges([toneBadge, displayedEntry.label, context.preferredStrategy, ...badgeOverrides]),
  };
}

function buildDecisionWarnings(
  report: TradingReport,
  context: PriceContext,
  primaryStrategy: ReportDecision["primaryStrategy"],
  displayedEntry: ReportDecision["displayedEntrySignal"],
  tone: ReportDecisionTone,
) {
  const warnings = (report.validationWarnings ?? []).map((item) => safeText(item, "")).filter(Boolean);
  if (
    (tone === "caution" || tone === "risk") &&
    /매수 우세|진입 우세|현재가 진입 우세|눌림목 진입 우세/.test(displayedEntry.label)
  ) {
    warnings.push("주의/위험 최종 판단과 즉시 진입 우세 라벨이 충돌할 수 있습니다.");
  }
  if (
    context.targetRoleCollapsed ||
    samePriceZone(context.target, context.current) ||
    samePriceZone(context.target, context.resistance)
  ) {
    warnings.push("목표가가 현재가 또는 저항과 겹쳐 정상 목표가 아닌 targetStatus로 표시했습니다.");
  }
  if (
    (context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound") &&
    /일부 익절|수익 실현/.test(primaryStrategy.title)
  ) {
    warnings.push("저항권/하락추세 반등에서는 보유자 익절 문구를 primary strategy로 쓰지 않아야 합니다.");
  }
  if (
    (context.chartRegime === "support_breakdown" || tone === "risk") &&
    /분할|소액|선진입|매수/.test(displayedEntry.label)
  ) {
    warnings.push("위험 구간에서는 공격적 진입 라벨이 표시되지 않아야 합니다.");
  }
  return Array.from(new Set(warnings));
}

const DETERMINISTIC_WORDING_PATTERN =
  /강력\s*매수|무조건\s*매수|확정\s*매수|적극\s*매수|확정\s*매도|절대\s*수익|수익\s*보장|보장\s*수익|100\s*%/i;

const DISPLAY_BULLISH_BUY_PATTERN =
  /강력\s*매수|무조건\s*매수|확정\s*매수|적극\s*매수|매수\s*우세|현재가\s*진입\s*유리|현재가\s*매수\s*유리|즉시\s*매수/i;

const HOLDER_ONLY_PROFIT_PATTERN = /일부\s*익절|수익\s*실현|비중\s*축소|보유자\s*대응/i;

function guardUserFacingWording(value: unknown, fallback = FALLBACK.needsCheck) {
  let text = safeText(value, fallback);
  text = text
    .replace(/강력\s*매수|무조건\s*매수|확정\s*매수|적극\s*매수/gi, "확인 후 접근")
    .replace(/확정\s*매도/gi, "비중 축소 검토")
    .replace(/절대\s*수익|수익\s*보장|보장\s*수익/gi, "조건부 대응")
    .replace(/100\s*%/g, "조건부");
  return safeText(text, fallback);
}

function isBearishOrRiskDecisionState(context: PriceContext, tone: ReportDecisionTone) {
  return (
    tone === "risk" ||
    context.chartRegime === "support_breakdown" ||
    context.chartRegime === "downtrend"
  );
}

function isResistanceOrOverheatedState(context: PriceContext) {
  return (
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "range_upper_resistance" ||
    context.chartRegime === "overheated_breakout" ||
    context.chartRegime === "overextended_surge" ||
    context.chartRegime === "downtrend_rebound"
  );
}

function isPullbackConfirmationState(context: PriceContext) {
  return (
    context.chartRegime === "uptrend_pullback" ||
    context.chartRegime === "uptrend_consolidation" ||
    context.chartRegime === "healthy_pullback" ||
    context.chartRegime === "range_lower_support"
  );
}

function hasLowDecisionConfidence(report: TradingReport, context: PriceContext) {
  const finalConfidence = safeText(report.finalSummary?.confidence, "").toLowerCase();
  const regimeConfidence = safeText(report.chartRegime?.confidence ?? report.marketContext?.chartRegimeConfidence, "").toLowerCase();
  const missingCoreRoles = context.current === null || context.support === null || context.resistance === null;
  return finalConfidence === "low" || regimeConfidence === "low" || missingCoreRoles;
}

function hasUsableStopText(value: unknown) {
  const text = safeText(value, "");
  return Boolean(text && !/확인 필요|미확인|손절 기준 확인 필요/.test(text));
}

function guardDisplayedEntrySignalForState(
  displayedEntry: ReportDecision["displayedEntrySignal"],
  context: PriceContext,
  tone: ReportDecisionTone,
): ReportDecision["displayedEntrySignal"] {
  const label = guardUserFacingWording(displayedEntry.label);
  const explanation = guardUserFacingWording(displayedEntry.explanation);

  if (isBearishOrRiskDecisionState(context, tone)) {
    return {
      ...displayedEntry,
      mode: "risk",
      label: "위험 관리 우선",
      explanation: "지지 이탈 또는 고위험 구간에서는 신규 진입보다 손절 기준과 비중 관리가 우선입니다.",
    };
  }

  if ((tone === "caution" || isResistanceOrOverheatedState(context)) && DISPLAY_BULLISH_BUY_PATTERN.test(`${label} ${explanation}`)) {
    return {
      ...displayedEntry,
      mode: context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound" ? "breakout" : "wait",
      label: "확인 후 접근",
      explanation: "저항 또는 과열 부담이 있어 즉시 진입보다 돌파 후 재지지나 지지 반응 확인이 우선입니다.",
    };
  }

  if (isPullbackConfirmationState(context) && displayedEntry.mode === "pullback" && !/지지|확인|조건부|반응/.test(`${label} ${explanation}`)) {
    return {
      ...displayedEntry,
      label: "지지 확인",
      explanation: "눌림목 접근은 주요 지지 반응 확인을 전제로 판단합니다.",
    };
  }

  return {
    ...displayedEntry,
    label,
    explanation,
  };
}

function guardPrimaryStrategyForState(
  strategy: ReportDecision["primaryStrategy"],
  report: TradingReport,
  context: PriceContext,
  tone: ReportDecisionTone,
): ReportDecision["primaryStrategy"] {
  let title = guardUserFacingWording(strategy.title);
  let summary = guardUserFacingWording(strategy.summary);
  let entry = guardUserFacingWording(strategy.entry);
  const stop = guardUserFacingWording(strategy.stop, FALLBACK.noStop);
  const target = guardUserFacingWording(strategy.target, context.targetStatus || FALLBACK.needsCheck);
  let badges = uniqueBadges(strategy.badges.map((badge) => guardUserFacingWording(badge, "")));
  const strategyText = `${title} ${summary} ${entry} ${badges.join(" ")}`;
  const lowConfidence = hasLowDecisionConfidence(report, context);

  if (isBearishOrRiskDecisionState(context, tone)) {
    title = "위험 관리 / 신규 진입 보류";
    summary = "지지 이탈 또는 고위험 신호가 있어 신규 진입보다 손절 기준과 비중 관리가 우선입니다.";
    entry = "신규 진입 보류";
    badges = uniqueBadges(["위험 관리 우선", "신규 진입 보류"]);
  } else if (isResistanceOrOverheatedState(context) && DISPLAY_BULLISH_BUY_PATTERN.test(strategyText)) {
    title = context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge"
      ? "재지지 확인 대기"
      : context.chartRegime === "downtrend_rebound"
        ? "저항 회복 확인"
        : "돌파 확인 대기";
    summary = "현재 구간은 저항 또는 과열 부담이 있어 즉시 진입보다 돌파 후 재지지나 지지 반응 확인이 우선입니다.";
    entry = context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound" || context.chartRegime === "range_upper_resistance"
      ? `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 돌파 후 재지지 확인`
      : "눌림 또는 재지지 확인 후 접근";
    badges = uniqueBadges(["추격 주의", "확인 우선", ...badges]);
  } else if (isPullbackConfirmationState(context) && !/지지|확인|조건부|반응/.test(`${title} ${summary} ${entry}`)) {
    summary = "추세가 유지되더라도 신규 접근은 주요 지지 반응 확인을 전제로 판단합니다.";
    entry = `${context.supportText} 지지 반응 확인 후 접근`;
    badges = uniqueBadges(["지지 확인", "조건부 접근", ...badges]);
  }

  if (lowConfidence && DISPLAY_BULLISH_BUY_PATTERN.test(`${title} ${summary} ${entry}`)) {
    title = "확인 후 접근 / 신규 진입 신중";
    summary = "차트 또는 가격 정보 신뢰도가 낮아 즉시 판단보다 추가 확인이 우선입니다.";
    entry = "추가 확인 후 접근";
    badges = uniqueBadges(["확인 필요", "신규 진입 신중"]);
  }

  if (HOLDER_ONLY_PROFIT_PATTERN.test(`${title} ${summary}`) && (context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test")) {
    title = context.chartRegime === "downtrend_rebound" ? "저항 회복 확인" : "돌파 확인 대기";
    summary = "반등 또는 저항 테스트 구간에서는 보유자 대응과 신규 진입 판단을 분리하고, 신규 진입은 돌파 후 재지지 확인이 우선입니다.";
    entry = `${context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText} 돌파 후 재지지 확인`;
    badges = uniqueBadges(["신규 진입 신중", "재지지 확인"]);
  }

  return {
    title,
    summary,
    entry,
    stop,
    target,
    badges,
  };
}

function buildDecisionDisplayGuidance(
  report: TradingReport,
  context: PriceContext,
  primaryStrategy: ReportDecision["primaryStrategy"],
  displayedEntry: ReportDecision["displayedEntrySignal"],
  tone: ReportDecisionTone,
) {
  const lowConfidence = hasLowDecisionConfidence(report, context);
  const confirmLevel = context.breakoutLevelText !== FALLBACK.unknown ? context.breakoutLevelText : context.pivotText;
  const stopText = hasUsableStopText(primaryStrategy.stop) ? primaryStrategy.stop : FALLBACK.noStop;
  let newEntryDecision = `${primaryStrategy.entry} 기준으로 조건부 접근합니다.`;
  let holderDecision = `보유자는 ${stopText} 이탈 여부를 기준으로 추세 유지 여부를 확인합니다.`;
  let mustConfirmCondition = safeText(primaryStrategy.entry, "추가 확인 필요");
  let mustNotTradeReason = "";
  let nextReviewCondition = safeText(primaryStrategy.target, context.targetStatus || "추가 목표 확인 필요");

  if (isBearishOrRiskDecisionState(context, tone)) {
    newEntryDecision = "신규 진입은 보류하고 지지 회복과 위험 완화 확인을 우선합니다.";
    holderDecision = `보유자는 ${stopText} 이탈 여부를 우선 확인하고 비중 관리를 검토합니다.`;
    mustConfirmCondition = "지지 회복 확인";
    mustNotTradeReason = "지지 이탈 또는 고위험 신호가 우선입니다.";
    nextReviewCondition = `${context.supportText} 회복 또는 위험 완화 확인`;
  } else if (context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") {
    newEntryDecision = `현 위치 추격은 부적합하지만 ${confirmLevel} 돌파 후 재지지 확인 시 조건부 접근을 검토합니다.`;
    holderDecision = `보유자는 ${context.supportText} 이탈 여부를 기준으로 방어적으로 대응하고 추가 매수는 확인 후 검토합니다.`;
    mustConfirmCondition = `${confirmLevel} 돌파 후 재지지 확인`;
    mustNotTradeReason = context.targetRoleCollapsed || context.targetGapLabel ? safeText(context.targetStatus || context.targetGapLabel, "저항권 확인이 필요합니다.") : "";
    nextReviewCondition = `${confirmLevel} 안착 또는 ${context.supportText} 지지 반응`;
  } else if (context.chartRegime === "downtrend_rebound") {
    newEntryDecision = `추세 전환은 미확정이므로 ${confirmLevel} 회복과 재지지 확인 후 단계적 접근을 검토합니다.`;
    holderDecision = `보유자는 ${context.supportText} 이탈 여부를 기준으로 방어적으로 대응하고 추가 매수는 확인 후 검토합니다.`;
    mustConfirmCondition = `${confirmLevel} 회복 후 재지지 확인`;
    mustNotTradeReason = "추세 전환 확인 전 현재가 추격은 부적합합니다.";
    nextReviewCondition = `${confirmLevel} 회복 또는 ${context.supportText} 지지 반응`;
  } else if (context.chartRegime === "overheated_breakout" || context.chartRegime === "overextended_surge") {
    newEntryDecision = "현재가 추격보다 눌림 또는 재지지 확인 후 소액/조건부 접근을 검토합니다.";
    holderDecision = "보유자는 저항 반응과 기준 이탈 여부를 보며 비중 축소를 검토합니다.";
    mustConfirmCondition = "눌림 또는 재지지 확인";
    mustNotTradeReason = "과열 또는 추격매수 부담이 있습니다.";
    nextReviewCondition = `${context.supportText} 지지 반응 또는 과열 완화`;
  } else if (isPullbackConfirmationState(context)) {
    newEntryDecision = `${context.supportText} 부근 지지 반응 확인 시 조건 충족 후 분할 접근을 검토합니다.`;
    holderDecision = `보유자는 ${stopText} 이탈 전까지 추세 유지 여부를 확인합니다.`;
    mustConfirmCondition = `${context.supportText} 지지 반응 확인`;
    nextReviewCondition = `${context.supportText} 지지 유지 또는 ${confirmLevel} 돌파 확인`;
  }

  if (lowConfidence) {
    newEntryDecision = "차트 또는 가격 정보 신뢰도가 낮아 신규 진입은 추가 확인 후 접근합니다.";
    mustConfirmCondition = "가격 역할과 지지/저항 재확인";
    mustNotTradeReason = "차트 또는 가격 정보 신뢰도가 낮습니다.";
  }

  return {
    newEntryDecision: guardUserFacingWording(newEntryDecision),
    holderDecision: guardUserFacingWording(holderDecision),
    mustConfirmCondition: guardUserFacingWording(mustConfirmCondition),
    ...(mustNotTradeReason ? { mustNotTradeReason: guardUserFacingWording(mustNotTradeReason) } : {}),
    nextReviewCondition: guardUserFacingWording(nextReviewCondition),
  };
}

function isInvalidReportDecisionText(value: unknown) {
  if (typeof value !== "string") return true;
  const text = value.trim();
  return !text || isInvalidDisplayText(text) || /\b(undefined|null|NaN|Infinity)\b/i.test(text) || text.includes("[object Object]");
}

function isInvalidOptionalDisplayValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "string") return isInvalidReportDecisionText(value);
  return false;
}

function validateReportDecisionDisplayValues(decision: ReportDecision) {
  const invalidFields: string[] = [];
  const requiredTextFields: Array<[string, unknown]> = [
    ["chartRegime", decision.chartRegime],
    ["breakoutState", decision.breakoutState],
    ["finalActionState", decision.finalActionState],
    ["finalActionLabel", decision.finalActionLabel],
    ["primaryStrategy.title", decision.primaryStrategy.title],
    ["primaryStrategy.summary", decision.primaryStrategy.summary],
    ["primaryStrategy.entry", decision.primaryStrategy.entry],
    ["primaryStrategy.stop", decision.primaryStrategy.stop],
    ["primaryStrategy.target", decision.primaryStrategy.target],
    ["priceRoles.currentPrice.text", decision.priceRoles.currentPrice.text],
    ["priceRoles.mainSupport.text", decision.priceRoles.mainSupport.text],
    ["priceRoles.mainResistance.text", decision.priceRoles.mainResistance.text],
    ["entryStrategies.current.label", decision.entryStrategies.current.label],
    ["entryStrategies.current.condition", decision.entryStrategies.current.condition],
    ["entryStrategies.current.stop", decision.entryStrategies.current.stop],
    ["entryStrategies.current.target", decision.entryStrategies.current.target],
    ["entryStrategies.current.riskReward", decision.entryStrategies.current.riskReward],
    ["entryStrategies.current.explanation", decision.entryStrategies.current.explanation],
    ["entryStrategies.pullback.label", decision.entryStrategies.pullback.label],
    ["entryStrategies.pullback.condition", decision.entryStrategies.pullback.condition],
    ["entryStrategies.pullback.stop", decision.entryStrategies.pullback.stop],
    ["entryStrategies.pullback.target", decision.entryStrategies.pullback.target],
    ["entryStrategies.pullback.riskReward", decision.entryStrategies.pullback.riskReward],
    ["entryStrategies.pullback.explanation", decision.entryStrategies.pullback.explanation],
    ["entryStrategies.breakout.label", decision.entryStrategies.breakout.label],
    ["entryStrategies.breakout.condition", decision.entryStrategies.breakout.condition],
    ["entryStrategies.breakout.stop", decision.entryStrategies.breakout.stop],
    ["entryStrategies.breakout.target", decision.entryStrategies.breakout.target],
    ["entryStrategies.breakout.riskReward", decision.entryStrategies.breakout.riskReward],
    ["entryStrategies.breakout.explanation", decision.entryStrategies.breakout.explanation],
    ["displayedEntrySignal.label", decision.displayedEntrySignal.label],
    ["displayedEntrySignal.explanation", decision.displayedEntrySignal.explanation],
    ["signalSummary.entryPerspective", decision.signalSummary.entryPerspective],
  ];

  for (const [path, value] of requiredTextFields) {
    if (isInvalidReportDecisionText(value)) invalidFields.push(path);
  }

  const optionalFields: Array<[string, unknown]> = [
    ["priceRoles.secondarySupport.text", decision.priceRoles.secondarySupport?.text],
    ["priceRoles.breakoutLevel.text", decision.priceRoles.breakoutLevel?.text],
    ["priceRoles.stopLoss.text", decision.priceRoles.stopLoss?.text],
    ["priceRoles.invalidation.text", decision.priceRoles.invalidation?.text],
    ["priceRoles.target.text", decision.priceRoles.target?.text],
    ["priceRoles.targetStatus", decision.priceRoles.targetStatus],
    ["entryStrategies.current.score", decision.entryStrategies.current.score],
    ["entryStrategies.current.entryTrigger", decision.entryStrategies.current.entryTrigger],
    ["entryStrategies.current.confirmationCondition", decision.entryStrategies.current.confirmationCondition],
    ["entryStrategies.current.invalidation", decision.entryStrategies.current.invalidation],
    ["entryStrategies.current.target1", decision.entryStrategies.current.target1],
    ["entryStrategies.current.target2", decision.entryStrategies.current.target2],
    ["entryStrategies.current.positionSizingHint", decision.entryStrategies.current.positionSizingHint],
    ["entryStrategies.current.failureCondition", decision.entryStrategies.current.failureCondition],
    ["entryStrategies.current.shortExplanation", decision.entryStrategies.current.shortExplanation],
    ["entryStrategies.pullback.score", decision.entryStrategies.pullback.score],
    ["entryStrategies.pullback.entryTrigger", decision.entryStrategies.pullback.entryTrigger],
    ["entryStrategies.pullback.confirmationCondition", decision.entryStrategies.pullback.confirmationCondition],
    ["entryStrategies.pullback.invalidation", decision.entryStrategies.pullback.invalidation],
    ["entryStrategies.pullback.target1", decision.entryStrategies.pullback.target1],
    ["entryStrategies.pullback.target2", decision.entryStrategies.pullback.target2],
    ["entryStrategies.pullback.positionSizingHint", decision.entryStrategies.pullback.positionSizingHint],
    ["entryStrategies.pullback.failureCondition", decision.entryStrategies.pullback.failureCondition],
    ["entryStrategies.pullback.shortExplanation", decision.entryStrategies.pullback.shortExplanation],
    ["entryStrategies.breakout.score", decision.entryStrategies.breakout.score],
    ["entryStrategies.breakout.entryTrigger", decision.entryStrategies.breakout.entryTrigger],
    ["entryStrategies.breakout.confirmationCondition", decision.entryStrategies.breakout.confirmationCondition],
    ["entryStrategies.breakout.invalidation", decision.entryStrategies.breakout.invalidation],
    ["entryStrategies.breakout.target1", decision.entryStrategies.breakout.target1],
    ["entryStrategies.breakout.target2", decision.entryStrategies.breakout.target2],
    ["entryStrategies.breakout.positionSizingHint", decision.entryStrategies.breakout.positionSizingHint],
    ["entryStrategies.breakout.failureCondition", decision.entryStrategies.breakout.failureCondition],
    ["entryStrategies.breakout.shortExplanation", decision.entryStrategies.breakout.shortExplanation],
    ["signalSummary.overallScore", decision.signalSummary.overallScore],
    ["signalSummary.trendScore", decision.signalSummary.trendScore],
    ["signalSummary.locationScore", decision.signalSummary.locationScore],
    ["signalSummary.momentumScore", decision.signalSummary.momentumScore],
    ["signalSummary.volumeScore", decision.signalSummary.volumeScore],
    ["signalSummary.srQualityScore", decision.signalSummary.srQualityScore],
    ["signalSummary.breakoutScore", decision.signalSummary.breakoutScore],
    ["signalSummary.breakoutReliabilityScore", decision.signalSummary.breakoutReliabilityScore],
    ["signalSummary.riskRewardScore", decision.signalSummary.riskRewardScore],
    ["signalSummary.volatilityRiskScore", decision.signalSummary.volatilityRiskScore],
    ["signalSummary.dataConfidenceScore", decision.signalSummary.dataConfidenceScore],
    ["signalSummary.riskScore", decision.signalSummary.riskScore],
    ["displayedEntrySignal.score", decision.displayedEntrySignal.score],
    ["newEntryDecision", decision.newEntryDecision],
    ["holderDecision", decision.holderDecision],
    ["mustConfirmCondition", decision.mustConfirmCondition],
    ["mustNotTradeReason", decision.mustNotTradeReason],
    ["nextReviewCondition", decision.nextReviewCondition],
  ];

  for (const [path, value] of optionalFields) {
    if (isInvalidOptionalDisplayValue(value)) invalidFields.push(path);
  }

  decision.primaryStrategy.badges.forEach((badge, index) => {
    if (isInvalidReportDecisionText(badge)) invalidFields.push(`primaryStrategy.badges.${index}`);
  });

  decision.signalSummary.scoreWarnings?.forEach((warning, index) => {
    if (isInvalidReportDecisionText(warning)) invalidFields.push(`signalSummary.scoreWarnings.${index}`);
  });

  if (!invalidFields.length) return [];
  return [`ReportDecision에 유효하지 않은 표시 값이 있습니다: ${invalidFields.slice(0, 6).join(", ")}`];
}

export function validateReportDecision(decision: ReportDecision, indicators: IndicatorRow[] = []) {
  const warnings: string[] = [];
  const finalText = `${decision.finalActionState} ${decision.finalActionLabel} ${decision.primaryStrategy.title} ${decision.primaryStrategy.summary}`;
  const entryText = `${decision.displayedEntrySignal.label} ${decision.displayedEntrySignal.explanation}`;
  const currentEntryText = `${decision.entryStrategies.current.label} ${decision.entryStrategies.current.condition} ${decision.entryStrategies.current.explanation}`;
  const guidanceText = `${decision.newEntryDecision ?? ""} ${decision.holderDecision ?? ""} ${decision.mustConfirmCondition ?? ""} ${decision.mustNotTradeReason ?? ""} ${decision.nextReviewCondition ?? ""}`;
  const allDecisionText = `${finalText} ${entryText} ${currentEntryText} ${guidanceText}`;
  const bullishEntryPattern = /매수 우세|진입 우세|현재가 진입 유리|현재가 진입 우세|눌림목 진입 우세|강력 매수|적극 매수|확정 매수/;
  const aggressiveStrategyPattern = /현재가\s*(분할진입|분할 진입|소액 진입)|모멘텀\s*(진입|추세추종)|돌파 전\s*소액|소액 선진입|공격/;
  const targetText = safeText(decision.priceRoles.target?.text, "");
  const targetStatus = safeText(decision.priceRoles.targetStatus, "");
  const targetMissing = !targetText || /확인 필요|미확인|추가 목표|상단 목표 미확인/.test(targetText);
  const targetLooksNormal = Boolean(targetText && !/확인 필요|미확인|목표가 근접|목표 여유 낮음|상승 여지 제한|추가 목표|상단 저항|저항 재확인/.test(targetText));
  const currentValue = decision.priceRoles.currentPrice.value;
  const resistanceValue = decision.priceRoles.mainResistance.value;
  const targetValue = decision.priceRoles.target?.value ?? null;
  const breakoutValue = decision.priceRoles.breakoutLevel?.value ?? null;
  const supportValue = decision.priceRoles.mainSupport.value;
  const stopValue = decision.priceRoles.stopLoss?.value ?? null;
  const invalidationValue = decision.priceRoles.invalidation?.value ?? null;
  const breakoutScore = decision.entryStrategies.breakout.score ?? null;
  const currentScore = decision.entryStrategies.current.score ?? null;
  const pullbackScore = decision.entryStrategies.pullback.score ?? null;
  const trendOpportunity = decision.trendOpportunity ?? "none";
  const scoreWarningText = (decision.signalSummary.scoreWarnings ?? []).join(" ");
  const overallScore = decision.signalSummary.overallScore;
  const riskRewardScore = decision.signalSummary.riskRewardScore ?? null;
  const breakoutReliabilityScore = decision.signalSummary.breakoutReliabilityScore ?? null;
  const dataConfidenceScore = decision.signalSummary.dataConfidenceScore ?? null;
  const targetBaselineValues = [currentValue, resistanceValue, breakoutValue].filter((value): value is number => value !== null && Number.isFinite(value));
  const targetBaseline = targetBaselineValues.length ? Math.max(...targetBaselineValues) : null;
  const displayedTargetIsForward =
    targetValue !== null &&
    (targetBaseline === null || targetValue > targetBaseline * 1.0075) &&
    !sameDisplayRoleZone(targetValue, currentValue) &&
    !sameDisplayRoleZone(targetValue, resistanceValue) &&
    !sameDisplayRoleZone(targetValue, breakoutValue);
  const refinedRegime = decision.refinedRegime ?? "existing_regime";

  if (samePriceZone(currentValue, targetValue) && !hasDecisionWarning(decision, /TARGET_TOO_CLOSE|PRICE_ROLE_COLLAPSE/)) {
    warnings.push("TARGET_TOO_CLOSE: 현재가와 목표가가 같은 가격대로 표시될 수 있습니다.");
  }

  if (currentValue !== null && targetValue !== null && targetValue <= currentValue && !hasDecisionWarning(decision, /TARGET_NOT_ABOVE_ENTRY|TARGET_TOO_CLOSE|PRICE_ROLE_COLLAPSE/)) {
    warnings.push("TARGET_NOT_ABOVE_ENTRY: 목표가가 현재가보다 높지 않습니다.");
  }

  if (samePriceZone(currentValue, resistanceValue) && !hasDecisionWarning(decision, /RESISTANCE_TOO_CLOSE/)) {
    warnings.push("RESISTANCE_TOO_CLOSE: 현재가와 저항선이 같은 가격대입니다.");
  }

  if (samePriceZone(breakoutValue, targetValue) && !hasDecisionWarning(decision, /BREAKOUT_TARGET_OVERLAP|PRICE_ROLE_COLLAPSE/)) {
    warnings.push("BREAKOUT_TARGET_OVERLAP: 돌파 확인 가격과 목표가가 같은 가격대입니다.");
  }

  if ((samePriceZone(supportValue, stopValue) || samePriceZone(supportValue, invalidationValue)) && !hasDecisionWarning(decision, /SUPPORT_STOP_OVERLAP/)) {
    warnings.push("SUPPORT_STOP_OVERLAP: 지지선과 손절/무효화 기준이 같은 가격대입니다.");
  }

  if (isInvalidLongRoleAtCurrent(supportValue, currentValue) && !hasDecisionWarning(decision, /SUPPORT_ABOVE_CURRENT|LONG_STOP_RECHECK_REQUIRED/)) {
    warnings.push("SUPPORT_ABOVE_CURRENT: 현재가보다 위에 있는 지지가 현재가 롱 진입 기준으로 표시되고 있습니다.");
  }

  if (isInvalidLongRoleAtCurrent(stopValue, currentValue) && !hasDecisionWarning(decision, /INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/)) {
    warnings.push("INVALID_LONG_STOP: 현재가보다 위에 있는 손절 기준이 현재가 롱 진입 기준으로 표시되고 있습니다.");
  }

  if (
    hasDecisionWarning(decision, /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/) &&
    (decision.entryStrategies.current.score ?? 0) > 30
  ) {
    warnings.push("INVALID_LONG_STOP: 현재가 진입 점수가 무효 손절 기준에 맞게 제한되지 않았습니다.");
  }

  if (DETERMINISTIC_WORDING_PATTERN.test(allDecisionText)) {
    warnings.push("ReportDecision에 확정적이거나 보장성 있는 매매 표현이 남아 있습니다.");
  }

  if ((decision.finalActionTone === "caution" || decision.finalActionTone === "risk") && DISPLAY_BULLISH_BUY_PATTERN.test(guidanceText)) {
    warnings.push("주의/위험 상태의 신규/보유자 가이드에 공격적 매수 표현이 남아 있습니다.");
  }

  if (
    (decision.chartRegime === "downtrend_rebound" || decision.chartRegime === "resistance_test") &&
    HOLDER_ONLY_PROFIT_PATTERN.test(finalText) &&
    !/보유자/.test(finalText)
  ) {
    warnings.push("보유자 전용 익절/비중축소 문구가 신규 진입 primary strategy로 노출될 수 있습니다.");
  }

  if (
    decision.newEntryDecision &&
    decision.holderDecision &&
    safeText(decision.newEntryDecision, "") === safeText(decision.holderDecision, "")
  ) {
    warnings.push("신규 진입 가이드와 보유자 가이드가 분리되지 않았습니다.");
  }

  if ((decision.finalActionTone === "caution" || decision.finalActionTone === "risk") && bullishEntryPattern.test(entryText)) {
    warnings.push("finalAction이 주의/위험인데 표시 진입 라벨이 매수 우세로 해석될 수 있습니다.");
  }

  if (samePriceZone(currentValue, targetValue) && !/목표가 근접|목표 여유 낮음|상승 여지 제한|추가 목표/.test(targetStatus)) {
    warnings.push("현재가와 목표가가 같은 가격대인데 targetStatus 경고가 없습니다.");
  }

  if (samePriceZone(resistanceValue, targetValue) && !/목표가 근접|목표 여유 낮음|상승 여지 제한|추가 목표|상단 목표/.test(targetStatus)) {
    warnings.push("저항선과 목표가가 같은 가격대인데 targetStatus 경고가 없습니다.");
  }

  if (decision.chartRegime === "support_breakdown" && (/분할|소액|선진입|모멘텀|유리|매수/.test(currentEntryText) || (decision.entryStrategies.current.score ?? 0) >= 55)) {
    warnings.push("지지선 이탈 구간에서 현재가 공격 진입 라벨이 표시될 수 있습니다.");
  }

  if ((decision.chartRegime === "support_breakdown" || decision.finalActionTone === "risk") && aggressiveStrategyPattern.test(decision.primaryStrategy.title)) {
    warnings.push("지지선 이탈 또는 고위험 구간에서 공격적 primary strategy가 표시될 수 있습니다.");
  }

  if (
    breakoutValue !== null &&
    priceAboveByTolerance(currentValue, breakoutValue) &&
    /돌파 확인 대기|신규 진입 보류\s*\/\s*돌파 확인 대기/.test(finalText) &&
    decision.breakoutState !== "failed_breakout"
  ) {
    warnings.push("현재가가 돌파 기준 위인데 최종/대표 전략이 여전히 돌파 확인 대기로 표시될 수 있습니다.");
  }

  if (decision.breakoutState === "breakout_confirmed" && (breakoutScore ?? 0) < 60) {
    warnings.push("돌파 성공 상태인데 돌파 진입 표시 점수가 60 미만입니다.");
  }

  if (
    decision.breakoutState === "breakout_retest_confirmed" &&
    /신규 진입 보류|돌파 확인 대기|추격매수 주의/.test(finalText) &&
    !/위험|목표 여유|과열|손절|이탈|고위험/.test(finalText)
  ) {
    warnings.push("돌파 후 재지지 확인 상태가 명확한 위험 사유 없이 과도하게 보수적으로 표시될 수 있습니다.");
  }

  if (trendOpportunity !== "none" && Math.max(currentScore ?? 0, pullbackScore ?? 0, breakoutScore ?? 0) < 45) {
    warnings.push("상승/모멘텀 기회가 감지됐지만 모든 진입 표시 점수가 45 미만입니다.");
  }

  if ((decision.finalActionTone === "risk" || decision.chartRegime === "support_breakdown" || decision.chartRegime === "downtrend") && (overallScore ?? 0) > 49 && !/SCORE_CAPPED_BY_STATE/.test(scoreWarningText)) {
    warnings.push("SCORE_CAPPED_BY_STATE: 위험/하락 상태인데 표시 종합 점수가 보수적으로 제한되지 않았습니다.");
  }

  if ((dataConfidenceScore ?? 100) <= 45 && (overallScore ?? 0) > 55 && !/SCORE_CAPPED_BY_CONFIDENCE/.test(scoreWarningText)) {
    warnings.push("SCORE_CAPPED_BY_CONFIDENCE: 낮은 신뢰도 상태인데 표시 종합 점수가 높게 유지됩니다.");
  }

  if (hasDecisionWarning(decision, /TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|PRICE_ROLE_COLLAPSE/) && !displayedTargetIsForward && (riskRewardScore ?? 0) > 40 && !/SCORE_CAPPED_BY_PRICE_COLLAPSE|SCORE_CAPPED_BY_LOW_RR/.test(scoreWarningText)) {
    warnings.push("SCORE_CAPPED_BY_PRICE_COLLAPSE: 목표/현재가 역할 붕괴 상태인데 손익비 점수가 높게 유지됩니다.");
  }

  if (hasDecisionWarning(decision, /BREAKOUT_TARGET_OVERLAP/) && (breakoutReliabilityScore ?? 0) > 55 && !/BREAKOUT_SCORE_CAPPED/.test(scoreWarningText)) {
    warnings.push("BREAKOUT_SCORE_CAPPED: 돌파 기준과 목표가가 겹치는데 돌파 신뢰 점수가 높게 유지됩니다.");
  }

  if (decision.instrumentRiskProfile?.isLeveraged && decision.candleRiskProfile?.largeBearishCandle && (overallScore ?? 0) > 55) {
    warnings.push("LEVERAGED_SHARP_DROP_CAP: leveraged sharp bearish setup keeps overall score too high.");
  }

  if (refinedRegime === "support_shock_test" && (currentScore ?? 0) > 40) {
    warnings.push("SUPPORT_SHOCK_SCORE_CAP: support shock current entry score should stay below 40.");
  }

  if (refinedRegime === "trend_damage_warning" && /매수 후보|분할진입 후보|상승 지속|buy candidate/i.test(finalText)) {
    warnings.push("TREND_DAMAGE_WITH_BUY_LABEL: trend damage warning still shows buy-candidate wording.");
  }

  if (refinedRegime === "parabolic_risk" && !decision.targetProfile) {
    warnings.push("PARABOLIC_TARGET_PROFILE_MISSING: parabolic risk needs target profile.");
  }

  if (refinedRegime === "parabolic_risk" && decision.targetProfile?.targetQuality === "clear" && decision.targetProfile.extensionTarget === null) {
    warnings.push("PARABOLIC_TARGET_PROFILE_WEAK: parabolic risk should distinguish clear, extended, or uncertain targets.");
  }

  if ((decision.finalActionTone === "risk" || /위험 관리|신규 진입 보류/.test(finalText)) && (currentScore ?? 0) > 45) {
    warnings.push("RISK_LABEL_ENTRY_SCORE_CONFLICT: defensive final label has high current-entry score.");
  }

  if (
    decision.displayedEntrySignal.mode === "current" &&
    /상승 지속|분할진입 후보|매수 후보|진입 후보/i.test(finalText) &&
    (currentScore ?? 0) <= 35
  ) {
    warnings.push("BULLISH_LABEL_LOW_CURRENT_SCORE: bullish label conflicts with very low current-entry score.");
  }

  if (/신규 진입 보류|위험 관리|급락|추격 주의/.test(finalText) && (overallScore ?? 0) >= 70 && refinedRegime !== "confirmed_breakout") {
    warnings.push("DEFENSIVE_LABEL_HIGH_SCORE: defensive label has high overall score without confirmed breakout reason.");
  }

  if (dataConfidenceScore !== null && overallScore !== null && dataConfidenceScore === overallScore && !/SCORE_BANDED_BY_REFINED_REGIME|SCORE_CAPPED/.test(scoreWarningText)) {
    warnings.push("REPORT_CONFIDENCE_SIGNAL_SCORE_MIXED: data confidence appears to be reused as signal score.");
  }

  const strategyEntries = [
    decision.entryStrategies.current,
    decision.entryStrategies.pullback,
    decision.entryStrategies.breakout,
  ];
  const incompleteEntries = strategyEntries.filter((entry) => entry.isComplete === false);
  for (const entry of strategyEntries) {
    const severeIncomplete = (entry.completenessWarnings ?? []).some((warning) => /MISSING_CONFIRMATION|MISSING_INVALIDATION|MISSING_TARGET/.test(warning));
    if (entry.isComplete === false && severeIncomplete && (entry.score ?? 0) > 50) {
      warnings.push(`SCENARIO_INCOMPLETE: ${entry.mode} 진입 시나리오가 미완성인데 표시 점수가 50을 초과합니다.`);
    }
    if ((decision.finalActionTone === "risk" || decision.chartRegime === "support_breakdown") && entry.mode === "current" && (entry.score ?? 0) > 30) {
      warnings.push("support_breakdown/high risk current entry score is not capped.");
    }
    if (
      (decision.chartRegime === "resistance_test" || decision.chartRegime === "range_upper_resistance" || decision.chartRegime === "downtrend_rebound") &&
      entry.mode === "current" &&
      (entry.score ?? 0) > 40 &&
      decision.breakoutState !== "breakout_confirmed" &&
      decision.breakoutState !== "breakout_retest_confirmed"
    ) {
      warnings.push("resistance/downtrend current entry score is not confirmation-first capped.");
    }
  }
  if (incompleteEntries.length >= 2 && (overallScore ?? 0) > 60 && refinedRegime !== "confirmed_breakout" && !/SCORE_CAPPED_BY_INCOMPLETE_SCENARIO/.test(scoreWarningText)) {
    warnings.push("SCORE_CAPPED_BY_INCOMPLETE_SCENARIO: 진입 시나리오가 미완성인데 종합 점수가 높게 유지됩니다.");
  }

  if (
    aggressiveStrategyPattern.test(`${decision.primaryStrategy.title} ${decision.displayedEntrySignal.label}`) &&
    /확인 필요|미확인|손절 기준 확인 필요/.test(`${decision.primaryStrategy.stop} ${decision.priceRoles.stopLoss?.text ?? ""}`)
  ) {
    warnings.push("공격적 또는 분할 진입 전략에 명확한 손절 기준이 부족합니다.");
  }

  const rsiOverboughtBuy = indicators.some((row) => {
    const text = `${row.name} ${row.value} ${row.interpretation} ${row.signal}`;
    const numericRsi = /rsi/i.test(row.name) ? parsePriceFromText(row.value) : null;
    const overbought = /과매수|과열|추격매수|overbought|extended/i.test(text) || (numericRsi !== null && numericRsi >= 70);
    return /rsi/i.test(row.name) && overbought && /^(매수|buy|bullish)$/i.test(safeText(row.signal, ""));
  });
  if (rsiOverboughtBuy) {
    warnings.push("RSI 과매수 구간이 단순 매수 신호로 표시될 수 있습니다.");
  }

  const nearResistance =
    /저항|목표가 근접|목표 여유 낮음/.test(`${decision.priceRoles.currentPrice.status ?? ""} ${targetStatus} ${finalText}`) ||
    samePriceZone(currentValue, resistanceValue);
  if (nearResistance && decision.displayedEntrySignal.mode === "pullback" && /매수 우세|진입 우세|눌림목 진입 우세/.test(entryText) && !/미래|대기|확인|관심/.test(entryText)) {
    warnings.push("저항권 근처에서 미래 눌림목 점수가 즉시 진입 허가처럼 표시될 수 있습니다.");
  }

  if (decision.finalActionTone === "caution" && decision.displayedEntrySignal.mode === "pullback" && !/미래|대기|확인|관심|조건부|지지|재지지/.test(entryText)) {
    warnings.push("주의 구간의 눌림목 신호가 미래/대기/확인 맥락 없이 표시될 수 있습니다.");
  }

  if (/신규 진입 보류|진입 보류|진입 회피|위험 관리/.test(finalText) && /현재가 진입 유리|현재가 진입 우세|분할 진입 가능|소액 진입 가능|적극 진입|강력 매수|매수 우세/.test(currentEntryText)) {
    warnings.push("신규 진입 보류 판단과 현재가 유리 라벨이 충돌할 수 있습니다.");
  }

  if ((targetMissing || targetValue === null) && targetLooksNormal) {
    warnings.push("목표가가 유효하지 않은데 정상 목표처럼 표시될 수 있습니다.");
  }

  warnings.push(...validateReportDecisionDisplayValues(decision));

  return Array.from(new Set(warnings));
}

function warnReportDecisionInDevelopment(decision: ReportDecision) {
  if (process.env.NODE_ENV !== "development" || !decision.consistencyWarnings?.length) return;
  console.warn("[ReportDecision consistency]", decision.consistencyWarnings);
}

export function buildReportDecision(
  rawReport: AnalysisResponse,
  report: TradingReport,
  context: PriceContext,
  finalAction: InstitutionalReportViewModel["finalAction"],
  dataset: ReturnType<typeof buildActionableTradingDataset>,
  displayedEntry: DisplayedEntrySignal,
  signal: ReturnType<typeof deriveSignal>,
  totalScore: number | null,
): ReportDecision {
  const breakoutState = deriveBreakoutState(report, context);
  const baseEntryStrategies = {
    current: entryStrategyDecision("current", dataset.entryMode.currentEntry, context),
    pullback: entryStrategyDecision("pullback", dataset.entryMode.pullbackEntry, context),
    breakout: entryStrategyDecision("breakout", dataset.entryMode.breakoutEntry, context),
  };
  let trendOpportunity = deriveTrendOpportunity(report, context, breakoutState, dataset.indicators);
  const currentEntryScore = safeScore(report.scoreSummary?.entryScores?.currentEntry?.score) ?? 0;
  const breakoutEntryScore = safeScore(report.scoreSummary?.entryScores?.breakoutEntry?.score) ?? 0;
  const opportunityAllowed =
    trendOpportunity === "none" &&
    context.chartRegime !== "support_breakdown" &&
    context.chartRegime !== "downtrend" &&
    context.chartRegime !== "overheated_breakout" &&
    context.chartRegime !== "overextended_surge" &&
    context.target !== null &&
    context.targetGapLabel !== "목표 여유 낮음";
  const hasUsableAttemptTarget = context.target !== null || /^\d/.test(safeText(context.targetStatus, ""));
  const breakoutAttemptAllowed =
    trendOpportunity === "none" &&
    breakoutState === "breakout_attempt" &&
    context.chartRegime !== "support_breakdown" &&
    context.chartRegime !== "downtrend" &&
    context.chartRegime !== "overheated_breakout" &&
    context.chartRegime !== "overextended_surge" &&
    (context.targetGapLabel !== "목표 여유 낮음" || hasUsableAttemptTarget);
  if (breakoutAttemptAllowed || (opportunityAllowed && breakoutState === "breakout_attempt" && breakoutEntryScore >= 50 && currentEntryScore >= 30)) {
    trendOpportunity = "bullish_breakout_attempt";
  } else if (
    opportunityAllowed &&
    (context.chartRegime === "uptrend_pullback" || context.chartRegime === "uptrend_consolidation" || context.chartRegime === "healthy_pullback") &&
    currentEntryScore >= 45
  ) {
    trendOpportunity = currentEntryScore >= 55 ? "uptrend_continuation" : "controlled_uptrend_entry";
  }
  const tone = finalActionTone(report, context, finalAction, breakoutState, trendOpportunity);
  const normalizedPriceRoles = normalizeDecisionPriceRoles(report, rawReport, context, dataset);
  const instrumentRiskProfile = deriveInstrumentRiskProfile(rawReport, report);
  const candleRiskProfile = deriveCandleRiskProfile(report, context, dataset.indicators);
  const targetProfile = deriveTargetProfile(context, report);
  const refinedRegime = deriveRefinedRegime(report, context, breakoutState, instrumentRiskProfile, candleRiskProfile, targetProfile);
  const calibratedEntryStrategies = calibrateReportDecisionEntries(baseEntryStrategies, report, context, breakoutState, trendOpportunity, tone);
  const refinedEntryCalibration = calibrateScoresByRefinedRegime(
    calibratedEntryStrategies,
    report,
    context,
    refinedRegime,
    breakoutState,
    instrumentRiskProfile,
    candleRiskProfile,
    targetProfile,
  );
  const normalizedEntryStrategies = normalizeDecisionEntryStrategies(
    refinedEntryCalibration.entryStrategies,
    report,
    context,
    normalizedPriceRoles.priceRoles,
    normalizedPriceRoles.warnings,
    breakoutState,
    trendOpportunity,
    tone,
  );
  let entryStrategies = normalizedEntryStrategies.entryStrategies;
  const hasInvalidLongEntryWarning = normalizedPriceRoles.warnings.some((warning) => /SUPPORT_ABOVE_CURRENT|INVALID_LONG_STOP|LONG_STOP_RECHECK_REQUIRED/.test(warning));
  if (
    refinedRegime === "healthy_uptrend_pullback" &&
    !hasInvalidLongEntryWarning &&
    tone !== "risk" &&
    (entryStrategies.current.score ?? 0) < 45
  ) {
    entryStrategies = {
      ...entryStrategies,
      current: patchEntryStrategy(entryStrategies.current, {
        score: scoreInDisplayRange(entryStrategies.current.score, 45, instrumentRiskProfile.isLeveraged ? 58 : 62),
        label: entryStrategies.current.label || "조건부 분할",
        tone: "neutral",
      }),
    };
  }
  const normalizedDisplayedEntry = normalizeDecisionEntrySignal(displayedEntry, report, context, tone, breakoutState, trendOpportunity, entryStrategies);
  const guardedDisplayedEntry = guardDisplayedEntrySignalForState(normalizedDisplayedEntry, context, tone);
  const targetCollapsed =
    context.targetRoleCollapsed ||
    samePriceZone(context.target, context.current) ||
    samePriceZone(context.target, context.resistance) ||
    context.targetGapLabel === "목표 여유 낮음";
  const targetStatus = targetCollapsed
    ? safeText(context.targetStatus || context.targetGapLabel, "목표 여유 낮음")
    : safeText(context.targetStatus || context.targetGapLabel, safeText(context.targetText, "추가 목표 확인 필요"));
  const rawPrimaryStrategy = buildDecisionPrimaryStrategy(report, context, finalAction, entryStrategies, guardedDisplayedEntry, tone, breakoutState, trendOpportunity, refinedRegime, targetProfile);
  const guardedPrimaryStrategy = guardPrimaryStrategyForState(rawPrimaryStrategy, report, context, tone);
  const primaryStrategy = {
    ...guardedPrimaryStrategy,
    target: safeText(normalizedPriceRoles.priceRoles.target?.text ?? normalizedPriceRoles.priceRoles.targetStatus, guardedPrimaryStrategy.target),
  };
  const displayGuidance = buildDecisionDisplayGuidance(report, context, primaryStrategy, guardedDisplayedEntry, tone);
  const signalSummary = normalizeDecisionSignalSummary(
    rawReport,
    report,
    context,
    entryStrategies,
    guardedDisplayedEntry,
    normalizedPriceRoles.priceRoles,
    normalizedPriceRoles.warnings,
    normalizedEntryStrategies.warnings,
    tone,
    breakoutState,
    totalScore,
    refinedRegime,
    instrumentRiskProfile,
    candleRiskProfile,
    targetProfile,
    refinedEntryCalibration.scoreWarnings,
    refinedEntryCalibration.overallSeed,
  );
  const decision: ReportDecision = {
    chartRegime: context.chartRegime,
    breakoutState,
    trendOpportunity,
    refinedRegime,
    instrumentRiskProfile,
    candleRiskProfile,
    targetProfile,
    finalActionState: getActionState(report),
    finalActionLabel: primaryStrategy.title,
    finalActionTone: tone,
    primaryStrategy,
    priceRoles: normalizedPriceRoles.priceRoles,
    entryStrategies,
    displayedEntrySignal: guardedDisplayedEntry,
    signalSummary,
    ...displayGuidance,
  };
  const consistencyWarnings = [
    ...normalizedPriceRoles.warnings,
    ...normalizedEntryStrategies.warnings,
    ...refinedEntryCalibration.scoreWarnings,
    ...(signalSummary.scoreWarnings ?? []),
    ...buildDecisionWarnings(report, context, primaryStrategy, guardedDisplayedEntry, tone),
    ...validateReportDecision(decision, dataset.indicators),
  ];

  return {
    ...decision,
    ...(consistencyWarnings.length ? { consistencyWarnings: Array.from(new Set(consistencyWarnings)) } : {}),
  };
}

export function buildInstitutionalReportViewModel(rawReport: AnalysisResponse): InstitutionalReportViewModel {
  const normalizedReport = normalizeTradingReport(rawReport);
  const context = buildPriceContext(rawReport, normalizedReport);
  const finalAction = deriveFinalAction(normalizedReport, context);
  const dataset = buildActionableTradingDataset(normalizedReport, rawReport, context, finalAction);
  const entryMode = dataset.entryMode;
  const displayedEntry = deriveDisplayedEntrySignal(normalizedReport, entryMode, context, finalAction);
  const signal = deriveSignal(normalizedReport, context, entryMode);
  const totalScore = safeScore(normalizedReport.scoreSummary?.totalScore);
  const reportDecision = buildReportDecision(rawReport, normalizedReport, context, finalAction, dataset, displayedEntry, signal, totalScore);
  const reportConfidenceScore = dataConfidenceDisplayScore(normalizedReport, context);
  warnReportDecisionInDevelopment(reportDecision);
  const displayIdentity = buildDisplayIdentity(rawReport, normalizedReport, context);
  const priceUnit = displayIdentity.priceUnitNote;
  const trendLabel = chartRegimeLabels[context.chartRegime] ?? chartRegimeLabels.unknown;
  const trendDescription = firstText(
    [normalizedReport.chartRegime?.reasons?.[0], rawReport.aiAnalysis?.visualTrend, normalizedReport.finalSummary.reason],
    "차트 상태 확인이 필요합니다.",
  );
  const supportZones = [
    normalizedReport.analysisMeta?.mainSupports?.[0],
    normalizedReport.keyLevels.supports[0]?.priceZone,
    normalizedReport.priceRoles?.pullbackEntry?.priceZone,
  ];
  const resistanceZones = [
    normalizedReport.analysisMeta?.mainResistances?.[0],
    normalizedReport.keyLevels.resistances[0]?.priceZone,
    normalizedReport.priceRoles?.pivot?.priceZone,
  ];

  return {
    hero: {
      stockName: displayIdentity.ticker,
      ticker: displayIdentity.ticker,
      marketTag: displayIdentity.marketLabel,
      displayIdentity,
      displayTitle: displayIdentity.ticker,
      companyLine: displayIdentity.companyLine,
      displayMarket: displayIdentity.marketLabel,
      currentPrice: displayIdentity.priceText,
      currencyOrUnit: displayIdentity.currencyUnitLabel,
      displayCurrencyUnit: displayIdentity.priceUnitNote,
      priceChange: "-",
      confidenceScore: reportConfidenceScore,
      confidenceLabel: confidenceLabel(normalizedReport.finalSummary.confidence, reportConfidenceScore),
      trendLabel,
      trendDescription,
      miniChartData: [
        { label: "지지", value: context.supportText },
        { label: "현재", value: context.currentText },
        { label: "저항", value: context.resistanceText },
      ],
      signalLabel: signal.signalLabel,
      signalTone: signal.signalTone,
    },
    basisSummary: {
      chartBasis: compactAnalysisBasis(normalizedReport.analysisMeta?.chartTimeframe, rawReport.aiAnalysis?.timeframeEstimate),
      currentPrice: context.currentText,
      pivotPrice: context.pivotText,
      recentSupport: joinZones(supportZones),
      recentResistance: joinZones(resistanceZones),
      currentLocation: context.currentLocation,
      priceUnit,
      preferredStrategy: context.preferredStrategy,
    },
    finalAction,
    entryMode,
    scorePanel: {
      overallScore: reportDecision.signalSummary.overallScore,
      momentumScore: reportDecision.signalSummary.momentumScore,
      breakoutScore: reportDecision.signalSummary.breakoutScore,
      riskScore: reportDecision.signalSummary.riskScore,
      entryScore: reportDecision.displayedEntrySignal.score,
      entryScoreLabel: reportDecision.displayedEntrySignal.label,
      entryScoreMode: displayedEntry.mode,
      entryScoreExplanation: reportDecision.displayedEntrySignal.explanation,
    },
    keyLevels: {
      ...dataset.keyLevels,
    },
    marketSummary: dataset.marketSummary,
    scenarios: dataset.scenarios,
    indicators: dataset.indicators,
    pattern: dataset.pattern,
    insightNotes: dataset.insightNotes,
    riskNotice: buildRiskNotice(normalizedReport),
    reportDecision,
  };
}
