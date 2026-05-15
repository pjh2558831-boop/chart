"use client";

import type { FinalAction, RiskRewardDetail, TradingReport } from "../types/analysis";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

const actionTone: Record<FinalAction, string> = {
  CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED: "border-emerald-300 bg-emerald-50 text-emerald-950",
  BREAKOUT_WAIT: "border-blue-300 bg-blue-50 text-blue-950",
  WAIT_FOR_SUPPORT_CONFIRMATION: "border-blue-300 bg-blue-50 text-blue-950",
  NO_NEW_ENTRY_HOLD_OK: "border-blue-300 bg-blue-50 text-blue-950",
  WAIT_FOR_BREAKOUT: "border-blue-300 bg-blue-50 text-blue-950",
  WAIT_FOR_PULLBACK: "border-slate-300 bg-slate-50 text-slate-950",
  CONDITIONAL_BUY: "border-emerald-300 bg-emerald-50 text-emerald-950",
  PULLBACK_BUY_CANDIDATE: "border-emerald-400 bg-emerald-50 text-emerald-950",
  BREAKOUT_BUY_CANDIDATE: "border-emerald-400 bg-emerald-50 text-emerald-950",
  HOLD_AND_WATCH: "border-violet-300 bg-violet-50 text-violet-950",
  PARTIAL_TAKE_PROFIT: "border-orange-300 bg-orange-50 text-orange-950",
  REDUCE_POSITION: "border-amber-400 bg-amber-50 text-amber-950",
  SELL_RISK: "border-red-500 bg-red-50 text-red-950",
  NO_TRADE: "border-slate-300 bg-slate-100 text-slate-950",
  BUY_CANDIDATE: "border-emerald-400 bg-emerald-50 text-emerald-950",
  WAIT: "border-blue-300 bg-blue-50 text-blue-950",
  HOLD: "border-violet-300 bg-violet-50 text-violet-950",
  TAKE_PROFIT: "border-orange-300 bg-orange-50 text-orange-950",
};

const actionLabel: Record<FinalAction, string> = {
  CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED: "현재가 진입 불리 / 눌림목 대기 우선",
  BREAKOUT_WAIT: "돌파 확인 대기",
  WAIT_FOR_SUPPORT_CONFIRMATION: "지지 확인 대기",
  NO_NEW_ENTRY_HOLD_OK: "신규 진입보다 보유 관망 우세",
  WAIT_FOR_BREAKOUT: "신규 진입 주의 / 돌파 확인 대기",
  WAIT_FOR_PULLBACK: "신규 진입 보류 / 눌림목 대기",
  CONDITIONAL_BUY: "현재가 소액 조건부 진입 / 손절 짧게",
  PULLBACK_BUY_CANDIDATE: "눌림목 매수 후보",
  BREAKOUT_BUY_CANDIDATE: "돌파 매수 후보",
  HOLD_AND_WATCH: "신규 진입보다 보유 관망 우세",
  PARTIAL_TAKE_PROFIT: "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의",
  REDUCE_POSITION: "위험 관리 우선 / 신규 진입 보류",
  SELL_RISK: "손절 위험",
  NO_TRADE: "매매 부적합",
  BUY_CANDIDATE: "조건부 매수 후보",
  WAIT: "신규 진입 보류",
  HOLD: "보유 관망",
  TAKE_PROFIT: "일부 익절 고려",
};
function confidenceLabel(value?: string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  if (value === "unavailable") return "확인 제한";
  return "낮음";
}

function reliabilityLabel(value?: string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  return "낮음";
}

function signalLabel(value?: string | null) {
  if (value === "bullish") return "상승 우위";
  if (value === "bearish") return "하락 우위";
  return "중립";
}

function scoreTone(score: number, mode: "normal" | "risk" = "normal") {
  if (mode === "risk") {
    if (score < 40) return "border-emerald-200 bg-emerald-50 text-emerald-900";
    if (score < 60) return "border-amber-200 bg-amber-50 text-amber-900";
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  if (score < 50) return "border-rose-200 bg-rose-50 text-rose-900";
  if (score < 65) return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function safeScore(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : null;
}

function safeText(value: unknown, fallback = "확인 필요") {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || /^(undefined|null|nan|infinity)$/i.test(text)) return fallback;
  if (/\b(undefined|null|NaN|Infinity)\b/.test(text)) return fallback;
  return text;
}

function displayEntryScoreLabel(score: number | null) {
  if (score === null) return "확인 필요";
  if (score < 30) return "부적합";
  if (score < 50) return "불리";
  if (score < 65) return "확인 필요";
  if (score < 80) return "후보";
  return "유리";
}

function hasContent(value?: string | null) {
  return Boolean(value && value !== "이미지 기준 추정 불가" && value !== "미확인");
}

function riskRewardText(value?: RiskRewardDetail | null) {
  if (!value) return "확인 필요";
  if (value.value === null || !Number.isFinite(value.value)) return value.label || "확인 필요";
  if (value.value >= 5) return "5.0+ / 고손익비 후보";
  return `${value.value} / ${riskRewardLabel(value.value, value.label)}`;
}

function riskRewardDescription(value?: RiskRewardDetail | null) {
  if (value?.value !== null && typeof value?.value === "number" && Number.isFinite(value.value) && value.value >= 5) {
    return `이미지 기반 추정값이므로 실제 체결가, 변동성, 슬리피지에 따라 손익비는 달라질 수 있습니다. 계산값: ${value.value}`;
  }
  return value?.interpretation || "진입가, 손절가, 목표가 중 일부가 명확하지 않아 손익비 계산을 보류합니다.";
}

function riskRewardLabel(value: number, fallback?: string | null) {
  if (!Number.isFinite(value)) return fallback || "확인 필요";
  if (value < 1) return "손익비 불리";
  if (value < 1.5) return "손익비 보통";
  if (value < 3) return "손익비 우수";
  if (value < 5) return "손익비 매우 우수";
  return "고손익비 후보";
}
function riskRewardScore(value?: RiskRewardDetail | null) {
  if (!value || value.value === null || !Number.isFinite(value.value)) return null;
  if (value.value < 1) return 35;
  if (value.value < 1.5) return 55;
  if (value.value < 2) return 70;
  return 85;
}

function indicatorTradingMeaning(name: string, signal?: string | null, explanation?: string | null) {
  const lowerName = name.toLowerCase();
  const text = `${explanation ?? ""}`.trim();
  if (text && !/중립으로 해석됩니다/.test(text)) return safeText(text, "보조 판단으로만 참고합니다.");
  if (/rsi/i.test(name)) {
    return "RSI상 과매수/과매도 신호가 뚜렷하지 않아 단독 진입 타이밍 판단에는 제한적입니다.";
  }
  if (/macd/i.test(name)) {
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아 돌파 신뢰도를 강하게 보강하기 어렵습니다.";
  }
  if (lowerName.includes("volume") || name.includes("거래량")) {
    if (signal === "bullish") return "상승 구간에서 거래량이 증가해 돌파 신뢰도를 일부 보강합니다.";
    return "거래량만으로는 강한 매수세를 확인하기 어렵습니다.";
  }
  if (name.includes("이동평균") || lowerName.includes("moving")) {
    if (signal === "bullish") return "가격이 주요 이동평균선 위에 있어 단기 흐름은 우호적입니다.";
    if (signal === "bearish") return "가격이 주요 이동평균선 아래에 있어 단기 반등 신뢰도는 낮습니다.";
    return "이동평균선만으로는 뚜렷한 방향성을 판단하기 어렵습니다.";
  }
  if (name.includes("일목") || lowerName.includes("ichimoku")) {
    return "일목균형표는 표시된 차트 기준의 지지/저항 보조 근거로만 참고합니다.";
  }
  return "단독으로 진입 타이밍을 판단하기는 어렵고, 지지/저항 반응과 함께 확인해야 합니다.";
}

function unavailableIndicatorReason(name: string, reason?: string | null) {
  const text = safeText(reason, "");
  if (text && !/[?�]/.test(text)) return text;
  if (/rsi/i.test(name)) return "이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.";
  if (/macd/i.test(name)) return "이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.";
  if (name.includes("볼린저") || /bollinger/i.test(name)) return "이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.";
  if (name.includes("거래량") || /volume/i.test(name)) return "이미지에서 명확히 확인되지 않아 돌파 거래량 판단은 제한적입니다.";
  return "이미지에서 명확히 확인되지 않아 보조 판단으로만 참고합니다.";
}

function numberFromText(value?: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveDisplayMarketContext(report: TradingReport) {
  if (report.marketContext?.priceLocation) return report.marketContext;
  const current = numberFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const supports = [
    ...(report.keyLevels.supports ?? []).map((item) => numberFromText(item.priceZone)),
    ...(report.analysisMeta?.mainSupports ?? []).map((item) => numberFromText(item)),
    numberFromText(report.priceRoles?.pullbackEntry?.priceZone),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => b - a);
  const resistances = [
    ...(report.keyLevels.resistances ?? []).map((item) => numberFromText(item.priceZone)),
    ...(report.analysisMeta?.mainResistances ?? []).map((item) => numberFromText(item)),
    numberFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  const support = current !== null ? supports.find((value) => value <= current * 1.005) ?? supports[0] : supports[0];
  const resistance = current !== null ? resistances.find((value) => value >= current * 0.995) ?? resistances[0] : resistances[0];
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const nearSupport = current !== null && support !== undefined && current > 0
    ? ((current - support) / current) * 100 >= 0 && ((current - support) / current) * 100 <= 3
    : false;
  const nearResistance = current !== null && resistance !== undefined && resistance > 0
    ? ((resistance - current) / resistance) * 100 >= 0 && ((resistance - current) / resistance) * 100 <= 2.5
    : false;
  const rangePosition = current !== null && support !== undefined && resistance !== undefined && resistance > support
    ? Math.max(0, Math.min(1, (current - support) / (resistance - support)))
    : null;
  const supportGap = current !== null && support !== undefined && current > 0
    ? Math.max(0, ((current - support) / current) * 100)
    : null;
  const isExtendedMove = Boolean(nearResistance && typeof currentRr === "number" && Number.isFinite(currentRr) && currentRr < 1 && supportGap !== null && supportGap >= 8);
  const breakoutRetestConfirmed = report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE";
  let priceLocation = "unknown";
  if (breakoutRetestConfirmed) priceLocation = "breakout_area";
  else if (isExtendedMove) priceLocation = "overextended";
  else if (nearSupport) priceLocation = "near_support";
  else if (rangePosition !== null && rangePosition <= 0.35) priceLocation = "lower_range";
  else if (rangePosition !== null && rangePosition < 0.70) priceLocation = "middle_range";
  else if (rangePosition !== null && nearResistance) priceLocation = "near_resistance";
  else if (rangePosition !== null) priceLocation = "upper_range";
  else if (nearResistance) priceLocation = "near_resistance";
  return { priceLocation, rangePosition, isExtendedMove, nearSupport, nearResistance, breakoutRetestConfirmed };
}

function deriveFinalActionDetail(report: TradingReport): { title: string; subtitle: string; actionType: string; reason: string } {
  const score = report.scoreSummary;
  const currentEntry = safeScore(score?.entryScores?.currentEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.current) ?? 50;
  const pullbackEntry = safeScore(score?.entryScores?.pullbackEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.pullback) ?? 50;
  const breakoutEntry = safeScore(score?.entryScores?.breakoutEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.breakout) ?? 50;
  const buyScore = safeScore(score?.buyScore) ?? 50;
  const holdScore = safeScore(score?.holdScore) ?? 50;
  const riskScore = safeScore(score?.riskScore) ?? 50;
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const breakoutRr = report.tradePlan.riskRewardByEntry?.breakout?.value;
  const currentRrValue = typeof currentRr === "number" && Number.isFinite(currentRr) ? currentRr : null;
  const breakoutRrValue = typeof breakoutRr === "number" && Number.isFinite(breakoutRr) ? breakoutRr : null;
  const currentPrice = numberFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = numberFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const stopPrice = numberFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const marketContext = deriveDisplayMarketContext(report);
  const priceLocation = marketContext.priceLocation;
  const supportArea = priceLocation === "near_support" || priceLocation === "lower_range";
  const partialProfitAllowed = Boolean(
    marketContext.nearResistance &&
      (priceLocation === "upper_range" || priceLocation === "near_resistance" || priceLocation === "overextended") &&
      currentRrValue !== null &&
      currentRrValue < 1 &&
      holdScore >= 60 &&
      !supportArea,
  );
  const pivotExists = currentPrice !== null && pivotPrice !== null;
  const priceNearOrBelowPivot = pivotExists ? currentPrice <= pivotPrice * 1.01 : report.finalSummary.finalAction === "BREAKOUT_WAIT";
  const breakoutRetestConfirmed = pivotExists ? currentPrice >= pivotPrice * 1.005 : report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE";
  const shortTermSupportClose = currentPrice !== null && stopPrice !== null && currentPrice > 0
    ? Math.abs(currentPrice - stopPrice) / currentPrice <= 0.04
    : false;
  const overextended = priceLocation === "overextended" || Boolean(marketContext.isExtendedMove);
  const fallback = {
    title: safeText(report.finalSummary.title, actionLabel[report.finalSummary.finalAction] || "조건 확인 필요"),
    subtitle: safeText(report.finalSummary.oneLineConclusion, "현재 차트는 주요 지지와 저항 확인이 필요한 구간입니다."),
    actionType: safeText(actionLabel[report.finalSummary.finalAction], "조건 확인"),
    reason: safeText(score?.explanation ?? report.finalSummary.reason, "기술적 조건을 추가로 확인해야 합니다."),
  };

  if (currentEntry < 30 && pullbackEntry < 30 && breakoutEntry < 30 && holdScore < 40 && riskScore >= 70) {
    return {
      title: "매매 부적합",
      subtitle: "신규 진입, 보유, 돌파, 눌림목 조건이 모두 약하고 위험도가 높습니다.",
      actionType: "NO_TRADE",
      reason: safeText(score?.explanation, fallback.reason),
    };
  }
  if (supportArea) {
    if (pullbackEntry >= 60 || (report.tradePlan.riskRewardByEntry?.pullback?.value ?? 0) >= 1.2) {
      return {
        title: "지지권 눌림목 매수 후보",
        subtitle: "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 지지 반응 확인 후 눌림목 진입을 우선 검토할 수 있습니다.",
        actionType: "PULLBACK_BUY",
        reason: safeText(score?.entryScores?.pullbackEntry?.explanation, fallback.reason),
      };
    }
    return {
      title: "지지 확인 대기",
      subtitle: "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.",
      actionType: "WAIT_FOR_SUPPORT_CONFIRMATION",
      reason: safeText(score?.entryScores?.pullbackEntry?.explanation, fallback.reason),
    };
  }
  if (riskScore >= 70 && shortTermSupportClose) {
    return {
      title: "위험 관리 우선 / 신규 진입 보류",
      subtitle: "단기 지지선 이탈 위험이 커져 신규 진입보다 손절 기준 확인이 먼저입니다.",
      actionType: "RISK_MANAGEMENT",
      reason: safeText(score?.explanation, "위험 점수가 높아 손익비와 손절 기준을 먼저 확인해야 합니다."),
    };
  }
  if (breakoutEntry >= 70 && breakoutRetestConfirmed && breakoutRrValue !== null && breakoutRrValue >= 1.5) {
    return {
      title: "돌파 매수 후보",
      subtitle: "핵심 전환 가격 돌파 후 재지지가 확인되면 다음 저항까지 상승 여지를 볼 수 있습니다.",
      actionType: "BREAKOUT_BUY",
      reason: safeText(score?.entryScores?.breakoutEntry?.explanation, fallback.reason),
    };
  }
  if (currentEntry >= 60 && currentRrValue !== null && currentRrValue >= 1.2 && riskScore < 55 && !overextended && !marketContext.nearResistance) {
    return {
      title: "현재가 소액 조건부 진입 / 손절 짧게",
      subtitle: "현재가 기준 손익비가 나쁘지 않지만, 저항 근처 변동성에 대비해 짧은 손절 기준이 필요합니다.",
      actionType: "CURRENT_ENTRY",
      reason: safeText(score?.entryScores?.currentEntry?.explanation, fallback.reason),
    };
  }
  if (pullbackEntry >= 75 && pullbackEntry >= currentEntry && pullbackEntry >= breakoutEntry) {
    return {
      title: "눌림목 매수 후보",
      subtitle: "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다.",
      actionType: "PULLBACK_BUY",
      reason: safeText(score?.entryScores?.pullbackEntry?.explanation, fallback.reason),
    };
  }
  if (currentEntry < 50 && pullbackEntry >= 70 && pullbackEntry > breakoutEntry) {
    return {
      title: "현재가 진입 불리 / 눌림목 대기 우선",
      subtitle: "현재가는 저항 또는 전환 가격에 가까워 손익비가 낮고, 주요 지지 구간에서 반등 확인 후 진입하는 전략이 더 유리합니다.",
      actionType: "PULLBACK_WAIT",
      reason: safeText(score?.entryScores?.pullbackEntry?.explanation, fallback.reason),
    };
  }
  if (breakoutEntry < 65 && pivotPrice !== null && !breakoutRetestConfirmed) {
    return {
      title: "돌파 확인 대기",
      subtitle: "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다.",
      actionType: "BREAKOUT_WAIT",
      reason: safeText(score?.entryScores?.breakoutEntry?.explanation, fallback.reason),
    };
  }
  if (partialProfitAllowed) {
    return {
      title: priceLocation === "overextended" ? "급등 후 저항 근접 / 일부 익절 고려" : "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의",
      subtitle: "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다.",
      actionType: "PARTIAL_TAKE_PROFIT",
      reason: safeText(report.finalSummary.reason ?? score?.explanation, fallback.reason),
    };
  }
  if (holdScore >= 70 && currentEntry < holdScore && pullbackEntry < holdScore) {
    return {
      title: "신규 진입보다 보유 관망 우세",
      subtitle: "신규 진입 손익비는 제한적이지만, 보유자는 주요 지지선 이탈 전까지 관망할 수 있습니다.",
      actionType: "HOLD",
      reason: safeText(score?.explanation, fallback.reason),
    };
  }
  if (buyScore >= 65 && pullbackEntry >= Math.max(currentEntry, breakoutEntry)) {
    return {
      title: "눌림목 매수 후보",
      subtitle: "현재가 추격보다 지지 확인 후 눌림목으로 접근하는 조건이 더 우선입니다.",
      actionType: "PULLBACK_BUY",
      reason: safeText(score?.entryScores?.pullbackEntry?.explanation, fallback.reason),
    };
  }
  return fallback;
}
function getOneLineActionSummary(report: TradingReport) {
  const detail = deriveFinalActionDetail(report);
  if (detail.subtitle) return detail.subtitle;
  const score = report.scoreSummary;
  const current = safeScore(score?.entryScores?.currentEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.current);
  const pullback = safeScore(score?.entryScores?.pullbackEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.pullback);
  const breakout = safeScore(score?.entryScores?.breakoutEntry?.score) ?? riskRewardScore(report.tradePlan.riskRewardByEntry?.breakout);
  const hold = safeScore(score?.holdScore) ?? 0;
  const risk = safeScore(score?.riskScore) ?? 0;
  const action = report.finalSummary.finalAction;

  if (risk >= 75 || action === "SELL_RISK" || action === "REDUCE_POSITION") {
    return "위험도가 높아 신규 진입은 피하고 단기 손절 기준을 우선 확인해야 합니다.";
  }
  if ((pullback ?? 0) >= 65 && (current ?? 0) < 50 && (pullback ?? 0) >= (breakout ?? 0)) {
    return "현재가 추격매수는 불리하고, 주요 지지 구간에서 눌림목 확인 후 진입하는 전략이 더 유리합니다.";
  }
  if ((breakout ?? 0) < 65 && (action === "BREAKOUT_WAIT" || action === "WAIT_FOR_BREAKOUT")) {
    return "핵심 저항 돌파 후 재지지 확인 전까지는 신규 진입보다 관망이 유리합니다.";
  }
  if (hold >= 60 && (current ?? 0) < 50) {
    return "신규 진입은 부담스럽지만, 보유자는 주요 지지선 이탈 전까지 관망 가능합니다.";
  }
  return "현재 차트는 기술적 조건 확인이 필요하며, 신규 진입 전 주요 지지와 저항을 먼저 확인하는 것이 좋습니다.";
}

function getEntryRecommendationRanking(report: TradingReport) {
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const items = [
    {
      key: "pullback",
      name: "눌림목 진입",
      score: safeScore(report.scoreSummary?.entryScores?.pullbackEntry?.score) ?? riskRewardScore(rr.pullback),
      reason: safeText(report.scoreSummary?.entryScores?.pullbackEntry?.explanation, "주요 지지 구간에서 반등 확인 시 손절 기준을 짧게 둘 수 있습니다."),
    },
    {
      key: "breakout",
      name: "돌파 진입",
      score: safeScore(report.scoreSummary?.entryScores?.breakoutEntry?.score) ?? riskRewardScore(rr.breakout),
      reason: safeText(report.scoreSummary?.entryScores?.breakoutEntry?.explanation, "핵심 저항 돌파 후 재지지 확인이 필요합니다."),
    },
    {
      key: "current",
      name: "현재가 진입",
      score: safeScore(report.scoreSummary?.entryScores?.currentEntry?.score) ?? riskRewardScore(rr.current),
      reason: safeText(report.scoreSummary?.entryScores?.currentEntry?.explanation, "현재 가격이 저항 구간에 가까우면 손익비가 낮을 수 있습니다."),
    },
  ];

  return items
    .map((item) => ({ ...item, score: item.score ?? 50 }))
    .sort((a, b) => b.score - a.score);
}

function getEntryScoreDisplayItems(report: TradingReport) {
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  return [
    {
      title: "현재가 진입",
      item: report.scoreSummary?.entryScores?.currentEntry,
      fallbackScore: riskRewardScore(rr.current),
      fallbackReason: "현재가 진입 기준을 계산할 가격 정보가 부족합니다.",
    },
    {
      title: "눌림목 진입",
      item: report.scoreSummary?.entryScores?.pullbackEntry,
      fallbackScore: riskRewardScore(rr.pullback),
      fallbackReason: "눌림목 진입 기준을 계산할 가격 정보가 부족합니다.",
    },
    {
      title: "돌파 진입",
      item: report.scoreSummary?.entryScores?.breakoutEntry,
      fallbackScore: riskRewardScore(rr.breakout),
      fallbackReason: "돌파 진입 기준을 계산할 가격 정보가 부족합니다.",
    },
  ].map((entry) => {
    const score = safeScore(entry.item?.score) ?? entry.fallbackScore;
    return {
      title: entry.title,
      score,
      label: displayEntryScoreLabel(score),
      explanation: safeText(entry.item?.explanation, entry.fallbackReason),
    };
  });
}

function getNextConfirmationChecklist(report: TradingReport) {
  const pivot = safeText(report.priceRoles?.pivot?.priceZone ?? report.tradePlan.transitionLevel?.priceZone, "");
  const support = safeText(report.priceRoles?.pullbackEntry?.priceZone ?? report.keyLevels.supports?.[0]?.priceZone, "");
  const stop = safeText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "");
  const unavailableIndicators = report.indicatorAnalysis?.unavailable ?? [];
  const items: string[] = [];

  if (pivot) items.push(`${pivot} 돌파 후 재지지 여부 확인`);
  if (support) items.push(`${support} 부근에서 반등이 나오는지 확인`);
  if (stop) items.push(`${stop} 이탈 여부 확인`);
  items.push("돌파 시 거래량 증가 여부 확인");
  if (unavailableIndicators.some((item) => /RSI|MACD/i.test(item.name))) {
    items.push("RSI/MACD 등 확인 제한 지표는 보조 판단으로만 참고");
  }

  const fallback = [
    "핵심 저항 돌파 여부 확인",
    "주요 지지선 이탈 여부 확인",
    "거래량 동반 여부 확인",
    "손익비가 개선되는 진입 구간 확인",
  ];
  return (items.length ? items : fallback).filter((item) => safeText(item, "")).slice(0, 5);
}

function BulletList({ items, tone = "slate" }: { items: string[]; tone?: "green" | "red" | "amber" | "slate" }) {
  const color = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    red: "border-rose-100 bg-rose-50 text-rose-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  if (!items.length) {
    return <p className="text-sm text-slate-500">표시할 내용이 없습니다.</p>;
  }

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${color}`}>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisMetaCard({ meta }: { meta: TradingReport["analysisMeta"] }) {
  if (!meta) return null;
  const dataBasisLabel = {
    image_only: "이미지 기반 분석",
    image_with_ohlcv: "이미지 + 가격 데이터 기반",
    unknown: "데이터 기준 미확인",
  }[meta.dataBasis ?? "image_only"];
  const priceUnit = safeText(meta.priceUnit, "이미지 축 기준 추정");
  const priceUnitConfidence = meta.priceUnitConfidence ?? "low";
  const showPriceUnitWarning = priceUnitConfidence === "low" || priceUnit === "확인 필요" || priceUnit.includes("이미지 축");
  const rows = [
    ["종목/티커", meta.symbol || "미확인"],
    ["분석 기준 차트", meta.chartTimeframe || "추정 불가"],
    ["현재가 또는 추정 현재가", meta.currentPriceZone || "이미지 기준 추정 불가"],
    ["가격 단위", priceUnit],
    ["핵심 전환 가격", meta.keyPivotPrice || "미확인"],
    ["주요 지지", meta.mainSupports?.length ? meta.mainSupports.join(" / ") : "미확인"],
    ["주요 저항", meta.mainResistances?.length ? meta.mainResistances.join(" / ") : "미확인"],
    ["분석 기준 시각", meta.analyzedAt || "분석 시각 미확인"],
    ["데이터 기준", dataBasisLabel],
  ];

  return (
    <ResultSection title="분석 기준 요약" description="이미지에서 확인 가능한 기준 정보만 표시합니다." tone="blue">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      {showPriceUnitWarning ? (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          가격 단위는 이미지 축 기준 추정값이며 실제 시세 단위와 다를 수 있습니다.
        </p>
      ) : null}
    </ResultSection>
  );
}

export function OneLineActionSummary({ report }: { report: TradingReport }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">최종 한 줄 행동 요약</p>
      <p className="mt-2 text-base font-semibold leading-7 text-slate-950">{getOneLineActionSummary(report)}</p>
    </section>
  );
}

export function EntryRecommendationRanking({ report }: { report: TradingReport }) {
  const ranking = getEntryRecommendationRanking(report);
  return (
    <ResultSection title="진입 방식별 추천 순위" description="현재가, 눌림목, 돌파 진입을 점수와 손익비 기준으로 비교합니다." tone="green">
      <div className="grid gap-3 lg:grid-cols-3">
        {ranking.map((item, index) => {
          const label = displayEntryScoreLabel(item.score);
          const tone = item.score >= 65 ? "success" : item.score < 50 ? "warning" : "neutral";
          return (
            <article key={item.key} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{index + 1}순위</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{item.name}</h3>
                </div>
                <StatusBadge label={label} tone={tone} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.reason}</p>
            </article>
          );
        })}
      </div>
    </ResultSection>
  );
}

export function NextConfirmationChecklist({ report }: { report: TradingReport }) {
  const items = getNextConfirmationChecklist(report);
  return (
    <ResultSection title="다음 확인 조건" description="분석 이후 실제 대응 전에 확인하면 좋은 조건입니다." tone="blue">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ul className="grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </ResultSection>
  );
}

export function FinalActionCard({ report }: { report: TradingReport }) {
  const { finalSummary, userActionGuide, tradePlan } = report;
  const score = report.scoreSummary ?? {
    totalScore: 50,
    totalLabel: "관망 우세",
    buyScore: 40,
    buyLabel: "매수 주의",
    holdScore: 60,
    holdLabel: "관망 가능",
    riskScore: 50,
    riskLabel: "주의",
    explanation: "이미지 기반 분석으로 추가 확인 조건이 필요합니다.",
    entryScores: {
      currentEntry: { score: 0, label: "확인 필요", explanation: "현재가 진입 기준을 계산할 가격 정보가 부족합니다." },
      pullbackEntry: { score: 0, label: "확인 필요", explanation: "눌림목 진입 기준을 계산할 가격 정보가 부족합니다." },
      breakoutEntry: { score: 0, label: "확인 필요", explanation: "돌파 진입 기준을 계산할 가격 정보가 부족합니다." },
    },
    scoreFactors: { positive: [], negative: [], risk: [] },
  };
  const actionDetail = deriveFinalActionDetail(report);
  const entryScoreItems = getEntryScoreDisplayItems(report);
  const pullbackTargets = report.priceRoles?.targets?.pullbackTargets ?? [
    tradePlan.targets.pullbackTargets?.firstTarget?.priceZone,
    tradePlan.targets.pullbackTargets?.secondTarget?.priceZone,
  ].filter(Boolean) as string[];
  const breakoutTargets = report.priceRoles?.targets?.breakoutTargets ?? [
    tradePlan.targets.breakoutTargets?.firstTarget?.priceZone,
    tradePlan.targets.breakoutTargets?.secondTarget?.priceZone,
    tradePlan.targets.firstTarget.priceZone,
  ].filter(Boolean) as string[];
  const topTargetSummary = [
    pullbackTargets.length
      ? `눌림목 기준 1차 ${pullbackTargets[0]}${pullbackTargets[1] ? ` / 2차 ${pullbackTargets[1]}` : ""}`
      : "",
    breakoutTargets.length
      ? `돌파 기준 1차 ${breakoutTargets[0]}${breakoutTargets[1] ? ` / 2차 ${breakoutTargets[1]}` : ""}`
      : "",
  ].filter(Boolean);
  const topStopSummary = [
    tradePlan.stopLossByEntry?.currentEntry?.priceZone ? `현재가 ${tradePlan.stopLossByEntry.currentEntry.priceZone}` : "",
    tradePlan.stopLossByEntry?.pullbackEntry?.priceZone ? `눌림목 ${tradePlan.stopLossByEntry.pullbackEntry.priceZone}` : "",
    tradePlan.stopLossByEntry?.breakoutEntry?.priceZone ? `돌파 ${tradePlan.stopLossByEntry.breakoutEntry.priceZone}` : "",
  ].filter(Boolean);
  const tone = finalSummary.finalAction === "SELL_RISK" || finalSummary.finalAction === "REDUCE_POSITION"
    ? "danger"
    : finalSummary.finalAction.includes("BUY")
        || finalSummary.finalAction === "CONDITIONAL_BUY"
        || finalSummary.finalAction === "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED"
      ? "success"
      : finalSummary.finalAction === "PARTIAL_TAKE_PROFIT" || finalSummary.finalAction === "TAKE_PROFIT"
        ? "warning"
        : "info";

  return (
    <section className={`rounded-lg border p-5 shadow-soft ${actionTone[finalSummary.finalAction]}`}>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-sm font-semibold opacity-80">理쒖쥌 ?됰룞 ?먮떒</p>
          <h2 className="mt-3 text-3xl font-bold">{actionDetail.title}</h2>
          <p className="mt-4 text-base leading-7">{actionDetail.subtitle}</p>
          {actionDetail.reason ? <p className="mt-3 text-sm leading-6 opacity-80">{actionDetail.reason}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label={actionDetail.actionType} tone={tone} />
            <StatusBadge label={`분석 점수 ${score.totalScore} / 100 · ${score.totalLabel}`} tone="neutral" />
            <StatusBadge label={`신뢰도 ${confidenceLabel(finalSummary.confidence)}`} tone="neutral" />
          </div>
          {score.explanation ? <p className="mt-3 text-sm leading-6 opacity-80">{score.explanation}</p> : null}
        </div>

        <div className="grid gap-3 text-sm">
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">신규 진입</p>
            <p className="mt-1 leading-6">{userActionGuide.nonHolder}</p>
          </div>
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">보유자 대응</p>
            <p className="mt-1 leading-6">{userActionGuide.holder}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
              <p className="font-semibold">손절 기준</p>
              {topStopSummary.length ? (
                topStopSummary.map((line) => <p key={line} className="mt-1">{line}</p>)
              ) : (
                <p className="mt-1">{tradePlan.stopLoss.priceZone}</p>
              )}
            </div>
            <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
              <p className="font-semibold">목표 구간</p>
              {topTargetSummary.length ? (
                topTargetSummary.map((line) => <p key={line} className="mt-1">{line}</p>)
              ) : (
                <p className="mt-1">확인 필요</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">분석 점수</p>
            <p className="mt-1 text-lg font-bold">종합 {score.totalScore} / 100</p>
            <p className="mt-1">{score.totalLabel}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className={`rounded-md border px-3 py-2 ${scoreTone(score.holdScore)}`}>
                <p className="text-xs font-semibold">보유 관망</p>
                <p className="mt-1 font-bold">{score.holdScore} / 100</p>
                <p className="text-xs">{score.holdLabel}</p>
              </div>
              <div className={`rounded-md border px-3 py-2 ${scoreTone(score.riskScore, "risk")}`}>
                <p className="text-xs font-semibold">위험도</p>
                <p className="mt-1 font-bold">{score.riskScore} / 100</p>
                <p className="text-xs">{score.riskLabel} · 높을수록 위험</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">진입 점수</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {entryScoreItems.map(({ title, score: value, label }) => {
                return (
                  <div key={title} className={`rounded-md border px-3 py-2 ${scoreTone(value ?? 0)}`}>
                    <p className="text-xs font-semibold">{title}</p>
                    <p className="mt-1 font-bold">{value === null ? "확인 필요" : `${value} / 100`}</p>
                    <p className="text-xs">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ScoreFactorsSection({ scoreSummary }: { scoreSummary?: TradingReport["scoreSummary"] }) {
  if (!scoreSummary) return null;
  const factors = scoreSummary.scoreFactors ?? { positive: [], negative: [], risk: [] };
  const renderFactor = (items: Array<{ label: string; scoreImpact: number; reason: string }> = [], tone: "green" | "red" | "amber") => {
    if (!items.length) return <p className="text-sm text-slate-500">표시할 근거가 제한적입니다.</p>;
    const color = {
      green: "border-emerald-100 bg-emerald-50 text-emerald-900",
      red: "border-rose-100 bg-rose-50 text-rose-900",
      amber: "border-amber-100 bg-amber-50 text-amber-900",
    }[tone];
    return (
      <div className="space-y-2">
        {items.map((item) => {
          const impact = Number.isFinite(item.scoreImpact) ? Math.round(item.scoreImpact) : 0;
          const label = safeText(item.label, "점수 요인");
          const reason = safeText(item.reason, "추가 확인이 필요합니다.");
          return (
            <div key={`${label}-${impact}-${reason}`} className={`rounded-lg border px-4 py-3 text-sm ${color}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{label}</span>
                <span className="font-bold">{impact > 0 ? `+${impact}` : impact}</span>
              </div>
              <p className="mt-1 leading-6 opacity-85">{reason}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ResultSection title="점수 산정 근거" description="실제 점수 계산에 반영된 요인을 긍정, 감점, 위험 요인으로 나누어 표시합니다." tone="blue">
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-bold text-emerald-800">긍정 요인</h3>
          {renderFactor(factors.positive, "green")}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-rose-800">감점 요인</h3>
          {renderFactor(factors.negative, "red")}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-amber-800">위험 요인</h3>
          {renderFactor(factors.risk, "amber")}
        </div>
      </div>
    </ResultSection>
  );
}

export function UserActionGuideTable({ guide }: { guide: TradingReport["userActionGuide"] }) {
  const rows = [
    ["미보유자", guide.nonHolder],
    ["보유자", guide.holder],
    ["단기 매매자", guide.shortTermTrader],
    ["추가 매수자", guide.addBuyer],
    ["손절 기준", guide.stopLoss],
  ];

  return (
    <ResultSection title="사용자 상태별 대응표" tone="blue">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-36 px-4 py-3 font-semibold">사용자 상태</th>
              <th className="px-4 py-3 font-semibold">대응</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-4 py-3 font-semibold text-slate-950">{label}</td>
                <td className="px-4 py-3 leading-6 text-slate-700">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResultSection>
  );
}

export function TradePlanTable({ plan, priceRoles }: { plan: TradingReport["tradePlan"]; priceRoles?: TradingReport["priceRoles"] }) {
  const pullbackTargets = priceRoles?.targets?.pullbackTargets ?? [
    plan.targets.pullbackTargets?.firstTarget?.priceZone,
    plan.targets.pullbackTargets?.secondTarget?.priceZone,
    plan.targets.pullbackTargets?.thirdTarget?.priceZone,
  ].filter(Boolean) as string[];
  const breakoutTargets = priceRoles?.targets?.breakoutTargets ?? [
    plan.targets.breakoutTargets?.firstTarget?.priceZone,
    plan.targets.breakoutTargets?.secondTarget?.priceZone,
    plan.targets.firstTarget.priceZone,
    plan.targets.secondTarget?.priceZone,
  ].filter(Boolean) as string[];
  const entryStops = plan.stopLossByEntry;
  const stopRows = entryStops
    ? [
        ["현재가 진입 손절", entryStops.currentEntry?.priceZone, entryStops.currentEntry?.condition, entryStops.currentEntry?.explanation],
        ["눌림목 진입 손절", entryStops.pullbackEntry?.priceZone, entryStops.pullbackEntry?.condition, entryStops.pullbackEntry?.explanation],
        ["돌파 진입 손절", entryStops.breakoutEntry?.priceZone, entryStops.breakoutEntry?.condition, entryStops.breakoutEntry?.explanation],
        ["중기 관점 무효화", entryStops.mediumTermInvalidation?.priceZone, entryStops.mediumTermInvalidation?.condition, entryStops.mediumTermInvalidation?.explanation],
      ]
    : [
        ["단기 손절", plan.stopLoss.shortTerm?.priceZone, plan.stopLoss.shortTerm?.condition, plan.stopLoss.shortTerm?.meaning],
        ["보수적 손절", plan.stopLoss.conservative?.priceZone, plan.stopLoss.conservative?.condition, plan.stopLoss.conservative?.meaning],
        ["중기 관점 무효화", plan.invalidation.midTerm?.priceZone ?? plan.invalidation.condition, plan.invalidation.condition, plan.invalidation.meaning],
      ];
  const rows = [
    ["눌림목 진입", plan.entry.pullbackEntry?.priceZone, plan.entry.pullbackEntry?.condition, plan.entry.pullbackEntry?.action],
    ["돌파 진입", plan.entry.breakoutEntry?.priceZone, plan.entry.breakoutEntry?.condition, plan.entry.breakoutEntry?.action],
    ["추격매수 금지", plan.entry.noChaseZone?.priceZone, plan.entry.noChaseZone?.reason, "현재 구간에서는 조건 확인이 우선입니다."],
    ...stopRows,
    ["눌림목 1차 목표", pullbackTargets[0], "눌림목 진입 기준 가까운 저항", "보유자에게는 일부 익절 또는 돌파 확인 구간입니다."],
    ["눌림목 2차 목표", pullbackTargets[1], "눌림목 진입 기준 다음 저항", "1차 저항 돌파 시 확인할 목표 후보입니다."],
    ["돌파 1차 목표", breakoutTargets[0], "핵심 전환 가격 돌파 후 다음 저항", "돌파 진입 기준 1차 목표 후보입니다."],
    ["돌파 2차 목표", breakoutTargets[1], "돌파 후 확장 저항", "돌파 진입 기준 2차 목표 후보입니다."],
  ].filter((row) => hasContent(row[1]));

  return (
    <ResultSection title="진입 / 손절 / 목표 / 무효화 조건" description="가격은 추천가가 아니라 이미지 기반 기술적 조건 후보입니다." tone="purple">
      {plan.transitionLevel?.explanation ? (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          {plan.transitionLevel.explanation}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">구분</th>
              <th className="px-4 py-3 font-semibold">가격 구간</th>
              <th className="px-4 py-3 font-semibold">조건</th>
              <th className="px-4 py-3 font-semibold">대응 의미</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([label, zone, condition, action]) => (
              <tr key={label}>
                <td className="px-4 py-3 font-semibold text-slate-950">{label}</td>
                <td className="px-4 py-3 text-slate-800">{zone}</td>
                <td className="px-4 py-3 leading-6 text-slate-700">{condition}</td>
                <td className="px-4 py-3 leading-6 text-slate-600">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-600">손익비</p>
            <p className="mt-1 text-xs text-slate-500">중기 무효화 가격은 제외하고 단기 손절 기준으로 계산합니다.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["현재가 기준", plan.riskRewardByEntry?.current],
            ["눌림목 기준", plan.riskRewardByEntry?.pullback],
            ["돌파 기준", plan.riskRewardByEntry?.breakout ?? plan.riskReward],
          ].map(([label, value]) => {
            const rr = value as RiskRewardDetail | undefined;
            const isHighEstimate = rr?.value !== null && typeof rr?.value === "number" && Number.isFinite(rr.value) && rr.value >= 5;
            return (
              <article key={String(label)} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">{label as string}</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{riskRewardText(rr)}</p>
                {isHighEstimate ? <p className="mt-1 text-[11px] font-semibold text-amber-700">이미지 기반 추정값</p> : null}
                <p className="mt-2 text-xs leading-5 text-slate-600">{riskRewardDescription(rr)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </ResultSection>
  );
}

export function KeyLevelsSection({ levels, priceRoles }: { levels: TradingReport["keyLevels"]; priceRoles?: TradingReport["priceRoles"] }) {
  const rows = [
    ...(priceRoles?.current ? [{ label: "현재가", priceZone: priceRoles.current.priceZone, meaning: priceRoles.current.meaning, reliability: "low", type: "기준" }] : []),
    ...(priceRoles?.pivot ? [{ label: "핵심 전환 가격", priceZone: priceRoles.pivot.priceZone, meaning: priceRoles.pivot.meaning, reliability: "medium", type: "전환" }] : []),
    ...levels.supports.map((item, index) => ({
      ...item,
      type: "지지",
      meaning: index === 0
        ? "단기 지지 확인 구간이며 이탈 시 단기 손절 기준으로 참고합니다."
        : index === 1
          ? "보수적 손절 기준으로 참고할 수 있는 하단 지지입니다."
          : "중기 관점 무효화 기준으로 참고할 수 있는 구조적 지지입니다.",
    })),
    ...levels.resistances.map((item, index) => ({
      ...item,
      type: "저항",
      meaning: index === 0
        ? "돌파 확인 가격입니다. 아래에서는 저항, 돌파 후 재지지 시 지지 전환 근거가 됩니다."
        : index === 1
          ? "돌파 진입 기준 1차 목표 후보입니다."
          : "확장 목표 후보입니다.",
    })),
  ];

  return (
    <ResultSection title="핵심 가격대" description="비슷한 가격은 묶고, 이미지 기반 불확실성을 반영해 부근 구간으로 표시합니다." tone="green">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">이미지 기반 분석으로 핵심 가격대 산정이 제한됩니다.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <article key={`${row.type}-${row.label}-${row.priceZone}`} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-950">{row.label}</p>
                <StatusBadge label={`${row.type} / 신뢰도 ${reliabilityLabel(row.reliability)}`} tone={row.type === "지지" ? "success" : row.type === "저항" ? "warning" : "info"} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{row.priceZone}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{row.meaning}</p>
            </article>
          ))}
        </div>
      )}
    </ResultSection>
  );
}

export function ScenarioSection({ scenarios }: { scenarios: TradingReport["scenarios"] }) {
  const rows: Array<{ label: string; scenario: TradingReport["scenarios"]["bullish"]; tone: "success" | "neutral" | "danger" }> = [
    { label: "상승 시나리오", scenario: scenarios.bullish, tone: "success" },
    { label: "중립 시나리오", scenario: scenarios.neutral, tone: "neutral" },
    { label: "하락 시나리오", scenario: scenarios.bearish, tone: "danger" },
  ];

  return (
    <ResultSection title="상승 / 중립 / 하락 시나리오" tone="blue">
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map(({ label, scenario, tone }) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <StatusBadge label={label} tone={tone} />
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-950">조건</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.condition}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">예상 흐름</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.expectedMove}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">대응</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.action}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </ResultSection>
  );
}

export function EvidenceSection({ evidence }: { evidence: TradingReport["evidence"] }) {
  const summaryItems = [
    ...(evidence.negative ?? []),
    ...(evidence.positive ?? []),
    ...(evidence.riskFactors ?? []),
  ]
    .map((item) => safeText(item, ""))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <ResultSection title="핵심 판단 근거" tone="green">
      <BulletList
        items={summaryItems.length ? summaryItems : ["주요 지지와 저항, 손익비, 이미지 기반 분석 한계를 함께 확인해야 합니다."]}
        tone="slate"
      />
    </ResultSection>
  );
}

export function PatternAnalysisSection({ analysis }: { analysis: TradingReport["patternAnalysis"] }) {
  const secondary = analysis.secondaryPattern;
  const primaryName = safeText(analysis.primaryPattern.name, "명확한 패턴 없음");
  const noClearPattern = primaryName.includes("명확한 패턴 없음") || primaryName.includes("패턴 없음") || primaryName.includes("?놁쓬");

  return (
    <ResultSection title="주요 패턴 분석" tone="purple">
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <StatusBadge label={noClearPattern ? "주요 패턴" : "패턴 후보"} tone="info" />
        <h3 className="mt-3 text-lg font-bold text-slate-950">{primaryName}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {noClearPattern
            ? "현재는 패턴 예측보다 주요 지지 반응과 핵심 전환 가격 돌파 여부가 더 중요합니다."
            : safeText(analysis.primaryPattern.tradingMeaning || analysis.primaryPattern.reason, "지지 확인과 돌파 후 재지지 여부를 우선 확인합니다.")}
        </p>
        {!noClearPattern ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-950">확인 조건</dt>
              <dd className="mt-1 leading-6 text-slate-600">{safeText(analysis.primaryPattern.confirmationCondition, "추가 확인 필요")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">무효화 조건</dt>
              <dd className="mt-1 leading-6 text-slate-600">{safeText(analysis.primaryPattern.invalidationCondition, "추가 확인 필요")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">매매 의미</dt>
              <dd className="mt-1 leading-6 text-slate-600">{safeText(analysis.primaryPattern.tradingMeaning, "조건 확인 전까지 보조 참고로만 봅니다.")}</dd>
            </div>
          </dl>
        ) : null}
        {secondary ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-900">보조 시나리오: </span>
            {safeText(secondary.name, "확인 필요")} - {safeText(secondary.reason, "보조 참고로만 확인합니다.")}
          </div>
        ) : null}
        {analysis.excludedPatterns?.length ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            제외 패턴: {analysis.excludedPatterns.slice(0, 3).map((item) => safeText(item.name, "확인 필요")).join(" / ")}
          </p>
        ) : null}
      </article>
    </ResultSection>
  );
}

export function IndicatorSummarySection({ analysis }: { analysis: TradingReport["indicatorAnalysis"] }) {
  const confirmed = analysis.confirmed ?? [];
  const directional = confirmed.filter((item) => item.signal === "bullish" || item.signal === "bearish");
  const neutral = confirmed.filter((item) => item.signal !== "bullish" && item.signal !== "bearish");
  const unavailable = analysis.unavailable ?? [];

  return (
    <ResultSection title="보조지표 분석" description="방향성이 확인된 지표는 강조하고, 중립 또는 확인 제한 지표는 간단히 묶어 표시합니다." tone="blue">
      <div className="space-y-4">
        {directional.length ? (
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-800">확인된 방향성 지표</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {directional.map((item) => (
                <article key={`${item.name}-${item.explanation}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <StatusBadge label={signalLabel(item.signal)} tone={item.signal === "bullish" ? "success" : "danger"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{indicatorTradingMeaning(item.name, item.signal, item.explanation)}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {neutral.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-800">중립 지표</h3>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {neutral.map((item) => (
                <li key={`${item.name}-${item.explanation}`} className="py-2 leading-6 text-slate-600">
                  <span className="font-semibold text-slate-900">{item.name}: </span>
                  {indicatorTradingMeaning(item.name, item.signal, item.explanation)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800">확인 제한 지표</h3>
          {unavailable.length ? (
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-2">
              {unavailable.map((item) => (
                <li key={`${item.name}-${item.reason}`}>
                  <span className="font-semibold text-slate-900">{item.name}: </span>
                  {unavailableIndicatorReason(item.name, item.reason)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">추가로 확인 제한 표시된 지표가 없습니다.</p>
          )}
        </div>
      </div>
    </ResultSection>
  );
}

export function ImageLimitNotice({ disclaimer }: { disclaimer: string }) {
  return (
    <ResultSection title="이미지 기반 한계 안내" tone="yellow">
      <p className="text-sm leading-6 text-slate-700">{disclaimer}</p>
    </ResultSection>
  );
}


