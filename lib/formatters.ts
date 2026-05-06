export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 4,
});

const priceFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return numberFormatter.format(value);
}

export function formatPrice(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "계산 불가";
  return priceFormatter.format(value);
}

export function formatPercent(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

export function formatConfidence(confidence?: string | null): string {
  switch ((confidence ?? "").toLowerCase()) {
    case "high":
      return "높음";
    case "medium":
      return "보통";
    case "low":
      return "낮음";
    case "unavailable":
      return "확인 불가";
    default:
      return confidence || "-";
  }
}

export function formatStatus(status?: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
      return "검증 완료";
    case "skipped":
      return "검증 건너뜀";
    case "failed":
      return "검증 실패";
    case "uptrend":
      return "상승 추세";
    case "downtrend":
      return "하락 추세";
    case "sideways_or_mixed":
      return "혼합/횡보";
    case "overbought":
      return "과매수";
    case "oversold":
      return "과매도";
    case "rebound_candidate":
      return "반등 후보";
    case "bullish_cross":
    case "bullish_cross_candidate":
      return "상향 교차 후보";
    case "bearish_cross":
    case "bearish_cross_candidate":
      return "하향 교차 후보";
    case "bullish":
      return "상승 우위";
    case "bearish":
      return "하락 우위";
    case "neutral":
      return "중립";
    case "increasing":
      return "증가";
    case "decreasing":
      return "감소";
    case "near_lower":
      return "하단 근접";
    case "near_upper":
      return "상단 근접";
    case "above_upper":
      return "상단 이탈";
    case "below_lower":
      return "하단 이탈";
    case "middle":
      return "중단 부근";
    case "price_above_ma":
      return "가격이 이평선 위";
    case "price_below_ma":
      return "가격이 이평선 아래";
    case "short_above_long":
      return "단기선 우위";
    case "short_below_long":
      return "장기선 우위";
    case "above_cloud":
      return "구름 위";
    case "inside_cloud":
      return "구름 내부";
    case "below_cloud":
      return "구름 아래";
    case "mixed":
      return "혼합";
    case "unknown":
      return "확인 불가";
    case "insufficient_data":
    case "insufficient_visual_data":
      return "데이터 부족";
    default:
      return status || "-";
  }
}

export function formatMarket(market?: string | null): string {
  switch ((market ?? "").toUpperCase()) {
    case "KR":
      return "한국";
    case "US":
      return "미국";
    case "UNKNOWN":
      return "확인 불가";
    default:
      return market || "-";
  }
}

export function formatPatternCategory(category?: string | null): string {
  switch ((category ?? "").toLowerCase()) {
    case "reversal":
      return "반전형";
    case "continuation":
      return "지속형";
    case "range":
      return "박스권";
    case "breakout":
      return "돌파형";
    case "unknown":
      return "불명확";
    default:
      return category || "-";
  }
}

export function formatBreakoutDirection(direction?: string | null): string {
  switch ((direction ?? "").toLowerCase()) {
    case "upside_candidate":
      return "상방 돌파 후보";
    case "downside_candidate":
      return "하방 이탈 후보";
    case "neutral":
      return "중립";
    case "unknown":
      return "방향 확인 필요";
    default:
      return direction || "-";
  }
}

export function formatRiskLevel(riskLevel?: string | null): string {
  switch ((riskLevel ?? "").toLowerCase()) {
    case "low":
      return "낮음";
    case "medium":
      return "보통";
    case "high":
      return "높음";
    default:
      return "알 수 없음";
  }
}

export function getStatusTone(status?: string | null): Tone {
  const normalized = (status ?? "").toLowerCase();
  if (
    [
      "completed",
      "uptrend",
      "bullish",
      "bullish_cross",
      "bullish_cross_candidate",
      "rebound_candidate",
      "increasing",
      "price_above_ma",
      "short_above_long",
      "above_cloud",
    ].includes(normalized)
  ) {
    return "success";
  }
  if (
    [
      "failed",
      "overbought",
      "bearish",
      "bearish_cross",
      "bearish_cross_candidate",
      "decreasing",
      "below_lower",
      "price_below_ma",
      "short_below_long",
      "below_cloud",
    ].includes(normalized)
  ) {
    return "danger";
  }
  if (["skipped", "insufficient_data", "insufficient_visual_data", "unknown"].includes(normalized)) {
    return "warning";
  }
  return "neutral";
}

export function getConfidenceTone(confidence?: string | null): Tone {
  switch ((confidence ?? "").toLowerCase()) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "danger";
    default:
      return "neutral";
  }
}

export function getPatternCategoryTone(category?: string | null): Tone {
  switch ((category ?? "").toLowerCase()) {
    case "reversal":
      return "warning";
    case "continuation":
      return "info";
    case "range":
      return "neutral";
    case "breakout":
      return "success";
    default:
      return "neutral";
  }
}

export function getBreakoutTone(direction?: string | null): string {
  switch ((direction ?? "").toLowerCase()) {
    case "upside_candidate":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "downside_candidate":
      return "text-rose-700 bg-rose-50 border-rose-200";
    case "neutral":
      return "text-slate-700 bg-slate-50 border-slate-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

export function getRiskTone(riskLevel?: string | null): string {
  switch ((riskLevel ?? "").toLowerCase()) {
    case "low":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "medium":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "high":
      return "text-rose-700 bg-rose-50 border-rose-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

export function formatSignalLabel(signal?: string | null): string {
  switch (signal) {
    case "strong_buy_candidate":
      return "강한 매수 후보";
    case "buy_candidate":
      return "매수 후보";
    case "weak_buy_candidate":
      return "약한 매수 후보";
    case "hold_candidate":
      return "보유 후보";
    case "reduce_position_candidate":
      return "비중축소 후보";
    case "weak_sell_candidate":
      return "약한 매도 후보";
    case "sell_candidate":
      return "매도 후보";
    case "strong_sell_candidate":
      return "강한 매도 후보";
    case "neutral":
      return "중립";
    case "insufficient_data":
    case "insufficient_visual_data":
      return "데이터 부족";
    default:
      return signal || "-";
  }
}

export function formatPriceRange(from?: number | null, to?: number | null): string {
  if (from === null || from === undefined || to === null || to === undefined) return "계산 불가";
  return `${formatPrice(from)} ~ ${formatPrice(to)}`;
}

export function formatScore(score?: number | null): string {
  if (score === null || score === undefined || !Number.isFinite(score)) return "-";
  return `${score}점`;
}
