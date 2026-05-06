import {
  formatConfidence,
  formatNumber,
  formatPrice,
  formatPriceRange,
  formatSignalLabel,
  formatStatus,
} from "./formatters";
import type {
  AdvancedTradeSignal,
  AnalysisResponse,
  AnalysisViewModel,
  SignalTone,
  TradeSignal,
} from "../types/analysis";

type SignalSource = AdvancedTradeSignal | TradeSignal | null | undefined;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function compact<T>(values: Array<T | null | undefined | false | "">): T[] {
  return values.filter(Boolean) as T[];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getSignalSource(raw: AnalysisResponse): SignalSource {
  return raw.advancedTradeSignal ?? raw.tradeSignal ?? null;
}

function getCurrentPrice(raw: AnalysisResponse): number | null {
  const source = getSignalSource(raw);
  return (
    source?.currentPriceEstimate?.value ??
    raw.aiAnalysis?.priceAxisObservations?.currentPriceEstimate?.value ??
    raw.technicalAnalysis?.latestClose ??
    null
  );
}

function supportLevels(raw: AnalysisResponse): number[] {
  const source = getSignalSource(raw);
  return compact([
    ...(raw.advancedTradeSignal?.supportResistance?.supportLevels ?? []),
    ...(raw.technicalAnalysis?.supportResistance?.supportLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestSupport,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleSupportPrices?.map((level) => level.value) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentLowEstimate?.value,
    source?.stopLossCandidate?.price,
  ]).filter(finite);
}

function resistanceLevels(raw: AnalysisResponse): number[] {
  const source = getSignalSource(raw);
  return compact([
    ...(raw.advancedTradeSignal?.supportResistance?.resistanceLevels ?? []),
    ...(raw.technicalAnalysis?.supportResistance?.resistanceLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestResistance,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleResistancePrices?.map((level) => level.value) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentHighEstimate?.value,
    source?.targetPriceCandidate?.primary,
  ]).filter(finite);
}

function nearestBelow(current: number | null, levels: number[]) {
  if (!finite(current)) return null;
  return levels
    .filter((level) => level <= current)
    .sort((a, b) => Math.abs(current - a) - Math.abs(current - b))[0] ?? null;
}

function nearestAbove(current: number | null, levels: number[]) {
  if (!finite(current)) return null;
  return levels
    .filter((level) => level >= current)
    .sort((a, b) => Math.abs(current - a) - Math.abs(current - b))[0] ?? null;
}

function distancePercent(current: number | null, level: number | null) {
  if (!finite(current) || !finite(level) || level === 0) return null;
  return ((current - level) / level) * 100;
}

function distanceText(current: number | null, level: number | null) {
  const distance = distancePercent(current, level);
  if (distance === null) return "계산 불가";
  if (Math.abs(distance) < 0.25) return "현재가 근처";
  return `약 ${distance > 0 ? "+" : ""}${distance.toFixed(1)}%`;
}

function signalTone(signal: string): SignalTone {
  if (signal === "strong_buy_candidate") return "strongPositive";
  if (signal === "buy_candidate" || signal === "weak_buy_candidate") return "positive";
  if (signal === "reduce_position_candidate") return "caution";
  if (signal === "sell_candidate" || signal === "weak_sell_candidate") return "negative";
  if (signal === "strong_sell_candidate") return "danger";
  if (signal.includes("insufficient")) return "unknown";
  return "neutral";
}

function visibleIndicatorCount(raw: AnalysisResponse) {
  return Object.values(raw.aiAnalysis?.indicatorReadings ?? {}).filter((indicator) => {
    if (!indicator || typeof indicator !== "object") return false;
    return Boolean((indicator as { visible?: boolean }).visible);
  }).length;
}

function normalizeSignal(raw: AnalysisResponse) {
  const source = getSignalSource(raw);
  const current = getCurrentPrice(raw);
  const supports = supportLevels(raw);
  const resistances = resistanceLevels(raw);
  const nearestSupport = nearestBelow(current, supports);
  const nearestResistance = nearestAbove(current, resistances);
  const buyScore = source?.buyScore ?? source?.conditionScores?.buy?.total ?? null;
  const sellScore = source?.sellScore ?? source?.conditionScores?.sell?.total ?? null;
  const rr = source?.targetPriceCandidate?.riskRewardRatio ?? null;
  let signal = source?.finalSignal ?? source?.summarySignal?.actionParameter ?? "neutral";
  const warnings: string[] = [];

  if (!current || (supports.length === 0 && resistances.length === 0) || visibleIndicatorCount(raw) <= 1) {
    signal = signal === "neutral" ? "neutral" : "insufficient_data";
    warnings.push("가격 또는 보조지표 정보가 부족해 강한 기술적 신호로 보지 않습니다.");
  }

  if (finite(buyScore) && finite(sellScore) && Math.abs(buyScore - sellScore) < 10) {
    signal = "neutral";
    warnings.push("매수 점수와 매도 점수 차이가 작아 중립으로 해석합니다.");
  }

  const resistanceDistance = distancePercent(current, nearestResistance);
  if (signal === "strong_buy_candidate" && resistanceDistance !== null && resistanceDistance <= 0 && resistanceDistance >= -2.5) {
    signal = finite(buyScore) && buyScore >= 55 ? "buy_candidate" : "neutral";
    warnings.push("현재가가 주요 저항 후보에 가까워 강한 매수 후보로 보지 않습니다.");
  }

  const supportDistance = distancePercent(current, nearestSupport);
  if (signal === "strong_sell_candidate" && supportDistance !== null && supportDistance >= 0 && supportDistance <= 2.5) {
    signal = finite(sellScore) && sellScore >= 55 ? "reduce_position_candidate" : "neutral";
    warnings.push("현재가가 주요 지지 후보에 가까워 강한 매도 후보로 보지 않습니다.");
  }

  if (finite(rr) && rr < 1.5) {
    if (signal === "strong_buy_candidate") signal = "buy_candidate";
    if (signal === "strong_sell_candidate") signal = "sell_candidate";
    warnings.push("손익비 부족");
  }

  return { signal, buyScore, sellScore, holdScore: raw.advancedTradeSignal?.holdScore ?? null, warnings };
}

export function buildSignalSummary(raw: AnalysisResponse): AnalysisViewModel["signalSummary"] {
  const source = getSignalSource(raw);
  const normalized = normalizeSignal(raw);
  const confidence = source?.confidence === "high" ? "medium" : source?.confidence;
  const finalLabel = formatSignalLabel(normalized.signal);
  const currentState = firstText(
    raw.advancedTradeSignal?.marketState,
    raw.visualSummary?.currentState,
    raw.marketRegime?.interpretation,
    raw.aiAnalysis?.visualTrend,
    "차트 상태 확인 필요",
  );
  const strategyTypeLabel = firstText(
    raw.advancedTradeSignal?.strategyType,
    normalized.signal.includes("buy") ? "눌림 반등 관찰" : "",
    normalized.signal.includes("sell") ? "리스크 관리" : "",
    normalized.signal === "neutral" ? "관망" : "",
    "돌파 확인 대기",
  );
  const currentPriceText = formatPrice(getCurrentPrice(raw));
  const oneLineSummary = firstText(
    raw.aiAnalysis?.patternSummary?.comment,
    raw.aiAnalysis?.summary,
    "이미지 기반 분석 결과를 바탕으로 기술적 신호 후보를 정리했습니다.",
  );

  return {
    finalLabel,
    signalTone: signalTone(normalized.signal),
    currentState,
    strategyTypeLabel,
    confidenceLabel: formatConfidence(confidence ?? "low"),
    currentPriceText,
    oneLineSummary,
  };
}

export function buildPriceStrategy(raw: AnalysisResponse): AnalysisViewModel["priceStrategy"] {
  const source = getSignalSource(raw);
  const current = getCurrentPrice(raw);
  const support = nearestBelow(current, supportLevels(raw));
  const resistance = nearestAbove(current, resistanceLevels(raw));
  const entryFrom =
    source?.summarySignal?.entryPriceCandidate?.from ??
    source?.buyZone?.priceRange?.from ??
    source?.sellZone?.priceRange?.from ??
    support ??
    null;
  const entryTo =
    source?.summarySignal?.entryPriceCandidate?.to ??
    source?.buyZone?.priceRange?.to ??
    source?.sellZone?.priceRange?.to ??
    current ??
    null;
  const fallbackStop = support ? support * 0.98 : resistance ? resistance * 1.02 : null;
  const stopLoss = source?.stopLossCandidate?.price ?? fallbackStop;
  const target1 = source?.targetPriceCandidate?.primary ?? source?.summarySignal?.targetPriceCandidate?.primary ?? null;
  const target2 = source?.targetPriceCandidate?.secondary ?? source?.summarySignal?.targetPriceCandidate?.secondary ?? null;
  const rr = source?.targetPriceCandidate?.riskRewardRatio ?? null;

  return {
    entryZoneText: entryFrom && entryTo ? formatPriceRange(entryFrom, entryTo) : "명확한 진입 후보 구간 없음",
    stopLossText: formatPrice(stopLoss),
    target1Text: target1 ? formatPrice(target1) : "목표 가격 후보 계산 불가",
    target2Text: target2 ? formatPrice(target2) : "목표 가격 후보 계산 불가",
    riskRewardText: finite(rr)
      ? `${formatNumber(rr)}${rr < 1.5 ? " / 손익비가 낮아 공격적 진입 후보로 보기 어렵습니다." : ""}`
      : "계산 불가",
    priceBasisWarning: "이미지 기반 가격은 실제 가격과 다를 수 있습니다.",
  };
}

export function buildDecisionReasons(raw: AnalysisResponse): AnalysisViewModel["decisionReasons"] {
  const source = getSignalSource(raw);
  const current = getCurrentPrice(raw);
  const support = nearestBelow(current, supportLevels(raw));
  const resistance = nearestAbove(current, resistanceLevels(raw));
  const normalized = normalizeSignal(raw);
  const reasons: AnalysisViewModel["decisionReasons"] = [
    ...(raw.advancedTradeSignal?.decisionReason ?? []).map((text) => ({ type: "neutral" as const, text })),
    ...(raw.advancedTradeSignal?.blockedReasons ?? []).map((text) => ({ type: "negative" as const, text })),
  ];

  if (support) reasons.push({ type: "positive", text: "현재 가격이 주요 지지 후보 구간 위에 위치합니다." });
  if (resistance) reasons.push({ type: "negative", text: "주요 저항 후보 구간이 가까워 추가 확인이 필요합니다." });
  if (finite(normalized.buyScore) && finite(normalized.sellScore) && Math.abs(normalized.buyScore - normalized.sellScore) < 10) {
    reasons.push({ type: "neutral", text: "매수 점수와 매도 점수 차이가 크지 않아 강한 방향성 판단은 어렵습니다." });
  }
  if (source?.targetPriceCandidate?.riskRewardRatio !== undefined && (source.targetPriceCandidate.riskRewardRatio ?? 0) < 1.5) {
    reasons.push({ type: "negative", text: "손익비가 낮아 공격적 진입 후보로 보기 어렵습니다." });
  }
  reasons.push({ type: "negative", text: "이미지 기반 분석이므로 실제 OHLCV 검증이 필요합니다." });

  return reasons.slice(0, 8);
}

export function buildScoreSummary(raw: AnalysisResponse): AnalysisViewModel["scoreSummary"] {
  const source = getSignalSource(raw);
  const normalized = normalizeSignal(raw);
  const buy = source?.conditionScores?.buy;
  const sell = source?.conditionScores?.sell;

  return {
    buyScore: normalized.buyScore,
    sellScore: normalized.sellScore,
    holdScore: normalized.holdScore,
    interpretation:
      finite(normalized.buyScore) && finite(normalized.sellScore) && Math.abs(normalized.buyScore - normalized.sellScore) < 10
        ? "매수와 매도 점수가 비슷해 중립 또는 관망 후보가 우세합니다."
        : "점수는 기술적 조건 충족 정도를 요약한 참고값입니다.",
    rows: [
      { group: "매수", label: "지지선 근처", score: buy?.supportProximity },
      { group: "매수", label: "RSI 반등", score: buy?.rsiRebound },
      { group: "매수", label: "MACD 상향", score: buy?.macdBullish },
      { group: "매수", label: "거래량 증가", score: buy?.volumeIncrease },
      { group: "매수", label: "추세", score: buy?.trend },
      { group: "매도", label: "저항선 근처", score: sell?.resistanceProximity },
      { group: "매도", label: "RSI 과열", score: sell?.rsiOverheated },
      { group: "매도", label: "MACD 하향", score: sell?.macdBearish },
      { group: "매도", label: "거래량 증가", score: sell?.volumeIncrease },
      { group: "매도", label: "볼린저 상단", score: sell?.bollingerUpper },
    ],
  };
}

export function buildMarketState(raw: AnalysisResponse): AnalysisViewModel["marketState"] {
  const pattern = raw.aiAnalysis?.patternCandidates?.[0];
  return {
    trendDirection: firstText(raw.marketRegime?.trendDirection, raw.visualSummary?.trendDirection, raw.aiAnalysis?.visualTrend, "확인 필요"),
    volatilityState: firstText(raw.marketRegime?.volatilityState, raw.visualSummary?.volatilityState, "보통 또는 확인 필요"),
    pricePosition: firstText(raw.marketRegime?.pricePosition, raw.visualSummary?.pricePosition, "주요 가격대 확인 필요"),
    patternState: pattern ? `${pattern.label} ${pattern.stage ? `(${pattern.stage})` : "후보"}` : "명확한 패턴 후보 없음",
    interpretation: firstText(
      raw.marketRegime?.interpretation,
      raw.visualSummary?.marketInterpretation,
      raw.aiAnalysis?.summary,
      "시장 상태 해석 정보가 부족합니다.",
    ),
  };
}

export function buildSupportResistance(raw: AnalysisResponse): AnalysisViewModel["supportResistance"] {
  const current = getCurrentPrice(raw);
  return {
    currentPrice: current,
    supports: supportLevels(raw).slice(0, 3).map((value, index) => ({
      label: `지지 후보 ${index + 1}`,
      value,
      distanceText: distanceText(current, value),
      meaning: "이탈 시 단기 추세 약화 가능성",
    })),
    resistances: resistanceLevels(raw).slice(0, 3).map((value, index) => ({
      label: `저항 후보 ${index + 1}`,
      value,
      distanceText: distanceText(current, value),
      meaning: "돌파 여부가 단기 방향성 판단의 핵심",
    })),
  };
}

export function buildPatternView(raw: AnalysisResponse): AnalysisViewModel["patternView"] {
  const candidates = raw.aiAnalysis?.patternCandidates ?? [];
  const primary = raw.aiAnalysis?.patternSummary?.primaryPattern ?? candidates[0]?.label ?? null;
  return {
    summaryText: primary ? `${primary} 후보를 우선 확인합니다.` : "현재 이미지에서는 명확한 패턴 후보가 확인되지 않습니다.",
    candidates,
  };
}

export function buildIndicatorView(raw: AnalysisResponse): AnalysisViewModel["indicatorView"] {
  const indicators = raw.aiAnalysis?.indicatorReadings ?? {};
  return [
    {
      name: "RSI",
      status: formatStatus(indicators.rsi?.status),
      direction: indicators.rsi?.visible ? "확인됨" : "확인 부족",
      interpretation: indicators.rsi?.visible
        ? "과매수/과매도 여부와 반등 후보를 보조 판단합니다."
        : "RSI 패널이 명확하지 않습니다.",
      confidence: formatConfidence(indicators.rsi?.confidence),
    },
    {
      name: "MACD",
      status: formatStatus(indicators.macd?.status),
      direction: indicators.macd?.visible ? "확인됨" : "확인 부족",
      interpretation: "상향/하향 교차 후보와 모멘텀 방향을 보조 판단합니다.",
      confidence: formatConfidence(indicators.macd?.confidence),
    },
    {
      name: "볼린저밴드",
      status: formatStatus(indicators.bollingerBands?.position),
      direction: indicators.bollingerBands?.visible ? "확인됨" : "확인 부족",
      interpretation: "상단/하단 근접 여부로 과열 또는 반등 후보를 보조 판단합니다.",
      confidence: formatConfidence(indicators.bollingerBands?.confidence),
    },
    {
      name: "이동평균선",
      status: formatStatus(indicators.movingAverages?.status),
      direction: indicators.movingAverages?.visible ? "확인됨" : "확인 부족",
      interpretation: "가격이 주요 이평선 위/아래에 있는지 확인합니다.",
      confidence: formatConfidence(indicators.movingAverages?.confidence),
    },
    {
      name: "거래량",
      status: formatStatus(indicators.volume?.status),
      direction: indicators.volume?.visible ? "확인됨" : "확인 부족",
      interpretation: "돌파 신뢰도를 높일 만한 거래량 근거가 있는지 확인합니다.",
      confidence: formatConfidence(indicators.volume?.confidence),
    },
    {
      name: "일목구름",
      status: formatStatus(indicators.ichimoku?.cloudPosition ?? indicators.ichimoku?.status),
      direction: indicators.ichimoku?.visible ? "확인됨" : "확인 부족",
      interpretation: "구름 위/아래 위치로 추세 방향성을 보조 판단합니다.",
      confidence: formatConfidence(indicators.ichimoku?.confidence),
    },
  ];
}

export function buildRiskWarnings(raw: AnalysisResponse): string[] {
  const normalized = normalizeSignal(raw);
  return unique([
    ...(raw.aiAnalysis?.riskNotes ?? []),
    ...(raw.tradeSignal?.warnings ?? []),
    ...(raw.advancedTradeSignal?.warnings ?? []),
    ...normalized.warnings,
    "본 분석은 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다.",
  ]);
}

export function normalizeAnalysisResult(raw: AnalysisResponse): AnalysisViewModel {
  return {
    signalSummary: buildSignalSummary(raw),
    priceStrategy: buildPriceStrategy(raw),
    decisionReasons: buildDecisionReasons(raw),
    scoreSummary: buildScoreSummary(raw),
    marketState: buildMarketState(raw),
    supportResistance: buildSupportResistance(raw),
    patternView: buildPatternView(raw),
    indicatorView: buildIndicatorView(raw),
    riskWarnings: buildRiskWarnings(raw),
  };
}
