import type {
  AnalysisMeta,
  AnalysisResponse,
  Confidence,
  EntryModeScore,
  FinalAction,
  PriceRoles,
  ScoreSummary,
  TradingReport,
} from "../types/analysis";

const IMAGE_LIMIT_TEXT = "이미지 기준 추정 불가";
const DISCLAIMER =
  "본 분석은 차트 이미지 기반의 기술적 분석 참고 정보입니다. 실제 투자 판단은 사용자가 직접 해야 하며, 이미지 기반 분석 특성상 실제 OHLCV 데이터와 차이가 있을 수 있습니다.";

const patternLabels: Record<string, string> = {
  box_range: "박스권 후보",
  rectangle_breakout: "박스권 돌파 후보",
  ascending_channel: "상승 채널 후보",
  descending_channel: "하락 채널 후보",
  triangle_consolidation: "삼각 수렴 후보",
  ascending_triangle: "상승 삼각형 후보",
  descending_triangle: "하락 삼각형 후보",
  double_bottom: "이중바닥 후보",
  double_top: "이중천장 후보",
  head_and_shoulders: "헤드앤숄더 후보",
  inverse_head_and_shoulders: "역헤드앤숄더 후보",
  bull_flag: "상승 깃발형 후보",
  bear_flag: "하락 깃발형 후보",
  wedge: "쐐기형 후보",
  support_retest: "지지 재확인 후보",
  resistance_retest: "저항 재확인 후보",
  breakout_pullback: "돌파 후 눌림목 후보",
  breakdown_retest: "지지 이탈 후 되돌림 후보",
  bollinger_squeeze: "볼린저밴드 수축 후보",
  cloud_consolidation: "일목 구름대 내 횡보 후보",
  cloud_top_resistance: "구름대 상단 저항 후보",
  cloud_bottom_support: "구름대 하단 지지 후보",
  unknown: "명확한 패턴 없음",
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: unknown, fallback = 0) {
  const number = finite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function nonEmpty(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeDisplayText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || /^(undefined|null|nan|infinity)$/i.test(text)) return fallback;
  if (/\b(undefined|null|NaN|Infinity)\b/.test(text)) return fallback;
  return text;
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

function formatEstimatedZone(value?: number | null) {
  return finite(value) && value > 0 ? formatPrice(value, " 부근 추정") : IMAGE_LIMIT_TEXT;
}

function priceFromText(value?: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return finite(parsed) ? parsed : null;
}

function samePriceZone(a?: string | null, b?: string | null, tolerancePercent = 1) {
  const first = priceFromText(a);
  const second = priceFromText(b);
  if (!finite(first) || !finite(second) || second === 0) return false;
  return Math.abs(first - second) / Math.abs(second) * 100 <= tolerancePercent;
}

function sortPriceZones(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  return values
    .map((value) => safeDisplayText(value, ""))
    .filter(Boolean)
    .filter((value) => {
      const number = priceFromText(value);
      const key = finite(number) ? String(Math.round(number * 100) / 100) : value;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const first = priceFromText(a);
      const second = priceFromText(b);
      if (!finite(first) || !finite(second)) return 0;
      return first - second;
    });
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

function targetsAfterPivot(targets: number[], pivot?: number | null) {
  if (!finite(pivot)) return targets.slice(0, 2);
  return targets.filter((target) => target > pivot * 1.01).slice(0, 2);
}

function nextLowerPriceZone(reference?: string | null, candidates: Array<string | undefined | null> = []) {
  const referencePrice = priceFromText(reference);
  if (!finite(referencePrice)) return null;
  const sorted = sortPriceZones(candidates)
    .map((zone) => ({ zone, price: priceFromText(zone) }))
    .filter((item): item is { zone: string; price: number } => finite(item.price) && item.price < referencePrice * 0.995)
    .sort((a, b) => b.price - a.price);
  return sorted[0]?.zone ?? null;
}

function filterTargetsAbove(entry?: string | null, targets: Array<string | undefined | null> = [], exclude?: string | null) {
  const entryPrice = priceFromText(entry);
  return sortPriceZones(targets)
    .filter((target) => !samePriceZone(target, entry))
    .filter((target) => !exclude || !samePriceZone(target, exclude))
    .filter((target) => {
      const targetPrice = priceFromText(target);
      return !finite(entryPrice) || (finite(targetPrice) && targetPrice > entryPrice * 1.005);
    });
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
    pivot: resistances[0] ?? null,
  };
}

function statusKo(value?: string | null) {
  const text = (value ?? "").toLowerCase();
  if (text.includes("up") || text.includes("bull") || text.includes("above") || text.includes("상승")) return "상승 추세";
  if (text.includes("down") || text.includes("bear") || text.includes("below") || text.includes("하락")) return "하락 추세";
  if (text.includes("side") || text.includes("range") || text.includes("횡보")) return "횡보";
  return "중립";
}

function confidence(value?: string | null): Confidence {
  if (value === "high" || value === "medium" || value === "unavailable") return value;
  return "low";
}

function scoreLabel(score: number) {
  if (score < 30) return "매매 부적합";
  if (score < 50) return "신규 진입 주의";
  if (score < 65) return "관망 우세";
  if (score < 80) return "조건부 진입 후보";
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
    return { value: null, label: "확인 필요", interpretation: "진입가, 손절가, 목표가 중 일부가 명확하지 않아 손익비 계산을 보류합니다." };
  }

  const risk = entry - stop;
  const reward = target - entry;
  if (risk <= 0 || reward <= 0) {
    return { value: null, label: "진입 부적합", interpretation: "목표가 대비 손절 기준이 불리하거나 목표가가 진입가보다 낮아 신규 진입에는 부적합합니다." };
  }

  const value = Math.round((reward / risk) * 100) / 100;
  if (value < 1) return { value, label: "손익비 불리", interpretation: "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다." };
  if (value < 1.5) return { value, label: "손익비 보통", interpretation: "손익비가 보통 수준이므로 조건 확인 후 보수적으로 접근해야 합니다." };
  if (value < 2) return { value, label: "조건부 진입 가능", interpretation: "조건 충족 시 진입 후보로 볼 수 있습니다." };
  return { value, label: "손익비 우수", interpretation: "손익비가 양호해 조건 충족 시 진입 후보로 참고할 수 있습니다." };
}

function firstTargetAbove(entry: number | null | undefined, targets: number[], minGapPercent = 0.1) {
  if (!finite(entry)) return null;
  const threshold = entry * (1 + minGapPercent / 100);
  return targets.find((target) => target > threshold) ?? null;
}

function stopBelowEntry(entry: number | null | undefined, candidates: Array<number | null | undefined>) {
  if (!finite(entry)) return null;
  const valid = candidates.filter(finite).filter((candidate) => candidate < entry);
  if (!valid.length) return null;
  return Math.max(...valid);
}

function indicatorSignal(value?: string | null): "bullish" | "bearish" | "neutral" {
  const text = (value ?? "").toLowerCase();
  if (text.includes("bull") || text.includes("up") || text.includes("above") || text.includes("상승")) return "bullish";
  if (text.includes("bear") || text.includes("down") || text.includes("below") || text.includes("하락")) return "bearish";
  return "neutral";
}

function indicatorExplanation(key: string, rawStatus?: string | null) {
  const text = (rawStatus ?? "").toLowerCase();
  const signal = indicatorSignal(rawStatus);
  if (key === "rsi") {
    if (signal === "bullish") return "RSI는 과매도권 이탈 또는 반등 가능성을 볼 때 참고할 수 있지만, 가격 지지 확인이 함께 필요합니다.";
    if (signal === "bearish") return "RSI가 과매수 부담을 시사하면 현재 구간의 신규 진입 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아 방향성 판단에는 제한적입니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않습니다.";
  }
  if (key === "volume") {
    if (["increase", "spike", "high", "상승", "증가"].some((token) => text.includes(token))) return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다.";
    if (["low", "weak", "decrease", "부족", "감소"].some((token) => text.includes(token))) return "뚜렷한 돌파 거래량이 부족해 저항 돌파 신뢰도는 아직 약합니다.";
    return "거래량만으로는 강한 매수세를 확인하기 어렵습니다.";
  }
  if (key === "movingAverages") {
    if (signal === "bullish") return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다.";
    if (signal === "bearish") return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다.";
    return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다.";
  }
  if (key === "ichimoku") {
    if (["above", "up", "bull", "구름 위", "상승"].some((token) => text.includes(token))) return "가격이 구름대 위에 있어 추세상 우호적입니다.";
    if (["inside", "neutral", "구름 안", "within"].some((token) => text.includes(token))) return "가격이 구름대 안에 있어 방향성 확인이 필요합니다.";
    if (["below", "down", "bear", "구름 아래", "하락"].some((token) => text.includes(token))) return "가격이 구름대 아래에 있어 상승 전환 신뢰도는 낮습니다.";
    return "일목균형표는 확인되지만 구름대 기준 방향성은 추가 확인이 필요합니다.";
  }
  if (key === "bollingerBands") {
    if (signal === "bullish") return "볼린저밴드상 가격 확장이 확인되면 돌파 흐름의 보조 근거가 될 수 있습니다.";
    if (signal === "bearish") return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다.";
    return "볼린저밴드만으로는 방향성보다 변동성 확인에 더 가깝습니다.";
  }
  return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인해야 합니다.";
}

function unavailableIndicatorReason(key: string) {
  const reasons: Record<string, string> = {
    rsi: "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부는 판단이 제한됩니다.",
    macd: "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
    volume: "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한됩니다.",
    movingAverages: "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한됩니다.",
    ichimoku: "일목균형표 구름대가 이미지에서 명확히 확인되지 않아 구름대 기준 판단은 제한됩니다.",
    bollingerBands: "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한됩니다.",
  };
  return reasons[key] ?? "이미지에서 명확히 확인되지 않습니다.";
}

function candidateName(candidate?: { name?: string | null; label?: string | null } | null) {
  if (!candidate) return undefined;
  const canonical = candidate.name?.trim();
  if (canonical && patternLabels[canonical]) return patternLabels[canonical];
  return candidate.label?.trim() || canonical || undefined;
}

function safeIndicatorExplanation(key: string, rawStatus?: string | null, signal = indicatorSignal(rawStatus)) {
  const text = (rawStatus ?? "").toLowerCase();
  if (key === "rsi") {
    if (signal === "bullish") return "RSI는 과매도권 이탈 또는 반등 가능성을 참고할 수 있지만, 가격 지지 확인과 함께 봐야 합니다.";
    if (signal === "bearish") return "RSI가 과매수 부담을 시사하면 현재 구간의 신규 진입 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아, 단독으로 진입 타이밍을 판단하기는 어렵습니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아, 돌파 신뢰도를 강하게 보강하기는 어렵습니다.";
  }
  if (key === "volume") {
    if (["increase", "spike", "high", "상승", "증가"].some((token) => text.includes(token))) return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다.";
    if (["low", "weak", "decrease", "부족", "감소"].some((token) => text.includes(token))) return "뚜렷한 돌파 거래량이 부족해 저항 돌파 신뢰도는 아직 제한적입니다.";
    return "거래량만으로는 강한 매수세를 확인하기 어렵습니다.";
  }
  if (key === "movingAverages") {
    if (signal === "bullish") return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다.";
    if (signal === "bearish") return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다.";
    return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다.";
  }
  if (key === "ichimoku") {
    if (["above", "up", "bull", "구름 위", "상승"].some((token) => text.includes(token))) return "가격이 구름대 위에 있어 추세상 우호적입니다.";
    if (["inside", "neutral", "구름 안", "within"].some((token) => text.includes(token))) return "가격이 구름대 안에 있어 방향성 확인이 필요합니다.";
    if (["below", "down", "bear", "구름 아래", "하락"].some((token) => text.includes(token))) return "가격이 구름대 아래에 있어 상승 전환 신뢰도는 낮습니다.";
    return "일목균형표는 확인되지만 구름대 기준 방향성은 추가 확인이 필요합니다.";
  }
  if (key === "bollingerBands") {
    if (signal === "bullish") return "볼린저밴드상 가격 확장이 확인되면 돌파 흐름의 보조 근거가 될 수 있습니다.";
    if (signal === "bearish") return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다.";
    return "볼린저밴드만으로는 방향성보다 변동성 확인에 가깝습니다.";
  }
  return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인해야 합니다.";
}

function safeUnavailableIndicatorReason(key: string) {
  const reasons: Record<string, string> = {
    rsi: "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.",
    macd: "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
    volume: "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한적입니다.",
    movingAverages: "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한적입니다.",
    ichimoku: "일목균형표가 이미지에서 명확히 확인되지 않아 지지/저항 판단에는 제한적입니다.",
    bollingerBands: "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.",
  };
  return reasons[key] ?? "이미지에서 명확히 확인되지 않아 판단이 제한적입니다.";
}

function indicatorKeyFromName(name?: string | null) {
  const text = (name ?? "").toLowerCase();
  if (text.includes("rsi")) return "rsi";
  if (text.includes("macd")) return "macd";
  if (text.includes("volume") || text.includes("거래")) return "volume";
  if (text.includes("moving") || text.includes("ma") || text.includes("이동")) return "movingAverages";
  if (text.includes("ichimoku") || text.includes("일목") || text.includes("구름")) return "ichimoku";
  if (text.includes("bollinger") || text.includes("볼린저")) return "bollingerBands";
  return "unknown";
}

function stripUnconfirmedTimeframe(text: string) {
  return text
    .replace(/주봉상|일봉상|월봉상|분봉상|4시간봉상|시간봉상/g, "이미지 기준으로")
    .replace(/\bweekly\b|\bdaily\b|\bmonthly\b/gi, "이미지 기준");
}

function normalizeIndicatorAnalysis(analysis: TradingReport["indicatorAnalysis"]): TradingReport["indicatorAnalysis"] {
  const confirmed = (analysis?.confirmed ?? []).map((item) => {
    const key = indicatorKeyFromName(item.name);
    const signal = item.signal === "bullish" || item.signal === "bearish" || item.signal === "neutral"
      ? item.signal
      : indicatorSignal(item.signal);
    return {
      ...item,
      explanation: stripUnconfirmedTimeframe(safeIndicatorExplanation(key, item.explanation, signal)),
    };
  });
  const unavailable = (analysis?.unavailable ?? []).map((item) => {
    const key = indicatorKeyFromName(item.name);
    return {
      ...item,
      reason: stripUnconfirmedTimeframe(safeUnavailableIndicatorReason(key)),
    };
  });
  return { confirmed, unavailable };
}

function normalizeTimeframeText(value?: string | null) {
  const text = safeDisplayText(value, "이미지 기준 추정");
  if (text.includes("미확인") || text.includes("unknown") || text.includes("추정 불가")) return "이미지 기준 추정";
  if (text.includes("추정") || text.includes("이미지 기준") || text.includes("표시된 차트 기준")) return text;
  return `${text} 추정`;
}

function indicatorKeyFromNameClean(name?: string | null) {
  const text = (name ?? "").toLowerCase();
  if (text.includes("rsi")) return "rsi";
  if (text.includes("macd")) return "macd";
  if (text.includes("거래") || text.includes("volume")) return "volume";
  if (text.includes("이동") || text.includes("moving") || text.includes("ma")) return "movingAverages";
  if (text.includes("일목") || text.includes("구름") || text.includes("ichimoku")) return "ichimoku";
  if (text.includes("볼린저") || text.includes("bollinger")) return "bollingerBands";
  return "unknown";
}

function indicatorExplanationClean(key: string, rawStatus?: string | null, signal = indicatorSignal(rawStatus)) {
  const text = (rawStatus ?? "").toLowerCase();
  if (key === "rsi") {
    if (signal === "bullish") return "RSI는 과매도 해소 또는 매수세 회복 여부를 보조적으로 확인하는 지표입니다.";
    if (signal === "bearish") return "RSI가 과열 구간에 가깝다면 현재가 추격매수 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아, 단독으로 진입 타이밍을 판단하기는 어렵습니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아, 돌파 신뢰도를 강하게 보강하기는 어렵습니다.";
  }
  if (key === "volume") {
    if (["increase", "spike", "high", "상승", "증가"].some((token) => text.includes(token))) {
      return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다.";
    }
    if (["low", "weak", "decrease", "부족", "감소"].some((token) => text.includes(token))) {
      return "뚜렷한 돌파 거래량이 부족해 저항 돌파 신뢰도는 아직 제한적입니다.";
    }
    return "거래량만으로는 강한 매수세를 확인하기 어렵습니다.";
  }
  if (key === "movingAverages") {
    if (signal === "bullish") return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다.";
    if (signal === "bearish") return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다.";
    return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다.";
  }
  if (key === "ichimoku") {
    if (["above", "up", "bull", "구름 위", "상승"].some((token) => text.includes(token))) return "가격이 구름대 위에 있어 추세상 우호적입니다.";
    if (["inside", "neutral", "구름 안", "within"].some((token) => text.includes(token))) return "가격이 구름대 안에 있어 방향성 확인이 필요합니다.";
    if (["below", "down", "bear", "구름 아래", "하락"].some((token) => text.includes(token))) return "가격이 구름대 아래에 있어 상승 전환 신뢰도는 낮습니다.";
    return "일목균형표는 이미지 기준으로 일부만 확인되므로, 구름대 지지/저항 판단은 보조적으로 봐야 합니다.";
  }
  if (key === "bollingerBands") {
    if (signal === "bullish") return "볼린저밴드상 가격 확장이 확인되면 돌파 흐름을 보조하는 근거가 될 수 있습니다.";
    if (signal === "bearish") return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다.";
    return "볼린저밴드만으로는 방향성보다 변동성 확인에 가깝습니다.";
  }
  return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인하는 보조 근거로 보는 것이 적절합니다.";
}

function unavailableIndicatorReasonClean(key: string) {
  const reasons: Record<string, string> = {
    rsi: "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.",
    macd: "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
    volume: "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한적입니다.",
    movingAverages: "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한적입니다.",
    ichimoku: "일목균형표가 이미지에서 명확히 확인되지 않아 지지/저항 판단에는 제한적입니다.",
    bollingerBands: "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.",
  };
  return reasons[key] ?? "이미지에서 명확히 확인되지 않아 판단에는 제한적입니다.";
}

function stripUnconfirmedTimeframeClean(text: string) {
  return safeDisplayText(text, "이미지 기준으로 판단이 제한됩니다.")
    .replace(/주봉상|일봉상|월봉상|분봉상|4시간봉상|시간봉상/g, "이미지 기준으로")
    .replace(/\bweekly\b|\bdaily\b|\bmonthly\b/gi, "이미지 기준");
}

function normalizeTimeframeTextClean(value?: string | null) {
  const text = safeDisplayText(value, "이미지 기준 추정");
  if (text === "미확인" || text.includes("unknown") || text.includes("추정 불가")) return "이미지 기준 추정";
  if (text.includes("추정") || text.includes("이미지 기준") || text.includes("표시된 차트 기준")) return text;
  return `${text} 추정`;
}

function normalizeIndicatorAnalysisClean(analysis: TradingReport["indicatorAnalysis"]): TradingReport["indicatorAnalysis"] {
  const confirmed = (analysis?.confirmed ?? []).map((item) => {
    const key = indicatorKeyFromNameClean(item.name);
    const signal = item.signal === "bullish" || item.signal === "bearish" || item.signal === "neutral"
      ? item.signal
      : indicatorSignal(item.signal);
    return {
      ...item,
      signal,
      explanation: stripUnconfirmedTimeframeClean(indicatorExplanationClean(key, item.explanation, signal)),
    };
  });
  const unavailable = (analysis?.unavailable ?? []).map((item) => {
    const key = indicatorKeyFromNameClean(item.name);
    return {
      ...item,
      reason: stripUnconfirmedTimeframeClean(unavailableIndicatorReasonClean(key)),
    };
  });
  return { confirmed, unavailable };
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

function nowKstText() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function buildAnalysisMeta(raw: AnalysisResponse, levels = getLevels(raw), existing?: Partial<AnalysisMeta>): AnalysisMeta {
  const symbol = raw.aiAnalysis?.symbolDetection?.detectedTicker
    || raw.aiAnalysis?.symbolDetection?.detectedName
    || existing?.symbol
    || "미확인";
  const chartTimeframe = normalizeTimeframeTextClean(existing?.chartTimeframe || raw.aiAnalysis?.timeframeEstimate);
  const supports = existing?.mainSupports?.length ? existing.mainSupports : levels.supports.map((value) => formatZone(value));
  const resistances = existing?.mainResistances?.length ? existing.mainResistances : levels.resistances.map((value) => formatZone(value));

  return {
    symbol,
    chartTimeframe,
    currentPriceZone: existing?.currentPriceZone || formatEstimatedZone(levels.current),
    keyPivotPrice: existing?.keyPivotPrice || formatZone(levels.pivot),
    mainSupports: supports,
    mainResistances: resistances,
    analyzedAt: existing?.analyzedAt || nowKstText(),
    dataBasis: existing?.dataBasis || "image_only",
  };
}

function buildPriceRoles(raw: AnalysisResponse, report?: Partial<TradingReport>): PriceRoles {
  const levels = getLevels(raw);
  const supports = levels.supports.map((value) => formatZone(value));
  const resistances = levels.resistances.map((value) => formatZone(value));
  const pullbackTargets = resistances.slice(0, 3);
  const breakoutTargets = resistances.slice(1, 3);

  return {
    current: report?.priceRoles?.current ?? {
      priceZone: formatZone(levels.current),
      meaning: "이미지상 마지막 가격 기준으로 추정한 현재가입니다.",
    },
    pivot: report?.priceRoles?.pivot ?? {
      priceZone: report?.tradePlan?.transitionLevel?.priceZone || formatZone(levels.pivot),
      meaning: "아래에서는 저항, 돌파 후 재지지에 성공하면 지지 전환 근거가 되는 가격대입니다.",
    },
    pullbackEntry: report?.priceRoles?.pullbackEntry ?? {
      priceZone: report?.tradePlan?.entry?.pullbackEntry?.priceZone || supports[0] || IMAGE_LIMIT_TEXT,
      condition: report?.tradePlan?.entry?.pullbackEntry?.condition || "주요 지지 구간에서 반등 확인 시",
    },
    breakoutEntry: report?.priceRoles?.breakoutEntry ?? {
      priceZone: report?.tradePlan?.entry?.breakoutEntry?.priceZone || formatZone(levels.pivot),
      condition: report?.tradePlan?.entry?.breakoutEntry?.condition || "핵심 전환 가격 돌파 후 재지지 확인 시",
    },
    stopLoss: report?.priceRoles?.stopLoss ?? {
      shortTerm: report?.tradePlan?.stopLoss?.shortTerm?.priceZone || supports[0] || IMAGE_LIMIT_TEXT,
      conservative: report?.tradePlan?.stopLoss?.conservative?.priceZone || supports[1] || IMAGE_LIMIT_TEXT,
      invalidation: report?.tradePlan?.invalidation?.midTerm?.priceZone || supports[2] || IMAGE_LIMIT_TEXT,
    },
    targets: report?.priceRoles?.targets ?? {
      pullbackTargets,
      breakoutTargets,
      holderTargets: resistances.slice(0, 3),
    },
  };
}

function normalizeScoreSummary(scoreSummary?: Partial<ScoreSummary> | null): ScoreSummary {
  const totalScore = clamp(scoreSummary?.totalScore, 50);
  const buyScore = clamp(scoreSummary?.buyScore, 40);
  const holdScore = clamp(scoreSummary?.holdScore, 60);
  const riskScore = clamp(scoreSummary?.riskScore, 50);
  return {
    totalScore,
    totalLabel: nonEmpty(scoreSummary?.totalLabel ?? scoreSummary?.label, scoreLabel(totalScore)),
    label: nonEmpty(scoreSummary?.label ?? scoreSummary?.totalLabel, scoreLabel(totalScore)),
    buyScore,
    buyLabel: nonEmpty(scoreSummary?.buyLabel, buyScoreLabel(buyScore)),
    holdScore,
    holdLabel: nonEmpty(scoreSummary?.holdLabel, holdScoreLabel(holdScore)),
    riskScore,
    riskLabel: nonEmpty(scoreSummary?.riskLabel, riskScoreLabel(riskScore)),
    explanation: nonEmpty(
      scoreSummary?.explanation,
      "이미지 기반 분석이므로 신규 진입, 보유 관망, 위험도를 분리해 보수적으로 해석합니다.",
    ),
    scoreFactors: {
      positive: scoreSummary?.scoreFactors?.positive ?? [],
      negative: scoreSummary?.scoreFactors?.negative ?? [],
      risk: scoreSummary?.scoreFactors?.risk ?? [],
    },
    ...(scoreSummary?.entryScores
      ? {
          entryScores: {
            currentEntry: normalizeEntryScore(scoreSummary.entryScores.currentEntry, "currentEntry"),
            pullbackEntry: normalizeEntryScore(scoreSummary.entryScores.pullbackEntry, "pullbackEntry"),
            breakoutEntry: normalizeEntryScore(scoreSummary.entryScores.breakoutEntry, "breakoutEntry"),
          },
        }
      : {}),
  };
}

function normalizeRiskRewardDetail(value?: Partial<ReturnType<typeof riskReward>> | null): ReturnType<typeof riskReward> {
  const ratio = finite(value?.value) ? Math.round(value.value * 100) / 100 : null;
  if (ratio === null) {
    return {
      value: null,
      label: safeDisplayText(value?.label, "확인 필요"),
      interpretation: safeDisplayText(value?.interpretation, "진입가, 손절가, 목표가 중 일부가 명확하지 않아 손익비 계산을 보류합니다."),
    };
  }
  return {
    value: ratio,
    label: safeDisplayText(value?.label, ratio < 1 ? "손익비 불리" : ratio < 1.5 ? "손익비 보통" : ratio < 2 ? "조건부 진입 가능" : "손익비 우수"),
    interpretation: safeDisplayText(value?.interpretation, ratio < 1 ? "목표가 대비 손절폭이 커서 신규 진입에는 불리합니다." : "조건 충족 시 진입 후보로 참고할 수 있습니다."),
  };
}

function riskRewardAllowsEntry(value?: ReturnType<typeof riskReward> | null, minimum = 1) {
  return finite(value?.value) && value.value >= minimum;
}

type EntryMode = "currentEntry" | "pullbackEntry" | "breakoutEntry";

const entryModeName: Record<EntryMode, string> = {
  currentEntry: "현재가 진입",
  pullbackEntry: "눌림목 진입",
  breakoutEntry: "돌파 진입",
};

function entryScoreLabel(score: number) {
  if (score < 30) return "부적합";
  if (score < 50) return "주의";
  if (score < 65) return "조건부 대기";
  if (score < 80) return "후보";
  return "우위";
}

function entryScoreWithMode(mode: EntryMode, score: number) {
  return `${entryModeName[mode]} ${entryScoreLabel(score)}`;
}

function normalizeEntryScore(
  value: Partial<EntryModeScore> | null | undefined,
  mode: EntryMode,
  fallbackScore = 0,
  fallbackExplanation = "진입 가격, 손절 기준, 목표가 중 일부가 명확하지 않아 확인이 필요합니다.",
): EntryModeScore {
  const hasScore = finite(value?.score);
  const score = clamp(value?.score, fallbackScore);
  const fallbackLabel = hasScore ? entryScoreWithMode(mode, score) : "확인 필요";
  return {
    score,
    label: nonEmpty(value?.label, fallbackLabel),
    explanation: nonEmpty(value?.explanation, fallbackExplanation),
  };
}

function scoreFromRiskReward(
  baseScore: number,
  rr: ReturnType<typeof riskReward> | undefined,
  mode: EntryMode,
) {
  let score = baseScore;
  if (!rr || rr.value === null) {
    score -= mode === "currentEntry" ? 20 : 10;
  } else if (rr.value < 1) {
    score -= mode === "currentEntry" ? 30 : 20;
  } else if (rr.value < 1.5) {
    score -= 5;
  } else if (rr.value < 2) {
    score += 12;
  } else {
    score += 20;
  }
  if (mode === "pullbackEntry") score += 8;
  return clamp(score, baseScore);
}

function entryScoreExplanation(mode: EntryMode, rr?: ReturnType<typeof riskReward>) {
  if (!rr || rr.value === null) {
    if (mode === "currentEntry") return "현재가 기준 진입가, 단기 손절가, 목표가 중 일부가 명확하지 않아 확인이 필요합니다.";
    if (mode === "pullbackEntry") return "눌림목 지지 확인 전에는 진입 가격과 손절 기준을 확정하기 어렵습니다.";
    return "돌파 후 재지지 여부가 확인되기 전까지는 돌파 진입 판단을 보류합니다.";
  }
  if (rr.value < 1) {
    if (mode === "currentEntry") return "현재가 기준 손익비가 낮아 추격 진입은 주의가 필요합니다.";
    if (mode === "pullbackEntry") return "눌림목 기준 목표 대비 손절폭이 커서 조건 확인이 필요합니다.";
    return "돌파 기준 목표 대비 손절폭이 커서 돌파 진입에는 주의가 필요합니다.";
  }
  if (rr.value >= 1.5) {
    if (mode === "currentEntry") return "현재가 기준 손익비는 일부 확보되지만 저항 근접 여부를 함께 확인해야 합니다.";
    if (mode === "pullbackEntry") return "지지 확인 후 접근하면 단기 손절 기준을 비교적 명확히 둘 수 있습니다.";
    return "돌파 후 재지지까지 확인되면 다음 저항까지의 손익비를 검토할 수 있습니다.";
  }
  return "손익비는 보통 수준이므로 가격 확인 후 보수적으로 접근하는 구간입니다.";
}

function deriveEntryScores(report: TradingReport, score: ScoreSummary): ScoreSummary["entryScores"] {
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice);
  const pullbackPrice = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const priceNearOrBelowPivot = finite(currentPrice) && finite(pivotPrice) && currentPrice <= pivotPrice * 1.01;
  const nearPivot = finite(currentPrice) && finite(pivotPrice) && Math.abs(currentPrice - pivotPrice) / pivotPrice * 100 <= 2.5;
  const breakoutConfirmed = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005;

  let currentScore = scoreFromRiskReward(score.buyScore, rr.current, "currentEntry");
  let pullbackScore = scoreFromRiskReward(score.buyScore, rr.pullback, "pullbackEntry");
  let breakoutScore = scoreFromRiskReward(score.buyScore, rr.breakout, "breakoutEntry");

  if (nearPivot || priceNearOrBelowPivot) currentScore = clamp(currentScore - 20, currentScore);
  if (rr.current?.value !== null && finite(rr.current?.value) && rr.current.value >= 1.5 && !nearPivot) currentScore = clamp(currentScore + 8, currentScore);
  if (finite(pullbackPrice)) pullbackScore = clamp(pullbackScore + 12, pullbackScore);
  if (finite(rr.pullback?.value) && finite(rr.current?.value) && rr.pullback.value >= rr.current.value + 0.5) {
    pullbackScore = clamp(pullbackScore + 10, pullbackScore);
  }
  if (score.riskScore >= 80) pullbackScore = clamp(pullbackScore - 30, pullbackScore);
  if (!breakoutConfirmed) breakoutScore = clamp(breakoutScore - 25, breakoutScore);
  if (priceNearOrBelowPivot) breakoutScore = clamp(breakoutScore - 10, breakoutScore);
  if (breakoutConfirmed && riskRewardAllowsEntry(rr.breakout, 1.5)) breakoutScore = clamp(breakoutScore + 20, breakoutScore);

  const currentExplanation = nearPivot
    ? `현재가는 ${report.priceRoles?.pivot?.priceZone ?? "핵심 전환 가격"} 부근에 가까워 추격 진입 손익비가 낮아질 수 있습니다.`
    : entryScoreExplanation("currentEntry", rr.current);
  const pullbackExplanation = pullbackScore >= 65
    ? `${report.priceRoles?.pullbackEntry?.priceZone ?? "주요 지지 구간"}에서 눌림목 지지가 확인되면 손절 기준을 짧게 잡기 쉬워 현재가 진입보다 유리합니다.`
    : entryScoreExplanation("pullbackEntry", rr.pullback);
  const breakoutExplanation = !breakoutConfirmed
    ? `${report.priceRoles?.pivot?.priceZone ?? "핵심 전환 가격"} 돌파 후 재지지가 아직 확인되지 않아 돌파 진입은 대기 구간입니다.`
    : entryScoreExplanation("breakoutEntry", rr.breakout);

  return {
    currentEntry: normalizeEntryScore(score.entryScores?.currentEntry, "currentEntry", currentScore, currentExplanation),
    pullbackEntry: normalizeEntryScore(score.entryScores?.pullbackEntry, "pullbackEntry", pullbackScore, pullbackExplanation),
    breakoutEntry: normalizeEntryScore(score.entryScores?.breakoutEntry, "breakoutEntry", breakoutScore, breakoutExplanation),
  };
}

function entryModePreferenceExplanation(report: TradingReport, score: ScoreSummary) {
  const current = score.entryScores?.currentEntry?.score ?? 0;
  const pullback = score.entryScores?.pullbackEntry?.score ?? 0;
  const breakout = score.entryScores?.breakoutEntry?.score ?? 0;
  const pivot = report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? "핵심 전환 가격";
  const pullbackZone = report.priceRoles?.pullbackEntry?.priceZone ?? "주요 지지 구간";
  const parts: string[] = [];

  if (current < 50) {
    parts.push(`현재가는 ${pivot} 부근 저항 또는 전환 가격 부담으로 추격 진입 점수가 낮습니다.`);
  }
  if (pullback >= 65) {
    parts.push(`${pullbackZone}에서 눌림목 지지가 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 점수가 상대적으로 높습니다.`);
  }
  if (breakout < 65) {
    parts.push(`${pivot} 돌파 후 재지지가 아직 부족해 돌파 진입은 확인 대기입니다.`);
  } else if (breakout >= 70) {
    parts.push(`${pivot} 돌파 후 재지지가 확인되면 돌파 진입 후보로 볼 수 있습니다.`);
  }
  if (!parts.length) {
    return nonEmpty(score.explanation, "현재가, 눌림목, 돌파 진입 조건을 분리해 확인해야 하는 구간입니다.");
  }
  return parts.join(" ");
}

function entryModePreferenceExplanationClean(report: TradingReport, score: ScoreSummary) {
  const current = score.entryScores?.currentEntry?.score ?? 0;
  const pullback = score.entryScores?.pullbackEntry?.score ?? 0;
  const breakout = score.entryScores?.breakoutEntry?.score ?? 0;
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const currentRr = rr.current?.value ?? null;
  const pullbackRr = rr.pullback?.value ?? null;
  const pivot = safeDisplayText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice, "핵심 전환 가격");
  const pullbackZone = safeDisplayText(report.priceRoles?.pullbackEntry?.priceZone, "주요 지지 구간");
  const shortStop = safeDisplayText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "단기 손절 기준");
  const breakoutTarget = safeDisplayText(report.priceRoles?.targets?.breakoutTargets?.[0] ?? report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone, "다음 저항");
  const parts: string[] = [];

  if (current < 50 || (finite(currentRr) && currentRr < 1)) {
    parts.push(`현재가는 ${pivot} 부근의 저항 또는 전환 가격에 가까워 추격매수 손익비가 낮습니다.`);
  } else {
    parts.push("현재가 진입은 핵심 가격대와 손절 기준을 함께 확인해야 합니다.");
  }

  if (pullback >= 65 || (finite(pullbackRr) && pullbackRr >= 1.5)) {
    parts.push(`${pullbackZone}에서 반등이 확인되면 ${shortStop}을 기준으로 손절을 짧게 둘 수 있어 눌림목 진입 조건이 상대적으로 유리합니다.`);
  } else {
    parts.push(`${pullbackZone} 지지 반응이 확인되기 전까지는 눌림목 진입도 확인 대기 구간입니다.`);
  }

  if (breakout >= 70) {
    parts.push(`${pivot} 돌파 후 재지지에 성공하면 돌파 진입 후보가 되며, 다음 목표는 ${breakoutTarget} 부근입니다.`);
  } else {
    parts.push(`${pivot} 돌파 후 재지지가 아직 충분히 확인되지 않아 돌파 진입은 확인 대기가 필요합니다.`);
  }

  if (score.holdScore >= 60) {
    parts.push(`보유자는 ${shortStop} 이탈 전까지 관망 가능하지만, ${pivot} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.`);
  }
  if (score.riskScore >= 60) {
    parts.push("다만 위험 점수가 높아 저항 근접, 손익비 부족, 이미지 기반 분석 한계를 함께 관리해야 합니다.");
  }

  return parts.join(" ");
}

const knownFinalActions = new Set<FinalAction>([
  "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED",
  "BREAKOUT_WAIT",
  "NO_NEW_ENTRY_HOLD_OK",
  "WAIT_FOR_BREAKOUT",
  "WAIT_FOR_PULLBACK",
  "CONDITIONAL_BUY",
  "PULLBACK_BUY_CANDIDATE",
  "BREAKOUT_BUY_CANDIDATE",
  "HOLD_AND_WATCH",
  "PARTIAL_TAKE_PROFIT",
  "REDUCE_POSITION",
  "SELL_RISK",
  "NO_TRADE",
  "BUY_CANDIDATE",
  "WAIT",
  "HOLD",
  "TAKE_PROFIT",
]);

function normalizeFinalAction(value: unknown): FinalAction {
  return typeof value === "string" && knownFinalActions.has(value as FinalAction)
    ? value as FinalAction
    : "WAIT_FOR_PULLBACK";
}

function buildScoreSummary(raw: AnalysisResponse, nearResistance: boolean, rr: ReturnType<typeof riskReward>, supportBroken: boolean): ScoreSummary {
  const trend = statusKo(raw.aiAnalysis?.visualTrend);
  const visibleCount = visibleIndicatorCount(raw);
  let total = 50;
  let buyScore = 50;
  let holdScore = 50;
  let riskScore = 40;
  const positive: NonNullable<ScoreSummary["scoreFactors"]>["positive"] = [];
  const negative: NonNullable<ScoreSummary["scoreFactors"]>["negative"] = [];
  const risk: NonNullable<ScoreSummary["scoreFactors"]>["risk"] = [];

  if (trend === "상승 추세") {
    total += 15;
    buyScore += 10;
    holdScore += 15;
    positive?.push({ label: "상승 추세 유지", scoreImpact: 15, reason: "차트의 방향성이 아직 상승 쪽으로 해석됩니다." });
  }
  if (!supportBroken) {
    total += 10;
    holdScore += 15;
    riskScore -= 10;
    positive?.push({ label: "주요 지지선 위 가격 유지", scoreImpact: 10, reason: "가까운 지지 후보를 아직 이탈하지 않았습니다." });
  }
  if (nearResistance) {
    total -= 15;
    buyScore -= 20;
    holdScore -= 5;
    riskScore += 15;
    negative?.push({ label: "저항 구간 근접", scoreImpact: -15, reason: "현재 가격이 주요 저항에 가까워 신규 추격매수에는 불리합니다." });
    risk?.push({ label: "저항 구간 근접", scoreImpact: 15, reason: "돌파 실패 시 단기 변동성이 커질 수 있습니다." });
  }
  if (rr.value === null || rr.value < 1) {
    total -= 15;
    buyScore -= 20;
    riskScore += 20;
    negative?.push({ label: "손익비 부족", scoreImpact: -15, reason: rr.interpretation });
    risk?.push({ label: "손익비 부족", scoreImpact: 20, reason: "목표 대비 손절폭이 커질 수 있습니다." });
  } else if (rr.value >= 1.5) {
    buyScore += 15;
    riskScore -= 10;
    positive?.push({ label: "손익비 1.5 이상", scoreImpact: 15, reason: "단기 손절 기준 대비 목표 여지가 있습니다." });
  }
  if (visibleCount < 3) {
    total -= 5;
    buyScore -= 5;
    riskScore += 5;
    negative?.push({ label: "주요 보조지표 확인 제한", scoreImpact: -5, reason: "RSI/MACD 등 주요 지표가 명확하지 않아 보수적으로 봅니다." });
    risk?.push({ label: "보조지표 확인 제한", scoreImpact: 5, reason: "과매수 여부와 모멘텀 판단이 제한됩니다." });
  }
  if (supportBroken) {
    total -= 30;
    holdScore -= 30;
    riskScore += 30;
    negative?.push({ label: "주요 지지선 이탈", scoreImpact: -30, reason: "단기 손절 기준을 이탈한 상태로 해석됩니다." });
    risk?.push({ label: "주요 지지선 이탈", scoreImpact: 30, reason: "단기 상승 관점이 약화됩니다." });
  }

  total -= 5;
  riskScore += 5;
  negative?.push({ label: "이미지 기반 분석 한계", scoreImpact: -5, reason: "실제 OHLCV 검증이 없어 점수를 보수적으로 조정합니다." });
  risk?.push({ label: "이미지 기반 분석 한계", scoreImpact: 5, reason: "이미지 추정값은 실제 가격 데이터와 차이가 있을 수 있습니다." });

  if (nearResistance || rr.value === null || rr.value < 1) total = Math.min(total, 64);
  if (riskScore >= 60) total = Math.min(total, 64);
  if (riskScore >= 70) total = Math.min(total, 49);

  const score = normalizeScoreSummary({
    totalScore: total,
    buyScore,
    holdScore,
    riskScore,
    explanation: nearResistance
      ? "현재 가격이 저항 구간에 가까워 신규 진입 점수는 낮고, 주요 지지선 이탈 전까지는 보유 관망 점수가 상대적으로 높습니다."
      : "추세와 지지 여부를 함께 보면 조건 확인 전까지는 보수적인 대응이 적절합니다.",
    scoreFactors: { positive, negative, risk },
  });
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);
  return score;
}

function alignScoreWithAction(report: TradingReport) {
  const score = normalizeScoreSummary(report.scoreSummary);
  let action = report.finalSummary.finalAction;
  const buyActions: FinalAction[] = [
    "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED",
    "PULLBACK_BUY_CANDIDATE",
    "BREAKOUT_BUY_CANDIDATE",
    "CONDITIONAL_BUY",
    "BUY_CANDIDATE",
  ];
  const waitOrHoldActions: FinalAction[] = ["NO_NEW_ENTRY_HOLD_OK", "BREAKOUT_WAIT", "WAIT_FOR_BREAKOUT", "WAIT_FOR_PULLBACK", "HOLD_AND_WATCH", "HOLD", "WAIT"];
  const rrValues = report.tradePlan.riskRewardByEntry ?? {};
  const bestEntryRr = [
    rrValues.pullback?.value,
    rrValues.breakout?.value,
    report.tradePlan.riskReward?.value,
  ].filter(finite).sort((a, b) => b - a)[0] ?? null;

  score.entryScores = deriveEntryScores(report, score);
  const entryScores = score.entryScores ?? {};
  const currentEntryScore = entryScores.currentEntry?.score ?? 0;
  const pullbackEntryScore = entryScores.pullbackEntry?.score ?? 0;
  const breakoutEntryScore = entryScores.breakoutEntry?.score ?? 0;
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice);
  const pivotExists = finite(pivotPrice);
  const priceNearOrBelowPivot = finite(currentPrice) && finite(pivotPrice) && currentPrice <= pivotPrice * 1.01;
  const breakoutRetestConfirmed = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005;
  const breakoutRr = rrValues.breakout?.value ?? null;

  const setFinalAction = (nextAction: FinalAction, title: string, conclusion?: string) => {
    report.finalSummary.finalAction = nextAction;
    report.finalSummary.title = title;
    if (conclusion) report.finalSummary.oneLineConclusion = conclusion;
    action = nextAction;
  };

  if (score.riskScore >= 80) {
    setFinalAction("SELL_RISK", "손절 위험", "위험 점수가 높아 신규 진입보다 손절 기준과 비중 관리가 우선입니다.");
  } else if (currentEntryScore < 30 && pullbackEntryScore < 30 && breakoutEntryScore < 30 && score.holdScore < 40 && score.riskScore >= 70) {
    setFinalAction("NO_TRADE", "매매 부적합", "현재가, 눌림목, 돌파 진입 조건과 보유 조건이 모두 약해 기술적 대응이 불리합니다.");
  } else if (breakoutEntryScore >= 70 && breakoutRetestConfirmed && finite(breakoutRr) && breakoutRr >= 1.5) {
    setFinalAction("BREAKOUT_BUY_CANDIDATE", "돌파 매수 후보", "돌파 후 재지지와 손익비 조건이 확인되어 돌파 진입 후보로 볼 수 있습니다.");
  } else if (pullbackEntryScore >= 70 && currentEntryScore < 50 && breakoutEntryScore < 65) {
    setFinalAction(
      "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED",
      "눌림목 매수 후보 / 현재가 추격매수는 불리",
      "현재가 진입 손익비는 낮지만 지지 구간에서 눌림목이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입이 더 유리합니다.",
    );
  } else if (pullbackEntryScore >= 65 && currentEntryScore >= 50 && score.riskScore < 60) {
    setFinalAction("PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "현재가보다 주요 지지 확인 후 접근하는 눌림목 진입 조건이 더 우선입니다.");
  } else if (breakoutEntryScore < 65 && pivotExists && priceNearOrBelowPivot) {
    setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파와 재지지가 아직 부족해 돌파 확인 후 대응하는 것이 유리합니다.");
  } else if (currentEntryScore < 40 && pullbackEntryScore < 50 && score.holdScore >= 60) {
    setFinalAction("NO_NEW_ENTRY_HOLD_OK", "신규 진입 부적합 / 보유 관망 가능", "현재가 신규 진입 조건은 약하지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다.");
  } else if (score.holdScore >= 70 && score.buyScore < score.holdScore && score.riskScore < 70) {
    setFinalAction("HOLD_AND_WATCH", "보유 관망 우세", "신규 진입보다 기존 보유자는 지지선 이탈 여부를 보며 관망하는 쪽이 더 자연스럽습니다.");
  }

  if (action === "CONDITIONAL_BUY" || action === "BUY_CANDIDATE") {
    if (pullbackEntryScore >= 65 && currentEntryScore < 65) {
      report.finalSummary.finalAction = "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED";
      report.finalSummary.title = "눌림목 매수 후보 / 현재가 추격매수는 불리";
    } else if (breakoutEntryScore >= pullbackEntryScore && breakoutEntryScore >= 65) {
      report.finalSummary.finalAction = "BREAKOUT_BUY_CANDIDATE";
      report.finalSummary.title = "돌파 매수 후보";
    } else if (pullbackEntryScore >= 65) {
      report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
      report.finalSummary.title = "눌림목 매수 후보";
    } else {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 확인 대기";
    }
  }

  action = report.finalSummary.finalAction;

  if (action === "NO_NEW_ENTRY_HOLD_OK" || action === "BREAKOUT_WAIT" || action === "WAIT_FOR_BREAKOUT" || action === "WAIT_FOR_PULLBACK" || action === "WAIT") {
    score.buyScore = Math.min(score.buyScore, 64);
    score.holdScore = Math.max(score.holdScore, Math.min(100, score.buyScore + 10), 60);
  }
  if (action === "NO_NEW_ENTRY_HOLD_OK") {
    score.buyScore = Math.min(score.buyScore, 49);
  }
  if (action === "HOLD_AND_WATCH" || action === "HOLD") {
    score.holdScore = Math.max(score.holdScore, score.buyScore + 5, 65);
  }
  if (score.riskScore >= 70 && buyActions.includes(action)) {
    report.finalSummary.finalAction = score.holdScore >= 60 ? "NO_NEW_ENTRY_HOLD_OK" : "BREAKOUT_WAIT";
    report.finalSummary.title = score.holdScore >= 60 ? "신규 진입 부적합 / 보유 관망 가능" : "신규 진입 주의 / 돌파 확인 대기";
    report.finalSummary.oneLineConclusion = score.holdScore >= 60
      ? "위험도가 높아 신규 진입은 불리하지만, 주요 지지선 이탈 전까지 보유 관망은 가능합니다."
      : "위험도가 높아 신규 진입보다 돌파 후 재지지 또는 지지 확인이 우선입니다.";
    score.buyScore = Math.min(score.buyScore, 55);
    score.totalScore = Math.min(score.totalScore, 64);
  }
  if (buyActions.includes(report.finalSummary.finalAction) && !riskRewardAllowsEntry({ value: bestEntryRr, label: "", interpretation: "" }, 1)) {
    report.finalSummary.finalAction = score.holdScore >= 60 ? "NO_NEW_ENTRY_HOLD_OK" : "WAIT_FOR_PULLBACK";
    report.finalSummary.title = score.holdScore >= 60 ? "신규 진입 부적합 / 보유 관망 가능" : "신규 진입 보류 / 눌림목 대기";
    report.finalSummary.oneLineConclusion = score.holdScore >= 60
      ? "손익비가 부족해 신규 진입은 불리하지만, 주요 지지선 이탈 전까지 보유 관망은 가능합니다."
      : "손익비가 부족해 신규 진입보다 눌림목 지지 확인을 기다리는 편이 보수적입니다.";
    score.buyScore = Math.min(score.buyScore, 55);
    score.totalScore = Math.min(score.totalScore, 64);
  }
  if (report.finalSummary.finalAction === "NO_TRADE" && !(score.buyScore < 30 && score.holdScore < 40 && score.riskScore >= 70)) {
    report.finalSummary.finalAction = score.holdScore >= 60 ? "NO_NEW_ENTRY_HOLD_OK" : "WAIT_FOR_PULLBACK";
    report.finalSummary.title = score.holdScore >= 60 ? "신규 진입 부적합 / 보유 관망 가능" : "신규 진입 보류 / 눌림목 대기";
    report.finalSummary.oneLineConclusion = score.holdScore >= 60
      ? "신규 진입 조건은 부족하지만, 보유자는 주요 지지선 이탈 전까지 관망 가능합니다."
      : "매매 부적합으로 단정하기보다 지지 확인 전까지 대기하는 구간입니다.";
  }
  if (waitOrHoldActions.includes(report.finalSummary.finalAction)) {
    score.totalScore = Math.min(score.totalScore, 64);
  }
  if (buyActions.includes(report.finalSummary.finalAction)) {
    score.totalScore = Math.max(score.totalScore, 65);
  }
  if (report.finalSummary.finalAction === "SELL_RISK" || report.finalSummary.finalAction === "NO_TRADE" || report.finalSummary.finalAction === "REDUCE_POSITION") {
    score.totalScore = Math.min(score.totalScore, 49);
  }
  score.buyScore = clamp(score.buyScore, 40);
  score.holdScore = clamp(score.holdScore, 60);
  score.riskScore = clamp(score.riskScore, 50);
  score.totalScore = clamp(score.totalScore, 50);
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);
  score.entryScores = deriveEntryScores(report, score);
  const refreshedEntryScores = score.entryScores ?? {};
  const finalCurrentScore = refreshedEntryScores.currentEntry?.score ?? 0;
  const finalPullbackScore = refreshedEntryScores.pullbackEntry?.score ?? 0;
  const finalBreakoutScore = refreshedEntryScores.breakoutEntry?.score ?? 0;
  const currentRr = rrValues.current?.value ?? null;
  const currentEntryPoor = finalCurrentScore < 50 || (finite(currentRr) && currentRr < 1);
  const pullbackIsBest = finalPullbackScore >= finalCurrentScore && finalPullbackScore >= finalBreakoutScore;
  const isTerminalRisk = report.finalSummary.finalAction === "SELL_RISK" || report.finalSummary.finalAction === "NO_TRADE" || report.finalSummary.finalAction === "REDUCE_POSITION";
  if (!isTerminalRisk && pullbackIsBest && finalPullbackScore >= 65 && currentEntryPoor) {
    report.finalSummary.finalAction = "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED";
    report.finalSummary.title = "눌림목 매수 후보 / 현재가 추격매수는 불리";
    score.totalScore = Math.min(Math.max(score.totalScore, 50), 79);
  }
  if (report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE" && (finalBreakoutScore < 65 || !breakoutRetestConfirmed)) {
    report.finalSummary.finalAction = finalPullbackScore >= 65 ? "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED" : "BREAKOUT_WAIT";
    report.finalSummary.title = finalPullbackScore >= 65 ? "눌림목 매수 후보 / 현재가 추격매수는 불리" : "돌파 확인 대기";
  }
  if (currentEntryPoor && report.finalSummary.title.includes("매수 우위")) {
    report.finalSummary.title = finalPullbackScore >= 65 ? "눌림목 매수 후보 / 현재가 추격매수는 불리" : "돌파 확인 대기";
  }
  if (score.holdScore >= 60 && report.finalSummary.finalAction === "NO_TRADE") {
    report.finalSummary.finalAction = "NO_NEW_ENTRY_HOLD_OK";
    report.finalSummary.title = "신규 진입 부적합 / 보유 관망 가능";
  }
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);
  score.explanation = entryModePreferenceExplanationClean(report, score);
  report.scoreSummary = score;
}

function sanitizeTradingReport(report: TradingReport) {
  report.finalSummary.finalAction = normalizeFinalAction(report.finalSummary.finalAction);
  const pivotZone = report.priceRoles?.pivot?.priceZone ?? report.tradePlan.transitionLevel?.priceZone;
  const pullbackEntryZone = report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone;
  const supportZones = sortPriceZones([
    ...(report.keyLevels.supports ?? []).map((item) => item.priceZone),
    ...(report.analysisMeta?.mainSupports ?? []),
    report.priceRoles?.stopLoss?.shortTerm,
    report.priceRoles?.stopLoss?.conservative,
    report.priceRoles?.stopLoss?.invalidation,
  ]);
  const resistanceZones = sortPriceZones([
    ...(report.keyLevels.resistances ?? []).map((item) => item.priceZone),
    ...(report.analysisMeta?.mainResistances ?? []),
    pivotZone,
  ]);
  const pullbackStopZone = nextLowerPriceZone(pullbackEntryZone, supportZones);
  const shortStopConflictsWithPullback = samePriceZone(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, pullbackEntryZone);
  if (shortStopConflictsWithPullback && pullbackStopZone) {
    const shortStop = {
      priceZone: pullbackStopZone,
      condition: `${pullbackStopZone} 이탈`,
      meaning: "눌림목 신규 진입 기준의 단기 손절 후보입니다.",
    };
    report.tradePlan.stopLoss.shortTerm = shortStop;
    report.tradePlan.stopLoss.priceZone = `단기 ${pullbackStopZone} 이탈`;
    if (report.priceRoles?.stopLoss) {
      report.priceRoles.stopLoss.shortTerm = pullbackStopZone;
    }
  }
  const sortedPullbackTargets = filterTargetsAbove(pullbackEntryZone, [
    pivotZone,
    ...resistanceZones,
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.pullbackTargets?.thirdTarget?.priceZone,
  ]).slice(0, 3);
  const sortedBreakoutTargets = filterTargetsAbove(pivotZone, [
    ...resistanceZones,
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    report.tradePlan.targets.breakoutTargets?.secondTarget?.priceZone,
    report.tradePlan.targets.firstTarget.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
  ], pivotZone).slice(0, 2);

  report.priceRoles = {
    ...report.priceRoles,
    current: report.priceRoles?.current ?? { priceZone: IMAGE_LIMIT_TEXT, meaning: "이미지상 현재가를 명확히 산정하기 어렵습니다." },
    pivot: report.priceRoles?.pivot ?? { priceZone: "미확인", meaning: "핵심 전환 가격은 이미지 기준으로 명확히 확인되지 않습니다." },
    targets: {
      pullbackTargets: sortedPullbackTargets,
      breakoutTargets: sortedBreakoutTargets,
      holderTargets: sortPriceZones(report.priceRoles?.targets?.holderTargets ?? report.keyLevels.resistances.map((item) => item.priceZone)),
    },
  };

  const firstBreakoutTarget = sortedBreakoutTargets[0] ?? IMAGE_LIMIT_TEXT;
  const secondBreakoutTarget = sortedBreakoutTargets[1];
  report.tradePlan.targets.firstTarget = {
    ...report.tradePlan.targets.firstTarget,
    priceZone: firstBreakoutTarget,
  };
  report.tradePlan.targets.secondTarget = secondBreakoutTarget
    ? { ...(report.tradePlan.targets.secondTarget ?? { action: "돌파 진입 기준 2차 목표 후보" }), priceZone: secondBreakoutTarget }
    : undefined;
  report.tradePlan.targets.breakoutTargets = {
    firstTarget: firstBreakoutTarget !== IMAGE_LIMIT_TEXT ? { priceZone: firstBreakoutTarget, action: "돌파 진입 기준 1차 목표" } : undefined,
    secondTarget: secondBreakoutTarget ? { priceZone: secondBreakoutTarget, action: "돌파 진입 기준 2차 목표" } : undefined,
  };
  report.tradePlan.targets.pullbackTargets = {
    firstTarget: sortedPullbackTargets[0] ? { priceZone: sortedPullbackTargets[0], action: "눌림목 진입 기준 1차 목표" } : undefined,
    secondTarget: sortedPullbackTargets[1] ? { priceZone: sortedPullbackTargets[1], action: "눌림목 진입 기준 2차 목표" } : undefined,
    thirdTarget: sortedPullbackTargets[2] ? { priceZone: sortedPullbackTargets[2], action: "눌림목 진입 기준 3차 목표 후보" } : undefined,
  };

  report.tradePlan.riskReward = normalizeRiskRewardDetail(report.tradePlan.riskReward);
  report.tradePlan.riskRewardByEntry = {
    current: riskReward(
      priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone),
      priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
      priceFromText(filterTargetsAbove(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone, [...sortedPullbackTargets, ...sortedBreakoutTargets])[0]),
    ),
    pullback: riskReward(
      priceFromText(pullbackEntryZone),
      priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
      priceFromText(sortedPullbackTargets[0]),
    ),
    breakout: riskReward(
      priceFromText(pivotZone),
      priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
      priceFromText(sortedBreakoutTargets[0]),
    ),
  };

  report.finalSummary.title = safeDisplayText(report.finalSummary.title, "신규 진입 보류 / 조건 확인 대기");
  report.finalSummary.oneLineConclusion = safeDisplayText(report.finalSummary.oneLineConclusion, "이미지 기반 분석으로 핵심 가격대 확인 후 대응하는 것이 보수적입니다.");
  report.finalSummary.reason = safeDisplayText(report.finalSummary.reason, "본 분석은 이미지 기반 기술적 분석 참고 정보입니다.");
  report.analysisMeta = {
    symbol: safeDisplayText(report.analysisMeta?.symbol, "미확인"),
    chartTimeframe: normalizeTimeframeTextClean(report.analysisMeta?.chartTimeframe),
    currentPriceZone: safeDisplayText(report.analysisMeta?.currentPriceZone, IMAGE_LIMIT_TEXT),
    keyPivotPrice: safeDisplayText(report.analysisMeta?.keyPivotPrice, "미확인"),
    mainSupports: report.analysisMeta?.mainSupports?.length ? report.analysisMeta.mainSupports.map((item) => safeDisplayText(item, "미확인")).filter((item) => item !== "미확인") : [],
    mainResistances: report.analysisMeta?.mainResistances?.length ? report.analysisMeta.mainResistances.map((item) => safeDisplayText(item, "미확인")).filter((item) => item !== "미확인") : [],
    analyzedAt: safeDisplayText(report.analysisMeta?.analyzedAt, nowKstText()),
    dataBasis: report.analysisMeta?.dataBasis ?? "image_only",
  };
  report.indicatorAnalysis = normalizeIndicatorAnalysisClean(report.indicatorAnalysis);
  const guidePivot = safeDisplayText(report.priceRoles?.pivot?.priceZone ?? pivotZone, "핵심 저항");
  const guidePullback = safeDisplayText(report.priceRoles?.pullbackEntry?.priceZone ?? pullbackEntryZone, "주요 지지 구간");
  const guideShortStop = safeDisplayText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "단기 손절 기준");
  const guideConservativeStop = safeDisplayText(report.tradePlan.stopLoss.conservative?.priceZone, "보수적 손절 기준");
  const guideInvalidation = safeDisplayText(report.tradePlan.invalidation.midTerm?.priceZone ?? report.tradePlan.invalidation.condition, "중기 무효화 기준");
  report.userActionGuide = {
    nonHolder: `현재가는 ${guidePivot}에 가까우면 추격매수는 불리합니다. ${guidePullback} 지지 확인 또는 돌파 후 재지지까지 기다리는 전략이 유리합니다.`,
    holder: `주요 지지선 이탈 전까지 보유 관망이 가능하며, ${guidePivot} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.`,
    shortTermTrader: `${guidePivot} 부근에서는 짧은 손절 기준 없이 진입하면 손익비가 불리합니다.`,
    addBuyer: `추가 매수는 현재가보다 ${guidePullback} 지지 확인 또는 ${guidePivot} 돌파 후 재지지 확인 이후가 유리합니다.`,
    stopLoss: `단기 ${guideShortStop} / 보수적 ${guideConservativeStop} / 중기 무효화 ${guideInvalidation}를 분리해서 대응합니다.`,
  };

  alignScoreWithAction(report);
  report.disclaimer = DISCLAIMER;
  return report;
}

function normalizeExistingReport(report: TradingReport, raw: AnalysisResponse): TradingReport {
  const fallback = buildFallbackReport(raw);
  const merged: TradingReport = {
    ...fallback,
    ...report,
    finalSummary: { ...fallback.finalSummary, ...report.finalSummary },
    userActionGuide: { ...fallback.userActionGuide, ...report.userActionGuide },
    tradePlan: {
      ...fallback.tradePlan,
      ...report.tradePlan,
      entry: { ...fallback.tradePlan.entry, ...report.tradePlan?.entry },
      stopLoss: { ...fallback.tradePlan.stopLoss, ...report.tradePlan?.stopLoss },
      targets: { ...fallback.tradePlan.targets, ...report.tradePlan?.targets },
      invalidation: { ...fallback.tradePlan.invalidation, ...report.tradePlan?.invalidation },
    },
    keyLevels: {
      supports: report.keyLevels?.supports?.length ? report.keyLevels.supports : fallback.keyLevels.supports,
      resistances: report.keyLevels?.resistances?.length ? report.keyLevels.resistances : fallback.keyLevels.resistances,
    },
    patternAnalysis: {
      ...fallback.patternAnalysis,
      ...report.patternAnalysis,
      primaryPattern: {
        ...fallback.patternAnalysis.primaryPattern,
        ...report.patternAnalysis?.primaryPattern,
      },
    },
    indicatorAnalysis: {
      confirmed: report.indicatorAnalysis?.confirmed ?? fallback.indicatorAnalysis.confirmed,
      unavailable: report.indicatorAnalysis?.unavailable ?? fallback.indicatorAnalysis.unavailable,
    },
    scenarios: report.scenarios ?? fallback.scenarios,
    evidence: {
      positive: report.evidence?.positive ?? fallback.evidence.positive,
      negative: report.evidence?.negative ?? fallback.evidence.negative,
      riskFactors: report.evidence?.riskFactors ?? fallback.evidence.riskFactors,
    },
  };

  const first = merged.tradePlan.targets.firstTarget.priceZone;
  const second = merged.tradePlan.targets.secondTarget?.priceZone;
  const firstNumber = Number(first?.replace(/[^\d.]/g, ""));
  const secondNumber = Number(second?.replace(/[^\d.]/g, ""));
  if (second && finite(firstNumber) && finite(secondNumber) && firstNumber > secondNumber && merged.finalSummary.finalAction !== "SELL_RISK") {
    merged.tradePlan.targets = {
      firstTarget: { ...merged.tradePlan.targets.firstTarget, priceZone: second },
      secondTarget: {
        priceZone: first,
        action: merged.tradePlan.targets.secondTarget?.action || merged.tradePlan.targets.firstTarget.action,
      },
    };
  }

  merged.scoreSummary = normalizeScoreSummary(merged.scoreSummary);
  merged.analysisMeta = buildAnalysisMeta(raw, getLevels(raw), merged.analysisMeta);
  merged.priceRoles = buildPriceRoles(raw, merged);
  merged.patternAnalysis.primaryPattern.name = ensureCandidateLabel(merged.patternAnalysis.primaryPattern.name);
  if (merged.patternAnalysis.secondaryPattern) {
    merged.patternAnalysis.secondaryPattern.name = ensureCandidateLabel(merged.patternAnalysis.secondaryPattern.name);
  }
  merged.disclaimer = DISCLAIMER;
  return sanitizeTradingReport(merged);
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
  const breakoutTargets = targetsAfterPivot(targets, levels.pivot);
  const currentTarget = firstTargetAbove(levels.current, targets);
  const breakoutFirstTarget = breakoutTargets[0] ?? null;
  const breakoutSecondTarget = breakoutTargets[1] ?? null;
  const secondTarget = breakoutSecondTarget;
  const pullbackEntry = levels.supports[0] ?? null;
  const currentStop = stopBelowEntry(levels.current, [shortStop, conservativeStop]);
  const pullbackStop = stopBelowEntry(pullbackEntry, [shortStop, conservativeStop, midInvalidation]);
  const breakoutStop = stopBelowEntry(levels.pivot, [shortStop, conservativeStop]);
  const riskRewardByEntry = {
    current: riskReward(levels.current, currentStop, currentTarget),
    pullback: riskReward(pullbackEntry, pullbackStop, firstTarget),
    breakout: riskReward(levels.pivot, breakoutStop, breakoutFirstTarget),
  };
  const rr = [riskRewardByEntry.current, riskRewardByEntry.pullback, riskRewardByEntry.breakout]
    .filter((item) => finite(item.value))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0] ?? riskRewardByEntry.breakout;
  const pullbackRrValue = riskRewardByEntry.pullback.value;
  const breakoutRrValue = riskRewardByEntry.breakout.value;
  const validEntryRiskRewards = [pullbackRrValue, breakoutRrValue].filter(finite);
  const bestEntryRrValue = validEntryRiskRewards.length ? Math.max(...validEntryRiskRewards) : null;
  const nearResistance = finite(levels.current) && finite(levels.pivot) && levels.pivot >= levels.current && ((levels.pivot - levels.current) / levels.pivot) * 100 <= 2.5;
  const nearSupport = finite(levels.current) && finite(shortStop) && levels.current > 0 && ((levels.current - shortStop) / levels.current) * 100 >= 0 && ((levels.current - shortStop) / levels.current) * 100 <= 3;
  const breakoutRetestConfirmed = finite(levels.current) && finite(levels.pivot) && levels.current >= levels.pivot * 1.005;
  const supportBroken = finite(levels.current) && finite(shortStop) && levels.current < shortStop;
  const scoreSummary = buildScoreSummary(raw, nearResistance, rr, supportBroken);

  let finalAction: FinalAction = "HOLD_AND_WATCH";
  let title = "보유 관망 우세";
  let oneLineConclusion = "주요 지지선 이탈 전까지는 보유 관망이 가능하지만, 신규 진입은 추가 확인이 필요합니다.";
  if (supportBroken) {
    finalAction = "SELL_RISK";
    title = "손절 위험";
    oneLineConclusion = "단기 지지선을 이탈해 손절 위험이 커졌습니다.";
  } else if (scoreSummary.buyScore < 30 && scoreSummary.holdScore < 40 && scoreSummary.riskScore >= 70) {
    finalAction = "NO_TRADE";
    title = "매매 부적합";
    oneLineConclusion = "신규 진입, 보유, 단기 대응 모두 불리한 구간으로 해석됩니다.";
  } else if (scoreSummary.riskScore >= 75) {
    if (scoreSummary.holdScore >= 60) {
      finalAction = "REDUCE_POSITION";
      title = "비중 축소 고려";
      oneLineConclusion = "위험 점수가 높아 신규 진입보다 보유 비중 조절과 손절 기준 확인이 우선입니다.";
    } else {
      finalAction = "SELL_RISK";
      title = "손절 위험";
      oneLineConclusion = "위험 점수가 높고 보유 점수도 낮아 관점 재검토가 필요합니다.";
    }
  } else if (breakoutRetestConfirmed && scoreSummary.buyScore >= 65 && breakoutRrValue !== null && breakoutRrValue >= 1.5) {
    finalAction = "BREAKOUT_BUY_CANDIDATE";
    title = "돌파 매수 후보";
    oneLineConclusion = "핵심 전환 가격 돌파 후 안착 조건과 손익비가 충족되면 돌파 매수 후보로 볼 수 있습니다.";
  } else if (nearSupport && scoreSummary.buyScore >= 60 && pullbackRrValue !== null && pullbackRrValue >= 1.2) {
    finalAction = "PULLBACK_BUY_CANDIDATE";
    title = "눌림목 매수 후보";
    oneLineConclusion = "주요 지지 부근에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (nearResistance && scoreSummary.buyScore < 50 && scoreSummary.holdScore >= 60) {
    finalAction = "NO_NEW_ENTRY_HOLD_OK";
    title = "신규 진입 부적합 / 보유 관망 가능";
    oneLineConclusion = "저항 구간에 가까워 신규 추격매수는 불리하지만, 주요 지지선 이탈 전까지 보유 관망은 가능합니다.";
  } else if (nearResistance) {
    finalAction = "BREAKOUT_WAIT";
    title = "신규 진입 주의 / 돌파 확인 대기";
    oneLineConclusion = "현재 가격이 저항 구간에 가까워 돌파 후 재지지 확인이 필요합니다.";
  } else if (scoreSummary.buyScore < 50 && scoreSummary.riskScore >= 50 && scoreSummary.holdScore >= 60) {
    finalAction = "NO_NEW_ENTRY_HOLD_OK";
    title = "신규 진입 부적합 / 보유 관망 가능";
    oneLineConclusion = "신규 진입 점수는 낮지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다.";
  } else if (scoreSummary.buyScore >= 65 && bestEntryRrValue !== null && bestEntryRrValue >= 1.5) {
    finalAction = pullbackRrValue !== null && pullbackRrValue >= (breakoutRrValue ?? 0)
      ? "PULLBACK_BUY_CANDIDATE"
      : "BREAKOUT_BUY_CANDIDATE";
    title = finalAction === "PULLBACK_BUY_CANDIDATE" ? "눌림목 매수 후보" : "돌파 매수 후보";
    oneLineConclusion = "손익비와 추세 조건이 일부 충족되어 조건 확인 시 매수 후보로 볼 수 있습니다.";
  }

  const pivotText = formatPrice(levels.pivot);
  const transitionNote = finite(levels.pivot)
    ? `${pivotText}은 핵심 전환 가격대입니다. 아래에서는 저항으로 작용하지만, 돌파 후 재지지에 성공하면 단기 상승 지속 근거가 됩니다.`
    : "핵심 전환 가격은 이미지 기준으로 명확히 산정하기 어렵습니다.";
  const stopSummary = `단기 ${formatPrice(shortStop)} 이탈 / 보수적 ${formatPrice(conservativeStop)} 이탈`;
  const indicators = raw.aiAnalysis?.indicatorReadings ?? {};
  const primaryPattern = raw.aiAnalysis?.patternCandidates?.[0];
  const secondaryPattern = raw.aiAnalysis?.patternCandidates?.[1];
  const primaryPatternIsWeak = !primaryPattern
    || primaryPattern.confidence === "low"
    || primaryPattern.name === "unknown"
    || !(primaryPattern.evidence?.length);
  const indicatorLabels = [
    ["rsi", "RSI"],
    ["macd", "MACD"],
    ["bollingerBands", "볼린저밴드"],
    ["ichimoku", "일목균형표"],
    ["movingAverages", "이동평균선"],
    ["volume", "거래량"],
  ] as const;
  const bullishTargets = [formatPrice(breakoutFirstTarget), formatPrice(breakoutSecondTarget)].filter((text) => text !== IMAGE_LIMIT_TEXT);
  const bullishMoveText = bullishTargets.length
    ? `${bullishTargets.join(" → ")} 순서로 상승 시도 가능`
    : "상단 저항이 확인될 때까지 돌파 지속 여부를 우선 확인";

  const report: TradingReport = {
    analysisMeta: buildAnalysisMeta(raw, levels),
    finalSummary: {
      finalAction,
      title,
      oneLineConclusion,
      confidence: visibleIndicatorCount(raw) >= 3 ? "medium" : "low",
      reason: transitionNote,
    },
    scoreSummary,
    userActionGuide: {
      nonHolder: `${formatZone(shortStop)} 지지 확인 또는 ${pivotText} 돌파 후 재지지까지 기다리는 것이 보수적입니다.`,
      holder: `주요 지지선 이탈 전까지 보유 관망이 가능하며, ${pivotText} 부근은 일부 익절 또는 돌파 확인 구간입니다. 강하게 돌파하면 다음 목표는 ${formatPrice(breakoutFirstTarget)}입니다.`,
      shortTermTrader: `${pivotText} 저항 부근에서는 짧은 손절 기준 없이 신규 진입하면 손익비가 불리할 수 있습니다.`,
      addBuyer: `${formatZone(shortStop)} 지지 확인 또는 ${pivotText} 돌파 후 안착 확인 전까지 추가 매수는 보류합니다.`,
      stopLoss: stopSummary,
    },
    tradePlan: {
      entry: {
        pullbackEntry: { priceZone: formatZone(shortStop), condition: "주요 지지 구간에서 하락이 멈추고 반등 확인", action: "눌림목 지지 확인 전까지 대기" },
        breakoutEntry: { priceZone: pivotText, condition: "핵심 전환 가격 돌파 후 해당 가격 위에서 재지지", action: "돌파 후 안착 확인 시 진입 후보" },
        noChaseZone: { priceZone: pivotText, reason: "저항 또는 목표가 근처에서는 추격매수보다 확인이 우선입니다." },
      },
      stopLoss: {
        priceZone: stopSummary,
        condition: `${formatPrice(shortStop)} 이탈 시 단기 손절 기준, ${formatPrice(conservativeStop)} 이탈 시 보수적 손절 기준`,
        meaning: "단기 손절과 중기 무효화 조건을 분리해 봅니다.",
        shortTerm: { priceZone: formatPrice(shortStop), condition: "가까운 주요 지지선 이탈", meaning: "단기 매매 관점의 손절 기준입니다." },
        conservative: { priceZone: formatPrice(conservativeStop), condition: "다음 주요 지지선 이탈", meaning: "보수적 손절 기준입니다." },
      },
      targets: {
        firstTarget: { priceZone: formatPrice(breakoutFirstTarget), action: "돌파 진입 기준 1차 목표 후보" },
        secondTarget: secondTarget ? { priceZone: formatPrice(secondTarget), action: "돌파 진입 기준 2차 목표 후보" } : undefined,
        pullbackTargets: {
          firstTarget: { priceZone: formatPrice(firstTarget), action: "눌림목 진입 기준 1차 목표" },
          secondTarget: targets[1] ? { priceZone: formatPrice(targets[1]), action: "눌림목 진입 기준 2차 목표" } : undefined,
          thirdTarget: targets[2] ? { priceZone: formatPrice(targets[2]), action: "눌림목 진입 기준 3차 목표 후보" } : undefined,
        },
        breakoutTargets: {
          firstTarget: breakoutFirstTarget ? { priceZone: formatPrice(breakoutFirstTarget), action: "돌파 진입 기준 1차 목표" } : undefined,
          secondTarget: breakoutSecondTarget ? { priceZone: formatPrice(breakoutSecondTarget), action: "돌파 진입 기준 2차 목표" } : undefined,
        },
      },
      invalidation: {
        condition: `${formatPrice(midInvalidation)} 이탈 시 중기 상승 관점을 폐기합니다.`,
        meaning: "중기 관점 무효화 가격은 손익비 계산에 사용하지 않습니다.",
        midTerm: { priceZone: formatPrice(midInvalidation), condition: "구조적 지지 이탈", meaning: "중기 상승 관점 무효화 기준입니다." },
      },
      riskReward: rr,
      riskRewardByEntry,
      transitionLevel: finite(levels.pivot) ? { priceZone: pivotText, explanation: transitionNote } : undefined,
    },
    keyLevels: {
      supports: levels.supports.map((value, index) => ({
        label: `${index + 1}차 지지`,
        priceZone: formatZone(value),
        meaning: index === 0 ? "단기 손절 기준으로 참고할 수 있는 가까운 지지 구간입니다." : "추가 하락 시 확인할 하단 지지 후보입니다.",
        reliability: index === 0 ? "medium" : "low",
      })),
      resistances: levels.resistances.map((value, index) => ({
        label: `${index + 1}차 저항`,
        priceZone: formatZone(value),
        meaning: index === 0 ? "돌파 후 재지지 성공 시 지지 전환 근거가 되는 핵심 전환 가격입니다." : "상승 시 다음 목표 후보입니다.",
        reliability: index === 0 ? "medium" : "low",
      })),
    },
    scenarios: {
      bullish: { condition: `${pivotText} 돌파 후 재지지`, expectedMove: bullishMoveText, action: "돌파 후 안착 확인 시 조건부 진입 후보" },
      neutral: { condition: `${formatZone(shortStop)} ~ ${formatZone(levels.pivot)} 사이 등락`, expectedMove: "박스권 또는 방향 탐색 구간 지속", action: "상단 추격매수보다 하단 지지 확인 우선" },
      bearish: { condition: `${formatPrice(shortStop)} 이탈`, expectedMove: "단기 상승 관점 약화", action: `단기 손절 또는 비중 축소를 고려하고, ${formatPrice(midInvalidation)} 이탈 시 중기 상승 관점은 별도로 폐기합니다.` },
    },
    patternAnalysis: {
      primaryPattern: {
        name: primaryPatternIsWeak ? "명확한 패턴 없음" : ensureCandidateLabel(candidateName(primaryPattern)),
        confidence: primaryPatternIsWeak ? "low" : confidence(primaryPattern?.confidence),
        reason: primaryPatternIsWeak ? "현재 이미지에서는 우선순위가 높은 확정 패턴 후보가 뚜렷하지 않습니다." : cleanText(primaryPattern?.evidence?.slice(0, 3).join(" / "), "가격 구조상 참고 가능한 패턴 후보입니다."),
        confirmationCondition: primaryPatternIsWeak ? "주요 지지선 또는 저항선에서 추가 반응 확인이 필요합니다." : cleanText(primaryPattern?.confirmationCondition, "주요 저항 돌파 또는 지지 확인이 필요합니다."),
        invalidationCondition: primaryPatternIsWeak ? "현재 구조만으로 별도 패턴 무효화 가격을 산정하기 어렵습니다." : cleanText(primaryPattern?.invalidationCondition, "주요 지지선 이탈 시 패턴 후보가 약화됩니다."),
        tradingMeaning: primaryPatternIsWeak ? "현재는 패턴 예측보다 지지 확인 또는 저항 돌파 후 재지지 여부가 더 중요합니다." : cleanText(primaryPattern?.tradingImplication || primaryPattern?.entryLogic, "패턴 내부 예측 진입보다 이탈 방향 확인 후 대응하는 것이 보수적입니다."),
      },
      secondaryPattern: secondaryPattern ? {
        name: ensureCandidateLabel(candidateName(secondaryPattern)),
        confidence: confidence(secondaryPattern.confidence),
        reason: cleanText(secondaryPattern.evidence?.slice(0, 2).join(" / "), "보조 시나리오로만 참고하며, 실제 대응은 지지 확인 또는 저항 돌파 후 재지지 여부를 우선합니다."),
      } : null,
      excludedPatterns: raw.aiAnalysis?.patternCandidates?.slice(2, 5).map((item) => ({
        name: ensureCandidateLabel(candidateName(item)),
        reason: "주요 패턴 후보보다 우선순위가 낮아 참고 항목으로 분류했습니다.",
      })) ?? [],
    },
    indicatorAnalysis: {
      confirmed: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean; status?: string | null; position?: string | null; pricePosition?: string | null; cloudPosition?: string | null; reason?: string | null } | undefined;
        if (!item?.visible) return [];
        const rawStatus = item.status ?? item.position ?? item.pricePosition ?? item.cloudPosition;
        const signal = indicatorSignal(rawStatus);
        return [{ name: label, signal, explanation: indicatorExplanationClean(key, rawStatus, signal) }];
      }),
      unavailable: indicatorLabels.flatMap(([key, label]) => {
        const item = indicators[key] as { visible?: boolean } | undefined;
        return item?.visible ? [] : [{ name: label, reason: unavailableIndicatorReasonClean(key) }];
      }),
    },
    evidence: {
      positive: ["주요 지지선 위에서 가격이 유지되는지 확인이 필요합니다."],
      negative: nearResistance ? ["현재 가격이 저항 구간에 가까워 신규 추격매수에는 불리합니다."] : [],
      riskFactors: ["이미지 기반 분석이므로 실제 OHLCV 데이터 검증이 필요합니다.", rr.interpretation],
    },
    disclaimer: DISCLAIMER,
  };
  report.priceRoles = buildPriceRoles(raw, report);
  return report;
}

export function normalizeTradingReport(raw: AnalysisResponse): TradingReport {
  return normalizeExistingReport(raw.tradingReport ?? buildFallbackReport(raw), raw);
}
