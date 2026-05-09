import type { AnalysisResponse, Confidence, FinalAction, TradingReport } from "../types/analysis";

const IMAGE_LIMIT_TEXT = "이미지 기반 분석으로 별도 가격 산정 제한";
const DISCLAIMER =
  "본 분석은 차트 이미지 기반의 기술적 분석 참고 정보입니다. 실제 투자 판단은 사용자가 직접 해야 하며, 이미지 기반 분석 특성상 실제 OHLCV 데이터와 차이가 있을 수 있습니다.";

const patternLabels: Record<string, string> = {
  box_range: "박스권",
  rectangle_breakout: "박스권 돌파",
  ascending_channel: "상승 채널",
  descending_channel: "하락 채널",
  triangle_consolidation: "삼각수렴",
  ascending_triangle: "상승 삼각형",
  descending_triangle: "하락 삼각형",
  double_bottom: "이중바닥",
  double_top: "이중천장",
  head_and_shoulders: "헤드앤숄더",
  inverse_head_and_shoulders: "역헤드앤숄더",
  bull_flag: "불 플래그",
  bear_flag: "베어 플래그",
  wedge: "쐐기형",
  support_retest: "지지선 리테스트",
  resistance_retest: "저항선 리테스트",
  breakout_pullback: "저항 돌파 후 눌림",
  breakdown_retest: "지지 이탈 후 되돌림",
  bollinger_squeeze: "볼린저밴드 스퀴즈",
  cloud_consolidation: "일목구름 내부 횡보",
  cloud_top_resistance: "구름 상단 저항",
  cloud_bottom_support: "구름 하단 지지",
  unknown: "명확한 패턴 없음",
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: unknown, fallback = 0) {
  const number = finite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatPrice(value?: number | null, suffix = "") {
  if (!finite(value) || value <= 0) return IMAGE_LIMIT_TEXT;
  const text = Math.abs(value) >= 100
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return `${text}${suffix}`;
}

function formatZone(value?: number | null) {
  return finite(value) && value > 0 ? formatPrice(value, " 부근") : IMAGE_LIMIT_TEXT;
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

function uniqueNumbers(values: Array<number | null | undefined>, current?: number | null, side?: "support" | "resistance") {
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
  if (side === "support") return merged.filter((value) => value <= current * 1.005).sort((a, b) => b - a).slice(0, 3);
  if (side === "resistance") return merged.filter((value) => value >= current * 0.995).sort((a, b) => a - b).slice(0, 3);
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

  const supports = uniqueNumbers(supportValues, current, "support");
  const resistances = uniqueNumbers(resistanceValues, current, "resistance");

  return {
    current,
    supports,
    resistances,
    shortStop: supports[0] ?? null,
    conservativeStop: supports[1] ?? null,
    midInvalidation: supports[2] ?? null,
    firstResistance: resistances[0] ?? null,
  };
}

function statusKo(value?: string | null) {
  const text = (value ?? "").toLowerCase();
  if (text.includes("up") || text.includes("bull") || text.includes("상승") || text.includes("above")) return "상승 추세";
  if (text.includes("down") || text.includes("bear") || text.includes("하락") || text.includes("below")) return "하락 추세";
  if (text.includes("side") || text.includes("range") || text.includes("횡보")) return "횡보";
  return "중립";
}

function confidence(value?: string | null): Confidence {
  if (value === "high" || value === "medium") return value;
  return "low";
}

function scoreLabel(score: number) {
  if (score < 30) return "매매 부적합";
  if (score < 50) return "신규 진입 주의";
  if (score < 65) return "관망 우세";
  if (score < 80) return "조건부 매수 후보";
  return "매수 우위";
}

function buyScoreLabel(score: number) {
  if (score < 30) return "매수 부적합";
  if (score < 50) return "매수 주의";
  if (score < 65) return "조건부 대기";
  if (score < 80) return "매수 후보";
  return "매수 우위";
}

function holdScoreLabel(score: number) {
  if (score < 30) return "보유 부적합";
  if (score < 50) return "비중 축소 고려";
  if (score < 65) return "관망 가능";
  if (score < 80) return "보유 우세";
  return "강한 보유";
}

function riskScoreLabel(score: number) {
  if (score < 20) return "낮음";
  if (score < 40) return "보통";
  if (score < 60) return "주의";
  if (score < 80) return "높음";
  return "매우 높음";
}

function riskReward(entry: number | null, stop: number | null, target: number | null) {
  if (!finite(entry) || !finite(stop) || !finite(target)) {
    return { value: null, label: "부적합" as const, interpretation: "이미지 기반 분석으로 손익비를 정확히 계산하기 어렵습니다." };
  }

  const risk = entry - stop;
  const reward = target - entry;
  if (risk <= 0 || reward <= 0) {
    return { value: null, label: "부적합" as const, interpretation: "현재 구간은 목표가와 가깝거나 손절 기준이 불리해 신규 진입에는 부적합합니다." };
  }

  const value = Math.round((reward / risk) * 100) / 100;
  if (value < 1) return { value, label: "부적합" as const, interpretation: "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다." };
  if (value < 1.5) return { value, label: "낮음" as const, interpretation: "손익비가 낮아 조건 확인 전 공격적 진입은 보수적으로 봐야 합니다." };
  if (value < 2) return { value, label: "보통" as const, interpretation: "조건 충족 시 진입 후보로 볼 수 있습니다." };
  return { value, label: "좋음" as const, interpretation: "손익비가 양호해 조건 충족 시 진입 후보로 참고할 수 있습니다." };
}

function indicatorSignal(value?: string | null): "bullish" | "bearish" | "neutral" {
  const text = (value ?? "").toLowerCase();
  if (text.includes("bull") || text.includes("up") || text.includes("above") || text.includes("상승")) return "bullish";
  if (text.includes("bear") || text.includes("down") || text.includes("below") || text.includes("하락")) return "bearish";
  return "neutral";
}

function looksBrokenText(value?: string | null) {
  return Boolean(value && /�|遑|媛|蹂|鍮|李|濡|\?대|\?쒕|毓/.test(value));
}

function candidateName(candidate?: { name?: string | null; label?: string | null } | null) {
  if (!candidate) return undefined;
  const canonical = candidate.name?.trim();
  if (canonical && patternLabels[canonical]) return patternLabels[canonical];
  const label = candidate.label?.trim();
  if (label && !looksBrokenText(label)) return label;
  return canonical || label;
}

function ensureCandidateLabel(name?: string | null) {
  const label = name?.trim() || "명확한 패턴 없음";
  if (label === "명확한 패턴 없음" || label.includes("후보") || label.includes("시나리오")) return label;
  return `${label} 후보`;
}

function visibleIndicatorCount(raw: AnalysisResponse) {
  return Object.values(raw.aiAnalysis?.indicatorReadings ?? {}).filter((item) => {
    return typeof item === "object" && item !== null && "visible" in item && Boolean(item.visible);
  }).length;
}

function buildScoreSummary(raw: AnalysisResponse, nearResistance: boolean, rr: ReturnType<typeof riskReward>, supportBroken: boolean) {
  let total = 50;
  let buyScore = 50;
  let holdScore = 50;
  let riskScore = 40;
  const positive: Array<{ label: string; scoreImpact: number; reason: string }> = [];
  const negative: Array<{ label: string; scoreImpact: number; reason: string }> = [];
  const risk: Array<{ label: string; scoreImpact: number; reason: string }> = [];
  const trend = statusKo(raw.aiAnalysis?.visualTrend);
  const visibleCount = visibleIndicatorCount(raw);
  if (trend === "상승 추세") {
    total += 15;
    buyScore += 10;
    holdScore += 15;
    positive.push({ label: "상승 추세 유지", scoreImpact: 15, reason: "차트의 큰 방향이 아직 상승 쪽으로 해석됩니다." });
  }
  if (!supportBroken) {
    total += 10;
    holdScore += 15;
    riskScore -= 10;
    positive.push({ label: "주요 지지선 위 가격 유지", scoreImpact: 10, reason: "가까운 지지 후보를 아직 이탈하지 않았습니다." });
  }
  if (visibleCount >= 3) total += 5;
  if (nearResistance) {
    total -= 15;
    buyScore -= 20;
    holdScore -= 5;
    riskScore += 15;
    negative.push({ label: "저항 구간 근접", scoreImpact: -15, reason: "현재 가격이 주요 저항에 가까워 신규 추격매수에는 불리합니다." });
  }
  if (rr.value === null || rr.value < 1) {
    total -= 15;
    buyScore -= 20;
    riskScore += 20;
    negative.push({ label: "손익비 부족", scoreImpact: -15, reason: rr.interpretation });
  } else if (rr.value >= 1.5) {
    buyScore += 15;
    riskScore -= 10;
    positive.push({ label: "손익비 1.5 이상", scoreImpact: 15, reason: "단기 손절 기준 대비 목표 여지가 있습니다." });
  }
  if (visibleCount < 3) {
    total -= 5;
    buyScore -= 5;
    riskScore += 5;
    negative.push({ label: "RSI/MACD 등 주요 지표 확인 제한", scoreImpact: -5, reason: "보조지표가 명확하지 않아 신뢰도를 보수적으로 봅니다." });
    risk.push({ label: "RSI/MACD 확인 불가", scoreImpact: 5, reason: "과매수 여부와 모멘텀 전환 신뢰도가 제한됩니다." });
  }
  total -= 5;
  riskScore += 5;
  negative.push({ label: "이미지 기반 분석 한계", scoreImpact: -5, reason: "실제 OHLCV 데이터 검증이 없어 점수를 보수적으로 조정합니다." });
  risk.push({ label: "이미지 기반 분석 한계", scoreImpact: 5, reason: "이미지 추정값은 실제 가격 데이터와 차이가 있을 수 있습니다." });

  if (supportBroken) {
    total -= 30;
    holdScore -= 30;
    riskScore += 30;
    negative.push({ label: "주요 지지선 이탈", scoreImpact: -30, reason: "단기 손절 기준을 이탈한 상태로 해석됩니다." });
    risk.push({ label: "주요 지지선 이탈", scoreImpact: 30, reason: "단기 상승 관점이 약화됩니다." });
  }

  if (nearResistance || rr.value === null || rr.value < 1) total = Math.min(total, 64);
  if (buyScore < 50 && riskScore >= 50) total = Math.min(total, 64);
  if (riskScore >= 70) total = Math.min(total, 79);
  if (riskScore >= 60) total = Math.min(total, 64);
  if (riskScore >= 70) total = Math.min(total, 49);
  const clampedTotal = clamp(total, 50);
  const clampedBuy = clamp(nearResistance || rr.value === null || rr.value < 1 ? Math.min(buyScore, 55) : buyScore, 50);
  let clampedHold = clamp(holdScore, 50);
  const clampedRisk = clamp(riskScore, 40);
  const totalLabel = scoreLabel(clampedTotal);
  if (totalLabel === "관망 우세" || totalLabel === "신규 진입 주의") clampedHold = Math.max(clampedHold, clampedBuy);

  return {
    totalScore: clampedTotal,
    totalLabel,
    label: totalLabel,
    buyScore: clampedBuy,
    buyLabel: buyScoreLabel(clampedBuy),
    holdScore: clampedHold,
    holdLabel: holdScoreLabel(clampedHold),
    riskScore: clampedRisk,
    riskLabel: riskScoreLabel(clampedRisk),
    explanation: nearResistance
      ? "상승 추세는 유지될 수 있지만 현재 가격이 저항 구간에 가까워 신규 진입보다는 보유 관망이 유리합니다."
      : "주요 조건을 종합하면 추가 확인 조건을 기다리는 관망 우세 구간입니다.",
    scoreFactors: {
      positive: positive.slice(0, 5),
      negative: negative.slice(0, 5),
      risk: risk.slice(0, 5),
    },
  };
}

function normalizeExistingReport(report: TradingReport): TradingReport {
  const first = report.tradePlan.targets.firstTarget.priceZone;
  const second = report.tradePlan.targets.secondTarget?.priceZone;
  const firstNumber = Number(first?.replace(/[^\d.]/g, ""));
  const secondNumber = Number(second?.replace(/[^\d.]/g, ""));
  let targets = report.tradePlan.targets;
  if (second && finite(firstNumber) && finite(secondNumber) && firstNumber > secondNumber && report.finalSummary.finalAction !== "SELL_RISK") {
    targets = {
      firstTarget: { ...report.tradePlan.targets.firstTarget, priceZone: second },
      secondTarget: report.tradePlan.targets.secondTarget
        ? { ...report.tradePlan.targets.secondTarget, priceZone: first }
        : report.tradePlan.targets.secondTarget,
    };
  }

  const scoreSummary = report.scoreSummary ?? {
    totalScore: 50,
    totalLabel: "관망 우세",
    label: "관망 우세",
    buyScore: 40,
    buyLabel: "매수 주의",
    holdScore: 60,
    holdLabel: "관망 가능",
    riskScore: 55,
    riskLabel: "주의",
    explanation: "이미지 기반 분석이므로 추가 확인 조건이 필요합니다.",
    scoreFactors: {
      positive: [],
      negative: [{ label: "이미지 기반 분석 한계", scoreImpact: -5, reason: "실제 OHLCV 데이터 검증이 필요합니다." }],
      risk: [{ label: "이미지 기반 분석 한계", scoreImpact: 5, reason: "이미지 추정값은 실제 가격 데이터와 차이가 있을 수 있습니다." }],
    },
  };
  if ((report.finalSummary.finalAction === "WAIT" || report.finalSummary.finalAction === "HOLD") && scoreSummary.holdScore < scoreSummary.buyScore) {
    scoreSummary.holdScore = scoreSummary.buyScore;
  }
  if ((report.finalSummary.finalAction === "WAIT" || report.finalSummary.finalAction === "HOLD") && scoreSummary.totalScore >= 80) {
    scoreSummary.totalScore = 64;
    scoreSummary.totalLabel = scoreLabel(scoreSummary.totalScore);
    scoreSummary.label = scoreSummary.totalLabel;
  }
  if (report.finalSummary.finalAction === "SELL_RISK" && scoreSummary.totalScore > 49) {
    scoreSummary.totalScore = 49;
    scoreSummary.totalLabel = scoreLabel(scoreSummary.totalScore);
    scoreSummary.label = scoreSummary.totalLabel;
  }
  scoreSummary.buyLabel = buyScoreLabel(scoreSummary.buyScore);
  scoreSummary.holdLabel = holdScoreLabel(scoreSummary.holdScore);
  scoreSummary.riskLabel = riskScoreLabel(scoreSummary.riskScore);

  return {
    ...report,
    scoreSummary,
    tradePlan: {
      ...report.tradePlan,
      targets,
    },
    patternAnalysis: {
      ...report.patternAnalysis,
      primaryPattern: {
        ...report.patternAnalysis.primaryPattern,
        name: ensureCandidateLabel(report.patternAnalysis.primaryPattern.name),
      },
      secondaryPattern: report.patternAnalysis.secondaryPattern
        ? { ...report.patternAnalysis.secondaryPattern, name: ensureCandidateLabel(report.patternAnalysis.secondaryPattern.name) }
        : report.patternAnalysis.secondaryPattern,
    },
    disclaimer: DISCLAIMER,
  };
}

function buildFallbackReport(raw: AnalysisResponse): TradingReport {
  const levels = getLevels(raw);
  const targets = uniqueNumbers([
    ...levels.resistances,
    raw.tradeSignal?.targetPriceCandidate?.primary,
    raw.tradeSignal?.targetPriceCandidate?.secondary,
  ], levels.current, "resistance").sort((a, b) => a - b);
  const shortStop = levels.shortStop;
  const conservativeStop = levels.conservativeStop;
  const midInvalidation = levels.midInvalidation;
  const firstTarget = targets[0] ?? null;
  const secondTarget = targets[1] ?? null;
  const entry = levels.firstResistance ?? null;
  const rr = riskReward(entry, shortStop, firstTarget);
  const nearResistance = finite(levels.current) && finite(levels.firstResistance) && levels.firstResistance >= levels.current && ((levels.firstResistance - levels.current) / levels.firstResistance) * 100 <= 2.5;
  const supportBroken = finite(levels.current) && finite(shortStop) && levels.current < shortStop;
  const scoreSummary = buildScoreSummary(raw, nearResistance, rr, supportBroken);

  let finalAction: FinalAction = "HOLD";
  let title = "보유 관망";
  let oneLineConclusion = "주요 지지선 이탈 전까지는 보유 관망이 우세합니다.";
  if (supportBroken) {
    finalAction = "SELL_RISK";
    title = "손절 위험";
    oneLineConclusion = "단기 지지선을 이탈해 손절 위험이 커졌습니다.";
  } else if (scoreSummary.riskScore >= 70) {
    finalAction = "NO_TRADE";
    title = "매매 부적합";
    oneLineConclusion = "위험 점수가 높아 신규 진입보다 리스크 관리가 우선입니다.";
  } else if (scoreSummary.buyScore < 50 && scoreSummary.riskScore >= 50) {
    finalAction = "WAIT";
    title = "신규 진입 보류 / 보유자는 관망";
    oneLineConclusion = "위험 요인이 신규 진입 점수보다 커서 추가 확인 전까지 대기가 우선입니다.";
  } else if (nearResistance && (rr.value === null || rr.value < 1)) {
    finalAction = "WAIT";
    title = "신규 진입 보류 / 보유자는 관망";
    oneLineConclusion = "저항 구간에 가까워 신규 추격매수는 비추천입니다.";
  } else if (scoreSummary.buyScore >= 70 && rr.value !== null && rr.value >= 1.5 && !nearResistance) {
    finalAction = "BUY_CANDIDATE";
    title = "조건부 매수 후보";
    oneLineConclusion = "손익비와 추세 조건이 충족되어 조건부 매수 후보로 볼 수 있습니다.";
  }

  if ((finalAction === "WAIT" || finalAction === "HOLD") && scoreSummary.holdScore < scoreSummary.buyScore) {
    scoreSummary.holdScore = scoreSummary.buyScore;
  }
  if ((finalAction === "WAIT" || finalAction === "HOLD") && scoreSummary.totalScore >= 80) {
    scoreSummary.totalScore = 64;
    scoreSummary.totalLabel = scoreLabel(scoreSummary.totalScore);
    scoreSummary.label = scoreSummary.totalLabel;
  }
  scoreSummary.buyLabel = buyScoreLabel(scoreSummary.buyScore);
  scoreSummary.holdLabel = holdScoreLabel(scoreSummary.holdScore);
  scoreSummary.riskLabel = riskScoreLabel(scoreSummary.riskScore);

  const resistanceText = formatPrice(levels.firstResistance);
  const transitionNote = finite(levels.firstResistance)
    ? `${resistanceText}는 현재 가장 중요한 전환 가격대입니다. ${resistanceText} 아래에서는 저항으로 작용하지만, 돌파 후 재지지에 성공하면 단기 상승 지속 근거가 됩니다.`
    : "전환 가격대는 이미지 기반 분석만으로 명확히 산정하기 어렵습니다.";
  const stopSummary = `단기 ${formatPrice(shortStop)} 이탈 / 보수적 ${formatPrice(conservativeStop)} 이탈`;
  const targetSummary = `1차 ${formatPrice(firstTarget)} / 2차 ${formatPrice(secondTarget)}`;
  const indicators = raw.aiAnalysis?.indicatorReadings ?? {};
  const primaryPattern = raw.aiAnalysis?.patternCandidates?.[0];
  const secondaryPattern = raw.aiAnalysis?.patternCandidates?.[1];
  const indicatorLabels = [
    ["rsi", "RSI"],
    ["macd", "MACD"],
    ["bollingerBands", "볼린저밴드"],
    ["ichimoku", "일목균형표"],
    ["movingAverages", "이동평균선"],
    ["volume", "거래량"],
  ] as const;

  return {
    finalSummary: {
      finalAction,
      title,
      oneLineConclusion,
      confidence: visibleIndicatorCount(raw) >= 3 ? "medium" : "low",
      reason: transitionNote,
    },
    scoreSummary,
    userActionGuide: {
      nonHolder: `${formatZone(shortStop)} 지지 확인 또는 ${resistanceText} 돌파 후 재지지까지 대기하는 것이 보수적입니다.`,
      holder: `주요 지지선 이탈 전까지 보유 관망 가능. 단, ${resistanceText} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.`,
      shortTermTrader: `${resistanceText} 저항 구간에서는 신규 진입보다 일부 익절 또는 돌파 확인이 우선입니다.`,
      addBuyer: `${formatZone(shortStop)} 지지 확인 또는 ${resistanceText} 돌파 후 재지지 확인 전까지 추가 매수는 보류합니다.`,
      stopLoss: stopSummary,
    },
    tradePlan: {
      entry: {
        pullbackEntry: { priceZone: formatZone(shortStop), condition: "주요 지지 구간에서 하락이 멈추고 반등 확인", action: "눌림목 지지 확인 전까지 대기" },
        breakoutEntry: { priceZone: resistanceText, condition: "저항 돌파 후 해당 가격 위에서 재지지", action: "돌파 후 안착 확인 시 진입 후보" },
        noChaseZone: { priceZone: resistanceText, reason: "저항 또는 목표가 근처에서는 신규 추격매수보다 확인이 우선입니다." },
      },
      stopLoss: {
        priceZone: stopSummary,
        condition: `${formatPrice(shortStop)} 이탈 시 단기 손절 기준, ${formatPrice(conservativeStop)} 이탈 시 보수적 손절 기준`,
        meaning: "단기 손절은 가장 가까운 지지선 이탈, 보수적 손절은 다음 지지선 이탈 기준입니다.",
        shortTerm: { priceZone: formatPrice(shortStop), condition: "가까운 주요 지지선 이탈", meaning: "단기 매매 관점의 손절 기준입니다." },
        conservative: { priceZone: formatPrice(conservativeStop), condition: "다음 주요 지지선 이탈", meaning: "보수적 손절 기준입니다." },
      },
      targets: {
        firstTarget: { priceZone: formatPrice(firstTarget), action: "가장 가까운 저항 또는 1차 익절 후보" },
        secondTarget: { priceZone: formatPrice(secondTarget), action: "다음 상단 저항 또는 확장 목표 후보" },
      },
      invalidation: {
        condition: `${formatPrice(midInvalidation)} 이탈 시 중기 상승 관점을 폐기합니다.`,
        meaning: "중기 관점 무효화 가격은 손익비 계산에 사용하지 않습니다.",
        midTerm: { priceZone: formatPrice(midInvalidation), condition: "구조적 지지 이탈", meaning: "중기 상승 관점 무효화 기준입니다." },
      },
      riskReward: rr,
      transitionLevel: finite(levels.firstResistance)
        ? { priceZone: resistanceText, explanation: transitionNote }
        : undefined,
    },
    keyLevels: {
      supports: levels.supports.map((value, index) => ({ label: `${index + 1}차 지지`, priceZone: formatZone(value), meaning: index === 0 ? "단기 손절 기준으로 참고할 수 있는 가까운 지지 구간입니다." : "추가 하락 시 확인할 하단 지지 후보입니다.", reliability: index === 0 ? "medium" : "low" })),
      resistances: levels.resistances.map((value, index) => ({ label: `${index + 1}차 저항`, priceZone: formatZone(value), meaning: index === 0 ? "아래에서는 저항, 돌파 후 재지지 성공 시 단기 상승 지속 근거가 되는 전환 가격대입니다." : "상승 시 다음 목표 후보입니다.", reliability: index === 0 ? "medium" : "low" })),
    },
    scenarios: {
      bullish: { condition: `${resistanceText} 돌파 후 재지지`, expectedMove: `${formatPrice(firstTarget)} → ${formatPrice(secondTarget)} 순서로 상승 시도 가능`, action: "돌파 후 안착 확인 시 진입 후보" },
      neutral: { condition: `${formatZone(shortStop)} ~ ${resistanceText} 사이 등락`, expectedMove: "박스권 또는 수렴 구간 지속", action: "상단 추격매수보다 하단 지지 확인 우선" },
      bearish: { condition: `${formatPrice(shortStop)} 이탈`, expectedMove: "단기 상승 관점 약화", action: `손절 또는 비중 축소 고려. ${formatPrice(midInvalidation)} 이탈 시 중기 상승 관점 폐기` },
    },
    patternAnalysis: {
      primaryPattern: {
        name: ensureCandidateLabel(candidateName(primaryPattern)),
        confidence: confidence(primaryPattern?.confidence),
        reason: cleanText(primaryPattern?.evidence?.slice(0, 3).join(" / "), "가격 구조상 주요 패턴 후보로 참고할 수 있습니다."),
        confirmationCondition: cleanText(primaryPattern?.confirmationCondition, "상단 추세선 또는 주요 저항 돌파 후 안착이 필요합니다."),
        invalidationCondition: cleanText(primaryPattern?.invalidationCondition, "하단 추세선 또는 주요 지지선 이탈 시 패턴 후보가 약화됩니다."),
        tradingMeaning: cleanText(primaryPattern?.tradingImplication || primaryPattern?.entryLogic, "패턴 내부 예측 진입보다 이탈 방향 확인 후 대응하는 것이 보수적입니다."),
      },
      secondaryPattern: secondaryPattern ? { name: ensureCandidateLabel(candidateName(secondaryPattern)), confidence: confidence(secondaryPattern.confidence), reason: cleanText(secondaryPattern.evidence?.slice(0, 2).join(" / "), "보조 시나리오로만 참고합니다.") } : null,
      excludedPatterns: raw.aiAnalysis?.patternCandidates?.slice(2, 5).map((item) => ({ name: ensureCandidateLabel(candidateName(item)), reason: "주요 패턴 후보보다 우선순위가 낮아 참고 항목으로 분류했습니다." })) ?? [],
    },
    indicatorAnalysis: {
      confirmed: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean; status?: string | null; position?: string | null; pricePosition?: string | null; cloudPosition?: string | null; reason?: string | null } | undefined;
        if (!item?.visible) return [];
        const rawStatus = item.status ?? item.position ?? item.pricePosition ?? item.cloudPosition;
        return [{ name: label, signal: indicatorSignal(rawStatus), explanation: item.reason ? cleanText(item.reason) : `${label}: ${statusKo(rawStatus)}로 해석됩니다.` }];
      }),
      unavailable: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean; reason?: string | null } | undefined;
        return item?.visible ? [] : [{ name: label, reason: "이미지에서 명확히 확인되지 않음" }];
      }),
    },
    evidence: {
      positive: ["주요 지지선 위에서 가격이 유지되는지 확인이 필요합니다."],
      negative: nearResistance ? ["현재 가격이 저항 구간에 가까워 신규 추격매수에는 불리합니다."] : [],
      riskFactors: ["이미지 기반 분석이므로 실제 OHLCV 데이터 검증이 필요합니다.", rr.interpretation],
    },
    disclaimer: DISCLAIMER,
  };
}

export function normalizeTradingReport(raw: AnalysisResponse): TradingReport {
  return normalizeExistingReport(raw.tradingReport ?? buildFallbackReport(raw));
}
