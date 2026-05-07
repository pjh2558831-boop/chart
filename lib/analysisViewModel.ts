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

function clampScore(value?: number | null): number | null {
  if (!finite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreText(value?: number | null) {
  const score = clampScore(value);
  return score === null ? "- / 100" : `${score} / 100`;
}

function scoreLevel(value?: number | null) {
  const score = clampScore(value);
  if (score === null) return "확인 불가";
  if (score <= 30) return "낮음";
  if (score <= 55) return "보통";
  if (score <= 75) return "높음";
  return "매우 높음";
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function numbers(values: Array<number | null | undefined>) {
  return values.filter(finite);
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
  return numbers([
    ...(raw.advancedTradeSignal?.supportResistance?.supportLevels ?? []),
    ...(raw.technicalAnalysis?.supportResistance?.supportLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestSupport,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleSupportPrices?.map((level) => level.value) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentLowEstimate?.value,
    source?.stopLossCandidate?.price,
  ]);
}

function resistanceLevels(raw: AnalysisResponse): number[] {
  const source = getSignalSource(raw);
  return numbers([
    ...(raw.advancedTradeSignal?.supportResistance?.resistanceLevels ?? []),
    ...(raw.technicalAnalysis?.supportResistance?.resistanceLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestResistance,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleResistancePrices?.map((level) => level.value) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentHighEstimate?.value,
    source?.targetPriceCandidate?.primary,
  ]);
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
  const rawBuyScore = source?.buyScore ?? source?.conditionScores?.buy?.total ?? null;
  const rawSellScore = source?.sellScore ?? source?.conditionScores?.sell?.total ?? null;
  const buyScore = clampScore(rawBuyScore);
  const sellScore = clampScore(rawSellScore);
  const holdScore = clampScore(
    raw.advancedTradeSignal?.holdScore ??
      (Math.max(buyScore ?? 0, sellScore ?? 0) ? 100 - Math.max(buyScore ?? 0, sellScore ?? 0) : null),
  );
  const rr = source?.targetPriceCandidate?.riskRewardRatio ?? null;
  let signal = source?.finalSignal ?? source?.summarySignal?.actionParameter ?? "neutral";
  const warnings: string[] = [];
  const deductions: string[] = [];

  if (!current || (supports.length === 0 && resistances.length === 0) || visibleIndicatorCount(raw) <= 1) {
    signal = signal === "neutral" ? "neutral" : "insufficient_data";
    warnings.push("가격 또는 보조지표 정보가 부족해 강한 기술적 신호로 보기 어렵습니다.");
    deductions.push("가격 또는 보조지표 정보 부족");
  }

  if (buyScore !== null && sellScore !== null && Math.abs(buyScore - sellScore) < 10) {
    signal = "neutral";
    warnings.push("매수 점수와 매도 점수 차이가 작아 중립으로 해석합니다.");
    deductions.push("매수/매도 점수 차이 부족");
  }

  const resistanceDistance = distancePercent(current, nearestResistance);
  if (signal === "strong_buy_candidate" && resistanceDistance !== null && resistanceDistance <= 0 && resistanceDistance >= -2.5) {
    signal = (buyScore ?? 0) >= 55 ? "buy_candidate" : "neutral";
    warnings.push("현재가가 주요 저항 후보에 가까워 강한 매수 후보로 보기 어렵습니다.");
    deductions.push("주요 저항 후보 근접");
  }

  const supportDistance = distancePercent(current, nearestSupport);
  if (signal === "strong_sell_candidate" && supportDistance !== null && supportDistance >= 0 && supportDistance <= 2.5) {
    signal = (sellScore ?? 0) >= 55 ? "reduce_position_candidate" : "neutral";
    warnings.push("현재가가 주요 지지 후보에 가까워 강한 매도 후보로 보기 어렵습니다.");
    deductions.push("주요 지지 후보 근접");
  }

  if (finite(rr) && rr < 1.5) {
    if (signal === "strong_buy_candidate") signal = "buy_candidate";
    if (signal === "strong_sell_candidate") signal = "sell_candidate";
    warnings.push("손익비 부족");
    deductions.push("손익비 부족");
  }

  return { signal, buyScore, sellScore, holdScore, warnings, deductions };
}

function koreanTrend(rawTrend?: string | null) {
  const value = (rawTrend ?? "").toLowerCase();
  if (value.includes("up") || value.includes("bull") || value.includes("상승")) return "상승 추세 후보";
  if (value.includes("down") || value.includes("bear") || value.includes("하락")) return "하락 추세 후보";
  if (value.includes("side") || value.includes("range") || value.includes("mixed") || value.includes("횡보")) return "횡보 또는 혼합 구간";
  return rawTrend && /[가-힣]/.test(rawTrend) ? rawTrend : "추세 확인 필요";
}

function koreanStrategy(signal: string) {
  if (signal.includes("buy")) return "지지 구간 반등 관찰";
  if (signal.includes("sell") || signal.includes("reduce")) return "저항 구간 리스크 관리";
  if (signal.includes("insufficient")) return "데이터 확인 대기";
  return "관망";
}

function buildKoreanSummary(raw: AnalysisResponse, signal: string) {
  const trend = koreanTrend(raw.aiAnalysis?.visualTrend);
  if (signal.includes("buy")) {
    return `현재 차트는 ${trend}로 해석되며, 지지 후보 구간과 보조지표 흐름을 함께 확인해야 하는 매수 후보 구간입니다.`;
  }
  if (signal.includes("sell") || signal.includes("reduce")) {
    return `현재 차트는 ${trend}로 해석되지만, 저항 후보 또는 리스크 요인이 있어 비중 관리가 필요한 구간입니다.`;
  }
  if (signal.includes("insufficient")) {
    return "가격축 또는 보조지표 근거가 부족해 강한 기술적 판단보다는 추가 확인이 필요한 상태입니다.";
  }
  return `현재 차트는 ${trend}로 해석되며, 매수와 매도 근거가 혼재되어 중립 또는 관망 후보가 우세합니다.`;
}

export function buildSignalSummary(raw: AnalysisResponse): AnalysisViewModel["signalSummary"] {
  const normalized = normalizeSignal(raw);
  return {
    finalLabel: formatSignalLabel(normalized.signal),
    signalTone: signalTone(normalized.signal),
    currentState: koreanTrend(raw.advancedTradeSignal?.marketState ?? raw.visualSummary?.currentState ?? raw.aiAnalysis?.visualTrend),
    strategyTypeLabel: koreanStrategy(normalized.signal),
    buyScoreText: scoreText(normalized.buyScore),
    sellScoreText: scoreText(normalized.sellScore),
    holdScoreText: scoreText(normalized.holdScore),
    buyScoreLevel: scoreLevel(normalized.buyScore),
    sellScoreLevel: scoreLevel(normalized.sellScore),
    holdScoreLevel: scoreLevel(normalized.holdScore),
    oneLineSummary: buildKoreanSummary(raw, normalized.signal),
  };
}

function riskRewardText(value?: number | null) {
  if (!finite(value)) return "계산 불가";
  if (value < 1) return `${formatNumber(value)} / 손익비가 낮아 공격적 진입 후보로 보기 어렵습니다.`;
  if (value < 2) return `${formatNumber(value)} / 손익비가 보통 수준입니다.`;
  return `${formatNumber(value)} / 손익비가 양호한 후보 구간입니다.`;
}

export function buildPriceStrategy(raw: AnalysisResponse): AnalysisViewModel["priceStrategy"] {
  const source = getSignalSource(raw);
  const current = getCurrentPrice(raw);
  const support = nearestBelow(current, supportLevels(raw));
  const resistance = nearestAbove(current, resistanceLevels(raw));
  const entryFrom = source?.summarySignal?.entryPriceCandidate?.from ?? source?.buyZone?.priceRange?.from ?? source?.sellZone?.priceRange?.from ?? support ?? null;
  const entryTo = source?.summarySignal?.entryPriceCandidate?.to ?? source?.buyZone?.priceRange?.to ?? source?.sellZone?.priceRange?.to ?? current ?? null;
  const fallbackStop = support ? support * 0.98 : resistance ? resistance * 1.02 : null;
  const stopLoss = source?.stopLossCandidate?.price ?? fallbackStop;
  const target1 = source?.targetPriceCandidate?.primary ?? source?.summarySignal?.targetPriceCandidate?.primary ?? null;
  const target2 = source?.targetPriceCandidate?.secondary ?? source?.summarySignal?.targetPriceCandidate?.secondary ?? null;
  const rr = source?.targetPriceCandidate?.riskRewardRatio ?? null;

  return {
    entryZoneText: entryFrom && entryTo ? formatPriceRange(entryFrom, entryTo) : "명확한 진입 후보 구간 없음",
    entryZoneBasis: "이미지상 주요 지지 후보 구간과 현재 가격 위치를 기준으로 산정한 관찰 구간입니다.",
    stopLossText: formatPrice(stopLoss),
    stopLossBasis: support ? `주요 지지 후보 가격대인 ${formatPrice(support)}을 약 2% 이탈하는 구간입니다.` : "무효화 기준 가격이 명확하지 않아 보수적으로 확인이 필요합니다.",
    target1Text: target1 ? formatPrice(target1) : "확인 불가",
    target1Basis: target1 ? "최근 저항 후보로 반복 표시된 가격대입니다." : "최근 저항 후보가 명확히 확인되지 않아 표시하지 않습니다.",
    target2Text: target2 ? formatPrice(target2) : "확인 불가",
    target2Basis: target2 ? "확장 목표 후보 또는 상단 지표 구간을 기준으로 산정했습니다." : "볼린저밴드 상단 또는 확장 목표가 명확히 확인되지 않아 표시하지 않습니다.",
    riskRewardText: riskRewardText(rr),
    riskRewardBasis: "진입 후보 가격, 손절 기준 후보, 1차 목표 가격 후보를 바탕으로 계산한 참고값입니다.",
    priceBasisWarning: "이미지 기반 가격은 실제 가격과 차이가 있을 수 있습니다.",
  };
}

export function buildDecisionReasons(raw: AnalysisResponse): AnalysisViewModel["decisionReasons"] {
  const current = getCurrentPrice(raw);
  const support = nearestBelow(current, supportLevels(raw));
  const resistance = nearestAbove(current, resistanceLevels(raw));
  const normalized = normalizeSignal(raw);
  const reasons: AnalysisViewModel["decisionReasons"] = [];

  if (support) reasons.push({ type: "positive", text: "현재 가격이 주요 지지 후보 구간 위에 있습니다." });
  if (!raw.aiAnalysis?.patternCandidates?.length) reasons.push({ type: "neutral", text: "명확한 정석 패턴 후보가 부족합니다." });
  if (resistance) reasons.push({ type: "negative", text: "주요 저항 후보 구간이 가까워 추가 확인이 필요합니다." });
  if (normalized.buyScore !== null && normalized.sellScore !== null && Math.abs(normalized.buyScore - normalized.sellScore) < 10) {
    reasons.push({ type: "neutral", text: "매수 점수와 매도 점수 차이가 크지 않아 강한 방향성 판단은 어렵습니다." });
  }
  const rr = getSignalSource(raw)?.targetPriceCandidate?.riskRewardRatio;
  if (rr !== undefined && (rr ?? 0) < 1.5) {
    reasons.push({ type: "negative", text: "손익비가 낮아 공격적 진입 후보로 보기 어렵습니다." });
  }
  reasons.push({ type: "negative", text: "이미지 기반 분석이므로 실제 OHLCV 검증이 필요합니다." });

  return reasons.slice(0, 9);
}

export function buildScoreSummary(raw: AnalysisResponse): AnalysisViewModel["scoreSummary"] {
  const source = getSignalSource(raw);
  const normalized = normalizeSignal(raw);
  const buy = source?.conditionScores?.buy;
  const sell = source?.conditionScores?.sell;
  const row = (group: string, label: string, score: number | null | undefined) => ({ group, label, score: clampScore(score) });

  return {
    buyScore: normalized.buyScore,
    sellScore: normalized.sellScore,
    holdScore: normalized.holdScore,
    interpretation:
      normalized.buyScore !== null && normalized.sellScore !== null && Math.abs(normalized.buyScore - normalized.sellScore) < 10
        ? "매수와 매도 점수가 비슷해 중립 또는 관망 후보가 우세합니다."
        : "점수는 기술적 조건 충족 정도를 100점 기준으로 정규화한 참고값입니다.",
    rows: [
      row("매수", "지지선 근처", buy?.supportProximity),
      row("매수", "RSI 반등", buy?.rsiRebound),
      row("매수", "MACD 상향", buy?.macdBullish),
      row("매수", "거래량 증가", buy?.volumeIncrease),
      row("매수", "추세", buy?.trend),
      row("매도", "저항선 근처", sell?.resistanceProximity),
      row("매도", "RSI 과열", sell?.rsiOverheated),
      row("매도", "MACD 하향", sell?.macdBearish),
      row("매도", "거래량 증가", sell?.volumeIncrease),
      row("매도", "볼린저 상단", sell?.bollingerUpper),
    ],
    deductions: normalized.deductions,
  };
}

export function buildMarketState(raw: AnalysisResponse): AnalysisViewModel["marketState"] {
  const pattern = raw.aiAnalysis?.patternCandidates?.[0];
  const trend = koreanTrend(raw.marketRegime?.trendDirection ?? raw.visualSummary?.trendDirection ?? raw.aiAnalysis?.visualTrend);
  const volatility = firstText(raw.marketRegime?.volatilityState, raw.visualSummary?.volatilityState);
  const pricePosition = firstText(raw.marketRegime?.pricePosition, raw.visualSummary?.pricePosition);

  return {
    trendDirection: trend,
    volatilityState: volatility && /[가-힣]/.test(volatility) ? volatility : "보통 또는 확인 필요",
    pricePosition: pricePosition && /[가-힣]/.test(pricePosition) ? pricePosition : "주요 가격대 확인 필요",
    patternState: pattern ? `${pattern.label} 후보` : "명확한 패턴 후보 없음",
    interpretation: `${trend}로 보이지만, 주요 지지·저항 후보와 보조지표 확인이 함께 필요합니다.`,
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
  const candidates = raw.aiAnalysis?.patternCandidates?.slice(0, 3) ?? [];
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
      interpretation: indicators.rsi?.visible ? "과매수·과매도 여부와 반등 후보를 보조 판단합니다." : "RSI 패널이 명확하지 않습니다.",
      confidence: formatConfidence(indicators.rsi?.confidence),
    },
    {
      name: "MACD",
      status: formatStatus(indicators.macd?.status),
      direction: indicators.macd?.visible ? "확인됨" : "확인 부족",
      interpretation: "상향·하향 교차 후보와 모멘텀 방향을 보조 판단합니다.",
      confidence: formatConfidence(indicators.macd?.confidence),
    },
    {
      name: "볼린저밴드",
      status: indicators.bollingerBands?.visible ? formatStatus(indicators.bollingerBands?.position ?? indicators.bollingerBands?.status) : "확인 불가",
      direction: indicators.bollingerBands?.visible ? "확인됨" : "확인 부족",
      interpretation: indicators.bollingerBands?.visible ? "상단·중단·하단 밴드 위치로 변동성 또는 과열 후보를 보조 판단합니다." : "차트에 명확한 볼린저밴드 구조가 보이지 않습니다.",
      confidence: formatConfidence(indicators.bollingerBands?.confidence),
    },
    {
      name: "일목구름",
      status: indicators.ichimoku?.visible ? formatStatus(indicators.ichimoku?.pricePosition ?? indicators.ichimoku?.cloudPosition ?? indicators.ichimoku?.status) : "확인 불가",
      direction: indicators.ichimoku?.visible ? "확인됨" : "확인 부족",
      interpretation: indicators.ichimoku?.visible ? "구름 상단 저항 또는 구름 하단 지지 확인이 필요합니다." : "차트에 구름 형태의 음영 영역이 명확하지 않습니다.",
      confidence: formatConfidence(indicators.ichimoku?.confidence),
    },
    {
      name: "이동평균선",
      status: formatStatus(indicators.movingAverages?.status),
      direction: indicators.movingAverages?.visible ? "확인됨" : "확인 부족",
      interpretation: "가격이 주요 이동평균선 위 또는 아래에 있는지 확인합니다.",
      confidence: formatConfidence(indicators.movingAverages?.confidence),
    },
    {
      name: "거래량",
      status: formatStatus(indicators.volume?.status),
      direction: indicators.volume?.visible ? "확인됨" : "확인 부족",
      interpretation: "돌파 신뢰도를 높일 만한 거래량 근거가 있는지 확인합니다.",
      confidence: formatConfidence(indicators.volume?.confidence),
    },
  ];
}

function isMostlyEnglish(text: string) {
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const korean = text.match(/[가-힣]/g)?.length ?? 0;
  return letters >= 12 && korean === 0;
}

function koreanRiskFallback(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("not financial") || normalized.includes("investment advice")) {
    return "본 분석은 투자 조언이 아니라 기술적 지표 기반 참고 정보입니다.";
  }
  if (normalized.includes("image") || normalized.includes("visual")) {
    return "이미지 기반 추정값이므로 실제 가격과 차이가 있을 수 있습니다.";
  }
  if (normalized.includes("ohlcv") || normalized.includes("data")) {
    return "실제 OHLCV 데이터 검증이 필요합니다.";
  }
  if (normalized.includes("volume")) {
    return "거래량 확인이 부족해 신호 신뢰도가 낮을 수 있습니다.";
  }
  if (normalized.includes("risk")) {
    return "리스크 요인이 있어 보수적인 확인이 필요합니다.";
  }
  return "";
}

function normalizeRiskText(text: string) {
  if (!isMostlyEnglish(text)) return text;
  return koreanRiskFallback(text);
}

export function buildRiskWarnings(raw: AnalysisResponse): string[] {
  const normalized = normalizeSignal(raw);
  const warnings = unique([
    ...(raw.aiAnalysis?.riskNotes ?? []),
    ...(raw.tradeSignal?.warnings ?? []),
    ...(raw.advancedTradeSignal?.warnings ?? []),
    ...normalized.warnings,
    "본 분석은 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다.",
  ])
    .map(normalizeRiskText)
    .filter(Boolean)
    .filter((warning) => !isMostlyEnglish(warning));

  return unique(warnings);
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
