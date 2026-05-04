import type {
  AIAnalysis,
  PatternCandidate,
  PatternCategory,
  PatternDirection,
  PatternStage,
  PatternSummary,
  RiskLevel,
} from "../../types/analysis";

type NormalizedChartInput = {
  currentPrice: number | null;
  supportLevels: number[];
  resistanceLevels: number[];
  recentHigh: number | null;
  recentLow: number | null;
  visualTrend: string;
  indicators: NonNullable<AIAnalysis["indicatorReadings"]>;
  hasEstimatedPrices: boolean;
  sourcePatterns: PatternCandidate[];
};

type DraftPattern = {
  name: string;
  label: string;
  category: PatternCategory;
  direction: PatternDirection;
  baseScore: number;
  baseReason: string;
  patternHigh: number | null;
  patternLow: number | null;
  neckline: number | null;
  support: number | null;
  resistance: number | null;
  breakoutPrice: number | null;
  breakdownPrice: number | null;
  invalidationLevel: number | null;
  evidence: string[];
  confirmationCondition: string;
  invalidationCondition: string;
  entryLogic: string;
  exitLogic: string;
  formula: string;
  sourceEstimated: boolean;
};

const MIN_OUTPUT_SCORE = 45;
const MAX_PATTERN_COUNT = 3;

const BULLISH_PATTERNS = new Set([
  "double_bottom",
  "inverse_head_and_shoulders",
  "ascending_triangle",
  "bull_flag",
  "cup_and_handle",
]);

const BEARISH_PATTERNS = new Set([
  "double_top",
  "head_and_shoulders",
  "descending_triangle",
  "bear_flag",
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundPrice(value: number | null, digits = 4) {
  if (!isFiniteNumber(value)) return null;
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function compactNumbers(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => isFiniteNumber(value) && value > 0);
}

function uniqueSortedLevels(values: Array<number | null | undefined>, direction: "asc" | "desc" = "asc") {
  const unique = Array.from(new Set(compactNumbers(values).map((value) => roundPrice(value, 4) as number)));
  return unique.sort((a, b) => (direction === "asc" ? a - b : b - a));
}

function nearestBelow(price: number | null, levels: number[]) {
  if (!price) return null;
  return levels.filter((level) => level <= price).sort((a, b) => Math.abs(price - a) - Math.abs(price - b))[0] ?? null;
}

function nearestAbove(price: number | null, levels: number[]) {
  if (!price) return null;
  return levels.filter((level) => level >= price).sort((a, b) => Math.abs(price - a) - Math.abs(price - b))[0] ?? null;
}

function pctDiff(a: number | null, b: number | null) {
  if (!a || !b) return null;
  return Math.abs(a - b) / Math.max(Math.abs(b), 1) * 100;
}

function hasText(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function confidenceFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "high";
  if (score >= 65) return "medium";
  return "low";
}

function stageForBreakout(input: NormalizedChartInput, draft: DraftPattern): PatternStage {
  const current = input.currentPrice;
  if (!current || (!draft.breakoutPrice && !draft.breakdownPrice)) return "candidate";

  if (draft.direction === "bullish") {
    if (draft.invalidationLevel && current < draft.invalidationLevel) return "failed";
    if (draft.breakoutPrice && current > draft.breakoutPrice) return "confirmed";
    return "candidate";
  }

  if (draft.direction === "bearish") {
    if (draft.invalidationLevel && current > draft.invalidationLevel) return "failed";
    if (draft.breakdownPrice && current < draft.breakdownPrice) return "confirmed";
    return "candidate";
  }

  if (draft.resistance && current > draft.resistance) return "confirmed";
  if (draft.support && current < draft.support) return "confirmed";
  return "candidate";
}

function calculateTradePlan(draft: DraftPattern, stage: PatternStage) {
  const patternHeight =
    draft.direction === "bullish"
      ? draft.neckline && draft.patternLow
        ? draft.neckline - draft.patternLow
        : draft.resistance && draft.support
          ? draft.resistance - draft.support
          : null
      : draft.patternHigh && draft.neckline
        ? draft.patternHigh - draft.neckline
        : draft.resistance && draft.support
          ? draft.resistance - draft.support
          : null;

  if (!patternHeight || patternHeight <= 0) {
    return {
      patternHeight: null,
      tradePlan: {
        entryType: "none",
        entryPriceAggressive: null,
        entryPriceConservative: null,
        stopLossPrice: null,
        targetPrice1: null,
        targetPrice2: null,
        riskRewardRatio: null,
      },
    };
  }

  if (draft.direction === "bullish") {
    const breakout = draft.breakoutPrice ?? draft.neckline ?? draft.resistance;
    const invalidation = draft.invalidationLevel ?? draft.patternLow ?? draft.support;
    const entryPriceAggressive = breakout ? breakout * 1.003 : null;
    const entryPriceConservative = breakout ? breakout * 1.01 : null;
    const stopLossPrice = invalidation ? invalidation * 0.985 : null;
    const targetPrice1 = breakout ? breakout + patternHeight * 0.5 : null;
    const targetPrice2 = breakout ? breakout + patternHeight : null;
    const riskRewardRatio =
      entryPriceAggressive && stopLossPrice && targetPrice1 && entryPriceAggressive > stopLossPrice
        ? (targetPrice1 - entryPriceAggressive) / (entryPriceAggressive - stopLossPrice)
        : null;

    return {
      patternHeight,
      tradePlan: {
        entryType: stage === "confirmed" ? "aggressive" : "wait",
        entryPriceAggressive: roundPrice(entryPriceAggressive),
        entryPriceConservative: roundPrice(entryPriceConservative),
        stopLossPrice: roundPrice(stopLossPrice),
        targetPrice1: roundPrice(targetPrice1),
        targetPrice2: roundPrice(targetPrice2),
        riskRewardRatio: roundPrice(riskRewardRatio, 2),
      },
    };
  }

  const breakdown = draft.breakdownPrice ?? draft.neckline ?? draft.support;
  const invalidation = draft.invalidationLevel ?? draft.patternHigh ?? draft.resistance;
  const entryPriceAggressive = breakdown ? breakdown * 0.997 : null;
  const entryPriceConservative = breakdown ? breakdown * 0.99 : null;
  const stopLossPrice = invalidation ? invalidation * 1.015 : null;
  const targetPrice1 = breakdown ? breakdown - patternHeight * 0.5 : null;
  const targetPrice2 = breakdown ? breakdown - patternHeight : null;
  const riskRewardRatio =
    entryPriceAggressive && stopLossPrice && targetPrice1 && stopLossPrice > entryPriceAggressive
      ? (entryPriceAggressive - targetPrice1) / (stopLossPrice - entryPriceAggressive)
      : null;

  return {
    patternHeight,
    tradePlan: {
      entryType: stage === "confirmed" ? "aggressive" : "wait",
      entryPriceAggressive: roundPrice(entryPriceAggressive),
      entryPriceConservative: roundPrice(entryPriceConservative),
      stopLossPrice: roundPrice(stopLossPrice),
      targetPrice1: roundPrice(targetPrice1),
      targetPrice2: roundPrice(targetPrice2),
      riskRewardRatio: roundPrice(riskRewardRatio, 2),
    },
  };
}

function calculatePatternConfidence(draft: DraftPattern, input: NormalizedChartInput, stage: PatternStage, riskRewardRatio: number | null) {
  let score = draft.baseScore;
  const warnings: string[] = [];
  const indicators = input.indicators;
  const current = input.currentPrice;

  if (stage === "confirmed") score += 15;
  if (stage === "candidate") {
    score -= 15;
    warnings.push("돌파 전 후보 상태이므로 진입 조건 확인이 필요합니다.");
  }
  if (stage === "failed" || stage === "invalid") {
    score -= 30;
    warnings.push("무효화 또는 실패 조건에 근접했거나 이미 충족된 후보입니다.");
  }

  const volumeStatus = indicators.volume?.status;
  if (volumeStatus === "increasing") score += 10;
  else {
    score -= 10;
    warnings.push("거래량 확인이 부족하여 신뢰도를 낮게 봅니다.");
  }

  const rsiValue = indicators.rsi?.valueEstimate;
  if (draft.direction === "bullish") {
    if (isFiniteNumber(rsiValue) && rsiValue >= 50) score += 5;
    if (isFiniteNumber(rsiValue) && rsiValue >= 75) {
      score -= 10;
      warnings.push("RSI 과열 구간에서 상승형 진입 후보를 보수적으로 봅니다.");
    }
    if (["bullish", "bullish_cross_candidate"].includes(String(indicators.macd?.status))) score += 5;
    if (["price_above_ma", "short_above_long"].includes(String(indicators.movingAverages?.status))) score += 5;
    if (indicators.ichimoku?.cloudPosition === "above_cloud" || indicators.ichimoku?.status === "above_cloud") score += 5;
  } else if (draft.direction === "bearish") {
    if (isFiniteNumber(rsiValue) && rsiValue <= 50) score += 5;
    if (isFiniteNumber(rsiValue) && rsiValue <= 25) {
      score -= 10;
      warnings.push("RSI 과매도 구간에서 하락형 진입 후보를 보수적으로 봅니다.");
    }
    if (["bearish", "bearish_cross_candidate"].includes(String(indicators.macd?.status))) score += 5;
    if (["price_below_ma", "short_below_long"].includes(String(indicators.movingAverages?.status))) score += 5;
    if (indicators.ichimoku?.cloudPosition === "below_cloud" || indicators.ichimoku?.status === "below_cloud") score += 5;
  }

  if (input.supportLevels.length >= 1 && input.resistanceLevels.length >= 1) score += 5;
  if (draft.sourceEstimated || input.hasEstimatedPrices) {
    score -= 10;
    warnings.push("이미지 기반 추정값이므로 실제 OHLC 데이터 검증 필요");
  }
  if (!current || compactNumbers([draft.support, draft.resistance, draft.neckline]).length < 2) {
    score -= 15;
    warnings.push("가격축, 현재가, 지지선, 저항선 정보가 부족합니다.");
  }
  if (riskRewardRatio !== null && riskRewardRatio < 1.5) {
    score -= 15;
    warnings.push("손익비 부족");
  }

  const confidenceScore = Math.max(0, Math.min(100, Math.round(score)));
  const riskLevel: RiskLevel =
    confidenceScore >= 75 && (riskRewardRatio ?? 0) >= 2
      ? "low"
      : confidenceScore >= 60 && (riskRewardRatio ?? 0) >= 1.5
        ? "medium"
        : "high";

  return {
    confidenceScore,
    confidence: confidenceFromScore(confidenceScore),
    riskLevel,
    warnings,
  };
}

function makeCandidate(draft: DraftPattern, input: NormalizedChartInput): PatternCandidate {
  let stage = stageForBreakout(input, draft);
  const { patternHeight, tradePlan } = calculateTradePlan(draft, stage);
  if (!patternHeight || !tradePlan.entryPriceAggressive || !tradePlan.stopLossPrice || !tradePlan.targetPrice1) {
    stage = "invalid";
  }
  const confidence = calculatePatternConfidence(draft, input, stage, tradePlan.riskRewardRatio ?? null);
  const directionToBreakout =
    draft.direction === "bullish" ? "upside_candidate" : draft.direction === "bearish" ? "downside_candidate" : "neutral";

  return {
    name: draft.name,
    label: draft.label,
    category: draft.category,
    direction: draft.direction,
    stage,
    confidence: confidence.confidence,
    confidenceScore: confidence.confidenceScore,
    baseReliability: {
      score: draft.baseScore,
      reason: draft.baseReason,
    },
    priceLevels: {
      currentPrice: roundPrice(input.currentPrice),
      patternHigh: roundPrice(draft.patternHigh),
      patternLow: roundPrice(draft.patternLow),
      neckline: roundPrice(draft.neckline),
      support: roundPrice(draft.support),
      resistance: roundPrice(draft.resistance),
      breakoutPrice: roundPrice(draft.breakoutPrice),
      breakdownPrice: roundPrice(draft.breakdownPrice),
    },
    tradePlan,
    evidence: draft.evidence,
    breakoutDirection: directionToBreakout,
    confirmationCondition: draft.confirmationCondition,
    invalidationCondition: draft.invalidationCondition,
    entryLogic: draft.entryLogic,
    exitLogic: draft.exitLogic,
    riskLevel: confidence.riskLevel,
    warnings: confidence.warnings,
    calculation: {
      patternHeight: roundPrice(patternHeight),
      formula: draft.formula,
      estimated: draft.sourceEstimated || input.hasEstimatedPrices,
    },
  };
}

function fromAiCandidate(candidate: PatternCandidate, input: NormalizedChartInput): DraftPattern | null {
  const name = candidate.name;
  const current = input.currentPrice;
  const support = nearestBelow(current, input.supportLevels) ?? input.supportLevels[0] ?? null;
  const resistance = nearestAbove(current, input.resistanceLevels) ?? input.resistanceLevels[input.resistanceLevels.length - 1] ?? null;
  const recentHigh = input.recentHigh ?? resistance;
  const recentLow = input.recentLow ?? support;

  const bullish = BULLISH_PATTERNS.has(name) || candidate.breakoutDirection === "upside_candidate";
  const bearish = BEARISH_PATTERNS.has(name) || candidate.breakoutDirection === "downside_candidate";
  const direction: PatternDirection = bullish ? "bullish" : bearish ? "bearish" : "neutral";
  const neckline = direction === "bearish" ? support : resistance;

  if (!neckline && !support && !resistance) return null;

  return {
    name,
    label: candidate.label || name,
    category: (candidate.category as PatternCategory) || "unknown",
    direction,
    baseScore: direction === "bearish" ? 60 : direction === "bullish" ? 65 : 55,
    baseReason: "AI가 식별한 패턴 후보를 가격축 추정값으로 보강했습니다.",
    patternHigh: recentHigh,
    patternLow: recentLow,
    neckline,
    support,
    resistance,
    breakoutPrice: direction === "bullish" ? neckline : null,
    breakdownPrice: direction === "bearish" ? neckline : null,
    invalidationLevel: direction === "bullish" ? recentLow : recentHigh,
    evidence: candidate.evidence?.length ? candidate.evidence : ["AI 이미지 분석에서 패턴 구조 후보가 관찰되었습니다."],
    confirmationCondition: candidate.confirmationCondition || "돌파선 또는 목선 확인이 필요합니다.",
    invalidationCondition: candidate.invalidationCondition || "무효화 가격 이탈 시 후보 신뢰도가 낮아집니다.",
    entryLogic: candidate.entryLogic || "돌파 확인 전에는 대기하고 확인 후 진입 후보로만 봅니다.",
    exitLogic: "1차/2차 목표 가격 후보와 무효화 기준 가격을 함께 참고합니다.",
    formula:
      direction === "bearish"
        ? "targetPrice2 = neckline - (patternHigh - neckline)"
        : "targetPrice2 = neckline + (neckline - patternLow)",
    sourceEstimated: true,
  };
}

function buildHeuristicDrafts(input: NormalizedChartInput): DraftPattern[] {
  const current = input.currentPrice;
  const support = nearestBelow(current, input.supportLevels) ?? input.supportLevels[0] ?? null;
  const resistance = nearestAbove(current, input.resistanceLevels) ?? input.resistanceLevels[input.resistanceLevels.length - 1] ?? null;
  const recentHigh = input.recentHigh ?? resistance;
  const recentLow = input.recentLow ?? support;
  const trend = input.visualTrend;
  const drafts: DraftPattern[] = [];

  if (support && resistance && recentLow && hasText(trend, ["하락", "반등", "조정", "횡보"])) {
    drafts.push({
      name: "double_bottom",
      label: "이중바닥",
      category: "reversal",
      direction: "bullish",
      baseScore: 68,
      baseReason: "이중바닥은 정석적인 상승 반전 패턴이며, 목선 돌파 후 신뢰도가 상승합니다.",
      patternHigh: resistance,
      patternLow: Math.min(support, recentLow),
      neckline: resistance,
      support,
      resistance,
      breakoutPrice: resistance,
      breakdownPrice: null,
      invalidationLevel: recentLow,
      evidence: ["최근 저점 또는 지지 후보가 관찰됩니다.", "상단 저항 후보를 목선으로 설정할 수 있습니다."],
      confirmationCondition: `${resistance} 부근 목선 위 돌파 유지가 필요합니다.`,
      invalidationCondition: `${recentLow} 부근 2차 저점 또는 주요 지지선 이탈 시 후보가 약해집니다.`,
      entryLogic: "목선 돌파 확인 전에는 대기하고, 돌파 후 눌림 지지 확인 시 진입 후보 조건으로 봅니다.",
      exitLogic: "목선 아래 재진입 또는 저점 이탈 시 실패 가능성을 높게 봅니다.",
      formula: "targetPrice2 = neckline + (neckline - patternLow)",
      sourceEstimated: true,
    });
  }

  if (support && resistance && recentHigh && hasText(trend, ["상승", "횡보", "저항"])) {
    drafts.push({
      name: "double_top",
      label: "이중천정",
      category: "reversal",
      direction: "bearish",
      baseScore: 60,
      baseReason: "이중천정은 상승 이후 저항 실패가 반복될 때 하락 반전 후보가 됩니다.",
      patternHigh: Math.max(resistance, recentHigh),
      patternLow: support,
      neckline: support,
      support,
      resistance,
      breakoutPrice: null,
      breakdownPrice: support,
      invalidationLevel: recentHigh,
      evidence: ["최근 고점 또는 저항 후보가 관찰됩니다.", "하단 지지 후보를 목선으로 설정할 수 있습니다."],
      confirmationCondition: `${support} 부근 목선 아래 이탈 확인이 필요합니다.`,
      invalidationCondition: `${recentHigh} 부근 2차 고점 재돌파 시 후보가 무효화됩니다.`,
      entryLogic: "목선 이탈 확인 전에는 대기하고, 이탈 후 되돌림 저항 확인 시 진입 후보 조건으로 봅니다.",
      exitLogic: "목선 위 재진입 또는 고점 재돌파 시 실패 가능성을 높게 봅니다.",
      formula: "targetPrice2 = neckline - (patternHigh - neckline)",
      sourceEstimated: true,
    });
  }

  if (support && resistance && current && resistance > support) {
    drafts.push({
      name: "rectangle_breakout",
      label: "박스권 돌파",
      category: "range",
      direction: current >= (support + resistance) / 2 ? "bullish" : "bearish",
      baseScore: 60,
      baseReason: "박스권은 일정한 상단 저항과 하단 지지가 반복될 때 돌파 방향 확인 후 의미가 커집니다.",
      patternHigh: resistance,
      patternLow: support,
      neckline: current >= (support + resistance) / 2 ? resistance : support,
      support,
      resistance,
      breakoutPrice: resistance,
      breakdownPrice: support,
      invalidationLevel: current >= (support + resistance) / 2 ? support : resistance,
      evidence: ["상단 저항 후보와 하단 지지 후보가 함께 관찰됩니다.", "가격이 두 경계 사이에서 움직이는 박스권 후보입니다."],
      confirmationCondition: "상단 저항 돌파 또는 하단 지지 이탈이 확인되어야 합니다.",
      invalidationCondition: "돌파 후 박스권 내부로 재진입하면 실패 가능성을 높게 봅니다.",
      entryLogic: "박스권 내부 예측 진입보다 경계 돌파/이탈 확인 후 진입 후보 조건으로 봅니다.",
      exitLogic: "박스 높이를 기준으로 1차/2차 목표 후보를 계산하고, 박스 내부 재진입을 경계합니다.",
      formula: "boxHeight = resistance - support; target2 = breakout boundary +/- boxHeight",
      sourceEstimated: true,
    });
  }

  return drafts;
}

export function normalizeChartImageAnalysis(input: AIAnalysis): NormalizedChartInput {
  const priceAxis = input.priceAxisObservations;
  const currentPrice = priceAxis?.currentPriceEstimate?.value ?? null;
  const supportLevels = uniqueSortedLevels([
    ...(priceAxis?.visibleSupportPrices?.map((level) => level.value) ?? []),
    ...input.visualSupportZones.map(() => null),
    priceAxis?.recentLowEstimate?.value,
  ]);
  const resistanceLevels = uniqueSortedLevels([
    ...(priceAxis?.visibleResistancePrices?.map((level) => level.value) ?? []),
    priceAxis?.recentHighEstimate?.value,
  ]);

  return {
    currentPrice,
    supportLevels,
    resistanceLevels,
    recentHigh: priceAxis?.recentHighEstimate?.value ?? null,
    recentLow: priceAxis?.recentLowEstimate?.value ?? null,
    visualTrend: input.visualTrend ?? "",
    indicators: input.indicatorReadings ?? {},
    hasEstimatedPrices: true,
    sourcePatterns: input.patternCandidates ?? [],
  };
}

export function calculatePatternTradePlan(pattern: PatternCandidate, input: NormalizedChartInput) {
  const draft = fromAiCandidate(pattern, input);
  if (!draft) return null;
  return calculateTradePlan(draft, stageForBreakout(input, draft)).tradePlan;
}

export function rankPatternCandidates(patternCandidates: PatternCandidate[]) {
  const filtered = patternCandidates.filter((candidate) => (candidate.confidenceScore ?? 0) >= MIN_OUTPUT_SCORE);
  const ranked = filtered.sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
  const selected: PatternCandidate[] = [];
  const directionCounts = new Map<string, number>();

  for (const candidate of ranked) {
    const direction = String(candidate.direction ?? "unknown");
    const count = directionCounts.get(direction) ?? 0;
    if (count >= MAX_PATTERN_COUNT) continue;
    selected.push(candidate);
    directionCounts.set(direction, count + 1);
    if (selected.length >= MAX_PATTERN_COUNT) break;
  }

  return selected;
}

export function buildPatternSummary(patternCandidates: PatternCandidate[]): PatternSummary {
  const primary = patternCandidates[0];
  if (!primary) {
    return {
      primaryPattern: null,
      overallPatternBias: "neutral",
      bestEntryZone: null,
      keyInvalidationPrice: null,
      keyTargetPrice: null,
      comment: "명확한 정석 차트패턴 후보가 부족합니다. 돌파선, 지지선, 저항선 확인이 필요합니다.",
    };
  }

  const direction = primary.direction === "bullish" || primary.direction === "bearish" ? primary.direction : "neutral";
  const entry = primary.tradePlan?.entryPriceAggressive;
  const target = primary.tradePlan?.targetPrice1;
  const invalidation = primary.tradePlan?.stopLossPrice;
  const condition = primary.stage === "confirmed" ? "확인된 후보" : "돌파 확인 필요";

  return {
    primaryPattern: primary.label,
    overallPatternBias: direction,
    bestEntryZone: entry ? `${entry.toLocaleString("ko-KR")} 부근 ${condition}` : null,
    keyInvalidationPrice: invalidation ?? null,
    keyTargetPrice: target ?? null,
    comment: `${primary.label} 후보가 가장 우선순위가 높습니다. ${primary.confirmationCondition}`,
  };
}

export function detectChartPatterns(normalizedInput: NormalizedChartInput) {
  const drafts = [
    ...normalizedInput.sourcePatterns.map((candidate) => fromAiCandidate(candidate, normalizedInput)).filter(Boolean),
    ...buildHeuristicDrafts(normalizedInput),
  ] as DraftPattern[];

  const uniqueDrafts = new Map<string, DraftPattern>();
  for (const draft of drafts) {
    if (!uniqueDrafts.has(draft.name)) uniqueDrafts.set(draft.name, draft);
  }

  const candidates = Array.from(uniqueDrafts.values()).map((draft) => makeCandidate(draft, normalizedInput));
  const ranked = rankPatternCandidates(candidates);

  return {
    patternCandidates: ranked,
    weakCandidates: candidates.filter((candidate) => (candidate.confidenceScore ?? 0) < MIN_OUTPUT_SCORE),
    patternSummary: buildPatternSummary(ranked),
  };
}
