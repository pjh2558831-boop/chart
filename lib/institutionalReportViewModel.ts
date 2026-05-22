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

export interface InstitutionalReportViewModel {
  hero: {
    stockName: string;
    ticker: string;
    marketTag: string;
    currentPrice: string;
    currencyOrUnit: string;
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
}

type PriceContext = {
  currentText: string;
  heroPrice: string;
  current: number | null;
  pivotText: string;
  pivot: number | null;
  supportText: string;
  support: number | null;
  secondarySupportText: string;
  resistanceText: string;
  resistance: number | null;
  targetText: string;
  target: number | null;
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
  resistance_test: "저항권 테스트",
  support_breakdown: "지지선 이탈",
  downtrend: "하락 추세",
  overextended_surge: "급등 과열",
  breakout_retest_confirmed: "돌파 후 재지지",
  breakout_wait: "돌파 확인 대기",
  range_lower_support: "박스권 하단",
  range_upper_resistance: "박스권 상단",
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
  if (current === null || upper === null) {
    return {
      label: "확인 필요",
      explanation: "목표가와 현재가의 거리 계산이 제한되어 목표 여유 확인이 필요합니다.",
    };
  }

  if (upper <= current) {
    return {
      label: "목표 여유 낮음",
      explanation: "목표가와 현재가가 거의 같거나 목표가가 현재가보다 낮아 추격매수는 불리합니다.",
    };
  }

  const targetGapPercent = percentGap(current, upper);
  const supportGap = support !== null ? current - support : null;
  const calculatedRiskReward = supportGap !== null && supportGap > 0 ? (upper - current) / supportGap : null;
  const riskReward = context.currentRiskReward ?? calculatedRiskReward;

  if ((targetGapPercent !== null && targetGapPercent <= 1.5) || (riskReward !== null && riskReward < 1)) {
    return {
      label: "목표 여유 낮음",
      explanation: `현재가와 ${context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText} 구간의 거리가 가까워 현재가 진입 손익비가 낮습니다.`,
    };
  }

  if (riskReward !== null && riskReward >= 1.5) {
    return {
      label: "목표 여유 있음",
      explanation: `주요 지지에서 반등 확인 시 ${context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText} 구간까지 상승 여지를 볼 수 있습니다.`,
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
  const targetText = firstText(
    [
      report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
      report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
      report.tradePlan.targets.firstTarget?.priceZone,
      report.priceRoles?.targets?.pullbackTargets?.[0],
      report.priceRoles?.targets?.breakoutTargets?.[0],
    ],
    FALLBACK.unknown,
  );

  const partial = {
    currentText: current.summaryPrice,
    heroPrice: current.heroPrice,
    current: current.numeric,
    pivotText,
    pivot: parsePriceFromText(pivotText),
    supportText,
    support: parsePriceFromText(supportText),
    secondarySupportText,
    resistanceText,
    resistance: parsePriceFromText(resistanceText),
    targetText,
    target: parsePriceFromText(targetText),
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
  if (context.chartRegime === "support_breakdown") {
    return {
      title: "위험 관리 / 신규 진입 보류",
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
  if (context.chartRegime === "downtrend_rebound") {
    return {
      title: context.currentLocation === "저항 바로 아래" || context.currentLocation === "목표가 근접" ? "저항권 테스트 / 추격매수 주의" : "하락추세 반등 / 돌파 확인 대기",
      subtitle: "하락 이후 반등은 추세 전환으로 단정하기 어렵고, 주요 저항 회복과 돌파 후 재지지 확인이 필요합니다.",
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
    return {
      title: "저항권 테스트 / 돌파 확인 대기",
      subtitle: "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.",
      reason: "저항권에서는 현재가 추격보다 돌파와 재지지 확인을 먼저 봅니다.",
      actionType: "RESISTANCE_TEST_WAIT",
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

  if (context.currentLocation === "저항 바로 아래" || context.currentLocation === "박스권 상단" || context.chartRegime === "range_upper_resistance") {
    return {
      title: "저항 근접 / 보유자는 일부 익절, 미보유자는 대기",
      subtitle: "보유자는 일부 익절 또는 돌파 안착 여부를 확인하고, 미보유자는 추격매수를 피하는 것이 유리합니다.",
      reason: "저항권에서는 신규 진입보다 보유자 대응과 돌파 확인이 우선입니다.",
      actionType: "RESISTANCE_HOLDER_ONLY",
    };
  }

  if (context.chartRegime === "uptrend_pullback") {
    return {
      title: "상승추세 눌림 / 지지 확인 시 관심",
      subtitle: "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.",
      reason: "상승추세 눌림은 지지 확인 후 조건부 진입으로 보는 것이 자연스럽습니다.",
      actionType: "UPTREND_PULLBACK_INTEREST",
    };
  }

  if (context.chartRegime === "uptrend_consolidation") {
    return {
      title: "상승추세 조정 / 지지 확인 필요",
      subtitle: "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다.",
      reason: "상승 이후 조정 구간에서는 지지 유지와 재상승 확인이 핵심입니다.",
      actionType: "UPTREND_CONSOLIDATION_WAIT",
    };
  }

  if (context.currentLocation === "지지권 근처" || context.currentLocation === "박스권 하단" || context.chartRegime === "range_lower_support" || context.chartRegime === "healthy_pullback") {
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
  if (/확인|대기|주의|조건부/.test(label)) return "caution";
  if (/미래/.test(label)) return "caution";
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
  const currentUnfavorable =
    context.currentLocation === "목표가 근접" ||
    context.currentLocation === "저항 바로 아래" ||
    context.chartRegime === "downtrend_rebound" ||
    context.chartRegime === "resistance_test" ||
    context.chartRegime === "support_breakdown" ||
    context.targetGapLabel === "목표 여유 낮음" ||
    (context.currentRiskReward !== null && context.currentRiskReward < 1);
  const futurePullbackOnly = context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test";

  const currentLabel = currentUnfavorable
    ? currentScore !== null && currentScore < 30 ? "부적합" : "불리"
    : safeText(entries.currentEntry?.label, entryScoreLabel(currentScore));
  let pullbackLabel = safeText(entries.pullbackEntry?.label, entryScoreLabel(pullbackScore));
  if (futurePullbackOnly && (pullbackScore ?? 0) >= 50) {
    pullbackLabel = "미래 눌림목 관심";
  } else if (context.chartRegime === "uptrend_pullback" && (pullbackScore ?? 0) >= 60) {
    pullbackLabel = "지지 확인 시 관심";
  } else if (context.chartRegime === "uptrend_consolidation" && (pullbackScore ?? 0) >= 55) {
    pullbackLabel = "눌림 대기";
  } else if (context.supportText !== FALLBACK.unknown && (pullbackScore ?? 0) >= 65) {
    pullbackLabel = "지지 확인 시 관심";
  }

  let breakoutLabel = safeText(entries.breakoutEntry?.label, entryScoreLabel(breakoutScore));
  if (futurePullbackOnly) {
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
      condition: currentUnfavorable ? "돌파 후 재지지 확인 전까지 신규 진입은 신중" : "짧은 손절 기준 확인 시 제한적으로 검토",
      stopLoss: practicalStopLoss("current", report, context),
      target: context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText,
      riskReward: practicalRiskRewardText(report.tradePlan.riskRewardByEntry?.current, context, "current"),
      explanation: currentUnfavorable
        ? `현재가가 ${context.resistanceText !== FALLBACK.unknown ? context.resistanceText : context.targetText} 저항 또는 목표 구간에 가까워 목표 여유가 작습니다.`
        : safeText(entries.currentEntry?.explanation, "현재가 진입은 지지와 손절 기준 확인이 필요합니다."),
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

  if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || actionState === "HIGH_RISK") {
    return { signalLabel: "위험 관리", signalTone: "risk" as SignalTone };
  }
  if (actionState === "AVOID" || (currentScore < 30 && pullbackScore < 30 && breakoutScore < 30)) {
    return { signalLabel: "진입 보류", signalTone: "risk" as SignalTone };
  }
  if (context.chartRegime === "resistance_test" || context.currentLocation === "저항 바로 아래" || context.currentLocation === "목표가 근접" || context.targetGapLabel === "목표 여유 낮음") {
    return { signalLabel: "주의", signalTone: "caution" as SignalTone };
  }
  if (context.chartRegime === "downtrend_rebound") {
    return { signalLabel: "대기", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "uptrend_pullback" && pullbackScore >= 60) {
    return { signalLabel: "눌림 관심", signalTone: "watch" as SignalTone };
  }
  if (context.chartRegime === "uptrend_consolidation") {
    return { signalLabel: "지지 확인", signalTone: "watch" as SignalTone };
  }
  if (currentScore < 50 && strongestEntryScore >= 60) {
    return { signalLabel: "대기", signalTone: "watch" as SignalTone };
  }
  if (context.breakoutRetestConfirmed && breakoutScore >= 65 && currentScore >= 50) {
    return { signalLabel: "매수", signalTone: "buy" as SignalTone };
  }
  if (actionState === "PULLBACK_ENTRY" || actionState === "BREAKOUT_WAIT") {
    return { signalLabel: "대기", signalTone: "watch" as SignalTone };
  }
  if (actionState === "HOLD_ONLY") {
    return { signalLabel: "보유 관망", signalTone: "hold" as SignalTone };
  }
  if (actionState === "STRONG_BUY" && currentScore >= 50 && strongestEntryScore >= 65) {
    return { signalLabel: "매수", signalTone: "buy" as SignalTone };
  }
  return { signalLabel: "중립", signalTone: "neutral" as SignalTone };
}

function indicatorSignal(text: unknown): Pick<IndicatorRow, "signal" | "tone"> {
  const value = safeText(text, "").toLowerCase();
  if (/bull|buy|상승|매수|우호|positive|increase/.test(value)) return { signal: "매수", tone: "positive" };
  if (/bear|sell|하락|매도|위험|negative|break/.test(value)) return { signal: "매도", tone: "risk" };
  if (/weak|주의|부족|제한|over|과열/.test(value)) return { signal: "주의", tone: "caution" };
  return { signal: "중립", tone: "neutral" };
}

function formatIndicatorValue(value: unknown, fallback = "수치 확인 제한") {
  if (typeof value === "number") return Number.isFinite(value) ? formatPrice(value) : fallback;
  return safeText(value, fallback);
}

function interpretRsi(value: unknown, fallback: unknown) {
  const rsi = safeNumber(value);
  if (rsi !== null) {
    if (rsi >= 70) return "RSI가 과매수권에 있어 추격매수 부담이 큽니다.";
    if (rsi >= 60) return "RSI상 상승 우위가 있으나 단기 과열 여부를 함께 확인해야 합니다.";
    if (rsi >= 45) return "RSI는 중립권으로 단독 진입 신호보다는 가격 위치 확인이 우선입니다.";
    if (rsi >= 30) return "RSI가 약세권에 가까워 반등 확인 전까지 보수적 접근이 필요합니다.";
    return "RSI가 과매도권에 있어 기술적 반등 가능성은 있으나 지지 확인이 필요합니다.";
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
  if (/upper|상단/.test(source)) return "볼린저밴드 상단 근접 가능성이 있어 단기 과열과 추격매수 부담을 함께 봅니다.";
  if (/lower|하단/.test(source)) return "볼린저밴드 하단 근접 가능성이 있어 반등 가능성은 있으나 지지 확인이 필요합니다.";
  if (/squeeze|수축/.test(source)) return "밴드 수축 구간이면 변동성 확대 전조로 돌파 방향 확인이 중요합니다.";
  if (/expand|확장/.test(source)) return "밴드 확장 구간이면 추세 진행 가능성이 있으나 손절 기준을 함께 확인해야 합니다.";
  return "밴드 위치가 명확하지 않아 변동성 판단은 제한적이며, 지지/저항 돌파 여부를 우선합니다.";
}

function buildIndicators(rawReport: AnalysisResponse, report: TradingReport) {
  const readings = rawReport.aiAnalysis?.indicatorReadings;
  const technical = rawReport.technicalAnalysis;
  const confirmed = report.indicatorAnalysis.confirmed ?? [];
  const unavailable = report.indicatorAnalysis.unavailable ?? [];
  const scaleLimited = report.analysisMeta?.priceUnitConfidence === "low" || safeText(report.analysisMeta?.priceUnit, "").includes("확인 필요");

  const normalizedByName = (keyword: string) => confirmed.find((item) => safeText(item.name, "").includes(keyword));
  const unavailableByName = (keyword: string) => unavailable.find((item) => safeText(item.name, "").includes(keyword));
  const macdValue = typeof technical?.macd?.macd === "number" || typeof technical?.macd?.signal === "number"
    ? `${formatPrice(technical?.macd?.macd)} / ${formatPrice(technical?.macd?.signal)}`
    : null;
  const maValue = typeof technical?.movingAverages?.ma20 === "number" || typeof technical?.movingAverages?.ma60 === "number"
    ? `${formatPrice(technical?.movingAverages?.ma20)} / ${formatPrice(technical?.movingAverages?.ma60)}`
    : null;
  const trendLabel = chartRegimeLabels[report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown"];

  const rows = [
    {
      name: "RSI",
      value: readings?.rsi?.valueEstimate ?? technical?.rsi?.value ?? null,
      interpretation: interpretRsi(readings?.rsi?.valueEstimate ?? technical?.rsi?.value, readings?.rsi?.status ?? technical?.rsi?.interpretation ?? normalizedByName("RSI")?.explanation ?? unavailableByName("RSI")?.reason),
    },
    {
      name: "MACD",
      value: scaleLimited ? "수치 확인 제한" : macdValue,
      interpretation: interpretMacd(technical?.macd?.macd, technical?.macd?.signal, readings?.macd?.status ?? technical?.macd?.interpretation ?? normalizedByName("MACD")?.explanation ?? unavailableByName("MACD")?.reason, trendLabel),
    },
    {
      name: "이동평균선",
      value: scaleLimited ? "수치 확인 제한" : maValue,
      interpretation: interpretMovingAverage(rawReport, report, readings?.movingAverages?.status ?? normalizedByName("이동")?.explanation ?? unavailableByName("이동")?.reason),
    },
    {
      name: "거래량",
      value: technical?.volume?.ratio ? `${technical.volume.ratio.toFixed(2)}배` : null,
      interpretation: safeText(readings?.volume?.status ?? technical?.volume?.interpretation ?? normalizedByName("거래량")?.explanation ?? rawReport.aiAnalysis?.volumeObservation, "이미지에서 명확한 거래량 급증은 확인되지 않아 돌파 신뢰도 판단은 보수적으로 봅니다."),
    },
    {
      name: "볼린저 밴드",
      value: readings?.bollingerBands?.position ?? technical?.bollingerBands?.position ?? null,
      interpretation: interpretBollinger(readings?.bollingerBands?.position ?? technical?.bollingerBands?.position, readings?.bollingerBands?.status ?? readings?.bollingerBands?.reason ?? technical?.bollingerBands?.interpretation ?? unavailableByName("볼린저")?.reason),
    },
  ];

  return rows.map((row) => {
    const interpretation = safeText(row.interpretation, "수치 데이터가 제한적이므로 가격 위치와 추세 구조를 기준으로 중립 판단합니다.");
    const signal = indicatorSignal(interpretation);
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
    if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test" || context.chartRegime === "overextended_surge") return "낮음";
    return "보통";
  }
  if (tone === "risk") {
    if (context.chartRegime === "support_breakdown" || context.chartRegime === "downtrend" || context.chartRegime === "downtrend_rebound" || context.chartRegime === "resistance_test" || context.chartRegime === "range_upper_resistance") return "높음";
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

function buildBestEntryScore(entryMode: InstitutionalReportViewModel["entryMode"], context: PriceContext) {
  const candidates = [
    { score: entryMode.currentEntry.score, label: "현재가 진입 우세" },
    { score: entryMode.pullbackEntry.score, label: "눌림목 진입 우세" },
    { score: entryMode.breakoutEntry.score, label: "돌파 진입 우세" },
  ].filter((item): item is { score: number; label: string } => typeof item.score === "number" && Number.isFinite(item.score));

  if (!candidates.length) return { entryScore: null, entryScoreLabel: FALLBACK.needsCheck };
  if (context.chartRegime === "resistance_test" || context.chartRegime === "downtrend_rebound") {
    const current = entryMode.currentEntry.score ?? 0;
    const breakout = entryMode.breakoutEntry.score ?? 0;
    const pullback = Math.min(entryMode.pullbackEntry.score ?? 0, 60);
    return {
      entryScore: Math.max(current, breakout, pullback),
      entryScoreLabel: "돌파 후 재지지 확인 우선",
    };
  }
  if (context.chartRegime === "support_breakdown") {
    return {
      entryScore: Math.max(entryMode.currentEntry.score ?? 0, entryMode.pullbackEntry.score ?? 0, entryMode.breakoutEntry.score ?? 0),
      entryScoreLabel: "위험 관리 우선",
    };
  }
  const best = candidates.reduce((winner, item) => (item.score > winner.score ? item : winner), candidates[0]);
  return { entryScore: best.score, entryScoreLabel: best.label };
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
  } else if (context.chartRegime === "overextended_surge") {
    notes.push("단기 급등 후 저항 구간에서는 미보유자의 추격매수보다 눌림 대기가 유리합니다.");
    notes.push("보유자는 일부 익절 또는 돌파 안착 여부를 확인할 수 있습니다.");
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
    upperBreakoutTarget: firstText([report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone, report.tradePlan.targets.secondTarget?.priceZone], context.targetText),
    stopLoss: practicalStopLoss("current", report, context),
    target: context.targetGapLabel === "목표 여유 낮음"
      ? firstText([context.targetText, context.resistanceText], "목표가 근접")
      : context.targetText,
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

export function buildInstitutionalReportViewModel(rawReport: AnalysisResponse): InstitutionalReportViewModel {
  const normalizedReport = normalizeTradingReport(rawReport);
  const context = buildPriceContext(rawReport, normalizedReport);
  const finalAction = deriveFinalAction(normalizedReport, context);
  const dataset = buildActionableTradingDataset(normalizedReport, rawReport, context, finalAction);
  const entryMode = dataset.entryMode;
  const bestEntry = buildBestEntryScore(entryMode, context);
  const signal = deriveSignal(normalizedReport, context, entryMode);
  const totalScore = safeScore(normalizedReport.scoreSummary?.totalScore);
  const priceUnit = firstText(
    [normalizedReport.analysisMeta?.priceUnit, rawReport.aiAnalysis?.symbolDetection?.currency],
    FALLBACK.noUnit,
  );
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
      stockName: firstText([normalizedReport.analysisMeta?.symbol, rawReport.aiAnalysis?.symbolDetection?.detectedName], FALLBACK.unknown),
      ticker: safeText(rawReport.aiAnalysis?.symbolDetection?.detectedTicker, "-"),
      marketTag: firstText([rawReport.aiAnalysis?.symbolDetection?.detectedMarket, rawReport.aiAnalysis?.symbolDetection?.detectedExchange], "-"),
      currentPrice: context.heroPrice,
      currencyOrUnit: priceUnit,
      priceChange: "-",
      confidenceScore: totalScore,
      confidenceLabel: confidenceLabel(normalizedReport.finalSummary.confidence, totalScore),
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
      chartBasis: safeText(normalizedReport.analysisMeta?.chartTimeframe, "추정 불가"),
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
      overallScore: totalScore,
      momentumScore: safeScore(normalizedReport.scoreSummary?.buyScore),
      breakoutScore: safeScore(normalizedReport.scoreSummary?.entryScores?.breakoutEntry?.score),
      riskScore: safeScore(normalizedReport.scoreSummary?.riskScore),
      entryScore: bestEntry.entryScore,
      entryScoreLabel: bestEntry.entryScoreLabel,
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
  };
}
