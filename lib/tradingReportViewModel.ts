import type { AnalysisResponse, Confidence, FinalAction, TradingReport } from "../types/analysis";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: unknown): number | null {
  if (finite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPrice(value?: number | null, suffix = "") {
  if (!finite(value)) return "이미지 기반 분석으로 정확 계산 제한";
  const text = Math.abs(value) >= 100
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return `${text}${suffix}`;
}

function formatZone(value?: number | null) {
  return finite(value) ? formatPrice(value, " 부근") : "이미지 기반 분석으로 정확 계산 제한";
}

function uniqueNumbers(values: Array<number | null | undefined>, current?: number | null) {
  const sorted = values.filter(finite).filter((value) => value > 0).sort((a, b) => a - b);
  const merged: number[] = [];
  for (const value of sorted) {
    const previous = merged.at(-1);
    if (!previous || Math.abs(value - previous) / previous > 0.01) {
      merged.push(value);
    } else {
      merged[merged.length - 1] = (previous + value) / 2;
    }
  }
  if (!finite(current)) return merged.slice(0, 3);
  return merged.sort((a, b) => Math.abs(a - current) - Math.abs(b - current)).slice(0, 3);
}

function getCurrentPrice(raw: AnalysisResponse) {
  return raw.tradeSignal?.currentPriceEstimate?.value
    ?? raw.aiAnalysis?.priceAxisObservations?.currentPriceEstimate?.value
    ?? raw.technicalAnalysis?.latestClose
    ?? null;
}

function getLevels(raw: AnalysisResponse) {
  const current = getCurrentPrice(raw);
  const supportValues = [
    ...(raw.technicalAnalysis?.supportResistance?.supportLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestSupport,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleSupportPrices?.map((item) => item.value ?? null) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentLowEstimate?.value,
    raw.tradeSignal?.stopLossCandidate?.price,
  ];
  const resistanceValues = [
    ...(raw.technicalAnalysis?.supportResistance?.resistanceLevels ?? []),
    raw.technicalAnalysis?.supportResistance?.nearestResistance,
    ...(raw.aiAnalysis?.priceAxisObservations?.visibleResistancePrices?.map((item) => item.value ?? null) ?? []),
    raw.aiAnalysis?.priceAxisObservations?.recentHighEstimate?.value,
    raw.tradeSignal?.targetPriceCandidate?.primary,
    raw.tradeSignal?.targetPriceCandidate?.secondary,
  ];
  const supports = uniqueNumbers(supportValues, current).filter((value) => !finite(current) || value <= current * 1.005);
  const resistances = uniqueNumbers(resistanceValues, current).filter((value) => !finite(current) || value >= current * 0.995);
  return { current, supports, resistances, support: supports[0] ?? null, resistance: resistances[0] ?? null };
}

function statusKo(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("up") || normalized.includes("bull") || value?.includes("상승")) return "상승 추세";
  if (normalized.includes("down") || normalized.includes("bear") || value?.includes("하락")) return "하락 추세";
  if (normalized.includes("side") || normalized.includes("range") || value?.includes("횡보")) return "횡보";
  return "혼조";
}

function riskReward(entry: number | null, stop: number | null, target: number | null) {
  if (!finite(entry) || !finite(stop) || !finite(target)) {
    return { value: null, label: "부적합", interpretation: "이미지 기반 분석으로 정확 계산 제한" };
  }
  const risk = entry - stop;
  const reward = target - entry;
  if (risk <= 0 || reward <= 0) {
    return { value: null, label: "부적합", interpretation: "현재 구간은 목표가와 가까워 신규 진입에는 불리합니다." };
  }
  const value = Math.round((reward / risk) * 100) / 100;
  if (value < 1) return { value, label: "부적합", interpretation: "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다." };
  if (value < 1.5) return { value, label: "낮음", interpretation: "손익비가 낮아 조건 확인 전 신규 진입은 보수적으로 봐야 합니다." };
  if (value < 2) return { value, label: "보통", interpretation: "조건 충족 시 진입 후보로 볼 수 있습니다." };
  return { value, label: "좋음", interpretation: "손익비가 양호해 조건 충족 시 진입 후보로 볼 수 있습니다." };
}

function confidence(value?: string | null): Confidence {
  return value === "high" || value === "medium" ? value : "low";
}

function buildFallbackReport(raw: AnalysisResponse): TradingReport {
  const { current, supports, resistances, support, resistance } = getLevels(raw);
  const stopLoss = raw.tradeSignal?.stopLossCandidate?.price ?? (finite(support) ? support * 0.98 : null);
  const firstTarget = raw.tradeSignal?.targetPriceCandidate?.primary ?? resistance;
  const secondTarget = raw.tradeSignal?.targetPriceCandidate?.secondary ?? resistances[1] ?? null;
  const rr = riskReward(support, stopLoss, firstTarget);
  const buyScore = Math.max(0, Math.min(100, Math.round(raw.tradeSignal?.buyScore ?? 0)));
  const sellScore = Math.max(0, Math.min(100, Math.round(raw.tradeSignal?.sellScore ?? 0)));
  const nearResistance = finite(current) && finite(resistance) && resistance >= current && ((resistance - current) / resistance) * 100 <= 2.5;
  const supportBroken = finite(current) && finite(stopLoss) && current < stopLoss;

  let finalAction: FinalAction = "HOLD";
  let title = "보유 관망";
  let oneLineConclusion = "강한 신규 진입보다 지지·저항 반응을 보며 대응하는 구간입니다.";

  if (supportBroken) {
    finalAction = "SELL_RISK";
    title = "손절 위험";
    oneLineConclusion = "주요 지지 기준을 이탈해 기존 상승 관점이 약화되는 구간입니다.";
  } else if (nearResistance || rr.label === "부적합") {
    finalAction = "WAIT";
    title = "신규 진입 보류 / 보유자는 관망";
    oneLineConclusion = "현재 가격이 저항 또는 목표 구간에 가까워 신규 추격매수는 불리합니다.";
  } else if (buyScore >= 70 && rr.value !== null && rr.value >= 1.5) {
    finalAction = "BUY_CANDIDATE";
    title = "매수 후보";
    oneLineConclusion = "지지 반응과 손익비 조건이 충족될 경우 매수 후보로 볼 수 있습니다.";
  } else if (sellScore >= 60 && nearResistance) {
    finalAction = "TAKE_PROFIT";
    title = "일부 익절 고려";
  }

  const primaryPattern = raw.aiAnalysis?.patternCandidates?.[0];
  const secondaryPattern = raw.aiAnalysis?.patternCandidates?.[1];
  const indicators = raw.aiAnalysis?.indicatorReadings ?? {};
  const indicatorLabels: Array<[keyof typeof indicators, string]> = [
    ["rsi", "RSI"],
    ["macd", "MACD"],
    ["bollingerBands", "볼린저밴드"],
    ["ichimoku", "일목균형표"],
    ["movingAverages", "이동평균선"],
    ["volume", "거래량"],
  ];

  return {
    finalSummary: {
      finalAction,
      title,
      oneLineConclusion,
      confidence: confidence(raw.tradeSignal?.confidence),
      reason: rr.interpretation,
    },
    userActionGuide: {
      nonHolder: `${formatZone(support)} 지지 확인 또는 ${formatPrice(resistance)} 돌파 후 재지지까지 대기하는 편이 보수적입니다.`,
      holder: `${formatPrice(stopLoss)} 이탈 전까지는 보유 관망이 가능합니다. ${formatZone(resistance)}에서는 일부 익절 또는 돌파 확인을 고려할 수 있습니다.`,
      shortTermTrader: `${formatZone(resistance)} 저항 구간에서는 신규 진입보다 일부 익절 또는 돌파 확인을 우선합니다.`,
      addBuyer: `${formatZone(support)} 지지 확인 또는 ${formatPrice(resistance)} 돌파 후 재지지 확인 전까지 추가 매수는 보류합니다.`,
      stopLoss: `${formatPrice(stopLoss)} 이탈 시 기존 상승 관점을 약화시킵니다.`,
    },
    tradePlan: {
      entry: {
        pullbackEntry: { priceZone: formatZone(support), condition: "주요 지지 구간에서 반등 확인", action: "눌림목 지지 확인 후 진입 후보로 참고" },
        breakoutEntry: { priceZone: `${formatPrice(resistance)} 돌파 후 재지지`, condition: "주요 저항 돌파 후 안착", action: "돌파 안착 확인 시 진입 후보로 참고" },
        noChaseZone: { priceZone: formatZone(resistance), reason: "현재 구간은 목표가 또는 저항과 가까우면 신규 추격매수에 불리합니다." },
      },
      stopLoss: { priceZone: formatPrice(stopLoss), condition: "주요 지지 또는 무효화 기준 이탈", meaning: "이탈 시 기존 상승 또는 반등 관점을 폐기합니다." },
      targets: {
        firstTarget: { priceZone: formatPrice(firstTarget), action: "1차 저항 또는 목표 후보 구간" },
        secondTarget: { priceZone: formatPrice(secondTarget), action: "돌파가 이어질 때만 확장 목표 후보로 참고" },
      },
      invalidation: { condition: `${formatPrice(stopLoss)} 이탈`, meaning: "기존 상승 채널, 반등 또는 돌파 관점이 약화됩니다." },
      riskReward: rr,
    },
    keyLevels: {
      supports: supports.slice(0, 3).map((value, index) => ({ label: `${index + 1}차 지지`, priceZone: formatZone(value), meaning: "이탈 시 단기 추세가 약화될 수 있는 가격대입니다.", reliability: index === 0 ? "medium" : "low" })),
      resistances: resistances.slice(0, 3).map((value, index) => ({ label: `${index + 1}차 저항`, priceZone: formatZone(value), meaning: "돌파 여부가 단기 방향성 판단의 핵심 가격대입니다.", reliability: index === 0 ? "medium" : "low" })),
    },
    scenarios: {
      bullish: { condition: `${formatPrice(resistance)} 돌파 후 재지지`, expectedMove: "단기 상승 흐름 연장 가능성", action: "돌파 안착 확인 시 진입 후보로 참고" },
      neutral: { condition: `${formatZone(support)}부터 ${formatZone(resistance)} 사이 등락`, expectedMove: "박스권 또는 채널 내 움직임 지속", action: "상단 추격보다 하단 지지 확인을 우선" },
      bearish: { condition: `${formatPrice(stopLoss)} 이탈`, expectedMove: "기존 상승 또는 반등 관점 약화", action: "손절 또는 비중 축소 후보로 대응" },
    },
    patternAnalysis: {
      primaryPattern: {
        name: primaryPattern?.label ?? "명확한 패턴 없음",
        confidence: confidence(primaryPattern?.confidence),
        reason: primaryPattern?.evidence?.slice(0, 2).join(" / ") || "우선순위를 둘 만한 정석 패턴 후보가 뚜렷하지 않습니다.",
        confirmationCondition: primaryPattern?.confirmationCondition || "주요 지지선 또는 저항선에서 추가 반응 확인이 필요합니다.",
        invalidationCondition: primaryPattern?.invalidationCondition || "현재 구조만으로는 별도 패턴 무효화 가격을 특정하기 어렵습니다.",
        tradingMeaning: primaryPattern?.tradingImplication || primaryPattern?.entryLogic || "패턴보다 지지·저항과 손익비를 우선 확인하는 구간입니다.",
      },
      secondaryPattern: secondaryPattern ? { name: secondaryPattern.label, confidence: confidence(secondaryPattern.confidence), reason: secondaryPattern.evidence?.slice(0, 2).join(" / ") || "보조 시나리오로 참고합니다." } : null,
      excludedPatterns: raw.aiAnalysis?.patternCandidates?.slice(2, 5).map((item) => ({ name: item.label || item.name, reason: "주요 패턴보다 우선순위가 낮아 하단 참고로만 분류했습니다." })) ?? [],
    },
    indicatorAnalysis: {
      confirmed: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean; status?: string | null; position?: string | null; pricePosition?: string | null; cloudPosition?: string | null } | undefined;
        return item?.visible ? [{ name: label, signal: "neutral", explanation: `${label}: ${statusKo(item.status ?? item.position ?? item.pricePosition ?? item.cloudPosition)}로 해석됩니다.` }] : [];
      }),
      unavailable: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean } | undefined;
        return item?.visible ? [] : [{ name: label, reason: `${label}는 이미지에서 명확히 확인되지 않습니다.` }];
      }),
    },
    evidence: {
      positive: [`${statusKo(raw.aiAnalysis?.visualTrend)} 흐름이 관찰됩니다.`, `${formatZone(support)} 지지 후보가 확인됩니다.`],
      negative: [`${formatZone(resistance)} 저항 후보가 가까워 추격 진입은 불리할 수 있습니다.`, rr.interpretation],
      riskFactors: ["이미지 기반 추정값이므로 실제 가격과 차이가 있을 수 있습니다.", "실제 OHLCV, 거래량, 재무 정보와 함께 확인해야 합니다."],
    },
    disclaimer: "본 리포트는 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다.",
  };
}

export function normalizeTradingReport(raw: AnalysisResponse): TradingReport {
  return raw.tradingReport ?? buildFallbackReport(raw);
}
