import type { AnalysisResponse, Confidence, FinalAction, TradingReport } from "../types/analysis";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatPrice(value?: number | null, suffix = "") {
  if (!finite(value) || value <= 0) return "이미지 기반 분석으로 정확 계산 제한";
  const text = Math.abs(value) >= 100
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return `${text}${suffix}`;
}

function formatZone(value?: number | null) {
  return finite(value) && value > 0 ? formatPrice(value, " 부근") : "이미지 기반 분석으로 정확 계산 제한";
}

function cleanText(value?: string | null, fallback = "추가 확인 조건이 필요합니다.") {
  if (!value?.trim()) return fallback;
  return value
    .replace(/\buptrend\b/gi, "상승 추세")
    .replace(/\bdowntrend\b/gi, "하락 추세")
    .replace(/\bsideways\b/gi, "횡보")
    .replace(/\bbreakout\b/gi, "저항 돌파")
    .replace(/\bpullback\b/gi, "눌림목")
    .replace(/\bsupport\b/gi, "지지")
    .replace(/\bresistance\b/gi, "저항")
    .replace(/\bvolume spike\b/gi, "거래량 증가")
    .replace(/\bIchimoku cloud\b/gi, "일목균형표 구름대")
    .replace(/\bMoving Average\b/gi, "이동평균선")
    .replace(/\brisk reward\b/gi, "손익비");
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

  return {
    current,
    supports,
    resistances,
    support: supports[0] ?? null,
    resistance: resistances[0] ?? null,
  };
}

function statusKo(value?: string | null) {
  const text = (value ?? "").toLowerCase();
  if (text.includes("up") || text.includes("bull") || text.includes("상승")) return "상승 추세";
  if (text.includes("down") || text.includes("bear") || text.includes("하락")) return "하락 추세";
  if (text.includes("side") || text.includes("range") || text.includes("횡보")) return "횡보";
  if (text.includes("overbought")) return "과열 후보";
  if (text.includes("oversold")) return "과매도 후보";
  if (text.includes("near_upper")) return "상단 근접";
  if (text.includes("near_lower")) return "하단 근접";
  return "중립";
}

function riskReward(entry: number | null, stop: number | null, target: number | null) {
  if (!finite(entry) || !finite(stop) || !finite(target)) {
    return { value: null, label: "부적합" as const, interpretation: "이미지 기반 분석으로 손익비를 정확히 계산하기 어렵습니다." };
  }

  const risk = entry - stop;
  const reward = target - entry;
  if (risk <= 0 || reward <= 0) {
    return { value: null, label: "부적합" as const, interpretation: "현재 구간은 목표가와 가까워 신규 진입에는 불리합니다." };
  }

  const value = Math.round((reward / risk) * 100) / 100;
  if (value < 1) return { value, label: "부적합" as const, interpretation: "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다." };
  if (value < 1.5) return { value, label: "낮음" as const, interpretation: "손익비가 낮아 조건 확인 전 신규 진입은 보수적으로 봐야 합니다." };
  if (value < 2) return { value, label: "보통" as const, interpretation: "조건 충족 시 진입 후보로 참고할 수 있습니다." };
  return { value, label: "좋음" as const, interpretation: "손익비가 양호해 조건 충족 시 진입 후보로 볼 수 있습니다." };
}

function confidence(value?: string | null): Confidence {
  if (value === "high" || value === "medium") return value;
  return "low";
}

function indicatorSignal(value?: string | null): "bullish" | "bearish" | "neutral" {
  const text = (value ?? "").toLowerCase();
  if (text.includes("bull") || text.includes("up") || text.includes("above")) return "bullish";
  if (text.includes("bear") || text.includes("down") || text.includes("below")) return "bearish";
  return "neutral";
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
  let oneLineConclusion = "강한 신규 진입보다 지지와 저항 반응을 확인하며 대응할 구간입니다.";

  if (supportBroken) {
    finalAction = "SELL_RISK";
    title = "손절 위험";
    oneLineConclusion = "주요 지지 기준을 이탈해 기존 상승 또는 반등 관점이 약화되는 구간입니다.";
  } else if (nearResistance || rr.label === "부적합") {
    finalAction = "WAIT";
    title = "신규 진입 보류 / 보유자는 관망";
    oneLineConclusion = "현재 가격이 저항 또는 목표 구간에 가까워 신규 추격매수에는 불리합니다.";
  } else if (buyScore >= 70 && rr.value !== null && rr.value >= 1.5) {
    finalAction = "BUY_CANDIDATE";
    title = "매수 후보";
    oneLineConclusion = "지지 반응과 손익비 조건이 충족될 경우 매수 후보로 참고할 수 있습니다.";
  } else if (sellScore >= 60 && nearResistance) {
    finalAction = "TAKE_PROFIT";
    title = "일부 익절 고려";
    oneLineConclusion = "저항 구간에 가까워 보유자는 일부 익절 또는 돌파 확인을 고려할 수 있습니다.";
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

  const resistanceText = formatZone(resistance);
  const supportText = formatZone(support);
  const stopText = formatPrice(stopLoss);

  return {
    finalSummary: {
      finalAction,
      title,
      oneLineConclusion,
      confidence: confidence(raw.tradeSignal?.confidence),
      reason: rr.interpretation,
    },
    userActionGuide: {
      nonHolder: `${supportText} 지지 확인 또는 ${formatPrice(resistance)} 돌파 후 재지지까지 대기하는 편이 보수적입니다.`,
      holder: `${stopText} 이탈 전까지는 보유 관망이 가능합니다. ${resistanceText}에서는 일부 익절 또는 돌파 확인을 고려할 수 있습니다.`,
      shortTermTrader: `${resistanceText} 저항 구간에서는 신규 진입보다 일부 익절 또는 돌파 확인이 우선입니다.`,
      addBuyer: `${supportText} 지지 확인 또는 ${formatPrice(resistance)} 돌파 후 재지지 확인 전까지 추가 매수는 보류합니다.`,
      stopLoss: `${stopText} 이탈 시 기존 상승 또는 반등 관점은 약화됩니다.`,
    },
    tradePlan: {
      entry: {
        pullbackEntry: { priceZone: supportText, condition: "주요 지지 구간에서 반등 확인", action: "눌림목 지지 확인 후 진입 후보로 참고" },
        breakoutEntry: { priceZone: `${formatPrice(resistance)} 돌파 후 재지지`, condition: "주요 저항 돌파 후 안착", action: "돌파 안착 확인 후 진입 후보로 참고" },
        noChaseZone: { priceZone: resistanceText, reason: "현재 구간이 목표가 또는 저항과 가까우면 신규 추격매수에는 불리합니다." },
      },
      stopLoss: { priceZone: stopText, condition: "주요 지지 또는 무효화 기준 이탈", meaning: "이탈 시 기존 상승 또는 반등 관점을 폐기합니다." },
      targets: {
        firstTarget: { priceZone: formatPrice(firstTarget), action: "1차 저항 또는 목표 후보 구간" },
        secondTarget: { priceZone: formatPrice(secondTarget), action: "돌파가 이어질 때만 확장 목표 후보로 참고" },
      },
      invalidation: { condition: `${stopText} 이탈`, meaning: "기존 상승 채널, 반등 또는 돌파 관점이 약화됩니다." },
      riskReward: rr,
    },
    keyLevels: {
      supports: supports.slice(0, 3).map((value, index) => ({
        label: `${index + 1}차 지지`,
        priceZone: formatZone(value),
        meaning: "이탈 시 단기 추세가 약화될 수 있는 가격대입니다.",
        reliability: index === 0 ? "medium" : "low",
      })),
      resistances: resistances.slice(0, 3).map((value, index) => ({
        label: `${index + 1}차 저항`,
        priceZone: formatZone(value),
        meaning: "돌파 여부가 단기 방향성 판단의 핵심 가격대입니다.",
        reliability: index === 0 ? "medium" : "low",
      })),
    },
    scenarios: {
      bullish: { condition: `${formatPrice(resistance)} 돌파 후 재지지`, expectedMove: "단기 상승 흐름이 연장될 가능성", action: "돌파 안착 확인 후 진입 후보로 참고" },
      neutral: { condition: `${supportText}부터 ${resistanceText} 사이 등락`, expectedMove: "박스권 또는 채널 내 움직임 지속", action: "상단 추격보다 하단 지지 확인 우선" },
      bearish: { condition: `${stopText} 이탈`, expectedMove: "기존 상승 또는 반등 관점 약화", action: "손절 또는 비중 축소 후보로 대응" },
    },
    patternAnalysis: {
      primaryPattern: {
        name: primaryPattern?.label ?? "명확한 패턴 없음",
        confidence: confidence(primaryPattern?.confidence),
        reason: cleanText(primaryPattern?.evidence?.slice(0, 2).join(" / "), "우선순위로 볼 만한 정석 패턴 후보가 뚜렷하지 않습니다."),
        confirmationCondition: cleanText(primaryPattern?.confirmationCondition, "주요 지지선 또는 저항선에서 추가 반응 확인이 필요합니다."),
        invalidationCondition: cleanText(primaryPattern?.invalidationCondition, "현재 구조만으로는 별도 패턴 무효화 가격을 특정하기 어렵습니다."),
        tradingMeaning: cleanText(primaryPattern?.tradingImplication || primaryPattern?.entryLogic, "패턴보다 지지·저항과 손익비를 우선 확인해야 하는 구간입니다."),
      },
      secondaryPattern: secondaryPattern
        ? {
          name: secondaryPattern.label,
          confidence: confidence(secondaryPattern.confidence),
          reason: cleanText(secondaryPattern.evidence?.slice(0, 2).join(" / "), "보조 시나리오로만 참고합니다."),
        }
        : null,
      excludedPatterns: raw.aiAnalysis?.patternCandidates?.slice(2, 5).map((item) => ({
        name: item.label || item.name,
        reason: "주요 패턴보다 우선순위가 낮아 하단 참고로만 분류했습니다.",
      })) ?? [],
    },
    indicatorAnalysis: {
      confirmed: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as {
          visible?: boolean;
          status?: string | null;
          position?: string | null;
          pricePosition?: string | null;
          cloudPosition?: string | null;
          reason?: string | null;
        } | undefined;
        if (!item?.visible) return [];
        const rawStatus = item.status ?? item.position ?? item.pricePosition ?? item.cloudPosition;
        return [{
          name: label,
          signal: indicatorSignal(rawStatus),
          explanation: item.reason ? cleanText(item.reason) : `${label}은 ${statusKo(rawStatus)}로 해석됩니다.`,
        }];
      }),
      unavailable: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean } | undefined;
        return item?.visible ? [] : [{ name: label, reason: "이미지에서 명확히 확인되지 않습니다." }];
      }),
    },
    evidence: {
      positive: [`${statusKo(raw.aiAnalysis?.visualTrend)} 흐름이 관찰됩니다.`, `${supportText} 지지 후보가 확인됩니다.`],
      negative: [`${resistanceText} 저항 후보가 가까워 추격 진입은 불리할 수 있습니다.`, rr.interpretation],
      riskFactors: ["이미지 기반 추정값이므로 실제 가격과 차이가 있을 수 있습니다.", "실제 OHLCV, 거래량, 시장 상황을 함께 확인해야 합니다."],
    },
    disclaimer: "본 리포트는 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다.",
  };
}

export function normalizeTradingReport(raw: AnalysisResponse): TradingReport {
  return raw.tradingReport ?? buildFallbackReport(raw);
}
