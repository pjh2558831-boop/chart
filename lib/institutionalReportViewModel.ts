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
    volatilityScore: number | null;
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
    confidence: string;
    detectedStructure: string;
    continuationProbability: string;
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
  noStop: "손절 기준 확인 필요",
  noUnit: "가격 단위 확인 필요",
  noLevels: "주요 지지/저항 확인 필요",
};

const chartRegimeLabels: Record<ChartRegime, string> = {
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
  return safeText(value, "분석 불가");
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
  if (context.chartRegime === "downtrend") return "추세 전환 확인 전 신규 진입 보류";
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
  if (context.chartRegime === "downtrend") {
    return {
      title: "하락 추세 / 신규 진입 보류",
      subtitle: "기술적 반등 가능성은 있으나 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.",
      reason: "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다.",
      actionType: "DOWNTREND_CAUTION",
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

function entryTone(label: string): EntryTone {
  if (/후보|관심|가능|유리/.test(label)) return "positive";
  if (/부적합|불리|회피/.test(label)) return "risk";
  if (/확인|대기|주의|조건부/.test(label)) return "caution";
  return "neutral";
}

function entryScoreLabel(score: number | null) {
  if (score === null) return FALLBACK.needsCheck;
  if (score <= 29) return "부적합";
  if (score <= 49) return "불리";
  if (score <= 64) return "확인 필요";
  if (score <= 79) return "후보";
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
  const currentStop = report.tradePlan.stopLossByEntry?.currentEntry;
  const pullbackStop = report.tradePlan.stopLossByEntry?.pullbackEntry;
  const breakoutStop = report.tradePlan.stopLossByEntry?.breakoutEntry;
  const currentUnfavorable =
    context.currentLocation === "목표가 근접" ||
    context.currentLocation === "저항 바로 아래" ||
    context.targetGapLabel === "목표 여유 낮음" ||
    (context.currentRiskReward !== null && context.currentRiskReward < 1);

  const currentLabel = currentUnfavorable
    ? currentScore !== null && currentScore < 30 ? "부적합" : "불리"
    : safeText(entries.currentEntry?.label, entryScoreLabel(currentScore));
  const pullbackLabel = context.supportText !== FALLBACK.unknown && (pullbackScore ?? 0) >= 65
    ? "지지 확인 시 관심"
    : safeText(entries.pullbackEntry?.label, entryScoreLabel(pullbackScore));
  const breakoutLabel = context.breakoutRetestConfirmed && (breakoutScore ?? 0) >= 65
    ? "돌파 매수 후보"
    : context.pivotText !== FALLBACK.unknown
      ? "돌파 확인 필요"
      : safeText(entries.breakoutEntry?.label, entryScoreLabel(breakoutScore));

  return {
    currentEntry: {
      score: currentScore,
      label: currentLabel,
      condition: currentUnfavorable ? "돌파 후 재지지 확인 전까지 신규 진입은 신중" : "짧은 손절 기준 확인 시 제한적으로 검토",
      stopLoss: firstText([currentStop?.condition, currentStop?.priceZone, report.tradePlan.stopLoss.shortTerm?.condition], FALLBACK.noStop),
      target: context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText,
      riskReward: riskRewardText(report.tradePlan.riskRewardByEntry?.current),
      explanation: currentUnfavorable
        ? `현재가가 ${context.resistanceText !== FALLBACK.unknown ? context.resistanceText : context.targetText} 저항 또는 목표 구간에 가까워 목표 여유가 작습니다.`
        : safeText(entries.currentEntry?.explanation, "현재가 진입은 지지와 손절 기준 확인이 필요합니다."),
      tone: entryTone(currentLabel),
    },
    pullbackEntry: {
      score: pullbackScore,
      label: pullbackLabel,
      condition: firstText([report.tradePlan.entry.pullbackEntry?.condition, `${context.supportText} 부근 지지 확인 시 관심`], FALLBACK.needsCheck),
      stopLoss: firstText([pullbackStop?.condition, pullbackStop?.priceZone], FALLBACK.noStop),
      target: context.targetText !== FALLBACK.unknown ? context.targetText : context.resistanceText,
      riskReward: riskRewardText(report.tradePlan.riskRewardByEntry?.pullback),
      explanation: context.supportText !== FALLBACK.unknown
        ? `${context.supportText} 부근 지지 반응이 확인되면 현재가 추격보다 조건이 개선될 수 있습니다.`
        : "명확한 지지 가격 확인이 필요합니다.",
      tone: entryTone(pullbackLabel),
    },
    breakoutEntry: {
      score: breakoutScore,
      label: breakoutLabel,
      condition: firstText([report.tradePlan.entry.breakoutEntry?.condition, `${context.pivotText} 돌파 후 위에서 재지지`], FALLBACK.needsCheck),
      stopLoss: firstText([breakoutStop?.condition, breakoutStop?.priceZone, context.pivotText !== FALLBACK.unknown ? `${context.pivotText} 재이탈` : ""], FALLBACK.noStop),
      target: firstText([report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone, context.targetText], FALLBACK.needsCheck),
      riskReward: context.breakoutRetestConfirmed ? riskRewardText(report.tradePlan.riskRewardByEntry?.breakout) : "돌파 확인 필요",
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

  if (context.chartRegime === "downtrend" || actionState === "HIGH_RISK") {
    return { signalLabel: "위험 관리", signalTone: "risk" as SignalTone };
  }
  if (actionState === "AVOID" || (currentScore < 30 && pullbackScore < 30 && breakoutScore < 30)) {
    return { signalLabel: "진입 보류", signalTone: "risk" as SignalTone };
  }
  if (context.currentLocation === "저항 바로 아래" || context.currentLocation === "목표가 근접" || context.targetGapLabel === "목표 여유 낮음") {
    return { signalLabel: "주의", signalTone: "caution" as SignalTone };
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

function formatIndicatorValue(value: unknown, fallback = "분석 불가") {
  if (typeof value === "number") return Number.isFinite(value) ? formatPrice(value) : fallback;
  return safeText(value, fallback);
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

  const rows = [
    {
      name: "RSI",
      value: readings?.rsi?.valueEstimate ?? technical?.rsi?.value ?? null,
      interpretation: readings?.rsi?.status ?? technical?.rsi?.interpretation ?? normalizedByName("RSI")?.explanation ?? unavailableByName("RSI")?.reason,
    },
    {
      name: "MACD",
      value: scaleLimited ? "수치 확인 제한" : macdValue,
      interpretation: readings?.macd?.status ?? technical?.macd?.interpretation ?? normalizedByName("MACD")?.explanation ?? unavailableByName("MACD")?.reason,
    },
    {
      name: "이동평균선",
      value: scaleLimited ? "수치 확인 제한" : maValue,
      interpretation: readings?.movingAverages?.status ?? normalizedByName("이동")?.explanation ?? unavailableByName("이동")?.reason,
    },
    {
      name: "거래량",
      value: technical?.volume?.ratio ? `${technical.volume.ratio.toFixed(2)}배` : null,
      interpretation: readings?.volume?.status ?? technical?.volume?.interpretation ?? normalizedByName("거래량")?.explanation ?? rawReport.aiAnalysis?.volumeObservation,
    },
    {
      name: "볼린저 밴드",
      value: readings?.bollingerBands?.position ?? technical?.bollingerBands?.position ?? null,
      interpretation: readings?.bollingerBands?.status ?? readings?.bollingerBands?.reason ?? technical?.bollingerBands?.interpretation ?? unavailableByName("볼린저")?.reason,
    },
  ];

  return rows.map((row) => {
    const interpretation = safeText(row.interpretation, "분석 불가");
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

function buildScenario(title: string, scenario: { condition?: string; expectedMove?: string; action?: string }, tone: ScenarioTone): ScenarioCard {
  return {
    title,
    condition: safeText(scenario.condition, "분석 데이터 없음"),
    probability: "확률 정보 없음",
    expectedMove: safeText(scenario.expectedMove, FALLBACK.needsCheck),
    interpretation: safeText(scenario.action, FALLBACK.needsCheck),
    tone,
  };
}

function buildInsightNotes(report: TradingReport, finalAction: InstitutionalReportViewModel["finalAction"], targetExplanation: string) {
  const lines = [
    finalAction.reason,
    safeText(report.scoreSummary?.explanation, ""),
    targetExplanation,
    safeText(report.chartRegime?.reasons?.[0], ""),
  ].map((line) => safeText(line, "")).filter(Boolean);
  return Array.from(new Set(lines)).slice(0, 4);
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

export function buildInstitutionalReportViewModel(rawReport: AnalysisResponse): InstitutionalReportViewModel {
  const normalizedReport = normalizeTradingReport(rawReport);
  const context = buildPriceContext(rawReport, normalizedReport);
  const finalAction = deriveFinalAction(normalizedReport, context);
  const entryMode = buildEntryModes(normalizedReport, context);
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
      volatilityScore: null,
    },
    keyLevels: {
      currentPrice: context.currentText,
      mainSupport: context.supportText,
      secondarySupport: context.secondarySupportText,
      mainResistance: context.resistanceText,
      breakoutTrigger: firstText([normalizedReport.tradePlan.entry.breakoutEntry?.priceZone, context.pivotText], FALLBACK.unknown),
      upperBreakoutTarget: firstText([normalizedReport.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone, normalizedReport.tradePlan.targets.secondTarget?.priceZone], FALLBACK.needsCheck),
      stopLoss: firstText([normalizedReport.tradePlan.stopLossByEntry?.currentEntry?.condition, normalizedReport.tradePlan.stopLoss.shortTerm?.condition, normalizedReport.tradePlan.stopLoss.condition], FALLBACK.noStop),
      target: context.targetText,
      invalidation: firstText([normalizedReport.tradePlan.stopLossByEntry?.mediumTermInvalidation?.condition, normalizedReport.tradePlan.invalidation.midTerm?.condition, normalizedReport.tradePlan.invalidation.condition], FALLBACK.needsCheck),
      targetGapLabel: context.targetGapLabel,
      targetGapExplanation: context.targetGapExplanation,
    },
    marketSummary: {
      observation: finalAction.title,
      coreInterpretation: finalAction.subtitle,
      supportResistanceInterpretation: `지지 ${context.supportText} / 저항 ${context.resistanceText}`,
      riskPoint: firstText([normalizedReport.evidence.riskFactors[0], normalizedReport.scoreSummary?.riskLabel], "리스크 요인 확인 필요"),
    },
    scenarios: {
      bullish: buildScenario("상승 시나리오", normalizedReport.scenarios.bullish, "positive"),
      neutral: buildScenario("중립 시나리오", normalizedReport.scenarios.neutral, "neutral"),
      bearish: buildScenario("하락 시나리오", normalizedReport.scenarios.bearish, "risk"),
    },
    indicators: buildIndicators(rawReport, normalizedReport),
    pattern: {
      confidence: confidenceLabel(normalizedReport.patternAnalysis.primaryPattern.confidence),
      detectedStructure: safeText(normalizedReport.patternAnalysis.primaryPattern.name, "명확한 패턴 없음"),
      continuationProbability: rawReport.aiAnalysis?.patternCandidates?.[0]?.confidenceScore != null && Number.isFinite(rawReport.aiAnalysis.patternCandidates[0].confidenceScore)
        ? `${Math.round(rawReport.aiAnalysis.patternCandidates[0].confidenceScore)}%`
        : "분석 불가",
      interpretation: firstText(
        [normalizedReport.patternAnalysis.primaryPattern.tradingMeaning, normalizedReport.patternAnalysis.primaryPattern.reason],
        "현재는 패턴보다 주요 가격대 확인이 우선입니다.",
      ),
    },
    insightNotes: buildInsightNotes(normalizedReport, finalAction, context.targetGapExplanation),
    riskNotice: buildRiskNotice(normalizedReport),
  };
}
