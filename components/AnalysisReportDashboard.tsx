"use client";

import type {
  AnalysisResponse,
  Confidence,
  IndicatorReadings,
  TradingActionState,
  TradingReport,
} from "../types/analysis";

type Tone = "positive" | "neutral" | "warning" | "negative" | "info";

type DashboardProps = {
  result: AnalysisResponse;
  report: TradingReport;
};

type CurrentPriceDisplay = {
  price: string;
  interpretation: string;
  hasNumericPrice: boolean;
};

type SignalInfo = {
  label: "BUY" | "HOLD" | "CAUTION";
  helper: string;
  tone: Tone;
};

type DashboardContext = {
  stockName: string;
  ticker: string;
  chartTimeframe: string;
  currentPriceText: string;
  currentPrice: number | null;
  pivotText: string;
  pivotPrice: number | null;
  supportText: string;
  supportPrice: number | null;
  resistanceText: string;
  resistancePrice: number | null;
  targetText: string;
  targetPrice: number | null;
  priceUnit: string;
  priceUnitConfidence: "low" | "medium" | "high";
  chartRegime: string;
  breakoutRetestConfirmed: boolean;
  currentRiskReward: number | null;
  pullbackRiskReward: number | null;
  breakoutRiskReward: number | null;
  currentPosition: string;
  targetRoom: {
    label: string;
    explanation: string;
  };
  preferredStrategy: string;
};

type DashboardFinalAction = {
  title: string;
  subtitle: string;
  actionType: string;
  reason: string;
};

type EntryModeJudgment = {
  key: "current" | "pullback" | "breakout";
  title: string;
  judgment: string;
  reason: string;
  condition: string;
  stop: string;
  target: string;
  riskReward: string;
  tone: Tone;
};

const RISK_NOTICE =
  "본 리포트는 AI 기반 기술적 분석 결과이며, 투자 참고 자료로만 활용하시기 바랍니다. 모든 투자 결정의 책임은 투자자 본인에게 있으며, 본 리포트는 투자 자문이 아닙니다.";

const chartRegimeLabel: Record<string, string> = {
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

function safeText(value: unknown, fallback = "-") {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || /^(undefined|null|nan|infinity)$/i.test(text)) return fallback;
  if (/\b(undefined|null|NaN|Infinity)\b/.test(text)) return fallback;
  return text;
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function isPlainNumericText(value: unknown) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text);
}

function safeScore(value: unknown) {
  const number = safeNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: unknown) {
  if (typeof value === "string" && safeText(value, "") !== "") return safeText(value);
  const number = safeNumber(value);
  if (number === null) return "-";
  return number.toLocaleString("ko-KR", {
    maximumFractionDigits: Math.abs(number) >= 100 ? 0 : 2,
  });
}

function formatNumericPrice(value: unknown) {
  const number = safeNumber(value);
  if (number === null) return "-";
  return number.toLocaleString("ko-KR", {
    maximumFractionDigits: Math.abs(number) >= 100 ? 0 : 2,
  });
}

function confidenceLabel(value?: Confidence | string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  if (value === "low") return "낮음";
  if (value === "unavailable") return "확인 제한";
  return safeText(value, "-");
}

function getActionState(report: TradingReport): TradingActionState {
  const state = report.finalSummary.actionState;
  if (state) return state;
  const action = report.finalSummary.finalAction;
  if (["BREAKOUT_BUY_CANDIDATE", "BUY_CANDIDATE", "CONDITIONAL_BUY"].includes(action)) return "STRONG_BUY";
  if (["PULLBACK_BUY_CANDIDATE", "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "WAIT_FOR_PULLBACK"].includes(action)) return "PULLBACK_ENTRY";
  if (["BREAKOUT_WAIT", "WAIT_FOR_BREAKOUT", "WAIT_FOR_SUPPORT_CONFIRMATION", "WAIT"].includes(action)) return "BREAKOUT_WAIT";
  if (["HOLD_AND_WATCH", "NO_NEW_ENTRY_HOLD_OK", "HOLD"].includes(action)) return "HOLD_ONLY";
  if (["SELL_RISK", "REDUCE_POSITION", "PARTIAL_TAKE_PROFIT", "TAKE_PROFIT"].includes(action)) return "HIGH_RISK";
  return "AVOID";
}

function getSignalInfo(actionState: TradingActionState, report: TradingReport): SignalInfo {
  const finalAction = report.finalSummary.finalAction;
  if (actionState === "STRONG_BUY" && finalAction === "BREAKOUT_BUY_CANDIDATE") {
    return { label: "BUY", helper: "매수 우세", tone: "positive" };
  }
  if (actionState === "STRONG_BUY") {
    return { label: "BUY", helper: "조건부 우세", tone: "positive" };
  }
  if (actionState === "PULLBACK_ENTRY") {
    return { label: "HOLD", helper: "지지 확인 필요", tone: "info" };
  }
  if (actionState === "BREAKOUT_WAIT") {
    return { label: "HOLD", helper: "돌파 확인 대기", tone: "info" };
  }
  if (actionState === "HOLD_ONLY") {
    return { label: "HOLD", helper: "관망 우세", tone: "neutral" };
  }
  if (actionState === "HIGH_RISK") {
    return { label: "CAUTION", helper: "주의 필요", tone: "warning" };
  }
  return { label: "CAUTION", helper: "진입 회피", tone: "negative" };
}

function getScoreTone(score: number | null, mode: "normal" | "risk" = "normal"): Tone {
  if (score === null) return "neutral";
  if (mode === "risk") {
    if (score >= 70) return "negative";
    if (score >= 45) return "warning";
    return "positive";
  }
  if (score >= 70) return "positive";
  if (score >= 40) return "warning";
  return "negative";
}

function toneClasses(tone: Tone) {
  const map: Record<Tone, string> = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    negative: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return map[tone];
}

function signalBoxClasses(tone: Tone) {
  const map: Record<Tone, string> = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    negative: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return map[tone];
}

function cardClass(extra = "") {
  return `rounded-xl border border-slate-200 bg-white p-6 leading-relaxed shadow-sm [word-break:keep-all] ${extra}`;
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

function SmallBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses(tone)}`}>
      {children}
    </span>
  );
}

function Marker({ tone }: { tone: Tone }) {
  const color = {
    positive: "bg-emerald-500",
    neutral: "bg-slate-400",
    warning: "bg-amber-500",
    negative: "bg-rose-500",
    info: "bg-blue-500",
  }[tone];
  return <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function getRegimeLabel(report: TradingReport) {
  const type = report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown";
  return chartRegimeLabel[type] ?? chartRegimeLabel.unknown;
}

function getFinalTitle(report: TradingReport) {
  return safeText(report.normalizedFinalAction?.title, safeText(report.finalSummary.title, "최종 판단 확인 필요"));
}

function getFinalSubtitle(report: TradingReport) {
  return safeText(
    report.normalizedFinalAction?.subtitle,
    safeText(report.finalSummary.oneLineConclusion, "주요 지지와 저항 확인이 필요합니다."),
  );
}

function getStockName(result: AnalysisResponse, report: TradingReport) {
  return safeText(result.aiAnalysis.symbolDetection?.detectedName, safeText(report.analysisMeta?.symbol, "미확인"));
}

function getTicker(result: AnalysisResponse) {
  return safeText(result.aiAnalysis.symbolDetection?.detectedTicker, "-");
}

function getMarket(result: AnalysisResponse) {
  return safeText(
    result.aiAnalysis.symbolDetection?.detectedMarket,
    safeText(result.aiAnalysis.symbolDetection?.detectedExchange, "-"),
  );
}

function getCurrentPriceDisplay(result: AnalysisResponse, report: TradingReport): CurrentPriceDisplay {
  const numericEstimate = safeNumber(result.aiAnalysis.priceAxisObservations?.currentPriceEstimate?.value);
  if (numericEstimate !== null) {
    const zoneText = safeText(report.analysisMeta?.currentPriceZone, safeText(report.priceRoles?.current?.priceZone, ""));
    return {
      price: formatNumericPrice(numericEstimate),
      interpretation: zoneText && !isPlainNumericText(zoneText) ? zoneText : "이미지 기준 추정",
      hasNumericPrice: true,
    };
  }

  const candidates = [report.priceRoles?.current?.priceZone, report.analysisMeta?.currentPriceZone];
  const plainNumericText = candidates.find((item) => isPlainNumericText(item));
  if (plainNumericText) {
    return {
      price: formatNumericPrice(plainNumericText),
      interpretation: "이미지 기준 추정",
      hasNumericPrice: true,
    };
  }

  const interpretation = candidates.map((item) => safeText(item, "")).find(Boolean);
  return {
    price: "-",
    interpretation: interpretation || "가격 해석 데이터 없음",
    hasNumericPrice: false,
  };
}

function getCurrency(result: AnalysisResponse, report: TradingReport) {
  return safeText(result.aiAnalysis.symbolDetection?.currency, safeText(report.analysisMeta?.priceUnit, "-"));
}

function percentGap(from: number | null, to: number | null) {
  if (from === null || to === null || from === 0) return null;
  const value = Math.abs(to - from) / Math.abs(from) * 100;
  return Number.isFinite(value) ? value : null;
}

function firstLevelText(level?: { priceZone: string; meaning?: string } | null) {
  if (!level) return "-";
  return safeText(level.priceZone);
}

function getTargetText(report: TradingReport) {
  const targets = [
    report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.firstTarget?.priceZone,
  ].map((item) => safeText(item, "")).filter(Boolean);
  return targets[0] ?? "-";
}

function getStopText(report: TradingReport) {
  return safeText(
    report.tradePlan.stopLossByEntry?.currentEntry?.priceZone,
    safeText(report.tradePlan.stopLoss.shortTerm?.priceZone, safeText(report.tradePlan.stopLoss.priceZone, "-")),
  );
}

function riskRewardText(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "확인 필요";
  if (value <= 0) return "진입 부적합";
  if (value < 1) return "불리";
  if (value < 1.5) return "보통";
  return `약 ${value.toFixed(1)} / 조건부 가능`;
}

function deriveCurrentPosition(context: Omit<DashboardContext, "currentPosition" | "targetRoom" | "preferredStrategy">) {
  const { currentPrice, pivotPrice, supportPrice, resistancePrice, targetPrice, breakoutRetestConfirmed } = context;
  if (currentPrice === null) return "가격 위치 확인 필요";
  if (breakoutRetestConfirmed || (pivotPrice !== null && currentPrice >= pivotPrice * 1.005)) return "돌파 확인 구간";

  const targetGap = targetPrice !== null ? percentGap(currentPrice, targetPrice) : null;
  if (targetPrice !== null && targetPrice >= currentPrice * 0.995 && targetGap !== null && targetGap <= 1.5) {
    return "목표가 근접";
  }

  const resistanceGap = resistancePrice !== null ? percentGap(currentPrice, resistancePrice) : null;
  if (resistancePrice !== null && resistancePrice >= currentPrice * 0.995 && resistanceGap !== null && resistanceGap <= 1.5) {
    return "저항 바로 아래";
  }

  const supportGap = supportPrice !== null ? percentGap(currentPrice, supportPrice) : null;
  if (supportPrice !== null && currentPrice >= supportPrice && supportGap !== null && supportGap <= 3) {
    return "지지권 근처";
  }

  if (supportPrice !== null && resistancePrice !== null && resistancePrice > supportPrice) {
    const rangePosition = (currentPrice - supportPrice) / (resistancePrice - supportPrice);
    if (Number.isFinite(rangePosition)) {
      if (rangePosition <= 0.35) return "박스권 하단";
      if (rangePosition < 0.7) return "박스권 중단";
      return "박스권 상단";
    }
  }

  return "가격 위치 확인 필요";
}

function deriveTargetRoom(context: Omit<DashboardContext, "targetRoom" | "preferredStrategy">) {
  const current = context.currentPrice;
  const upper = context.targetPrice ?? context.resistancePrice;
  const support = context.supportPrice;
  const currentRr = context.currentRiskReward;
  if (current === null || upper === null || upper <= current) {
    return {
      label: "확인 필요",
      explanation: "목표가와 현재가의 거리 계산이 제한되어 목표 여유 확인이 필요합니다.",
    };
  }

  const targetGapPercent = percentGap(current, upper);
  const supportGap = support !== null ? current - support : null;
  const rawRiskReward = supportGap !== null && supportGap > 0 ? (upper - current) / supportGap : null;
  const rr = typeof currentRr === "number" && Number.isFinite(currentRr) ? currentRr : rawRiskReward;

  if ((targetGapPercent !== null && targetGapPercent <= 1.5) || (rr !== null && rr < 1)) {
    return {
      label: "목표 여유 낮음",
      explanation: `현재가와 ${context.targetText !== "-" ? context.targetText : context.resistanceText} 구간의 거리가 매우 가까워 현재가 진입 손익비가 낮습니다.`,
    };
  }
  if (rr !== null && rr >= 1.5) {
    return {
      label: "목표 여유 있음",
      explanation: `주요 지지에서 반등 확인 시 ${context.targetText !== "-" ? context.targetText : context.resistanceText} 구간까지 상승 여지를 볼 수 있습니다.`,
    };
  }
  return {
    label: "목표 여유 보통",
    explanation: "현재가 기준 목표 여유는 일부 있으나, 손절 기준과 지지 반응 확인이 필요합니다.",
  };
}

function derivePreferredStrategy(context: Pick<DashboardContext, "chartRegime" | "currentPosition" | "targetRoom" | "pullbackRiskReward" | "breakoutRetestConfirmed">) {
  if (context.chartRegime === "downtrend") return "추세 전환 확인 전 신규 진입 보류";
  if (context.chartRegime === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) return "돌파 후 재지지 유지 여부 확인";
  if (context.currentPosition === "목표가 근접" || context.currentPosition === "저항 바로 아래" || context.targetRoom.label === "목표 여유 낮음") {
    return "추격매수보다 돌파 후 재지지 확인";
  }
  if (context.currentPosition === "지지권 근처" || context.currentPosition === "박스권 하단" || (context.pullbackRiskReward ?? 0) >= 1.2) {
    return "눌림목 지지 확인 후 관심";
  }
  return "주요 지지/저항 확인 필요";
}

function deriveDashboardContext(result: AnalysisResponse, report: TradingReport): DashboardContext {
  const currentDisplay = getCurrentPriceDisplay(result, report);
  const currentPriceText = currentDisplay.hasNumericPrice ? currentDisplay.price : safeText(currentDisplay.interpretation, "이미지 기준 추정 불가");
  const pivotText = safeText(report.analysisMeta?.keyPivotPrice, safeText(report.priceRoles?.pivot?.priceZone, "미확인"));
  const supportFallback = firstLevelText(report.keyLevels.supports[0]);
  const resistanceFallback = firstLevelText(report.keyLevels.resistances[0]);
  const supportText = safeText(report.analysisMeta?.mainSupports?.[0], supportFallback !== "-" ? supportFallback : "미확인");
  const resistanceText = safeText(report.analysisMeta?.mainResistances?.[0], resistanceFallback !== "-" ? resistanceFallback : "미확인");
  const targetFallback = getTargetText(report);
  const targetText = targetFallback !== "-" ? safeText(targetFallback, "미확인") : "미확인";
  const rawPriceUnit = safeText(report.analysisMeta?.priceUnit, "");
  const priceUnitConfidence = report.analysisMeta?.priceUnitConfidence ?? "low";
  const partialContext = {
    stockName: getStockName(result, report),
    ticker: getTicker(result),
    chartTimeframe: safeText(report.analysisMeta?.chartTimeframe, "추정 불가"),
    currentPriceText,
    currentPrice: parsePrice(currentPriceText),
    pivotText,
    pivotPrice: parsePrice(pivotText),
    supportText,
    supportPrice: parsePrice(supportText),
    resistanceText,
    resistancePrice: parsePrice(resistanceText),
    targetText,
    targetPrice: parsePrice(targetText),
    priceUnit: rawPriceUnit && rawPriceUnit !== "-" ? rawPriceUnit : "가격 단위 확인 필요",
    priceUnitConfidence,
    chartRegime: report.chartRegime?.type ?? report.marketContext?.chartRegime ?? "unknown",
    breakoutRetestConfirmed: Boolean(report.marketContext?.breakoutRetestConfirmed),
    currentRiskReward: report.tradePlan.riskRewardByEntry?.current?.value ?? null,
    pullbackRiskReward: report.tradePlan.riskRewardByEntry?.pullback?.value ?? null,
    breakoutRiskReward: report.tradePlan.riskRewardByEntry?.breakout?.value ?? null,
  };
  const currentPosition = deriveCurrentPosition(partialContext);
  const targetRoom = deriveTargetRoom({ ...partialContext, currentPosition });
  return {
    ...partialContext,
    currentPosition,
    targetRoom,
    preferredStrategy: derivePreferredStrategy({ ...partialContext, currentPosition, targetRoom }),
  };
}

function deriveDashboardFinalAction(report: TradingReport, context: DashboardContext): DashboardFinalAction {
  const normalized = report.normalizedFinalAction;
  if (context.chartRegime === "downtrend") {
    return {
      title: "하락 추세 / 신규 진입 보류",
      subtitle: "기술적 반등 가능성은 있으나 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.",
      actionType: "DOWNTREND_CAUTION",
      reason: "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다.",
    };
  }
  if (context.chartRegime === "breakout_retest_confirmed" || context.breakoutRetestConfirmed) {
    return {
      title: "돌파 후 재지지 확인 / 돌파 매수 후보",
      subtitle: "핵심 전환 가격 위에서 지지가 유지되면 다음 저항까지 상승 여지를 볼 수 있습니다.",
      actionType: "BREAKOUT_RETEST",
      reason: "돌파 가격 위에서 재지지 여부가 핵심 조건입니다.",
    };
  }
  if ((context.currentPosition === "목표가 근접" || context.targetRoom.label === "목표 여유 낮음") && context.currentPosition !== "지지권 근처") {
    return {
      title: "목표가 근접 / 추격매수 주의",
      subtitle: "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 필요합니다.",
      actionType: "TARGET_CLOSE_CHASE_RISK",
      reason: context.targetRoom.explanation,
    };
  }
  if (context.currentPosition === "저항 바로 아래" || context.currentPosition === "박스권 상단" || context.chartRegime === "range_upper_resistance") {
    return {
      title: "저항 근접 / 보유자는 일부 익절, 미보유자는 대기",
      subtitle: "보유자는 일부 익절 또는 돌파 안착 여부를 확인하고, 미보유자는 추격매수를 피하는 것이 유리합니다.",
      actionType: "RESISTANCE_HOLDER_ONLY",
      reason: "저항권에서는 신규 진입보다 보유자 대응과 돌파 확인이 우선입니다.",
    };
  }
  if (context.currentPosition === "지지권 근처" || context.currentPosition === "박스권 하단" || context.chartRegime === "range_lower_support" || context.chartRegime === "healthy_pullback") {
    return {
      title: "눌림목 대기 / 지지 확인 시 관심",
      subtitle: "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 두고 진입 후보로 볼 수 있습니다.",
      actionType: "PULLBACK_WAIT",
      reason: "지지 확인 전에는 즉시 진입보다 반등 확인이 필요합니다.",
    };
  }
  if (context.pivotPrice !== null && !context.breakoutRetestConfirmed) {
    return {
      title: "돌파 확인 대기",
      subtitle: "핵심 전환 가격 돌파 후 위에서 버티는지 확인 전까지는 신규 진입보다 대기가 유리합니다.",
      actionType: "BREAKOUT_WAIT",
      reason: "돌파 후 재지지가 아직 확인되지 않았습니다.",
    };
  }
  return {
    title: safeText(normalized?.title, getFinalTitle(report)),
    subtitle: safeText(normalized?.subtitle, getFinalSubtitle(report)),
    actionType: safeText(normalized?.actionType, "REPORT_FALLBACK"),
    reason: safeText(normalized?.reason, "주요 지지와 저항 확인이 필요합니다."),
  };
}

function entryTone(judgment: string): Tone {
  if (/후보|관심|가능/.test(judgment)) return "positive";
  if (/부적합|불리/.test(judgment)) return "negative";
  if (/확인|대기/.test(judgment)) return "warning";
  return "neutral";
}

function getEntryModeJudgments(report: TradingReport, context: DashboardContext): EntryModeJudgment[] {
  const entries = report.scoreSummary?.entryScores ?? {};
  const currentScore = entries.currentEntry?.score ?? 0;
  const pullbackScore = entries.pullbackEntry?.score ?? 0;
  const breakoutScore = entries.breakoutEntry?.score ?? 0;
  const currentStop = report.tradePlan.stopLossByEntry?.currentEntry;
  const pullbackStop = report.tradePlan.stopLossByEntry?.pullbackEntry;
  const breakoutStop = report.tradePlan.stopLossByEntry?.breakoutEntry;
  const pullbackEntry = report.tradePlan.entry.pullbackEntry;
  const breakoutEntry = report.tradePlan.entry.breakoutEntry;
  const currentUnfavorable = context.currentPosition === "목표가 근접" || context.currentPosition === "저항 바로 아래" || context.targetRoom.label === "목표 여유 낮음" || (context.currentRiskReward !== null && context.currentRiskReward < 1);
  const currentJudgment = currentUnfavorable ? (currentScore < 30 ? "부적합" : "불리") : currentScore >= 65 ? "조건부 가능" : currentScore >= 50 ? "확인 필요" : "불리";
  const pullbackJudgment = context.supportText !== "미확인" ? (pullbackScore >= 65 ? "지지 확인 시 관심" : "확인 필요") : "확인 필요";
  const breakoutJudgment = context.breakoutRetestConfirmed && breakoutScore >= 65 ? "돌파 매수 후보" : context.pivotText !== "미확인" ? "돌파 확인 필요" : "확인 필요";

  const rows: EntryModeJudgment[] = [
    {
      key: "current",
      title: "현재가 진입",
      judgment: currentJudgment,
      reason: currentUnfavorable
        ? `현재가가 ${context.resistanceText !== "미확인" ? context.resistanceText : context.targetText} 저항 또는 목표 구간에 가까워 목표 여유가 작습니다.`
        : safeText(entries.currentEntry?.explanation, "현재가 진입은 지지와 손절 기준 확인이 필요합니다."),
      condition: currentUnfavorable ? "돌파 후 재지지 확인 전까지 신규 진입은 신중" : "짧은 손절 기준 확인 시 제한적으로 검토",
      stop: safeText(currentStop?.condition, safeText(currentStop?.priceZone, "확인 필요")),
      target: context.targetText !== "미확인" ? context.targetText : context.resistanceText,
      riskReward: riskRewardText(context.currentRiskReward),
      tone: entryTone(currentJudgment),
    },
    {
      key: "pullback",
      title: "눌림목 진입",
      judgment: pullbackJudgment,
      reason: context.supportText !== "미확인"
        ? `${context.supportText} 부근 지지 반응이 확인되면 현재가 추격보다 조건이 개선될 수 있습니다.`
        : "명확한 지지 가격 확인이 필요합니다.",
      condition: pullbackEntry?.condition ?? `${context.supportText} 부근 지지 확인 시 관심`,
      stop: safeText(pullbackStop?.condition, safeText(pullbackStop?.priceZone, "확인 필요")),
      target: context.targetText !== "미확인" ? context.targetText : context.resistanceText,
      riskReward: riskRewardText(context.pullbackRiskReward),
      tone: entryTone(pullbackJudgment),
    },
    {
      key: "breakout",
      title: "돌파 진입",
      judgment: breakoutJudgment,
      reason: context.breakoutRetestConfirmed
        ? "핵심 전환 가격 위에서 재지지가 유지되는지 확인하는 것이 핵심입니다."
        : `${context.pivotText} 돌파 후 위에서 버티는 재지지 확인이 필요합니다.`,
      condition: breakoutEntry?.condition ?? `${context.pivotText} 돌파 후 위에서 재지지`,
      stop: safeText(breakoutStop?.condition, context.pivotText !== "미확인" ? `${context.pivotText} 재이탈` : "확인 필요"),
      target: report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? context.targetText,
      riskReward: context.breakoutRetestConfirmed ? riskRewardText(context.breakoutRiskReward) : "돌파 확인 필요",
      tone: entryTone(breakoutJudgment),
    },
  ];

  return rows.map((row) => ({
    ...row,
    target: safeText(row.target, "확인 필요"),
    condition: safeText(row.condition, "확인 필요"),
    stop: safeText(row.stop, "확인 필요"),
    riskReward: safeText(row.riskReward, "확인 필요"),
  }));
}

function getConfidenceReasons(report: TradingReport, context: DashboardContext) {
  const reasons: string[] = [];
  if (context.currentPosition === "목표가 근접" || context.currentPosition === "저항 바로 아래") {
    reasons.push("현재가가 주요 저항 또는 목표 구간에 가까워 신규 진입 판단 신뢰도가 제한됩니다.");
  }
  if (context.priceUnitConfidence === "low" || context.priceUnit.includes("확인 필요") || context.priceUnit.includes("이미지")) {
    reasons.push("가격 단위가 이미지 기준 추정이라 실제 시세와 차이가 있을 수 있습니다.");
  }
  if (context.currentRiskReward === null || context.currentRiskReward < 1) {
    reasons.push("현재가 기준 손익비가 낮거나 계산이 제한되어 지지/저항 재확인이 필요합니다.");
  }
  if (report.indicatorAnalysis.unavailable.length > 0) {
    reasons.push("보조지표 일부가 이미지에서 명확히 확인되지 않습니다.");
  }
  for (const reason of [...(report.chartRegime?.reasons ?? []), ...(report.evidence.riskFactors ?? [])]) {
    const safe = safeText(reason, "");
    if (safe && !reasons.includes(safe)) reasons.push(safe);
    if (reasons.length >= 4) break;
  }
  return reasons.slice(0, 4).length ? reasons.slice(0, 4) : ["이미지 기반 분석이므로 실제 가격 데이터와 체결 조건 확인이 필요합니다."];
}

function ReportHeader() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-tight text-slate-500">CHART VISION AI</p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">AI 기술적 분석 리포트</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          title="준비 중"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          리포트 다운로드
        </button>
        <button
          type="button"
          disabled
          title="준비 중"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          관심 종목 추가
        </button>
      </div>
    </header>
  );
}

function AnalysisBasisSummary({ context }: { context: DashboardContext }) {
  const rows = [
    ["종목/티커", `${context.stockName}${context.ticker !== "-" ? ` / ${context.ticker}` : ""}`],
    ["분석 기준 차트", context.chartTimeframe],
    ["현재가 또는 추정 현재가", context.currentPriceText || "이미지 기준 추정 불가"],
    ["핵심 전환 가격", context.pivotText],
    ["최근 지지", context.supportText],
    ["최근 저항", context.resistanceText],
    ["현재가 위치", context.currentPosition],
    ["가격 단위", context.priceUnit],
    ["우선 전략", context.preferredStrategy],
  ];

  return (
    <section className={cardClass()}>
      <SectionTitle title="분석 기준 요약" description="실제 대응에 필요한 가격대와 위치 정보를 우선 표시합니다." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="whitespace-nowrap text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-950 [word-break:keep-all]">{safeText(value, "미확인")}</p>
          </div>
        ))}
      </div>
      {context.priceUnitConfidence === "low" || context.priceUnit.includes("확인 필요") ? (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [word-break:keep-all]">
          가격 단위는 이미지 축 기준 추정값일 수 있어 실제 시세 단위와 차이가 있을 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}

function FinalActionSummaryCard({ report, context, action }: { report: TradingReport; context: DashboardContext; action: DashboardFinalAction }) {
  return (
    <section className={cardClass("border-blue-100 bg-blue-50/40")}>
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">최종 행동 요약</p>
      <p className="mt-2 text-lg font-extrabold leading-8 text-slate-950 [word-break:keep-all]">{action.title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700 [word-break:keep-all]">{safeText(action.subtitle, getFinalSubtitle(report))}</p>
      <div className="mt-4 rounded-lg border border-white/70 bg-white px-4 py-3">
        <p className="text-xs font-bold text-slate-500">목표 여유</p>
        <p className="mt-1 text-sm font-bold text-slate-950">{context.targetRoom.label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600 [word-break:keep-all]">{context.targetRoom.explanation}</p>
      </div>
    </section>
  );
}

function FinalActionJudgmentCard({ report, context, action }: { report: TradingReport; context: DashboardContext; action: DashboardFinalAction }) {
  const actionState = getActionState(report);
  const signal = getSignalInfo(actionState, report);
  const totalScore = safeScore(report.scoreSummary?.totalScore);
  const riskScore = safeScore(report.scoreSummary?.riskScore);

  return (
    <section className={cardClass("border-slate-300")}>
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="text-sm font-bold text-slate-500">최종 행동 판단</p>
          <h2 className="mt-2 text-2xl font-extrabold leading-9 text-slate-950 [word-break:keep-all]">{action.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 [word-break:keep-all]">{action.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SmallBadge tone={signal.tone}>{signal.helper}</SmallBadge>
            <SmallBadge tone="info">차트 상태 {chartRegimeLabel[context.chartRegime] ?? chartRegimeLabel.unknown}</SmallBadge>
            <SmallBadge tone={getScoreTone(riskScore, "risk")}>리스크 {riskScore === null ? "분석 불가" : `${riskScore} / 100`}</SmallBadge>
            <SmallBadge tone={context.priceUnitConfidence === "low" ? "warning" : "neutral"}>신뢰도 {confidenceLabel(report.finalSummary.confidence)}</SmallBadge>
          </div>
        </div>
        <div className={`flex min-h-36 flex-col items-center justify-center rounded-lg border px-6 py-5 text-center ${signalBoxClasses(signal.tone)}`}>
          <p className="whitespace-nowrap text-4xl font-extrabold tracking-tight">{signal.label}</p>
          <p className="mt-2 whitespace-nowrap text-sm font-extrabold">{signal.helper}</p>
          <p className="mt-3 text-sm font-bold text-slate-600">{totalScore === null ? "점수 분석 불가" : `종합 ${totalScore} / 100`}</p>
        </div>
      </div>
    </section>
  );
}

function EntryModesCard({ report, context }: { report: TradingReport; context: DashboardContext }) {
  const items = getEntryModeJudgments(report, context);
  return (
    <section className={cardClass()}>
      <SectionTitle title="진입 방식별 판단" description="현재가, 눌림목, 돌파 진입을 조건과 손절 기준별로 분리합니다." />
      <div className="grid gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-950">{item.title}</h3>
              <SmallBadge tone={item.tone}>{item.judgment}</SmallBadge>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600 [word-break:keep-all]">{item.reason}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ["조건", item.condition],
                ["손절", item.stop],
                ["목표", item.target],
                ["손익비", item.riskReward],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[64px_1fr] gap-3">
                  <dt className="whitespace-nowrap font-bold text-slate-500">{label}</dt>
                  <dd className="font-semibold leading-6 text-slate-900 [word-break:keep-all]">{safeText(value, "확인 필요")}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConfidenceReasonCard({ report, context }: { report: TradingReport; context: DashboardContext }) {
  const reasons = getConfidenceReasons(report, context);
  return (
    <section className={cardClass()}>
      <SectionTitle title="신뢰도 판단 이유" />
      <ul className="grid gap-2 text-sm leading-7 text-slate-700 md:grid-cols-2">
        {reasons.map((reason) => (
          <li key={reason} className="flex gap-2 [word-break:keep-all]">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniLevelChart({ result, report }: DashboardProps) {
  const currentDisplay = getCurrentPriceDisplay(result, report);
  const currentText = currentDisplay.price;
  const supportText = report.analysisMeta?.mainSupports?.[0] ?? report.keyLevels.supports[0]?.priceZone;
  const resistanceText = report.analysisMeta?.mainResistances?.[0] ?? report.keyLevels.resistances[0]?.priceZone;
  const current = parsePrice(currentDisplay.hasNumericPrice ? currentText : currentDisplay.interpretation);
  const support = parsePrice(supportText);
  const resistance = parsePrice(resistanceText);
  const canPosition = current !== null && support !== null && resistance !== null && resistance > support;
  const position = canPosition
    ? Math.max(0, Math.min(100, ((current - support) / (resistance - support)) * 100))
    : null;
  const hasAnyLevel = Boolean(safeText(supportText, "") || safeText(resistanceText, "") || currentDisplay.hasNumericPrice || currentDisplay.interpretation !== "가격 해석 데이터 없음");

  if (!hasAnyLevel) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        가격 흐름 데이터 없음
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>지지</span>
        <span>현재</span>
        <span>저항</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${position ?? 50}%` }} />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm"
          style={{ left: `calc(${position ?? 50}% - 8px)` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs leading-5">
        <div>
          <p className="font-semibold text-slate-500">주요 지지</p>
          <p className="mt-1 font-bold text-slate-900 [word-break:keep-all]">{safeText(supportText, "-")}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-500">현재 가격</p>
          <p className="mt-1 font-bold text-slate-900">{currentDisplay.hasNumericPrice ? currentText : "-"}</p>
          {!currentDisplay.hasNumericPrice ? (
            <p className="mt-1 text-[11px] font-semibold text-slate-500 [word-break:keep-all]">{currentDisplay.interpretation}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-500">주요 저항</p>
          <p className="mt-1 font-bold text-slate-900 [word-break:keep-all]">{safeText(resistanceText, "-")}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryHero({ result, report }: DashboardProps) {
  const actionState = getActionState(report);
  const signal = getSignalInfo(actionState, report);
  const totalScore = safeScore(report.scoreSummary?.totalScore);
  const market = getMarket(result);
  const confidence = totalScore === null ? "분석 불가" : `${totalScore} / 100`;
  const trend = safeText(result.aiAnalysis.visualTrend, getRegimeLabel(report));
  const currentDisplay = getCurrentPriceDisplay(result, report);
  const currency = currentDisplay.hasNumericPrice ? getCurrency(result, report) : "";

  return (
    <section className={cardClass("overflow-hidden")}>
      <div className="grid gap-6 2xl:grid-cols-[minmax(320px,1.15fr)_minmax(520px,1.65fr)_minmax(190px,220px)] 2xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 [word-break:keep-all]">{getStockName(result, report)}</h2>
            <span className="whitespace-nowrap text-base font-semibold text-slate-600">{getTicker(result)}</span>
            {market !== "-" ? <SmallBadge tone="info">{market}</SmallBadge> : null}
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="whitespace-nowrap text-5xl font-bold tracking-tight text-slate-950">{currentDisplay.price}</p>
              {currency ? <p className="pb-2 text-base font-semibold text-slate-600">{currency}</p> : null}
              <p className="pb-2 text-sm font-semibold text-slate-400">등락 데이터 없음</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
              <span className="font-bold text-slate-900">가격 해석</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="[word-break:keep-all]">{currentDisplay.interpretation}</span>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-3">
          <div className="min-w-[9rem] rounded-lg border border-slate-100 bg-white/70 p-4">
            <p className="text-sm font-semibold text-slate-500">AI 신뢰도</p>
            <p className="mt-3 whitespace-nowrap text-3xl font-bold text-blue-700">{confidence}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">{confidenceLabel(report.finalSummary.confidence)}</p>
          </div>
          <div className="min-w-[9rem] rounded-lg border border-slate-100 bg-white/70 p-4">
            <p className="text-sm font-semibold text-slate-500">트렌드 방향</p>
            <p className="mt-3 text-xl font-bold leading-7 text-slate-950 [word-break:keep-all]">{trend}</p>
            <p className="mt-2 text-sm leading-5 text-slate-500 [word-break:keep-all]">{getRegimeLabel(report)}</p>
          </div>
          <div className="min-w-[9rem] rounded-lg border border-slate-100 bg-white/70 p-4">
            <p className="text-sm font-semibold text-slate-500">분석 정보</p>
            <p className="mt-3 text-base font-bold leading-6 text-slate-950 [word-break:keep-all]">{safeText(report.analysisMeta?.analyzedAt, "시간 정보 미확인")}</p>
            <p className="mt-2 text-sm text-slate-500">이미지 기반 분석</p>
          </div>
        </div>

        <div className={`flex min-h-32 flex-col items-center justify-center rounded-lg border px-6 py-5 text-center ${signalBoxClasses(signal.tone)}`}>
          <p className="whitespace-nowrap text-4xl font-extrabold tracking-tight">{signal.label}</p>
          <p className="mt-2 whitespace-nowrap text-sm font-extrabold">{signal.helper}</p>
          <p className="mt-2 text-xs font-semibold leading-5 opacity-80 [word-break:keep-all]">{getFinalTitle(report)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-slate-600">1D 가격 흐름</p>
        <MiniLevelChart result={result} report={report} />
      </div>
    </section>
  );
}

function MarketSummaryCard({ report }: { report: TradingReport }) {
  const support = report.keyLevels.supports[0]?.priceZone;
  const resistance = report.keyLevels.resistances[0]?.priceZone;
  const rows = [
    ["시장 관점", getFinalTitle(report), "info" as Tone],
    ["핵심 해석", getFinalSubtitle(report), "positive" as Tone],
    ["지지·저항 해석", support || resistance ? `지지 ${safeText(support, "-")} / 저항 ${safeText(resistance, "-")}` : "분석 데이터 없음", "neutral" as Tone],
    ["리스크 요인", report.evidence.riskFactors[0] ?? report.scoreSummary?.riskLabel ?? "분석 데이터 없음", "warning" as Tone],
  ];

  return (
    <section className={cardClass()}>
      <SectionTitle title="AI 시장 요약" />
      <div className="space-y-4">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex gap-3">
            <Marker tone={tone as Tone} />
            <div>
              <p className="whitespace-nowrap text-sm font-bold text-slate-950">{label}</p>
              <p className="mt-1 text-sm leading-7 text-slate-600 [word-break:keep-all]">{safeText(value, "분석 데이터 없음")}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  const value = score ?? 0;
  const stroke = score === null ? "#CBD5E1" : value >= 70 ? "#2563EB" : value >= 40 ? "#F59E0B" : "#DC2626";
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 110 110" className="h-40 w-40 -rotate-90">
        <circle cx="55" cy="55" r="44" fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r="44"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className={score === null ? "text-base font-bold text-slate-500" : "text-4xl font-bold text-slate-950"}>
          {score === null ? "분석 불가" : score}
        </p>
        <p className="text-sm font-semibold text-slate-500">{score === null ? "점수 없음" : "/ 100"}</p>
      </div>
    </div>
  );
}

function MetricBar({ label, score, mode = "normal" }: { label: string; score: number | null; mode?: "normal" | "risk" }) {
  const tone = getScoreTone(score, mode);
  const value = score ?? 0;
  const color = {
    positive: "bg-emerald-500",
    neutral: "bg-slate-400",
    warning: "bg-amber-500",
    negative: "bg-rose-500",
    info: "bg-blue-500",
  }[tone];

  return (
    <div className="grid grid-cols-[92px_1fr_74px] items-center gap-3 text-sm">
      <span className="whitespace-nowrap font-semibold text-slate-700">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="whitespace-nowrap text-right text-xs font-bold text-slate-900">{score === null ? "분석 불가" : score}</span>
    </div>
  );
}

function SignalScoreCard({ report }: { report: TradingReport }) {
  const score = report.scoreSummary;
  const totalScore = safeScore(score?.totalScore);
  const breakout = safeScore(score?.entryScores?.breakoutEntry?.score);
  const risk = safeScore(score?.riskScore);
  const volatility = null;

  return (
    <section className={cardClass()}>
      <SectionTitle title="AI 시그널 점수" />
      <div className="grid gap-6 lg:grid-cols-[170px_1fr] lg:items-center">
        <div className="flex justify-center">
          <ScoreCircle score={totalScore} />
        </div>
        <div className="space-y-4">
          <MetricBar label="모멘텀" score={safeScore(score?.buyScore)} />
          <MetricBar label="돌파 확률" score={breakout} />
          <MetricBar label="리스크 수준" score={risk} mode="risk" />
          <MetricBar label="변동성 점수" score={volatility} />
        </div>
      </div>
    </section>
  );
}

function PriceLevelsCard({ result, report }: DashboardProps) {
  const currentDisplay = getCurrentPriceDisplay(result, report);
  const rows = [
    ["현재 가격", currentDisplay.price],
    ["가격 해석", currentDisplay.interpretation],
    ["주요 지지선", report.analysisMeta?.mainSupports?.[0] ?? firstLevelText(report.keyLevels.supports[0])],
    ["보조 지지선", report.analysisMeta?.mainSupports?.[1] ?? firstLevelText(report.keyLevels.supports[1])],
    ["주요 저항선", report.analysisMeta?.mainResistances?.[0] ?? firstLevelText(report.keyLevels.resistances[0])],
    ["상단 돌파 기준", report.tradePlan.entry.breakoutEntry?.priceZone ?? report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice],
    ["손절 기준", getStopText(report)],
    ["목표 주가", getTargetText(report)],
  ];

  return (
    <section className={cardClass()}>
      <SectionTitle title="핵심 가격 레벨" />
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th className="w-36 whitespace-nowrap bg-slate-50 px-4 py-3 font-semibold text-slate-600">{label}</th>
                <td className="px-4 py-3 font-semibold leading-6 text-slate-950 [word-break:keep-all]">{safeText(value, "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function indicatorSignal(value: unknown): { label: string; tone: Tone } {
  const text = safeText(value, "").toLowerCase();
  if (/bull|buy|상승|매수|우호|positive|increase/.test(text)) return { label: "매수", tone: "positive" };
  if (/bear|sell|하락|매도|위험|negative|break/.test(text)) return { label: "매도", tone: "negative" };
  if (/weak|주의|부족|제한|over|과열/.test(text)) return { label: "주의", tone: "warning" };
  return { label: "중립", tone: "neutral" };
}

function indicatorValue(readings: IndicatorReadings | undefined, result: AnalysisResponse, key: string) {
  const technical = result.technicalAnalysis;
  if (key === "rsi") return readings?.rsi?.valueEstimate ?? technical?.rsi?.value ?? null;
  if (key === "macd") {
    const macd = technical?.macd?.macd;
    const signal = technical?.macd?.signal;
    if (typeof macd === "number" || typeof signal === "number") return `${formatPrice(macd)} / ${formatPrice(signal)}`;
    return null;
  }
  if (key === "ma") {
    const ma = technical?.movingAverages;
    if (ma?.ma20 || ma?.ma60) return `${formatPrice(ma.ma20)} / ${formatPrice(ma.ma60)}`;
    return null;
  }
  if (key === "volume") return technical?.volume?.ratio ? `${technical.volume.ratio.toFixed(2)}배` : null;
  if (key === "bollinger") return technical?.bollingerBands?.position ?? null;
  return null;
}

function IndicatorSummaryCard({ result, report, context }: DashboardProps & { context: DashboardContext }) {
  const readings = result.aiAnalysis.indicatorReadings;
  const confirmed = report.indicatorAnalysis.confirmed;
  const confirmedByName = (name: string) => confirmed.find((item) => item.name.includes(name));
  const rows = [
    {
      name: "RSI",
      value: indicatorValue(readings, result, "rsi"),
      interpretation: readings?.rsi?.status ?? result.technicalAnalysis?.rsi?.interpretation ?? confirmedByName("RSI")?.explanation,
    },
    {
      name: "MACD",
      value: indicatorValue(readings, result, "macd"),
      interpretation: readings?.macd?.status ?? result.technicalAnalysis?.macd?.interpretation ?? confirmedByName("MACD")?.explanation,
    },
    {
      name: "이동평균선",
      value: indicatorValue(readings, result, "ma"),
      interpretation: readings?.movingAverages?.status ?? confirmedByName("이동")?.explanation,
    },
    {
      name: "거래량",
      value: indicatorValue(readings, result, "volume"),
      interpretation: readings?.volume?.status ?? result.technicalAnalysis?.volume?.interpretation ?? result.aiAnalysis.volumeObservation,
    },
    {
      name: "볼린저 밴드",
      value: indicatorValue(readings, result, "bollinger"),
      interpretation: readings?.bollingerBands?.status ?? readings?.bollingerBands?.reason ?? result.technicalAnalysis?.bollingerBands?.interpretation,
    },
  ];
  const scaleLimited = context.priceUnitConfidence === "low" || context.priceUnit.includes("확인 필요");
  const unavailable = report.indicatorAnalysis.unavailable ?? [];

  return (
    <section className={cardClass()}>
      <SectionTitle title="기술적 지표 요약" />
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">지표</th>
              <th className="px-4 py-3 font-semibold">수치</th>
              <th className="px-4 py-3 font-semibold">해석</th>
              <th className="px-4 py-3 font-semibold">신호</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const signal = indicatorSignal(row.interpretation);
              const valueLimited = scaleLimited && (row.name === "MACD" || row.name === "이동평균선");
              return (
                <tr key={row.name}>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{row.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{valueLimited ? "수치 확인 제한" : row.value == null ? "분석 불가" : formatPrice(row.value)}</td>
                  <td className="px-4 py-3 leading-7 text-slate-600 [word-break:keep-all]">{safeText(row.interpretation, "분석 불가")}</td>
                  <td className="px-4 py-3"><SmallBadge tone={signal.tone}>{signal.label}</SmallBadge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {unavailable.length ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-700">확인 제한 지표</p>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-600 md:grid-cols-2">
            {unavailable.slice(0, 4).map((item) => (
              <li key={`${item.name}-${item.reason}`} className="[word-break:keep-all]">
                <span className="font-semibold text-slate-900">{safeText(item.name, "지표")}</span>: {safeText(item.reason, "이미지에서 명확히 확인되지 않음")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ScenarioAnalysisCard({ report }: { report: TradingReport }) {
  const scenarios = [
    ["상승 시나리오", report.scenarios.bullish, "positive" as Tone],
    ["중립 시나리오", report.scenarios.neutral, "info" as Tone],
    ["하락 시나리오", report.scenarios.bearish, "negative" as Tone],
  ];

  return (
    <section className={cardClass()}>
      <SectionTitle title="시나리오 분석" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {scenarios.map(([title, scenario, tone]) => (
          <article key={title as string} className={`rounded-lg border p-4 ${toneClasses(tone as Tone)}`}>
            <h3 className="text-sm font-bold">{title as string}</h3>
            <dl className="mt-3 space-y-2 text-xs leading-6 [word-break:keep-all]">
              <div>
                <dt className="font-bold opacity-70">조건</dt>
                <dd>{safeText((scenario as TradingReport["scenarios"]["bullish"]).condition, "분석 데이터 없음")}</dd>
              </div>
              <div>
                <dt className="font-bold opacity-70">예상 흐름</dt>
                <dd>{safeText((scenario as TradingReport["scenarios"]["bullish"]).expectedMove, "확인 필요")}</dd>
              </div>
              <div>
                <dt className="font-bold opacity-70">전략적 해석</dt>
                <dd>{safeText((scenario as TradingReport["scenarios"]["bullish"]).action, "확인 필요")}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function confidenceScore(value?: Confidence | string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  if (value === "low") return "낮음";
  return safeText(value, "확인 제한");
}

function PatternDetectionCard({ result, report }: DashboardProps) {
  const primary = report.patternAnalysis.primaryPattern;
  const candidate = result.aiAnalysis.patternCandidates?.[0];
  const patternName = safeText(primary.name, "명확한 패턴 없음");
  const confidence = confidenceScore(primary.confidence);
  const continuation = candidate?.confidenceScore != null && Number.isFinite(candidate.confidenceScore)
    ? `${Math.round(candidate.confidenceScore)}%`
    : "분석 불가";

  return (
    <section className={cardClass()}>
      <SectionTitle title="AI 패턴 감지" />
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">패턴 신뢰도</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{confidence}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">감지된 구조</p>
          <p className="mt-2 text-lg font-bold leading-7 text-slate-950 [word-break:keep-all]">{patternName}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">추세 연속 확률</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{continuation}</p>
        </div>
        <div className="md:col-span-1">
          <p className="text-sm font-semibold text-slate-500">핵심 해석</p>
          <p className="mt-2 text-sm leading-7 text-slate-600 [word-break:keep-all]">{safeText(primary.tradingMeaning || primary.reason, "현재는 패턴보다 주요 가격대 확인이 우선입니다.")}</p>
        </div>
      </div>
    </section>
  );
}

function InsightNoteCard({ report }: { report: TradingReport }) {
  const lines = [
    getFinalSubtitle(report),
    safeText(report.finalSummary.reason, ""),
    safeText(report.scoreSummary?.explanation, ""),
  ].filter(Boolean).slice(0, 3);

  return (
    <section className={cardClass()}>
      <SectionTitle title="기관 인사이트 노트" />
      <div className="max-h-36 space-y-2 overflow-hidden text-sm leading-7 text-slate-600 [word-break:keep-all]">
        {(lines.length ? lines : ["주요 가격대와 지표 확인을 통해 조건부 대응이 필요합니다."]).slice(0, 4).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function RiskNoticeCard() {
  return (
    <section className={cardClass()}>
      <SectionTitle title="리스크 고지" />
      <p className="text-sm leading-7 text-slate-600 [word-break:keep-all]">{RISK_NOTICE}</p>
    </section>
  );
}

function ReportFooter({ result, report }: DashboardProps) {
  const model = safeText(result.appliedAnalysisMode, safeText(result.analysisMode, "-"));
  const updatedAt = safeText(report.analysisMeta?.analyzedAt, "실시간");

  return (
    <footer className="flex flex-col gap-2 px-2 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>AI Technical Analysis Report</p>
      <p>분석 모델: {model} · 업데이트: {updatedAt}</p>
      <p>© 2026 CHART VISION AI</p>
    </footer>
  );
}

export default function AnalysisReportDashboard({ result, report }: DashboardProps) {
  const context = deriveDashboardContext(result, report);
  const action = deriveDashboardFinalAction(report, context);

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 rounded-2xl bg-slate-50/80 p-3 text-slate-950 sm:p-5">
      <ReportHeader />
      <AnalysisBasisSummary context={context} />
      <FinalActionSummaryCard report={report} context={context} action={action} />
      <FinalActionJudgmentCard report={report} context={context} action={action} />
      <EntryModesCard report={report} context={context} />

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <PriceLevelsCard result={result} report={report} />
          <ScenarioAnalysisCard report={report} />
        </div>
        <div className="space-y-5">
          <IndicatorSummaryCard result={result} report={report} context={context} />
          <ConfidenceReasonCard report={report} context={context} />
        </div>
      </div>

      <RiskNoticeCard />

      <ReportFooter result={result} report={report} />
    </div>
  );
}
