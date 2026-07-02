import type {
  AnalysisMeta,
  AnalysisResponse,
  ChartRegime,
  Confidence,
  EntryModeScore,
  FinalAction,
  MarketContext,
  PatternRiskProfile,
  PriceRoles,
  PriceLocation,
  RiskRewardDetail,
  ScoreFactor,
  ScoreSummary,
  TradingActionState,
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
  cloud_consolidation: "일목 구름대 횡보 후보",
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

function looksLikeUsTicker(symbol?: string | null) {
  const text = typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
  if (!text || text === "미확인") return false;
  if (/\b(NYSE|NASDAQ|AMEX|ETF|US)\b/.test(text)) return true;
  return /^[A-Z]{1,5}$/.test(text);
}

function inferPriceUnit(
  symbol?: string | null,
  currentPrice?: number | null,
  existingUnit?: string | null,
  existingConfidence?: string | null,
): { priceUnit: string; priceUnitConfidence: "low" | "medium" | "high" } {
  const confidence = existingConfidence === "high" || existingConfidence === "medium" || existingConfidence === "low"
    ? existingConfidence
    : undefined;
  if (existingUnit && existingUnit.trim()) {
    return {
      priceUnit: existingUnit.trim(),
      priceUnitConfidence: confidence ?? "low",
    };
  }

  const isUsLike = looksLikeUsTicker(symbol);
  if (isUsLike && finite(currentPrice) && currentPrice > 10000) {
    return { priceUnit: "확인 필요", priceUnitConfidence: "low" };
  }
  if (isUsLike && finite(currentPrice) && currentPrice > 0) {
    return { priceUnit: "달러 기준 추정", priceUnitConfidence: "medium" };
  }
  if (finite(currentPrice) && currentPrice >= 100000) {
    return { priceUnit: "이미지 축 기준 추정", priceUnitConfidence: "low" };
  }
  return { priceUnit: "이미지 축 기준 추정", priceUnitConfidence: "low" };
}

function priceFromText(value?: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return finite(parsed) ? parsed : null;
}

function safeText(value: unknown, fallback = "확인 필요") {
  return safeDisplayText(value, fallback);
}

function safeNumber(value: unknown) {
  if (finite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return finite(parsed) ? parsed : null;
}

function safeScore(value: unknown, fallback: number | null = null) {
  const number = safeNumber(value);
  if (number === null) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parsePriceFromText(value?: string | null) {
  return priceFromText(value);
}

function formatPriceZone(value: unknown, fallback = "확인 필요") {
  if (finite(value)) return formatZone(value);
  return safeText(value, fallback);
}

function clampScore(value: unknown, fallback = 0) {
  return clamp(value, fallback);
}

function distancePercent(a: number, b: number) {
  if (!finite(a) || !finite(b) || b === 0) return null;
  return Math.abs(a - b) / Math.abs(b) * 100;
}

function deriveMarketContext(report: TradingReport): MarketContext {
  const current = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const supportValues = [
    ...(report.keyLevels.supports ?? []).map((item) => priceFromText(item.priceZone)),
    ...(report.analysisMeta?.mainSupports ?? []).map((item) => priceFromText(item)),
    priceFromText(report.priceRoles?.pullbackEntry?.priceZone),
    priceFromText(report.tradePlan.entry.pullbackEntry?.priceZone),
    priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
  ].filter(finite).sort((a, b) => b - a);
  const resistanceValues = [
    ...(report.keyLevels.resistances ?? []).map((item) => priceFromText(item.priceZone)),
    ...(report.analysisMeta?.mainResistances ?? []).map((item) => priceFromText(item)),
    priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice),
    priceFromText(report.tradePlan.transitionLevel?.priceZone),
    priceFromText(report.tradePlan.targets.firstTarget?.priceZone),
  ].filter(finite).sort((a, b) => a - b);
  const support = finite(current)
    ? supportValues.find((value) => value <= current * 1.005) ?? supportValues[0]
    : supportValues[0];
  const resistance = finite(current)
    ? resistanceValues.find((value) => value >= current * 0.995) ?? resistanceValues[0]
    : resistanceValues[0];
  const pivot = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone) ?? resistance;
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const breakoutTarget = priceFromText(report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? report.tradePlan.targets.firstTarget?.priceZone ?? report.priceRoles?.targets?.breakoutTargets?.[0]);
  const breakoutRr = report.tradePlan.riskRewardByEntry?.breakout?.value;
  const breakoutRetestConfirmed = finite(current) && finite(pivot) && (
    current >= pivot * 1.005 ||
    (current >= pivot * 0.998 && finite(breakoutTarget) && breakoutTarget > current * 1.003 && finite(breakoutRr) && breakoutRr >= 1)
  );
  const nearSupport = finite(current) && finite(support) && current > 0
    ? ((current - support) / current) * 100 >= 0 && ((current - support) / current) * 100 <= 3
    : false;
  const nearResistance = finite(current) && finite(resistance) && resistance > 0
    ? ((resistance - current) / resistance) * 100 >= 0 && ((resistance - current) / resistance) * 100 <= 2.5
    : false;
  const rangePosition = finite(current) && finite(support) && finite(resistance) && resistance > support
    ? Math.max(0, Math.min(1, (current - support) / (resistance - support)))
    : null;
  const supportGap = finite(current) && finite(support) && current > 0
    ? Math.max(0, ((current - support) / current) * 100)
    : null;
  const isExtendedMove = Boolean(
    nearResistance &&
      finite(currentRr) &&
      currentRr < 1 &&
      supportGap !== null &&
      supportGap >= 8,
  );
  let priceLocation: PriceLocation = "unknown";

  if (breakoutRetestConfirmed) {
    priceLocation = "breakout_area";
  } else if (isExtendedMove) {
    priceLocation = "overextended";
  } else if (nearSupport) {
    priceLocation = "near_support";
  } else if (rangePosition !== null) {
    if (rangePosition <= 0.35) priceLocation = "lower_range";
    else if (rangePosition < 0.70) priceLocation = "middle_range";
    else if (nearResistance) priceLocation = "near_resistance";
    else priceLocation = "upper_range";
  } else if (nearResistance) {
    priceLocation = "near_resistance";
  }

  return {
    priceLocation,
    rangePosition,
    isExtendedMove,
    nearSupport,
    nearResistance,
    breakoutRetestConfirmed,
  };
}

type DerivedChartRegime = {
  type: ChartRegime;
  regime: ChartRegime;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};

function chartRegimeResult(
  type: ChartRegime,
  confidence: "low" | "medium" | "high",
  reasons: string[],
): DerivedChartRegime {
  const safeReasons = reasons
    .map((item) => safeDisplayText(item, "분석 정보 부족"))
    .filter((item) => item !== "분석 정보 부족")
    .slice(0, 3);
  return {
    type,
    regime: type,
    confidence,
    reasons: safeReasons.length ? safeReasons : ["차트 상태를 분류할 정보가 제한적입니다."],
  };
}

function deriveChartRegime(report: TradingReport): DerivedChartRegime {
  const marketContext = deriveMarketContext(report);
  const score = normalizeScoreSummary(report.scoreSummary);
  const current = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivot = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const shortStop = priceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const pullbackEntry = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const pullbackStop = priceFromText(report.tradePlan.stopLossByEntry?.pullbackEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone);
  const pullbackTarget = priceFromText(report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.pullbackTargets?.[0]);
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const pullbackRr = report.tradePlan.riskRewardByEntry?.pullback?.value;
  const breakoutRr = report.tradePlan.riskRewardByEntry?.breakout?.value;
  const supportBroken = finite(current) && finite(shortStop) && current < shortStop * 0.995;
  const pullbackPlanValid = finite(pullbackEntry) && finite(pullbackStop) && finite(pullbackTarget) && pullbackStop < pullbackEntry && pullbackTarget > pullbackEntry;
  const nearestSupport = finite(pullbackEntry) ? pullbackEntry : shortStop;
  const supportGapPercent = finite(current) && finite(nearestSupport) && current > 0
    ? ((current - nearestSupport) / current) * 100
    : null;
  const pullbackFarBelow = supportGapPercent !== null && supportGapPercent >= 8;
  const belowPivot = finite(current) && finite(pivot) && current < pivot * 0.985;
  const failedReclaim = finite(current) && finite(pivot) && current < pivot * 1.005 && !marketContext.breakoutRetestConfirmed;
  const indicatorRows = [
    ...(report.indicatorAnalysis?.confirmed ?? []),
    ...(report.indicatorAnalysis?.unavailable ?? []),
  ];
  const indicatorText = (item: (typeof indicatorRows)[number]) => [
    "signal" in item ? item.signal : "",
    "explanation" in item ? item.explanation : "",
    "reason" in item ? item.reason : "",
  ].join(" ");
  const indicatorFullText = indicatorRows.map(indicatorText).join(" ");
  const bullishIndicator = indicatorRows.some((item) => /bullish|상승|우호|위에|증가/i.test(indicatorText(item)));
  const weakIndicator = !bullishIndicator || indicatorRows.some((item) => /bearish|neutral|하락|약세|중립|제한|확인되지|부족/i.test(indicatorText(item)));
  const trendText = [
    report.scoreSummary?.explanation,
    report.finalSummary?.reason,
    ...(report.evidence?.positive ?? []),
    ...(report.evidence?.negative ?? []),
    ...(report.evidence?.riskFactors ?? []),
  ].join(" ");
  const downtrendText = /하락|급락|약세|고점.*하향|저점.*하향|lower low|lower high|downtrend|decline|구름.*아래|매물/i.test(trendText);
  const uptrendText = /상승|우상향|상승추세|상승 추세|고점.*상향|저점.*상향|higher high|higher low|uptrend|bullish|rising/i.test(trendText);
  const strongUptrendText = /강한 상승|뚜렷한 상승|상승추세|상승 추세|고점.*상향|저점.*상향|higher high|higher low|정배열|rising support|cloud support|구름.*지지/i.test(trendText);
  const rangeText = /박스|횡보|range|sideways|레인지|box|상단.*하단|하단.*상단/i.test(trendText);
  const reboundAfterDeclineText = /(하락|급락|약세|lower high|lower low|downtrend|decline|overhead|매물|구름.*아래).*(반등|회복|rebound|recover)|((반등|회복|rebound|recover).*(하락|급락|약세|downtrend|decline|매물))/i.test(trendText);
  const weakSupportBounce = (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range") && (!finite(pullbackRr) || pullbackRr < 1.5);
  const sourcePriceLocation = report.marketContext?.priceLocation;
  const hintedUpperOrResistance =
    Boolean(report.marketContext?.nearResistance) ||
    sourcePriceLocation === "upper_range" ||
    sourcePriceLocation === "near_resistance" ||
    sourcePriceLocation === "overextended";
  const upperOrResistance = hintedUpperOrResistance || marketContext.nearResistance || marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "near_resistance" || marketContext.priceLocation === "overextended";
  const poorCurrentRr = finite(currentRr) && currentRr < 1;
  const surgeText = /급등|과열|윗꼬리|거래량 증가|volume spike|spike|surge|exhaust/i.test(trendText);
  const overboughtText =
    indicatorRows.some((item) => {
      const name = "name" in item ? item.name : "";
      const text = `${name} ${indicatorText(item)}`;
      if (/RSI/i.test(text)) return /과매수|과열|overbought|overheating|(?:7[0-9]|8[0-9]|9[0-9]|100)/i.test(text);
      if (/볼린저|band/i.test(text)) return /상단 밴드 근접|upper band|과열|overbought/i.test(text);
      return /과매수|overbought/i.test(text);
    }) ||
    /과열권/i.test(trendText);
  const breakoutSpikeText = /돌파|breakout|급등|spike|surge|gap|갭|강한 상승|거래량 증가/i.test(`${trendText} ${indicatorFullText}`);
  const targetOrResistanceClose = upperOrResistance && (poorCurrentRr || failedReclaim || (finite(currentRr) && currentRr < 1.2));
  const uptrendEvidence = strongUptrendText || (uptrendText && bullishIndicator && !downtrendText);
  const downtrendReboundEvidence = reboundAfterDeclineText || (!marketContext.breakoutRetestConfirmed && failedReclaim && (upperOrResistance || belowPivot) && downtrendText);
  const rangeStructureLikely =
    rangeText ||
    (marketContext.rangePosition != null &&
      !uptrendEvidence &&
      !downtrendReboundEvidence &&
      !downtrendText &&
      score.riskScore < 65 &&
      score.holdScore >= 45);
  const overextendedScore = [
    marketContext.isExtendedMove,
    upperOrResistance,
    poorCurrentRr,
    pullbackFarBelow,
    surgeText,
    overboughtText,
    score.riskScore >= 60,
  ].filter(Boolean).length;
  const overextendedConfirmed = surgeText && (marketContext.isExtendedMove || pullbackFarBelow || score.riskScore >= 60 || marketContext.priceLocation === "overextended");
  const existingRegimeHint = report.marketContext?.chartRegime;
  const canPromoteToOverheated =
    !existingRegimeHint ||
    existingRegimeHint === "unknown" ||
    existingRegimeHint === "overheated_breakout";
  const overheatedBreakoutEvidence =
    canPromoteToOverheated &&
    overboughtText &&
    breakoutSpikeText &&
    upperOrResistance &&
    !supportBroken &&
    !marketContext.breakoutRetestConfirmed &&
    (poorCurrentRr || failedReclaim || pullbackFarBelow || score.riskScore >= 50);
  const downtrendScore = [
    supportBroken,
    downtrendText,
    belowPivot,
    failedReclaim,
    score.riskScore >= 65,
    score.holdScore < 60,
    weakIndicator,
    weakSupportBounce,
    !pullbackPlanValid,
  ].filter(Boolean).length;
  const clearDowntrendEvidence =
    supportBroken ||
    downtrendText ||
    (score.riskScore >= 70 && belowPivot && failedReclaim && weakSupportBounce && !upperOrResistance);
  const reboundShouldTakePriority =
    downtrendReboundEvidence &&
    upperOrResistance &&
    score.riskScore < 70;
  const reasons: string[] = [];

  if (supportBroken) {
    reasons.push("주요 지지선 이탈이 우선 확인됩니다.");
    return chartRegimeResult("support_breakdown", score.riskScore >= 65 ? "high" : "medium", reasons);
  }
  if (!marketContext.breakoutRetestConfirmed && clearDowntrendEvidence && downtrendScore >= 4 && !reboundShouldTakePriority) {
    if (downtrendText || belowPivot || failedReclaim) reasons.push("피벗 회복 실패 또는 하락 흐름 근거가 남아 있습니다.");
    if (weakIndicator) reasons.push("보조지표가 반전을 강하게 확인하지 못합니다.");
    if (weakSupportBounce) reasons.push("지지권 반등 가능성은 있으나 추세 전환 확인은 부족합니다.");
    return chartRegimeResult("downtrend", supportBroken || downtrendScore >= 6 ? "high" : "medium", reasons);
  }
  if (!marketContext.breakoutRetestConfirmed && downtrendReboundEvidence) {
    reasons.push("하락 이후 반등 구간으로, 주요 저항 회복 확인이 필요합니다.");
    if (upperOrResistance || failedReclaim) reasons.push("현재가는 저항권 또는 전환 가격 테스트 성격이 강합니다.");
    return chartRegimeResult("downtrend_rebound", upperOrResistance ? "medium" : "low", reasons);
  }
  if (overheatedBreakoutEvidence) {
    reasons.push("RSI 과매수 또는 단기 급등 돌파 이후 저항권에 가까워 추격매수 부담이 큽니다.");
    if (poorCurrentRr || failedReclaim) reasons.push("돌파 후 재지지 확인 전까지는 현재가 진입 손익비가 낮습니다.");
    if (pullbackFarBelow) reasons.push("가까운 지지선과 이격이 있어 눌림 또는 재지지 확인이 우선입니다.");
    return chartRegimeResult("overheated_breakout", overextendedScore >= 5 ? "high" : "medium", reasons);
  }
  if (overextendedConfirmed && upperOrResistance && poorCurrentRr) {
    reasons.push("단기 급등 후 저항 또는 목표 구간에 가까워 현재가 손익비가 낮습니다.");
    if (pullbackFarBelow) reasons.push("가까운 지지선과의 이격이 커 눌림 확인 전 추격매수 부담이 큽니다.");
    if (surgeText) reasons.push("거래량 증가 또는 과열/윗꼬리 가능성이 보조 근거로 확인됩니다.");
    return chartRegimeResult("overextended_surge", overextendedScore >= 5 ? "high" : "medium", reasons);
  }
  if (marketContext.breakoutRetestConfirmed) {
    reasons.push("핵심 전환 가격 위에서 버티는 돌파 후 재지지 구간입니다.");
    return chartRegimeResult("breakout_retest_confirmed", finite(breakoutRr) && breakoutRr >= 1.5 && bullishIndicator ? "high" : "medium", reasons);
  }
  if (!supportBroken && uptrendEvidence && upperOrResistance && !overboughtText && !downtrendReboundEvidence) {
    reasons.push("상승 흐름 이후 고점권에서 지지 유지와 돌파 후 재지지 확인이 필요한 조정 구간입니다.");
    if (pullbackPlanValid) reasons.push("눌림목 지지와 손절 기준이 있어 박스권 하단보다 상승추세 조정으로 봅니다.");
    return chartRegimeResult("uptrend_consolidation", strongUptrendText ? "medium" : "low", reasons);
  }
  if (!marketContext.breakoutRetestConfirmed && targetOrResistanceClose) {
    reasons.push("주요 저항 또는 목표 구간을 테스트하고 있어 돌파 후 재지지 확인이 우선입니다.");
    return chartRegimeResult("resistance_test", poorCurrentRr ? "medium" : "low", reasons);
  }
  if (marketContext.nearResistance && !marketContext.breakoutRetestConfirmed) {
    reasons.push("저항 또는 전환 가격 근처지만 돌파 후 재지지가 아직 확인되지 않았습니다.");
    return chartRegimeResult("breakout_wait", "medium", reasons);
  }
  if (!supportBroken && uptrendEvidence && (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range" || pullbackPlanValid)) {
    reasons.push("상승 흐름 속 지지 구간으로 눌림 반응 확인이 우선입니다.");
    if (pullbackPlanValid) reasons.push("눌림목 진입 가격, 손절, 목표가가 비교적 분리되어 있습니다.");
    return chartRegimeResult("uptrend_pullback", strongUptrendText ? "high" : "medium", reasons);
  }
  if (!supportBroken && uptrendEvidence && marketContext.priceLocation !== "overextended") {
    reasons.push("상승 흐름 이후 조정 구간으로 지지 유지와 재상승 확인이 필요합니다.");
    return chartRegimeResult("uptrend_consolidation", "medium", reasons);
  }
  if (marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "near_resistance") {
    reasons.push("박스권 상단 또는 저항권에 가까운 구간입니다.");
    return chartRegimeResult(rangeStructureLikely ? "range_upper_resistance" : "resistance_test", "medium", reasons);
  }
  if ((marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range") && rangeStructureLikely) {
    reasons.push("주요 지지 또는 박스권 하단에 가까워 지지 반응 확인이 우선입니다.");
    return chartRegimeResult("range_lower_support", pullbackPlanValid ? "medium" : "low", reasons);
  }
  if (pullbackPlanValid && finite(pullbackRr) && pullbackRr >= 1.2 && score.riskScore < 70 && uptrendEvidence) {
    reasons.push("눌림목 진입 가격, 손절, 목표가가 비교적 분리되어 있습니다.");
    return chartRegimeResult("healthy_pullback", "medium", reasons);
  }
  if (marketContext.priceLocation === "middle_range" || (finite(current) && finite(pivot) && !finite(currentRr))) {
    reasons.push("지지와 저항 사이에서 방향 확인이 필요한 구간입니다.");
    return chartRegimeResult("sideways", "low", reasons);
  }
  reasons.push("차트 상태를 분류할 가격 정보가 제한적입니다.");
  return chartRegimeResult("unknown", "low", reasons);
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

function deriveStopLossByEntry(report: TradingReport) {
  const currentZone = report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone;
  const pullbackZone = report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone;
  const pivotZone = report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone;
  const supportZones = sortPriceZones([
    ...(report.keyLevels.supports ?? []).map((item) => item.priceZone),
    ...(report.analysisMeta?.mainSupports ?? []),
    report.priceRoles?.stopLoss?.shortTerm,
    report.priceRoles?.stopLoss?.conservative,
    report.priceRoles?.stopLoss?.invalidation,
    report.tradePlan.stopLoss.shortTerm?.priceZone,
    report.tradePlan.stopLoss.conservative?.priceZone,
  ]);
  const shortStop = nextLowerPriceZone(currentZone, supportZones)
    ?? safeDisplayText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "손절 기준 확인 필요");
  const pullbackStop = nextLowerPriceZone(pullbackZone, supportZones);
  const breakoutStop = nextLowerPriceZone(pivotZone, supportZones)
    ?? safeDisplayText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "손절 기준 확인 필요");
  const mediumTerm = safeDisplayText(
    report.tradePlan.invalidation.midTerm?.priceZone ?? report.priceRoles?.stopLoss?.invalidation ?? report.tradePlan.invalidation.condition,
    "확인 필요",
  );
  const currentEntryScore = report.scoreSummary?.entryScores?.currentEntry?.score;
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const currentEntryPoor = (finite(currentEntryScore) && currentEntryScore < 50) || !finite(currentRr) || currentRr < 1;
  const existingStops = report.tradePlan.stopLossByEntry;

  const currentEntry = existingStops?.currentEntry ?? (
    currentEntryPoor
      ? {
          priceZone: "손절 기준 확인 필요",
          condition: "현재가 진입 손익비 확인 필요",
          explanation: "현재가 진입이 불리한 구간이면 먼저 진입 가능 여부와 짧은 손절 기준을 다시 확인해야 합니다.",
        }
      : {
          priceZone: shortStop,
          condition: `${shortStop} 이탈`,
          explanation: "현재가 진입을 검토한다면 가까운 단기 지지 이탈을 우선 방어 기준으로 봅니다.",
        }
  );

  const existingPullbackStop = existingStops?.pullbackEntry?.priceZone;
  const existingPullbackStopIsValid =
    Boolean(existingStops?.pullbackEntry) &&
    !samePriceZone(existingPullbackStop, pullbackZone) &&
    finite(priceFromText(existingPullbackStop)) &&
    finite(priceFromText(pullbackZone)) &&
    priceFromText(existingPullbackStop)! < priceFromText(pullbackZone)! * 0.995;
  const pullbackEntry = existingPullbackStopIsValid
    ? existingStops!.pullbackEntry!
    : (
      pullbackStop && !samePriceZone(pullbackStop, pullbackZone)
        ? {
            priceZone: pullbackStop,
            condition: `${pullbackStop} 이탈`,
            explanation: "눌림목 진입은 진입 지지선과 같은 가격이 아니라 한 단계 아래 지지 이탈을 실패 기준으로 보는 것이 자연스럽습니다.",
          }
        : {
            priceZone: "확인 필요",
            condition: "눌림목 진입 기준 하단 지지 추가 확인 필요",
            explanation: "눌림목 진입가와 손절가가 같아지면 손익비가 왜곡되므로 별도 하단 지지 확인이 필요합니다.",
          }
  );

  const breakoutEntry = {
    ...(existingStops?.breakoutEntry ?? {}),
    priceZone: pivotZone && pivotZone !== "미확인" ? pivotZone : (existingStops?.breakoutEntry?.priceZone ?? breakoutStop),
    condition: pivotZone && pivotZone !== "미확인"
      ? `${pivotZone} 재이탈${breakoutStop && !samePriceZone(breakoutStop, pivotZone) ? ` 또는 ${breakoutStop} 이탈` : ""}`
      : `${breakoutStop} 이탈`,
    explanation: "돌파 진입은 핵심 전환 가격 재이탈 또는 그 아래 지지 이탈을 돌파 실패 기준으로 봅니다.",
  };

  const mediumTermInvalidation = existingStops?.mediumTermInvalidation ?? {
    priceZone: mediumTerm,
    condition: mediumTerm === "확인 필요" ? "중기 무효화 가격 확인 필요" : `${mediumTerm} 이탈`,
    explanation: "중기 관점 무효화 가격은 단기 손익비 계산에 사용하지 않고 큰 관점 재검토 기준으로만 봅니다.",
  };

  return {
    currentEntry,
    pullbackEntry,
    breakoutEntry,
    mediumTermInvalidation,
  };
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
  if (score < 90) return "강한 보유 후보";
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
    if (signal === "bullish") return "RSI는 반등 가능성을 참고할 수 있지만 가격 지지 확인이 함께 필요합니다.";
    if (signal === "bearish") return "RSI가 과열 부담을 시사하면 현재 구간의 신규 진입 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아 단독으로 진입 타이밍을 판단하기는 어렵습니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아 돌파 신뢰도를 강하게 보강하기는 어렵습니다.";
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
    if (signal === "bullish") return "볼린저밴드 확장이 확인되면 돌파 흐름을 보조하는 근거가 될 수 있습니다.";
    if (signal === "bearish") return "볼린저밴드 상단 부담 또는 하단 이탈 가능성이 있으면 추격 진입은 주의가 필요합니다.";
    return "볼린저밴드만으로는 방향성보다 변동성 확인에 가깝습니다.";
  }
  return "해당 지표는 단독 판단보다 핵심 가격대와 함께 확인해야 합니다.";
}

function unavailableIndicatorReason(key: string) {
  const reasons: Record<string, string> = {
    rsi: "RSI가 이미지에서 명확히 확인되지 않아 과매수 여부 판단은 제한적입니다.",
    macd: "MACD가 이미지에서 명확히 확인되지 않아 모멘텀 판단은 제한적입니다.",
    volume: "거래량이 이미지에서 명확히 확인되지 않아 돌파 신뢰도 판단은 제한적입니다.",
    movingAverages: "이동평균선이 이미지에서 명확히 확인되지 않아 추세 정렬 판단은 제한적입니다.",
    ichimoku: "일목균형표 구름대가 이미지에서 명확히 확인되지 않아 구름대 기준 판단은 제한적입니다.",
    bollingerBands: "볼린저밴드가 이미지에서 명확히 확인되지 않아 변동성 판단은 제한적입니다.",
  };
  return reasons[key] ?? "이미지에서 명확히 확인되지 않았습니다.";
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
    if (signal === "bullish") return "RSI는 반등 가능성을 참고할 수 있지만 가격 지지 확인이 함께 필요합니다.";
    if (signal === "bearish") return "RSI가 과열 부담을 시사하면 현재 구간의 신규 진입 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아 단독으로 진입 타이밍을 판단하기는 어렵습니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아 돌파 신뢰도를 강하게 보강하기는 어렵습니다.";
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
  if (key === "bollingerBands") return "볼린저밴드는 이미지에서 명확히 확인되는 범위 안에서만 보조 판단으로 참고합니다.";
  return "확인 가능한 범위에서만 보조 판단으로 참고합니다.";
}

function stripUnconfirmedTimeframeClean(text: string) {
  return safeDisplayText(text, "이미지 기준으로 확인 가능한 범위에서만 참고합니다.")
    .replace(/주봉상|일봉상|4시간봉상|시간봉상/g, "이미지 기준으로")
    .replace(/차트상/g, "표시된 차트 기준으로");
}

function normalizeIndicatorAnalysis(analysis: TradingReport["indicatorAnalysis"]): TradingReport["indicatorAnalysis"] {
  const confirmed = (analysis?.confirmed ?? []).map((item) => {
    const key = indicatorKeyFromNameClean(item.name);
    const signal = item.signal === "bullish" || item.signal === "bearish" || item.signal === "neutral"
      ? item.signal
      : indicatorSignal(item.signal);
    return {
      ...item,
      explanation: stripUnconfirmedTimeframeClean(safeIndicatorExplanation(key, item.explanation, signal)),
    };
  });
  const unavailable = (analysis?.unavailable ?? []).map((item) => {
    const key = indicatorKeyFromNameClean(item.name);
    return {
      ...item,
      reason: stripUnconfirmedTimeframeClean(unavailableIndicatorReason(key)),
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
  if (text.includes("거래량") || text.includes("volume")) return "volume";
  if (text.includes("이동") || text.includes("moving") || text.includes("ma")) return "movingAverages";
  if (text.includes("일목") || text.includes("구름") || text.includes("ichimoku")) return "ichimoku";
  if (text.includes("볼린저") || text.includes("bollinger")) return "bollingerBands";
  return "unknown";
}

function indicatorExplanationClean(key: string, rawStatus?: string | null, signal = indicatorSignal(rawStatus)) {
  const text = (rawStatus ?? "").toLowerCase();
  if (key === "rsi") {
    if (signal === "bullish") return "RSI는 매수세 회복 여부를 보조적으로 확인하는 지표입니다.";
    if (signal === "bearish") return "RSI가 과열 구간에 가까우면 현재가 추격매수 부담이 커질 수 있습니다.";
    return "RSI상 과매수 또는 과매도 신호가 뚜렷하지 않아 단독으로 진입 타이밍을 판단하기는 어렵습니다.";
  }
  if (key === "macd") {
    if (signal === "bullish") return "MACD가 상승 전환하면 돌파 신뢰도를 높이는 보조 근거가 됩니다.";
    if (signal === "bearish") return "MACD가 약세로 기울면 돌파 실패 또는 단기 조정 가능성을 함께 봐야 합니다.";
    return "MACD상 뚜렷한 추세 전환 신호는 확인되지 않아 돌파 신뢰도를 강하게 보강하기는 어렵습니다.";
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
    return "일목균형표는 이미지 기준으로 일부만 확인되므로 지지/저항 판단은 보조적으로 봐야 합니다.";
  }
  if (key === "bollingerBands") return "볼린저밴드는 이미지에서 명확히 확인되는 범위 안에서만 보조 판단으로 참고합니다.";
  return "확인 가능한 범위에서만 보조 판단으로 참고합니다.";
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
      reason: stripUnconfirmedTimeframeClean(unavailableIndicatorReason(key)),
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
  const chartTimeframe = normalizeTimeframeText(existing?.chartTimeframe || raw.aiAnalysis?.timeframeEstimate);
  const supports = existing?.mainSupports?.length ? existing.mainSupports : levels.supports.map((value) => formatZone(value));
  const resistances = existing?.mainResistances?.length ? existing.mainResistances : levels.resistances.map((value) => formatZone(value));
  const priceUnit = inferPriceUnit(symbol, levels.current, existing?.priceUnit, existing?.priceUnitConfidence);

  return {
    symbol,
    chartTimeframe,
    currentPriceZone: existing?.currentPriceZone || formatEstimatedZone(levels.current),
    keyPivotPrice: existing?.keyPivotPrice || formatZone(levels.pivot),
    mainSupports: supports,
    mainResistances: resistances,
    analyzedAt: existing?.analyzedAt || nowKstText(),
    dataBasis: existing?.dataBasis || "image_only",
    priceUnit: priceUnit.priceUnit,
    priceUnitConfidence: priceUnit.priceUnitConfidence,
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
      meaning: "이미지의 마지막 가격 기준으로 추정한 현재가입니다.",
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
      "이미지 기반 분석으로 신규 진입, 보유 관망, 위험도를 분리해 보수적으로 해석합니다.",
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

const tradingActionStateLabels: Record<TradingActionState, string> = {
  STRONG_BUY: "강한 매수 후보",
  CURRENT_PARTIAL_ENTRY: "현재가 분할 진입 가능",
  CURRENT_STARTER_POSITION: "현재가 소액 진입 가능",
  MOMENTUM_CONTINUATION_ENTRY: "모멘텀 추세추종 진입",
  PRE_BREAKOUT_AGGRESSIVE_ENTRY: "돌파 전 소액 선진입",
  PULLBACK_ENTRY: "눌림목 진입 후보",
  BREAKOUT_WAIT: "돌파 확인 대기",
  HOLD_ONLY: "보유자 관망",
  HIGH_RISK: "고위험 주의",
  AVOID: "진입 회피",
};

const tradingActionStateRanges: Record<TradingActionState, {
  total: [number, number];
  current: [number, number];
  pullback: [number, number];
  breakout: [number, number];
  risk: [number, number];
}> = {
  STRONG_BUY: { total: [75, 90], current: [65, 85], pullback: [60, 80], breakout: [70, 90], risk: [20, 40] },
  CURRENT_PARTIAL_ENTRY: { total: [60, 75], current: [55, 70], pullback: [50, 75], breakout: [45, 70], risk: [30, 55] },
  CURRENT_STARTER_POSITION: { total: [50, 68], current: [45, 60], pullback: [45, 72], breakout: [40, 65], risk: [35, 60] },
  MOMENTUM_CONTINUATION_ENTRY: { total: [65, 80], current: [60, 75], pullback: [45, 70], breakout: [55, 75], risk: [25, 50] },
  PRE_BREAKOUT_AGGRESSIVE_ENTRY: { total: [55, 70], current: [45, 62], pullback: [40, 65], breakout: [55, 75], risk: [40, 60] },
  PULLBACK_ENTRY: { total: [55, 70], current: [35, 55], pullback: [65, 85], breakout: [45, 65], risk: [35, 55] },
  BREAKOUT_WAIT: { total: [40, 60], current: [20, 45], pullback: [45, 70], breakout: [60, 80], risk: [45, 65] },
  HOLD_ONLY: { total: [35, 55], current: [10, 35], pullback: [35, 55], breakout: [35, 60], risk: [45, 65] },
  HIGH_RISK: { total: [20, 40], current: [0, 25], pullback: [10, 35], breakout: [10, 35], risk: [65, 85] },
  AVOID: { total: [0, 25], current: [0, 15], pullback: [0, 20], breakout: [0, 20], risk: [80, 100] },
};

function knownTradingActionState(value: unknown): value is TradingActionState {
  return typeof value === "string" && value in tradingActionStateLabels;
}

const controlledAggressiveActionStates = new Set<TradingActionState>([
  "CURRENT_PARTIAL_ENTRY",
  "CURRENT_STARTER_POSITION",
  "MOMENTUM_CONTINUATION_ENTRY",
  "PRE_BREAKOUT_AGGRESSIVE_ENTRY",
]);

function isControlledAggressiveActionState(value: unknown): value is TradingActionState {
  return knownTradingActionState(value) && controlledAggressiveActionStates.has(value);
}

function clampToRange(value: unknown, range: [number, number]) {
  const base = clamp(value, Math.round((range[0] + range[1]) / 2));
  return Math.max(range[0], Math.min(range[1], base));
}

function entryScoreLabel(score: number) {
  if (score < 20) return "부적합";
  if (score < 40) return "불리";
  if (score < 55) return "확인 필요";
  if (score < 70) return "조건부";
  if (score < 85) return "후보";
  return "유리";
}

function entryScoreWithMode(mode: EntryMode, score: number) {
  return `${entryModeName[mode]} ${entryScoreLabel(score)}`;
}

function currentEntryConditionalLabel(report: TradingReport, score: number) {
  const marketContext = deriveMarketContext(report);
  const rr = report.tradePlan.riskRewardByEntry?.current?.value ?? null;
  const riskScore = report.scoreSummary?.riskScore ?? 50;
  const priceUnitLow = report.analysisMeta?.priceUnitConfidence === "low";
  if (score < 20) return "현재가 진입 부적합";
  if (marketContext.priceLocation === "near_resistance" || marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "overextended") {
    if (score < 40) return "추격 주의";
    return "저항 근접";
  }
  if (score < 40 && (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range")) return "지지 확인 필요";
  if (score < 40) return "현재가 진입 불리";
  if (score < 55 && (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range")) return "지지 확인 필요";
  if (score < 55) return "현재가 진입 확인 필요";
  if (score < 70 && (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range")) return "소액 조건부";
  if (score < 70) return "현재가 조건부";
  if (marketContext.breakoutRetestConfirmed) return "돌파 후 현재가 진입 후보";
  if (marketContext.priceLocation === "near_support") return "지지권 근처 소액 조건부";
  if (score >= 70 && (riskScore >= 60 || !finite(rr) || rr < 1.5 || priceUnitLow)) {
    return "현재가 조건부 진입 / 손절 짧게";
  }
  if (score >= 65) return "현재가 진입 후보";
  return "현재가 진입 확인 필요";
}

function currentEntryConditionalExplanation(report: TradingReport, score: number, fallback: string) {
  const marketContext = deriveMarketContext(report);
  if (score >= 70 && marketContext.priceLocation === "near_support") {
    return "현재가는 주요 지지권에 가까워 소액 조건부 진입은 가능하지만, 지지선 이탈 시 빠른 손절이 필요합니다.";
  }
  if (score >= 70 && marketContext.breakoutRetestConfirmed) {
    return "돌파 후 재지지가 확인된 경우에만 현재가 진입 후보로 볼 수 있습니다.";
  }
  if (score >= 70 && report.analysisMeta?.dataBasis !== "image_with_ohlcv") {
    return "이미지 기반 추정이므로 실제 체결가와 손절 기준을 재확인해야 합니다.";
  }
  return fallback;
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

function refreshEntryScoreLabel(entry: EntryModeScore, mode: EntryMode) {
  entry.score = clamp(entry.score, 0);
  entry.label = entryScoreWithMode(mode, entry.score);
}

function refreshCurrentEntryScoreLabel(report: TradingReport, entry: EntryModeScore) {
  entry.score = clamp(entry.score, 0);
  entry.label = currentEntryConditionalLabel(report, entry.score);
  entry.explanation = currentEntryConditionalExplanation(report, entry.score, entry.explanation);
}

function applyEntryScoreConsistencyCaps(
  report: TradingReport,
  score: ScoreSummary,
  entries: {
    currentEntry: EntryModeScore;
    pullbackEntry: EntryModeScore;
    breakoutEntry: EntryModeScore;
  },
) {
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const marketContext = deriveMarketContext(report);
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const pullbackPrice = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const pullbackStop = priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone ?? report.priceRoles?.stopLoss?.shortTerm);
  const currentRr = rr.current?.value ?? null;
  const pullbackRr = rr.pullback?.value ?? null;
  const breakoutRr = rr.breakout?.value ?? null;
  const breakoutTargetPrice = priceFromText(report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? report.tradePlan.targets.firstTarget?.priceZone ?? report.priceRoles?.targets?.breakoutTargets?.[0]);
  const breakoutConfirmed = Boolean(marketContext.breakoutRetestConfirmed) || (
    finite(currentPrice) &&
    finite(pivotPrice) &&
    (
      currentPrice >= pivotPrice * 1.005 ||
      (currentPrice >= pivotPrice * 0.998 && finite(breakoutTargetPrice) && breakoutTargetPrice > currentPrice * 1.003 && finite(breakoutRr) && breakoutRr >= 1)
    )
  );
  const nearPivotWithoutBreakout = finite(currentPrice) && finite(pivotPrice) && Math.abs(currentPrice - pivotPrice) / Math.abs(pivotPrice) * 100 <= 2.5 && !breakoutConfirmed;
  const currentMayExceed70 = (
    (marketContext.priceLocation === "near_support" && riskRewardAllowsEntry(rr.current, 1.2)) ||
    breakoutConfirmed ||
    (riskRewardAllowsEntry(rr.current, 1.5) && score.riskScore < 50)
  );
  const supportClear = finite(pullbackPrice);
  const pullbackStopClear = finite(pullbackPrice) && finite(pullbackStop) && pullbackStop < pullbackPrice;
  const pullbackTooFar = finite(currentPrice) && finite(pullbackPrice) && currentPrice > 0 && ((currentPrice - pullbackPrice) / currentPrice) * 100 > 15;
  const volumeConfirmed = hasVolumeConfirmation(report);
  const supportBroken = finite(currentPrice) && finite(pullbackStop) && currentPrice < pullbackStop * 0.995;
  const downtrendLike =
    report.marketContext?.chartRegime === "downtrend" ||
    (!breakoutConfirmed &&
      (
        supportBroken ||
        (finite(currentPrice) && finite(pivotPrice) && currentPrice < pivotPrice * 0.985 && score.riskScore >= 65) ||
        (score.riskScore >= 70 && score.holdScore < 65)
      ));
  const overextendedLike =
    report.marketContext?.chartRegime === "overextended_surge" ||
    report.marketContext?.chartRegime === "overheated_breakout" ||
    marketContext.priceLocation === "overextended" ||
    (
      (marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "near_resistance") &&
      finite(currentRr) &&
      currentRr < 1 &&
      score.riskScore >= 55
    );

  if (marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "near_resistance") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 60);
  }
  if (nearPivotWithoutBreakout) entries.currentEntry.score = Math.min(entries.currentEntry.score, 65);
  if (marketContext.priceLocation === "overextended") entries.currentEntry.score = Math.min(entries.currentEntry.score, 45);
  if (!finite(currentRr)) entries.currentEntry.score = Math.min(entries.currentEntry.score, 40);
  else if (currentRr < 1) entries.currentEntry.score = Math.min(entries.currentEntry.score, 50);
  if ((marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range") && (!finite(currentRr) || currentRr >= 1)) {
    const supportFloor = finite(currentRr) && currentRr >= 1.2 ? 50 : 45;
    entries.currentEntry.score = Math.max(entries.currentEntry.score, supportFloor);
    entries.currentEntry.explanation = "현재가가 주요 지지권에 가까워 지지 이탈 여부를 확인하며 소액 조건부로만 검토할 수 있습니다.";
  }
  if (!currentMayExceed70) entries.currentEntry.score = Math.min(entries.currentEntry.score, 70);
  if (entries.currentEntry.score < 50) {
    entries.currentEntry.explanation = "현재가 기준 손익비 또는 가격 위치가 불리해 즉시 진입보다는 확인이 필요합니다.";
  }

  if (!supportClear || !pullbackStopClear) entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 65);
  if (pullbackTooFar) entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 60);
  if (score.riskScore >= 70) entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 65);
  if (finite(pullbackRr) && pullbackRr < 1) entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 50);
  if (entries.pullbackEntry.score >= 65 && supportClear && pullbackStopClear) {
    entries.pullbackEntry.explanation = "주요 지지와 하단 손절 기준이 비교적 명확해 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다.";
  }

  if (!breakoutConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
  if (finite(breakoutRr) && breakoutRr < 1) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 50);
  if (!volumeConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 65);
  if (breakoutConfirmed && finite(breakoutRr) && breakoutRr >= 1) {
    const breakoutFloor = breakoutRr >= 1.5 ? 75 : 65;
    entries.breakoutEntry.score = Math.max(entries.breakoutEntry.score, breakoutFloor);
    if (!volumeConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 80);
    entries.breakoutEntry.explanation = "핵심 전환 가격 위에서 재지지가 유지되면 돌파 진입 후보로 볼 수 있습니다.";
  }
  if (breakoutConfirmed && (!finite(breakoutTargetPrice) || (finite(currentPrice) && finite(breakoutTargetPrice) && breakoutTargetPrice <= currentPrice * 1.003))) {
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
    entries.breakoutEntry.explanation = "돌파는 확인되더라도 다음 목표가가 가까워 손익비 확인이 필요합니다.";
  }
  if (!breakoutConfirmed && finite(pivotPrice) && finite(breakoutRr) && breakoutRr >= 1) {
    entries.breakoutEntry.score = Math.max(entries.breakoutEntry.score, 40);
    entries.breakoutEntry.label = "돌파 확인 필요";
  }
  if (!(breakoutConfirmed && riskRewardAllowsEntry(rr.breakout, 1.5))) {
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 70);
  }
  if (entries.breakoutEntry.score < 65) {
    entries.breakoutEntry.explanation = "돌파 후 재지지와 거래량 또는 손익비 확인이 부족해 돌파 진입은 확인이 필요합니다.";
  }
  if (downtrendLike) {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, supportBroken ? 30 : 45);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, supportBroken ? 35 : 55);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutConfirmed ? 60 : 50);
    entries.currentEntry.explanation = supportBroken
      ? "주요 지지선 이탈 위험이 있어 현재가 진입보다 손절 기준 확인이 우선입니다."
      : "하락 추세에서는 지지권 반등만으로 현재가 진입을 강하게 보기 어렵습니다.";
    entries.pullbackEntry.explanation = "하락 추세에서는 지지권 반등 가능성은 참고하되, 주요 저항 회복 또는 추세 전환 확인이 필요합니다.";
    entries.breakoutEntry.explanation = breakoutConfirmed
      ? "돌파 후 재지지가 유지되는지 추가 확인이 필요합니다."
      : "주요 저항 회복과 돌파 후 재지지가 확인되기 전까지는 돌파 진입을 보류합니다.";
  } else if (overextendedLike) {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 40);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutConfirmed ? 60 : 55);
    if (!supportClear || !pullbackStopClear || !finite(pullbackRr) || pullbackRr < 1) {
      entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 60);
    }
    entries.currentEntry.explanation = "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리합니다.";
    entries.pullbackEntry.explanation = supportClear && pullbackStopClear
      ? "눌림목 진입은 가격이 주요 지지 구간까지 내려와 반등이 확인될 때만 후보로 봅니다."
      : "눌림목 지지와 손절 기준이 확인되기 전까지는 대기가 우선입니다.";
    entries.breakoutEntry.explanation = breakoutConfirmed
      ? "돌파 후 재지지가 유지되는지 확인해야 잔여 상승 가능성을 볼 수 있습니다."
      : "급등 후에는 추가 돌파보다 재지지 또는 눌림 확인이 먼저 필요합니다.";
  }

  refreshCurrentEntryScoreLabel(report, entries.currentEntry);
  refreshEntryScoreLabel(entries.pullbackEntry, "pullbackEntry");
  refreshEntryScoreLabel(entries.breakoutEntry, "breakoutEntry");
  if (!breakoutConfirmed && finite(pivotPrice) && finite(breakoutRr) && breakoutRr >= 1 && entries.breakoutEntry.score >= 30) {
    entries.breakoutEntry.score = Math.max(entries.breakoutEntry.score, 40);
    entries.breakoutEntry.label = "돌파 확인 필요";
  }
  if (overextendedLike) {
    entries.pullbackEntry.label = "눌림 대기";
  }
  return entries;
}

function balancedScoreBias(value: unknown) {
  const score = safeScore(value, 50) ?? 50;
  return Math.max(-10, Math.min(10, (score - 50) * 0.25));
}

function riskRewardScoreAdjustment(value?: RiskRewardDetail | null) {
  if (!finite(value?.value)) return -5;
  if (value.value < 1) return -20;
  if (value.value < 1.5) return -5;
  if (value.value < 2.5) return 10;
  if (value.value < 4) return 15;
  return 20;
}

function canAllowCurrentPartialEntry(
  report: TradingReport,
  context: {
    regime: ChartRegime;
    score: ScoreSummary;
    currentPrice: number | null;
    pivotPrice: number | null;
    nearestSupport: number | null;
    currentStop: number | null;
    currentTarget: number | null;
    extensionTarget: number | null;
    targetGapPercent: number | null;
    extensionTargetGapPercent: number | null;
    nearResistance: boolean;
    breakoutConfirmed: boolean;
    supportBroken: boolean;
    currentStopValid: boolean;
    volumeConfirmed: boolean;
    supportiveIndicators: boolean;
    priceUnitLow: boolean;
    targetGapVerySmall: boolean;
    meaningfulTargetGap: boolean;
    currentRr: number | null;
  },
) {
  const {
    regime,
    score,
    currentPrice,
    pivotPrice,
    nearestSupport,
    currentStop,
    extensionTarget,
    extensionTargetGapPercent,
    nearResistance,
    breakoutConfirmed,
    supportBroken,
    currentStopValid,
    volumeConfirmed,
    supportiveIndicators,
    priceUnitLow,
    targetGapVerySmall,
    meaningfulTargetGap,
    currentRr,
  } = context;
  const evidenceText = [
    report.scoreSummary?.explanation,
    report.finalSummary?.reason,
    ...(report.evidence?.positive ?? []),
    ...(report.evidence?.negative ?? []),
    ...(report.evidence?.riskFactors ?? []),
    ...(report.indicatorAnalysis?.confirmed ?? []).map((item) => `${item.name} ${item.signal} ${item.explanation}`),
  ].join(" ");
  const stopDistancePercent = finite(currentPrice) && finite(currentStop) && currentPrice > 0
    ? ((currentPrice - currentStop) / currentPrice) * 100
    : null;
  const supportDistancePercent = finite(currentPrice) && finite(nearestSupport) && currentPrice > 0
    ? Math.max(0, ((currentPrice - nearestSupport) / currentPrice) * 100)
    : null;
  const priceAbovePivot = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 0.998;
  const priceAboveSupport = finite(currentPrice) && finite(nearestSupport) && currentPrice >= nearestSupport * 1.003;
  const tightStop = stopDistancePercent !== null && stopDistancePercent > 0 && stopDistancePercent <= (nearResistance ? 5 : 7);
  const nearControllableSupport = supportDistancePercent !== null && supportDistancePercent <= 9;
  const extensionRoom = extensionTargetGapPercent !== null && extensionTargetGapPercent >= 3 && finite(extensionTarget);
  const targetRoomUsable = meaningfulTargetGap || extensionRoom || (finite(currentRr) && currentRr >= 1.2);
  const targetExhausted = targetGapVerySmall && !extensionRoom;
  const positiveRegime = new Set<ChartRegime>([
    "uptrend_pullback",
    "uptrend_consolidation",
    "healthy_pullback",
    "breakout_retest_confirmed",
    "breakout_wait",
    "range_upper_resistance",
    "resistance_test",
    "range_lower_support",
  ]).has(regime);
  const momentumSupportive =
    supportiveIndicators ||
    volumeConfirmed ||
    /MACD|정배열|상승 모멘텀|추세.*유지|거래량.*증가|breakout|bullish|positive|모멘텀|돌파/i.test(evidenceText);
  const rsiExtreme = /RSI[^0-9]{0,20}(?:8[0-9]|9[0-9]|100)|극단.*과열|포물선|parabolic|vertical surge/i.test(evidenceText);
  const rsiStrongCaution = /RSI[^0-9]{0,20}(?:7[5-9])|과매수|과열|overbought|overheating/i.test(evidenceText);
  const downtrendBlocked = regime === "downtrend" || regime === "support_breakdown" || (regime === "downtrend_rebound" && !breakoutConfirmed);

  if (supportBroken || !currentStopValid || !tightStop) return false;
  if (targetExhausted || score.riskScore >= 70 || priceUnitLow || downtrendBlocked) return false;
  if (!targetRoomUsable || !momentumSupportive || !positiveRegime) return false;
  if (!priceAboveSupport && !priceAbovePivot && !breakoutConfirmed && !nearControllableSupport) return false;
  if (rsiExtreme) return false;
  if (rsiStrongCaution && !breakoutConfirmed && !extensionRoom && (!finite(currentRr) || currentRr < 1.5)) return false;

  return true;
}

function capBalancedScore(value: number, max: number) {
  return Math.min(value, max);
}

function floorBalancedScore(value: number, min: number) {
  return Math.max(value, min);
}

function normalizeEntryScoresByContext(report: TradingReport): TradingReport {
  const derivedRegime = deriveChartRegime(report);
  const marketContext = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  const regime = report.chartRegime?.type ?? marketContext.chartRegime ?? derivedRegime.type;
  const score = normalizeScoreSummary(report.scoreSummary);
  const existingEntries = score.entryScores ?? {};
  const currentEntry = normalizeEntryScore(existingEntries.currentEntry, "currentEntry", 50);
  const pullbackEntry = normalizeEntryScore(existingEntries.pullbackEntry, "pullbackEntry", 50);
  const breakoutEntry = normalizeEntryScore(existingEntries.breakoutEntry, "breakoutEntry", 50);
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const nearestSupport = priceFromText(
    report.priceRoles?.pullbackEntry?.priceZone ??
      report.keyLevels.supports?.[0]?.priceZone ??
      report.tradePlan.stopLoss.shortTerm?.priceZone ??
      report.tradePlan.stopLoss.priceZone,
  );
  const nearestResistance = priceFromText(
    report.keyLevels.resistances?.[0]?.priceZone ??
      report.priceRoles?.pivot?.priceZone ??
      report.analysisMeta?.keyPivotPrice ??
      report.tradePlan.targets.firstTarget?.priceZone,
  );
  const currentStop = priceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const pullbackPrice = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const pullbackStop = priceFromText(report.tradePlan.stopLossByEntry?.pullbackEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const pullbackTarget = priceFromText(report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.pullbackTargets?.[0] ?? report.tradePlan.targets.firstTarget?.priceZone);
  const breakoutStop = priceFromText(report.tradePlan.stopLossByEntry?.breakoutEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const breakoutTarget = priceFromText(report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.breakoutTargets?.[0] ?? report.tradePlan.targets.firstTarget?.priceZone);
  const currentTargetCandidates = filterTargetsAbove(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone, [
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    report.tradePlan.targets.firstTarget?.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
  ]);
  const currentTarget = priceFromText(currentTargetCandidates[0]) ?? nearestResistance;
  const extensionTarget = priceFromText(
    currentTargetCandidates.find((value) => {
      const price = priceFromText(value);
      return finite(price) && finite(currentPrice) && price > currentPrice * 1.03 && (!finite(nearestResistance) || price > nearestResistance * 1.003);
    }),
  );
  const breakoutConfirmed = Boolean(marketContext.breakoutRetestConfirmed) || (
    finite(currentPrice) &&
    finite(pivotPrice) &&
    currentPrice >= pivotPrice * 1.005
  );
  const supportBroken = finite(currentPrice) && finite(currentStop) && currentPrice < currentStop * 0.995;
  const currentStopValid = finite(currentPrice) && finite(currentStop) && currentStop < currentPrice;
  const pullbackSetupClear = finite(pullbackPrice) && finite(pullbackStop) && finite(pullbackTarget) && pullbackStop < pullbackPrice && pullbackTarget > pullbackPrice * 1.003;
  const breakoutSetupClear = finite(pivotPrice) && finite(breakoutStop) && finite(breakoutTarget) && breakoutStop < pivotPrice && breakoutTarget > pivotPrice * 1.003;
  const targetGapPercent = finite(currentPrice) && finite(currentTarget) && currentPrice > 0
    ? ((currentTarget - currentPrice) / currentPrice) * 100
    : null;
  const extensionTargetGapPercent = finite(currentPrice) && finite(extensionTarget) && currentPrice > 0
    ? ((extensionTarget - currentPrice) / currentPrice) * 100
    : null;
  const targetGapVerySmall = targetGapPercent !== null && targetGapPercent <= 1.5;
  const meaningfulTargetGap = targetGapPercent !== null && targetGapPercent >= 3;
  const nearSupport = marketContext.nearSupport || marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range";
  const nearResistance = marketContext.nearResistance || marketContext.priceLocation === "near_resistance" || marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "overextended";
  const volumeConfirmed = hasVolumeConfirmation(report);
  const indicatorText = [
    ...(report.indicatorAnalysis?.confirmed ?? []).map((item) => `${item.signal} ${item.explanation}`),
    ...(report.evidence?.positive ?? []),
  ].join(" ");
  const supportiveIndicators = /bullish|상승|우호|매수|증가|위에|positive/i.test(indicatorText);
  const unclearIndicators = !supportiveIndicators || (report.indicatorAnalysis?.unavailable ?? []).length > (report.indicatorAnalysis?.confirmed ?? []).length;
  const patternConfidence = report.patternAnalysis?.primaryPattern?.confidence;
  const patternSupportive = patternConfidence === "high" || patternConfidence === "medium";
  const priceUnitLow = report.analysisMeta?.priceUnitConfidence === "low" || safeDisplayText(report.analysisMeta?.priceUnit, "").includes("확인 필요");

  let currentScore = 50 + balancedScoreBias(currentEntry.score);
  let pullbackScore = 50 + balancedScoreBias(pullbackEntry.score);
  let breakoutScore = 50 + balancedScoreBias(breakoutEntry.score);

  if (regime === "uptrend_pullback") {
    currentScore += 5;
    pullbackScore += 15;
  }
  if (regime === "uptrend_consolidation") {
    pullbackScore += 10;
    breakoutScore += 5;
  }
  if (regime === "healthy_pullback") pullbackScore += 15;
  if (regime === "range_lower_support") {
    currentScore += 5;
    pullbackScore += 15;
  }
  if (regime === "range_upper_resistance") {
    currentScore -= 20;
    if (nearResistance) breakoutScore += 5;
  }
  if (regime === "breakout_wait") breakoutScore += 10;
  if (regime === "breakout_retest_confirmed") breakoutScore += 25;
  if (regime === "overextended_surge" || regime === "overheated_breakout") {
    currentScore -= 20;
    breakoutScore -= 10;
  }
  if (regime === "resistance_test") {
    currentScore -= 25;
    pullbackScore -= 5;
    breakoutScore += 10;
  }
  if (regime === "downtrend_rebound") {
    currentScore -= 20;
    pullbackScore -= 5;
    breakoutScore += 5;
  }
  if (regime === "support_breakdown") {
    currentScore -= 25;
    pullbackScore -= 20;
    breakoutScore -= 15;
  }
  if (regime === "downtrend") {
    currentScore -= 20;
    pullbackScore -= 15;
    breakoutScore -= 10;
  }

  currentScore += riskRewardScoreAdjustment(rr.current);
  pullbackScore += riskRewardScoreAdjustment(rr.pullback);
  breakoutScore += riskRewardScoreAdjustment(rr.breakout);

  if (nearSupport && currentStopValid) currentScore += 10;
  if (nearSupport && pullbackSetupClear) pullbackScore += 10;
  if (nearResistance && !breakoutConfirmed) currentScore -= 20;
  if (targetGapVerySmall) currentScore -= 20;
  if (meaningfulTargetGap) {
    currentScore += 10;
    pullbackScore += 10;
    if (breakoutSetupClear) breakoutScore += 10;
  }
  if (nearSupport && pullbackSetupClear && !supportBroken) pullbackScore += 10;
  if (breakoutConfirmed) breakoutScore += 20;
  if (volumeConfirmed) {
    currentScore += 3;
    pullbackScore += 3;
    breakoutScore += 7;
  }
  if (supportiveIndicators) {
    currentScore += 5;
    pullbackScore += 5;
    breakoutScore += 5;
  } else if (unclearIndicators) {
    currentScore -= 5;
    pullbackScore -= 5;
    breakoutScore -= 5;
  }
  if (patternSupportive) {
    pullbackScore += 3;
    breakoutScore += 3;
  }
  if (priceUnitLow) {
    currentScore -= 7;
    pullbackScore -= 5;
    breakoutScore -= 5;
  }
  if (score.riskScore >= 70) {
    currentScore -= 20;
    pullbackScore -= 20;
    breakoutScore -= 20;
  } else if (score.riskScore >= 55) {
    currentScore -= 10;
    pullbackScore -= 10;
    breakoutScore -= 10;
  } else if (score.riskScore < 40) {
    if (riskRewardAllowsEntry(rr.current, 1)) currentScore += 5;
    if (riskRewardAllowsEntry(rr.pullback, 1)) pullbackScore += 5;
    if (riskRewardAllowsEntry(rr.breakout, 1)) breakoutScore += 5;
  }

  const breakoutReclaimConfirmed = breakoutConfirmed || (finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005);
  const breakoutTargetTooClose = finite(currentPrice) && finite(breakoutTarget) && breakoutTarget <= currentPrice * 1.003;
  const currentPartialEntryAllowed = canAllowCurrentPartialEntry(report, {
    regime,
    score,
    currentPrice,
    pivotPrice,
    nearestSupport,
    currentStop,
    currentTarget,
    extensionTarget,
    targetGapPercent,
    extensionTargetGapPercent,
    nearResistance,
    breakoutConfirmed,
    supportBroken,
    currentStopValid,
    volumeConfirmed,
    supportiveIndicators,
    priceUnitLow,
    targetGapVerySmall,
    meaningfulTargetGap,
    currentRr: rr.current?.value ?? null,
  });
  if (regime === "support_breakdown") {
    currentScore = capBalancedScore(currentScore, 30);
    pullbackScore = capBalancedScore(pullbackScore, 35);
    breakoutScore = capBalancedScore(breakoutScore, 40);
  } else if (regime === "downtrend") {
    currentScore = capBalancedScore(currentScore, supportBroken ? 30 : 45);
    pullbackScore = capBalancedScore(pullbackScore, supportBroken ? 35 : 55);
    breakoutScore = capBalancedScore(breakoutScore, breakoutReclaimConfirmed ? 60 : 50);
  } else if (regime === "downtrend_rebound") {
    currentScore = capBalancedScore(currentScore, 45);
    pullbackScore = capBalancedScore(pullbackScore, 60);
    breakoutScore = capBalancedScore(breakoutScore, breakoutConfirmed ? 70 : 60);
  } else if (regime === "overextended_surge" || regime === "overheated_breakout") {
    currentScore = capBalancedScore(currentScore, 40);
    breakoutScore = capBalancedScore(breakoutScore, breakoutConfirmed ? 70 : 60);
    if (!pullbackSetupClear || !riskRewardAllowsEntry(rr.pullback, 1)) pullbackScore = capBalancedScore(pullbackScore, 60);
    else if (!nearSupport || priceUnitLow) pullbackScore = capBalancedScore(pullbackScore, 75);
  } else if (regime === "resistance_test") {
    currentScore = capBalancedScore(currentScore, 40);
    pullbackScore = capBalancedScore(pullbackScore, 65);
    breakoutScore = capBalancedScore(breakoutScore, breakoutConfirmed ? 70 : 60);
  } else if (regime === "range_upper_resistance") {
    currentScore = capBalancedScore(currentScore, 60);
    if (!breakoutConfirmed) breakoutScore = capBalancedScore(breakoutScore, 65);
  } else if (regime === "breakout_wait") {
    breakoutScore = capBalancedScore(breakoutScore, 60);
    if (!nearSupport || !currentStopValid) currentScore = capBalancedScore(currentScore, 65);
  } else if (regime === "breakout_retest_confirmed") {
    if (breakoutSetupClear) breakoutScore = floorBalancedScore(breakoutScore, riskRewardAllowsEntry(rr.breakout, 1.5) ? 75 : 65);
    if (!volumeConfirmed) breakoutScore = capBalancedScore(breakoutScore, 80);
    if (breakoutTargetTooClose) breakoutScore = capBalancedScore(breakoutScore, 60);
  } else if (regime === "uptrend_pullback") {
    if (pullbackSetupClear) pullbackScore = floorBalancedScore(pullbackScore, 65);
    pullbackScore = capBalancedScore(pullbackScore, nearSupport && score.riskScore < 55 ? 85 : 75);
    if (nearSupport && currentStopValid && !supportBroken) currentScore = floorBalancedScore(currentScore, 45);
    currentScore = capBalancedScore(currentScore, nearSupport && currentStopValid && score.riskScore < 55 ? 70 : 65);
    if (!breakoutConfirmed) breakoutScore = capBalancedScore(breakoutScore, 60);
  } else if (regime === "uptrend_consolidation") {
    if (pullbackSetupClear) pullbackScore = floorBalancedScore(pullbackScore, 60);
    pullbackScore = capBalancedScore(pullbackScore, 75);
    currentScore = capBalancedScore(currentScore, 65);
    if (!breakoutConfirmed) breakoutScore = capBalancedScore(breakoutScore, 65);
  } else if (regime === "range_lower_support") {
    if (pullbackSetupClear) pullbackScore = floorBalancedScore(pullbackScore, 65);
    pullbackScore = capBalancedScore(pullbackScore, pullbackSetupClear && nearSupport && score.riskScore < 55 ? 85 : 75);
    if (nearSupport && currentStopValid && !supportBroken) currentScore = floorBalancedScore(currentScore, 45);
    currentScore = capBalancedScore(currentScore, nearSupport && currentStopValid && score.riskScore < 55 ? 70 : 65);
    if (!breakoutConfirmed) breakoutScore = capBalancedScore(breakoutScore, 60);
  } else if (regime === "healthy_pullback" && pullbackSetupClear) {
    pullbackScore = floorBalancedScore(pullbackScore, 65);
    pullbackScore = capBalancedScore(pullbackScore, nearSupport && score.riskScore < 55 ? 85 : 75);
  }

  const currentExtremeLow = supportBroken ||
    (finite(rr.current?.value) && rr.current.value < 0.5) ||
    (targetGapVerySmall && nearResistance && score.riskScore >= 70) ||
    (regime === "downtrend" && !breakoutReclaimConfirmed && score.riskScore >= 75);
  const pullbackExtremeLow = supportBroken ||
    !finite(pullbackPrice) ||
    (finite(pullbackTarget) && finite(pullbackPrice) && pullbackTarget <= pullbackPrice * 1.003) ||
    (finite(rr.pullback?.value) && rr.pullback.value < 0.5);
  const breakoutExtremeLow = !finite(pivotPrice) ||
    !finite(breakoutTarget) ||
    (finite(breakoutTarget) && finite(pivotPrice) && breakoutTarget <= pivotPrice * 1.003) ||
    (finite(rr.breakout?.value) && rr.breakout.value < 0.5);
  if (!currentExtremeLow) currentScore = floorBalancedScore(currentScore, nearSupport ? 40 : 20);
  if (!pullbackExtremeLow) pullbackScore = floorBalancedScore(pullbackScore, pullbackSetupClear && riskRewardAllowsEntry(rr.pullback, 1.5) ? 55 : 25);
  if (!breakoutExtremeLow) breakoutScore = floorBalancedScore(breakoutScore, breakoutSetupClear ? (breakoutConfirmed ? 60 : 40) : 25);

  const currentClearlyInvalid = supportBroken ||
    (regime === "downtrend" && !breakoutReclaimConfirmed && score.riskScore >= 75) ||
    score.riskScore >= 80;
  if (nearResistance && !breakoutConfirmed && !currentClearlyInvalid) {
    currentScore = floorBalancedScore(currentScore, 20);
  }
  if (currentPartialEntryAllowed) {
    const extensionRoom = extensionTargetGapPercent !== null && extensionTargetGapPercent >= 3;
    const releaseFloor = breakoutConfirmed
      ? 60
      : nearResistance
        ? 45
        : meaningfulTargetGap || extensionRoom
          ? 55
          : 45;
    const releaseCap = breakoutConfirmed
      ? 75
      : nearResistance
        ? 65
        : 70;
    currentScore = floorBalancedScore(currentScore, releaseFloor);
    currentScore = capBalancedScore(currentScore, score.riskScore >= 55 ? Math.min(releaseCap, 62) : releaseCap);
  }

  const currentIdeal = !priceUnitLow && score.riskScore < 40 && riskRewardAllowsEntry(rr.current, 2.5) && (breakoutConfirmed || (nearSupport && currentStopValid));
  const pullbackIdeal = !priceUnitLow && score.riskScore < 40 && riskRewardAllowsEntry(rr.pullback, 2.5) && pullbackSetupClear && nearSupport;
  const breakoutIdeal = !priceUnitLow && score.riskScore < 40 && riskRewardAllowsEntry(rr.breakout, 2.5) && breakoutSetupClear && breakoutConfirmed && volumeConfirmed && !breakoutTargetTooClose;
  if (!currentIdeal) currentScore = capBalancedScore(currentScore, 89);
  if (!pullbackIdeal) pullbackScore = capBalancedScore(pullbackScore, 89);
  if (!breakoutIdeal) breakoutScore = capBalancedScore(breakoutScore, 89);
  if (currentIdeal) currentScore = capBalancedScore(currentScore, 95);
  if (pullbackIdeal) pullbackScore = capBalancedScore(pullbackScore, 95);
  if (breakoutIdeal) breakoutScore = capBalancedScore(breakoutScore, 95);

  currentEntry.score = clamp(currentScore, 50);
  pullbackEntry.score = clamp(pullbackScore, 50);
  breakoutEntry.score = clamp(breakoutScore, 50);

  currentEntry.label = currentBalancedEntryLabel(report, currentEntry.score, {
    nearSupport,
    nearResistance,
    targetGapVerySmall,
  });
  pullbackEntry.label = pullbackBalancedEntryLabel(pullbackEntry.score, {
    regime,
    pullbackSetupClear,
  });
  breakoutEntry.label = breakoutBalancedEntryLabel(breakoutEntry.score, {
    breakoutConfirmed,
    breakoutSetupClear,
    pivotExists: finite(pivotPrice),
  });

  if (regime === "support_breakdown") {
    currentEntry.label = "진입 보류";
    pullbackEntry.label = "지지 회복 필요";
    breakoutEntry.label = "회복 확인 필요";
  } else if (regime === "downtrend_rebound") {
    currentEntry.label = "추격 주의";
    pullbackEntry.label = "미래 눌림목 관심";
    breakoutEntry.label = breakoutConfirmed ? "재지지 확인 필요" : "돌파 확인 필요";
  } else if (regime === "resistance_test") {
    currentEntry.label = "저항 근접";
    pullbackEntry.label = "미래 눌림목 관심";
    breakoutEntry.label = "돌파 확인 필요";
  } else if (regime === "uptrend_pullback") {
    pullbackEntry.label = pullbackEntry.score >= 70 ? "눌림목 후보" : "지지 확인 시 관심";
  } else if (regime === "uptrend_consolidation") {
    pullbackEntry.label = "눌림 대기";
  }

  if (currentPartialEntryAllowed) {
    if (nearResistance && !breakoutConfirmed) {
      currentEntry.label = "돌파 전 소액";
      currentEntry.explanation = extensionTargetGapPercent !== null && extensionTargetGapPercent >= 3
        ? "저항 근접 구간이지만 모멘텀과 다음 목표 여지가 있어 짧은 손절 전제의 소액 선진입만 검토할 수 있습니다."
        : "저항 근접 구간에서는 손절을 짧게 둘 수 있을 때만 현재가 소액 진입을 제한적으로 검토합니다.";
    } else if (breakoutConfirmed) {
      currentEntry.label = currentEntry.score >= 60 ? "분할 진입 가능" : "현재가 조건부";
      currentEntry.explanation = "돌파 또는 재지지 흐름이 확인되어 손절 기준을 짧게 두는 현재가 분할 진입을 검토할 수 있습니다.";
    } else if (currentEntry.score >= 55) {
      currentEntry.label = "소액 분할 가능";
      currentEntry.explanation = "지지와 손절 기준이 비교적 가까워 전량 진입보다 소액 분할 진입을 조건부로 검토할 수 있습니다.";
    } else {
      currentEntry.label = "현재가 조건부";
      currentEntry.explanation = "추가 확인은 필요하지만 손절 기준과 목표 여지가 있어 현재가 소액 접근을 제한적으로 검토할 수 있습니다.";
    }
  } else if (nearResistance || targetGapVerySmall) {
    currentEntry.explanation = "현재가가 저항 또는 목표 구간에 가까워 현재가 추격매수는 신중해야 합니다.";
  } else if (nearSupport) {
    currentEntry.explanation = "현재가가 지지권에 가까워도 지지 이탈 여부와 짧은 손절 기준을 함께 확인해야 합니다.";
  }
  if (pullbackSetupClear) {
    pullbackEntry.explanation = "주요 지지, 손절, 목표가가 분리되어 있어 지지 반응 확인 시 눌림목 후보로 볼 수 있습니다.";
  }
  if (!breakoutConfirmed && breakoutSetupClear) {
    breakoutEntry.explanation = "돌파 기준과 목표는 있으나 돌파 후 재지지가 확인되기 전까지는 확인 대기 구간입니다.";
  } else if (breakoutConfirmed) {
    breakoutEntry.explanation = "핵심 전환 가격 위에서 재지지가 유지되는지 확인하며 돌파 진입 후보로 봅니다.";
  }

  if (report.finalSummary.actionState === "CURRENT_PARTIAL_ENTRY") {
    currentEntry.label = "현재가 분할 진입";
    currentEntry.explanation = "현재가는 추격 구간에 가까울 수 있지만, 손절 기준을 짧게 잡을 수 있어 소액 분할 진입은 검토 가능합니다.";
  } else if (report.finalSummary.actionState === "CURRENT_STARTER_POSITION") {
    currentEntry.label = "현재가 소액 진입";
    currentEntry.explanation = "확인 조건은 남아 있지만 추세가 유지되고 있어, 손절을 짧게 전제로 한 소액 진입은 가능합니다.";
  } else if (report.finalSummary.actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    currentEntry.label = "모멘텀 진입";
    currentEntry.explanation = "추세와 모멘텀이 유지되고 있어 눌림만 기다리기보다 일부 추세추종 진입도 검토할 수 있습니다.";
  } else if (report.finalSummary.actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    currentEntry.label = "돌파 전 소액 선진입";
    currentEntry.explanation = "돌파 전 선진입은 실패 위험이 있으므로, 손절을 짧게 두는 소액 전략으로만 접근해야 합니다.";
    breakoutEntry.label = "돌파 확인 필요";
  }

  score.entryScores = {
    currentEntry,
    pullbackEntry,
    breakoutEntry,
  };
  score.explanation = entryModePreferenceExplanationClean(report, score);
  report.scoreSummary = score;
  return report;
}

function currentBalancedEntryLabel(
  report: TradingReport,
  score: number,
  context: { nearSupport: boolean; nearResistance: boolean; targetGapVerySmall: boolean },
) {
  const marketContext = deriveMarketContext(report);
  if (score < 20) return "부적합";
  if (context.nearResistance || context.targetGapVerySmall || marketContext.priceLocation === "overextended") {
    return score < 40 ? "추격 주의" : "저항 근접";
  }
  if (context.nearSupport) {
    if (score < 55) return "지지 확인 필요";
    return "소액 조건부";
  }
  if (score < 40) return "불리";
  if (score < 55) return "확인 필요";
  if (score < 70) return "조건부";
  if (score < 85) return "후보";
  return "유리";
}

function pullbackBalancedEntryLabel(score: number, context: { regime: ChartRegime; pullbackSetupClear: boolean }) {
  if (score < 20) return "부적합";
  if ((context.regime === "overextended_surge" || context.regime === "overheated_breakout") && score >= 50) return "눌림 대기";
  if (!context.pullbackSetupClear && score < 55) return "지지 확인 필요";
  if (score < 40) return "불리";
  if (score < 55) return "지지 확인 필요";
  if (score < 85) return "조건부 후보";
  return "유리";
}

function breakoutBalancedEntryLabel(score: number, context: { breakoutConfirmed: boolean; breakoutSetupClear: boolean; pivotExists: boolean }) {
  if (score < 20) return "부적합";
  if (!context.breakoutConfirmed) {
    if (context.pivotExists && context.breakoutSetupClear) return "돌파 확인 필요";
    return score < 40 ? "확인 필요" : "돌파 확인 필요";
  }
  if (score < 70) return "재지지 확인 필요";
  if (score < 85) return "돌파 후보";
  return "유리";
}

function adjustEntryScoresByRegime(report: TradingReport): TradingReport {
  const derivedRegime = deriveChartRegime(report);
  const marketContext = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  const regime = report.chartRegime?.type ?? marketContext.chartRegime ?? derivedRegime.type;
  const score = normalizeScoreSummary(report.scoreSummary);
  const entries = {
    currentEntry: normalizeEntryScore(score.entryScores?.currentEntry, "currentEntry"),
    pullbackEntry: normalizeEntryScore(score.entryScores?.pullbackEntry, "pullbackEntry"),
    breakoutEntry: normalizeEntryScore(score.entryScores?.breakoutEntry, "breakoutEntry"),
  };
  const rr = report.tradePlan.riskRewardByEntry ?? {};
  const currentPrice = parsePriceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = parsePriceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const currentStop = parsePriceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const pullbackPrice = parsePriceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const pullbackStop = parsePriceFromText(report.tradePlan.stopLossByEntry?.pullbackEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone);
  const pullbackTarget = parsePriceFromText(report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.pullbackTargets?.[0]);
  const breakoutTarget = parsePriceFromText(report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? report.tradePlan.targets.firstTarget?.priceZone ?? report.priceRoles?.targets?.breakoutTargets?.[0]);
  const supportBroken = finite(currentPrice) && finite(currentStop) && currentPrice < currentStop * 0.995;
  const breakoutRetestConfirmed = Boolean(marketContext.breakoutRetestConfirmed);
  const pullbackSetupClear = finite(pullbackPrice) && finite(pullbackStop) && finite(pullbackTarget) && pullbackStop < pullbackPrice && pullbackTarget > pullbackPrice;
  const breakoutTargetTooClose = finite(currentPrice) && finite(breakoutTarget) && breakoutTarget <= currentPrice * 1.003;
  const breakoutReclaimConfirmed = breakoutRetestConfirmed || (finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005);
  const volumeConfirmed = hasVolumeConfirmation(report);
  const pullbackRr = rr.pullback?.value ?? null;
  const breakoutRr = rr.breakout?.value ?? null;

  if (regime === "support_breakdown") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 30);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 35);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 40);
    score.holdScore = Math.min(score.holdScore, 55);
    score.riskScore = Math.max(score.riskScore, 70);
    entries.currentEntry.explanation = "주요 지지선 이탈이 확인되어 현재가 신규 진입보다 위험 관리가 우선입니다.";
    entries.pullbackEntry.explanation = "지지선 회복 전까지 눌림목 진입도 보수적으로 제한해야 합니다.";
    entries.breakoutEntry.explanation = "지지 회복과 저항 돌파 후 재지지 전까지 돌파 진입은 보류합니다.";
  } else if (regime === "downtrend") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, supportBroken ? 30 : 45);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, supportBroken ? 35 : 55);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutReclaimConfirmed ? 60 : 50);
    score.holdScore = Math.min(score.holdScore, 65);
    if (!breakoutReclaimConfirmed) score.riskScore = Math.max(score.riskScore, 60);
    entries.currentEntry.explanation = supportBroken
      ? "주요 지지선 이탈 위험이 있어 현재가 진입보다 손절 기준 확인이 우선입니다."
      : "하락 추세에서는 현재가 진입을 강하게 보기 어렵고 추세 전환 확인이 필요합니다.";
    entries.pullbackEntry.explanation = "하락 추세에서는 지지권 반등만으로 강한 눌림목 매수 후보로 보기 어렵습니다.";
    entries.breakoutEntry.explanation = breakoutReclaimConfirmed
      ? "주요 저항 회복 이후에도 재지지 확인이 필요합니다."
      : "주요 저항 회복과 돌파 후 재지지가 확인되기 전까지는 돌파 진입을 보류합니다.";
  } else if (regime === "downtrend_rebound") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 45);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 60);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutReclaimConfirmed ? 65 : 60);
    entries.currentEntry.explanation = "하락 이후 반등 구간에서는 현재가 진입보다 저항 회복 확인이 우선입니다.";
    entries.pullbackEntry.explanation = "눌림목은 미래 지지 확인 시 관심 구간이며 즉시 매수 우위로 보기는 어렵습니다.";
    entries.breakoutEntry.explanation = "주요 저항 돌파 후 재지지가 확인되어야 추세 전환 후보로 볼 수 있습니다.";
  } else if (regime === "overextended_surge" || regime === "overheated_breakout") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 40);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
    if (!pullbackSetupClear || !finite(pullbackRr) || pullbackRr < 1) {
      entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 60);
    }
    if (marketContext.nearResistance) score.holdScore = Math.min(score.holdScore, score.riskScore >= 60 ? 75 : 85);
    entries.currentEntry.explanation = "급등 후 저항권에서는 현재가 추격매수보다 눌림 또는 재지지 확인이 우선입니다.";
    entries.pullbackEntry.explanation = pullbackSetupClear
      ? "눌림목은 주요 지지 구간까지 내려와 반등이 확인될 때만 후보로 봅니다."
      : "눌림목 지지와 손절 기준이 확인되기 전까지는 대기가 우선입니다.";
    entries.breakoutEntry.explanation = "급등 이후에는 추가 돌파보다 재지지 또는 눌림 확인을 먼저 봅니다.";
  } else if (regime === "breakout_retest_confirmed") {
    entries.breakoutEntry.score = Math.max(entries.breakoutEntry.score, finite(breakoutRr) && breakoutRr >= 1.5 ? 75 : 65);
    if (!volumeConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 80);
    if (breakoutTargetTooClose) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
    if (marketContext.priceLocation !== "overextended") entries.currentEntry.score = Math.max(entries.currentEntry.score, 50);
    entries.breakoutEntry.explanation = breakoutTargetTooClose
      ? "돌파는 확인되더라도 다음 목표가가 가까워 손익비 확인이 필요합니다."
      : "핵심 전환 가격 위에서 재지지가 유지되어 돌파 진입 점수를 우선 반영합니다.";
  } else if (regime === "resistance_test") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 40);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 65);
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutRetestConfirmed ? 65 : 60);
    entries.currentEntry.explanation = "저항권 테스트 구간에서는 현재가 추격매수보다 돌파 후 재지지 확인이 우선입니다.";
    entries.pullbackEntry.explanation = "눌림목은 향후 지지 구간까지 내려온 뒤 확인할 미래 관심 구간입니다.";
    entries.breakoutEntry.explanation = "저항 돌파와 재지지가 확인되기 전까지는 돌파 확인 대기가 우선입니다.";
  } else if (regime === "breakout_wait") {
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
    entries.breakoutEntry.label = "돌파 확인 필요";
    entries.breakoutEntry.explanation = "돌파 후 재지지 확인 전까지는 돌파 진입을 대기하는 구간입니다.";
  } else if (regime === "uptrend_pullback") {
    if (pullbackSetupClear) entries.pullbackEntry.score = Math.max(entries.pullbackEntry.score, 65);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, score.riskScore < 55 ? 85 : 75);
    if (marketContext.nearSupport && score.riskScore < 60) entries.currentEntry.score = Math.max(entries.currentEntry.score, 45);
    if (!breakoutRetestConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 60);
    entries.pullbackEntry.explanation = "상승 흐름 속 눌림 구간으로, 지지 반응 확인 시 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (regime === "uptrend_consolidation") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 65);
    if (pullbackSetupClear) entries.pullbackEntry.score = Math.max(entries.pullbackEntry.score, 60);
    entries.pullbackEntry.score = Math.min(entries.pullbackEntry.score, 75);
    if (!breakoutRetestConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 65);
    entries.pullbackEntry.explanation = "상승 흐름 이후 조정 구간으로 지지 유지와 반등 확인이 필요합니다.";
  } else if (regime === "range_lower_support") {
    if (pullbackSetupClear && (finite(pullbackRr) ? pullbackRr >= 1.2 : true)) {
      entries.pullbackEntry.score = Math.max(entries.pullbackEntry.score, 65);
    }
    if (marketContext.nearSupport && score.riskScore < 60) {
      entries.currentEntry.score = Math.max(entries.currentEntry.score, 45);
    }
    entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, breakoutRetestConfirmed ? entries.breakoutEntry.score : 60);
    entries.pullbackEntry.explanation = "박스권 하단 또는 지지권에서는 일부 익절보다 지지 확인 후 눌림목 대응이 우선입니다.";
  } else if (regime === "range_upper_resistance") {
    entries.currentEntry.score = Math.min(entries.currentEntry.score, 60);
    if (!breakoutRetestConfirmed) entries.breakoutEntry.score = Math.min(entries.breakoutEntry.score, 65);
    entries.currentEntry.explanation = "박스권 상단 또는 저항권에서는 현재가 추격보다 돌파 확인이 우선입니다.";
    entries.pullbackEntry.explanation = "눌림목 진입은 향후 지지 구간까지 내려온 뒤 다시 판단하는 미래 시나리오입니다.";
  } else if (regime === "healthy_pullback") {
    if (pullbackSetupClear) entries.pullbackEntry.score = Math.max(entries.pullbackEntry.score, 65);
    entries.pullbackEntry.explanation = "정상 눌림 구간에서는 지지 반응과 짧은 손절 기준이 확인될 때 눌림목 후보가 됩니다.";
  }

  score.totalScore = clamp(score.totalScore, 50);
  score.holdScore = clamp(score.holdScore, 60);
  score.riskScore = clamp(score.riskScore, 50);
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyScore = clamp(score.buyScore, 40);
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);

  refreshCurrentEntryScoreLabel(report, entries.currentEntry);
  refreshEntryScoreLabel(entries.pullbackEntry, "pullbackEntry");
  refreshEntryScoreLabel(entries.breakoutEntry, "breakoutEntry");
  if ((regime === "overextended_surge" || regime === "overheated_breakout") && entries.pullbackEntry.score >= 50) entries.pullbackEntry.label = "눌림 대기";
  if (regime === "downtrend_rebound" && entries.pullbackEntry.score >= 50) entries.pullbackEntry.label = "미래 눌림목 관심";
  if (regime === "resistance_test" && entries.pullbackEntry.score >= 50) entries.pullbackEntry.label = "미래 눌림목 관심";
  if (regime === "breakout_wait" && entries.breakoutEntry.score >= 30) entries.breakoutEntry.label = "돌파 확인 필요";
  if (regime === "uptrend_pullback" && entries.pullbackEntry.score >= 60) entries.pullbackEntry.label = "지지 확인 시 관심";
  if (regime === "uptrend_consolidation" && entries.pullbackEntry.score >= 55) entries.pullbackEntry.label = "눌림 대기";
  if (regime === "range_lower_support" && entries.currentEntry.score < 65 && entries.currentEntry.score >= 45) entries.currentEntry.label = "지지 확인 필요";
  score.entryScores = entries;
  report.scoreSummary = score;
  return report;
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
  const marketContext = deriveMarketContext(report);
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice);
  const pullbackPrice = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const priceNearOrBelowPivot = finite(currentPrice) && finite(pivotPrice) && currentPrice <= pivotPrice * 1.01;
  const nearPivot = finite(currentPrice) && finite(pivotPrice) && Math.abs(currentPrice - pivotPrice) / pivotPrice * 100 <= 2.5;
  const breakoutConfirmed = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005;

  let currentScore = scoreFromRiskReward(score.buyScore, rr.current, "currentEntry");
  let pullbackScore = scoreFromRiskReward(score.buyScore, rr.pullback, "pullbackEntry");
  let breakoutScore = scoreFromRiskReward(score.buyScore, rr.breakout, "breakoutEntry");

  if (marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range") {
    pullbackScore = clamp(pullbackScore + 15, pullbackScore);
    currentScore = clamp(currentScore + 5, currentScore);
  }
  if (marketContext.priceLocation === "upper_range" || marketContext.priceLocation === "near_resistance") {
    currentScore = Math.min(currentScore, 60);
    if (!breakoutConfirmed) breakoutScore = Math.min(breakoutScore, 60);
  }
  if (marketContext.priceLocation === "overextended") currentScore = Math.min(currentScore, 45);
  if (nearPivot || priceNearOrBelowPivot) currentScore = clamp(currentScore - 20, currentScore);
  if (rr.current?.value !== null && finite(rr.current?.value) && rr.current.value >= 1.5 && !nearPivot) currentScore = clamp(currentScore + 8, currentScore);
  if (finite(pullbackPrice)) pullbackScore = clamp(pullbackScore + 12, pullbackScore);
  else pullbackScore = Math.min(pullbackScore, 65);
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

  return applyEntryScoreConsistencyCaps(report, score, {
    currentEntry: normalizeEntryScore(score.entryScores?.currentEntry, "currentEntry", currentScore, currentExplanation),
    pullbackEntry: normalizeEntryScore(score.entryScores?.pullbackEntry, "pullbackEntry", pullbackScore, pullbackExplanation),
    breakoutEntry: normalizeEntryScore(score.entryScores?.breakoutEntry, "breakoutEntry", breakoutScore, breakoutExplanation),
  });
}

function entryModePreferenceExplanation(report: TradingReport, score: ScoreSummary) {
  const current = score.entryScores?.currentEntry?.score ?? 0;
  const pullback = score.entryScores?.pullbackEntry?.score ?? 0;
  const breakout = score.entryScores?.breakoutEntry?.score ?? 0;
  const pivot = report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? "핵심 전환 가격";
  const pullbackZone = report.priceRoles?.pullbackEntry?.priceZone ?? "주요 지지 구간";
  const parts: string[] = [];

  if (current < 50) {
    parts.push(`현재가는 ${pivot} 부근 저항 또는 전환 가격대에 가까워 추격 진입 점수가 낮습니다.`);
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
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice);
  const nearResistance = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 0.97 && currentPrice <= pivotPrice * 1.01;
  const breakoutConfirmed = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005;
  const parts: string[] = [];

  if (current < 50 || (finite(currentRr) && currentRr < 1)) {
    parts.push(`현재가는 ${pivot} 부근의 저항 또는 전환 가격에 가까워 추격매수 손익비가 낮습니다.`);
  } else {
    parts.push("현재가 진입은 핵심 가격대와 손절 기준을 함께 확인해야 합니다.");
  }

  if (pullback >= 65 || (finite(pullbackRr) && pullbackRr >= 1.5)) {
    parts.push(`${pullbackZone}에서 반등이 확인되면 ${shortStop}을 기준으로 손절을 짧게 둘 수 있어 눌림목 진입 조건이 상대적으로 유리합니다.`);
  } else {
    parts.push(`${pullbackZone} 지지 반응을 확인하기 전까지는 눌림목 진입도 확인 대기 구간입니다.`);
  }

  if (breakout >= 70) {
    parts.push(`${pivot} 돌파 후 재지지에 성공하면 돌파 진입 후보가 되며, 다음 목표는 ${breakoutTarget} 부근입니다.`);
  } else {
    parts.push(`${pivot} 돌파 후 재지지가 아직 충분히 확인되지 않아 돌파 진입은 확인 대기가 필요합니다.`);
  }

  if (score.holdScore < 50) {
    parts.push("주요 지지선 이탈 또는 위험 증가로 보유자는 비중 축소를 고려해야 합니다.");
  } else if (score.holdScore >= 80 && nearResistance) {
    parts.push(`보유자는 ${shortStop} 이탈 전까지 관망 가능하지만, 저항 구간이 가까워 일부 익절 또는 돌파 확인이 필요합니다.`);
  } else if (score.holdScore >= 70 && !breakoutConfirmed) {
    parts.push("상승 흐름은 유지되지만 돌파 확인 전이므로 보유 관망 중심으로 대응하는 것이 적절합니다.");
  } else if (score.holdScore >= 60) {
    parts.push(`보유자는 ${shortStop} 이탈 전까지 관망 가능하지만 ${pivot} 부근에서는 일부 익절 또는 돌파 확인이 필요합니다.`);
  }
  if (score.riskScore >= 60) {
    parts.push("다만 위험 점수가 높아 저항 근접, 손익비 부족, 이미지 기반 분석 한계를 함께 관리해야 합니다.");
  }

  return parts.join(" ");
}

function safeRiskRewardValue(value?: number | null) {
  return finite(value) ? String(Math.round(value * 100) / 100) : "확인 필요";
}

function enhanceScoreFactors(report: TradingReport) {
  const score = normalizeScoreSummary(report.scoreSummary);
  const currentZone = safeDisplayText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone, "현재가");
  const pivotZone = safeDisplayText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone, "주요 저항 구간");
  const supportZone = safeDisplayText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone ?? report.keyLevels.supports?.[0]?.priceZone, "주요 지지 구간");
  const stopZone = safeDisplayText(report.tradePlan.stopLossByEntry?.pullbackEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "단기 손절 기준");
  const priceUnit = safeDisplayText(report.analysisMeta?.priceUnit, "이미지 축 기준 추정");
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const pullbackRr = report.tradePlan.riskRewardByEntry?.pullback?.value;
  const breakoutRr = report.tradePlan.riskRewardByEntry?.breakout?.value;
  const rrValue = finite(pullbackRr) ? pullbackRr : finite(breakoutRr) ? breakoutRr : currentRr;

  const enhance = (
    item: ScoreFactor,
    group: "positive" | "negative" | "risk",
  ): ScoreFactor => {
    const label = safeDisplayText(item.label, "점수 요인");
    const reason = safeDisplayText(item.reason, "추가 확인이 필요합니다.");
    if (/저항|resistance|근접/.test(label + reason)) {
      return {
        ...item,
        label: `${pivotZone} 저항 구간 근접`,
        reason: `현재가가 ${pivotZone} 핵심 전환 가격 또는 저항 구간에 가까워 현재가 추격매수 손익비가 낮아질 수 있습니다.`,
      };
    }
    if (/지지|support/.test(label + reason)) {
      return {
        ...item,
        label: group === "risk" ? `${supportZone} 지지 이탈 위험` : `${supportZone} 지지 후보 유지`,
        reason: group === "risk"
          ? `${supportZone} 이탈 시 단기 관점이 약화되므로 ${stopZone} 기준을 함께 확인해야 합니다.`
          : `현재가가 ${supportZone} 지지 후보를 아직 이탈하지 않은 상태로 해석됩니다.`,
      };
    }
    if (/손익비|risk reward/.test(label + reason)) {
      const rrText = safeRiskRewardValue(rrValue);
      return {
        ...item,
        label: rrText === "확인 필요" ? "손익비 확인 필요" : `눌림목 기준 손익비 ${rrText}`,
        reason: rrText === "확인 필요"
          ? `${currentZone} 기준 진입가, 손절가, 목표가 중 일부가 명확하지 않아 손익비 확인이 필요합니다.`
          : `${stopZone} 손절 기준 대비 목표 여지를 계산한 값이며, 이미지 기반 추정값이므로 실제 체결가와 다를 수 있습니다.`,
      };
    }
    if (/이미지|OHLCV|가격 단위/.test(label + reason)) {
      return {
        ...item,
        label: "가격 단위/이미지 추정 한계",
        reason: `${currentZone} 가격과 지지/저항은 ${priceUnit}값이므로 실제 시세 단위와 차이가 있을 수 있습니다.`,
      };
    }
    if (/보조지표|RSI|MACD|indicator/.test(label + reason)) {
      return {
        ...item,
        label: "RSI/MACD 확인 제한",
        reason: "RSI/MACD 등 확인 제한 지표는 과매수 여부와 모멘텀 판단의 보조 근거로만 참고합니다.",
      };
    }
    return { ...item, label, reason };
  };

  score.scoreFactors = {
    positive: (score.scoreFactors?.positive ?? []).map((item) => enhance(item, "positive")),
    negative: (score.scoreFactors?.negative ?? []).map((item) => enhance(item, "negative")),
    risk: (score.scoreFactors?.risk ?? []).map((item) => enhance(item, "risk")),
  };
  report.scoreSummary = score;
}

const knownFinalActions = new Set<FinalAction>([
  "CURRENT_PARTIAL_ENTRY",
  "CURRENT_STARTER_POSITION",
  "MOMENTUM_CONTINUATION_ENTRY",
  "PRE_BREAKOUT_AGGRESSIVE_ENTRY",
  "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED",
  "BREAKOUT_WAIT",
  "WAIT_FOR_SUPPORT_CONFIRMATION",
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
  const levels = getLevels(raw);
  const currentZone = formatEstimatedZone(levels.current);
  const pivotZone = formatZone(levels.pivot);
  const supportZone = formatZone(levels.shortStop);
  const priceUnit = inferPriceUnit(
    raw.aiAnalysis?.symbolDetection?.detectedTicker || raw.aiAnalysis?.symbolDetection?.detectedName,
    levels.current,
  ).priceUnit;
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
    positive?.push({ label: "상승 추세 유지", scoreImpact: 15, reason: `${currentZone} 기준으로 표시된 차트의 방향성이 아직 상승 쪽으로 해석됩니다.` });
  }
  if (!supportBroken) {
    total += 10;
    holdScore += 15;
    riskScore -= 10;
    positive?.push({ label: `${supportZone} 지지 후보 유지`, scoreImpact: 10, reason: `현재가가 ${supportZone} 단기 지지 후보를 아직 이탈하지 않은 상태로 해석됩니다.` });
  }
  if (nearResistance) {
    total -= 15;
    buyScore -= 20;
    holdScore -= 5;
    riskScore += 15;
    negative?.push({ label: `${pivotZone} 저항 구간 근접`, scoreImpact: -15, reason: `현재 가격이 ${pivotZone} 핵심 전환 가격 또는 저항 구간에 가까워 신규 추격매수에는 불리합니다.` });
    risk?.push({ label: `${pivotZone} 돌파 실패 위험`, scoreImpact: 15, reason: `${pivotZone} 위에서 재지지에 실패하면 단기 변동성이 커질 수 있습니다.` });
  }
  if (rr.value === null || rr.value < 1) {
    total -= 15;
    buyScore -= 20;
    riskScore += 20;
    const rrText = rr.value === null ? "확인 필요" : safeRiskRewardValue(rr.value);
    negative?.push({ label: rrText === "확인 필요" ? "손익비 확인 필요" : `손익비 ${rrText} 부족`, scoreImpact: -15, reason: rr.interpretation });
    risk?.push({ label: rrText === "확인 필요" ? "손익비 확인 필요" : `손익비 ${rrText} 부족`, scoreImpact: 20, reason: `${supportZone} 손절 기준 대비 목표 여지가 부족하면 변동성 부담이 커질 수 있습니다.` });
  } else if (rr.value >= 1.5) {
    buyScore += 15;
    riskScore -= 10;
    positive?.push({ label: `손익비 ${safeRiskRewardValue(rr.value)}`, scoreImpact: 15, reason: `${supportZone} 단기 손절 기준 대비 목표 여지가 일부 확보됩니다.` });
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
    negative?.push({ label: `${supportZone} 주요 지지선 이탈`, scoreImpact: -30, reason: `현재가가 ${supportZone} 단기 손절 기준을 이탈한 상태로 해석됩니다.` });
    risk?.push({ label: `${supportZone} 지지 이탈 위험`, scoreImpact: 30, reason: "단기 상승 관점이 약화되며 손절 또는 비중 축소 기준을 먼저 확인해야 합니다." });
  }

  total -= 5;
  riskScore += 5;
  negative?.push({ label: "이미지 기반 분석 한계", scoreImpact: -5, reason: `${currentZone} 가격과 지지/저항은 이미지 축 기준 추정값이므로 실제 OHLCV 검증 전까지 보수적으로 봅니다.` });
  risk?.push({ label: "가격 단위/이미지 추정 한계", scoreImpact: 5, reason: `가격 단위는 ${priceUnit}이며 실제 시세 단위와 차이가 있을 수 있습니다.` });

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

function hasVolumeConfirmation(report: TradingReport) {
  const confirmedVolume = (report.indicatorAnalysis?.confirmed ?? []).filter((item) => {
    const name = `${item.name ?? ""}`.toLowerCase();
    return name.includes("volume") || name.includes("거래량");
  });
  const text = confirmedVolume
    .map((item) => `${item.signal ?? ""} ${item.explanation ?? ""}`.toLowerCase())
    .join(" ");
  return /bullish|increase|spike|high|상승|동반|보강|우호/.test(text);
}

function capHoldScoreForContext(
  holdScore: number,
  report: TradingReport,
  context: {
    nearResistance: boolean;
    breakoutRetestConfirmed: boolean;
    supportBroken: boolean;
    riskScore: number;
  },
) {
  let capped = clamp(holdScore, 60);
  const imageOnly = report.analysisMeta?.dataBasis !== "image_with_ohlcv";
  if (context.nearResistance) capped = Math.min(capped, 85);
  if (!context.breakoutRetestConfirmed) capped = Math.min(capped, 82);
  if (!hasVolumeConfirmation(report)) capped = Math.min(capped, 85);
  if (imageOnly) capped = Math.min(capped, 85);
  if (context.riskScore >= 60) capped = Math.min(capped, 75);
  if (context.riskScore >= 70) capped = Math.min(capped, 65);
  if (context.supportBroken) capped = Math.min(capped, 45);
  return clamp(capped, 60);
}

function alignScoreWithAction(report: TradingReport) {
  const score = normalizeScoreSummary(report.scoreSummary);
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
  const nearResistance = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 0.97 && currentPrice <= pivotPrice * 1.01;
  const shortStopPrice = priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone ?? report.priceRoles?.stopLoss?.shortTerm);
  const supportBroken = finite(currentPrice) && finite(shortStopPrice) && currentPrice < shortStopPrice;
  const currentRr = rrValues.current?.value ?? null;
  const breakoutRr = rrValues.breakout?.value ?? null;
  const marketContext = deriveMarketContext(report);
  report.marketContext = { ...marketContext, ...report.marketContext };
  const chartRegime = deriveChartRegime(report);
  report.marketContext = {
    ...report.marketContext,
    chartRegime: chartRegime.regime,
    chartRegimeConfidence: chartRegime.confidence,
    chartRegimeReasons: chartRegime.reasons,
  };
  const regime = report.marketContext.chartRegime ?? chartRegime.regime;
  const breakoutRetestConfirmed = Boolean(report.marketContext.breakoutRetestConfirmed) || (finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005);
  const priceLocation = report.marketContext.priceLocation;
  const supportArea = priceLocation === "near_support" || priceLocation === "lower_range";
  const partialProfitAllowed = Boolean(
    report.marketContext.nearResistance &&
      (priceLocation === "upper_range" || priceLocation === "near_resistance" || priceLocation === "overextended") &&
      finite(currentRr) &&
      currentRr < 1 &&
      score.holdScore >= 60 &&
      !supportArea,
  );
  const currentEntryPoor = currentEntryScore < 50 || (finite(currentRr) && currentRr < 1);
  const pullbackIsBest = pullbackEntryScore >= currentEntryScore && pullbackEntryScore >= breakoutEntryScore;
  const applyMixedBreakoutPullbackGuide = () => {
    report.userActionGuide = {
      ...report.userActionGuide,
      nonHolder: "돌파 확인 전까지 무리한 진입은 피하되, 주요 지지 구간에서 반등이 확인되면 눌림목 진입을 검토할 수 있습니다.",
      holder: "주요 지지선 이탈 전까지 보유 관망이 가능하며, 핵심 전환 가격 돌파 여부를 확인해야 합니다.",
      shortTermTrader: "지지 반응이 나오면 짧은 손절 기준을 두고 대응할 수 있습니다.",
      addBuyer: "추가 매수는 지지 반응 확인 또는 돌파 후 재지지 확인 이후가 유리합니다.",
    };
  };

  const setFinalAction = (nextAction: FinalAction, title: string, conclusion: string) => {
    report.finalSummary.finalAction = nextAction;
    report.finalSummary.title = title;
    report.finalSummary.oneLineConclusion = conclusion;
  };

  if (regime === "support_breakdown") {
    setFinalAction("SELL_RISK", "위험 관리 / 신규 진입 보류", "주요 지지선 이탈이 확인되어 신규 진입보다 손절 기준과 비중 관리가 우선입니다.");
  } else if (regime === "downtrend") {
    if (supportArea) {
      setFinalAction("WAIT_FOR_SUPPORT_CONFIRMATION", "하락 추세 반등 대기 / 지지 확인 필요", "현재 구간은 기술적 반등 가능성은 있으나, 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.");
    } else if (report.marketContext.nearResistance) {
      setFinalAction("BREAKOUT_WAIT", "추세 전환 확인 대기", "주요 저항 회복 또는 돌파 후 재지지 확인 전까지 신규 진입은 보류하는 것이 유리합니다.");
    } else {
      setFinalAction("WAIT_FOR_SUPPORT_CONFIRMATION", "하락 추세 / 신규 진입 보류", "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다. 주요 저항 회복 또는 추세 전환 확인이 필요합니다.");
    }
  } else if (regime === "downtrend_rebound") {
    setFinalAction("BREAKOUT_WAIT", report.marketContext.nearResistance ? "저항권 테스트 / 추격매수 주의" : "하락추세 반등 / 돌파 확인 대기", "하락 이후 반등 구간은 추세 전환 확인 전까지 저항 돌파와 재지지 확인이 우선입니다.");
  } else if (regime === "overextended_surge" || regime === "overheated_breakout") {
    if (pullbackEntryScore >= 65 && finite(rrValues.pullback?.value) && rrValues.pullback.value >= 1.2) {
      setFinalAction("WAIT_FOR_PULLBACK", regime === "overheated_breakout" ? "추격매수 주의 / 재지지 확인" : "급등 후 눌림 대기 / 지지 확인 시 관심", "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리하고, 주요 지지 구간까지 눌림과 반등 확인이 필요합니다.");
    } else {
      setFinalAction(
        "PARTIAL_TAKE_PROFIT",
        score.holdScore >= 60 ? "보유자는 일부 익절 고려 / 미보유자는 눌림 대기" : (regime === "overheated_breakout" ? "과열권 돌파 후 조정 대기" : "급등 후 저항 근접 / 추격매수 주의"),
        "보유자는 일부 익절을 고려할 수 있지만, 미보유자는 주요 지지 구간까지 눌림을 기다리는 전략이 유리합니다.",
      );
    }
  } else if (regime === "breakout_retest_confirmed") {
    if (breakoutEntryScore >= 75 && finite(breakoutRr) && breakoutRr >= 1.5) {
      setFinalAction("BREAKOUT_BUY_CANDIDATE", "돌파 후 재지지 확인 / 돌파 매수 후보", "핵심 전환 가격 위에서 재지지가 유지되고 손익비가 충족되면 조건부 돌파 진입 후보로 볼 수 있습니다.");
    } else if (breakoutEntryScore >= 65) {
      setFinalAction("BREAKOUT_WAIT", "돌파 후 지지 전환 후보 / 확인 필요", "피벗 위에서 버티는 흐름은 확인되지만 이미지 기반 신뢰도와 손익비를 추가 확인해야 합니다.");
    } else {
      setFinalAction("BREAKOUT_WAIT", "돌파 실패 위험 / 재이탈 주의", "핵심 전환 가격 위 재지지가 약하면 재이탈 시 돌파 실패로 볼 수 있습니다.");
    }
  } else if (regime === "resistance_test") {
    setFinalAction("BREAKOUT_WAIT", "저항권 테스트 / 돌파 확인 대기", "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.");
  } else if (regime === "breakout_wait") {
    if (pullbackEntryScore >= 65) {
      setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기 / 눌림목 지지 확인 시 관심", "핵심 전환 가격 돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다.");
      applyMixedBreakoutPullbackGuide();
    } else {
      setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다.");
    }
  } else if (regime === "range_upper_resistance") {
    if (partialProfitAllowed) {
      setFinalAction(
        "PARTIAL_TAKE_PROFIT",
        priceLocation === "overextended" ? "급등 후 저항 근접 / 일부 익절 고려" : "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의",
        "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다.",
      );
    } else {
      setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "박스권 상단 또는 저항권에서는 추격매수보다 돌파 후 재지지 확인이 우선입니다.");
    }
  } else if (regime === "range_lower_support") {
    if (pullbackEntryScore >= 60 || (finite(rrValues.pullback?.value) && rrValues.pullback.value >= 1.2)) {
      setFinalAction("PULLBACK_BUY_CANDIDATE", "지지권 눌림목 매수 후보", "주요 지지권에서 손절과 목표가가 비교적 분리되어 있어 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다.");
    } else {
      setFinalAction("WAIT_FOR_SUPPORT_CONFIRMATION", "지지 확인 대기", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.");
    }
  } else if (regime === "uptrend_pullback") {
    setFinalAction("PULLBACK_BUY_CANDIDATE", "상승추세 눌림 / 지지 확인 시 관심", "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.");
  } else if (regime === "uptrend_consolidation") {
    setFinalAction("WAIT_FOR_PULLBACK", "상승추세 조정 / 지지 확인 필요", "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다.");
  } else if (regime === "healthy_pullback") {
    setFinalAction("PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다.");
  } else if (regime === "sideways") {
    setFinalAction("WAIT_FOR_SUPPORT_CONFIRMATION", "방향 확인 대기", "지지와 저항 사이 중간 구간이어서 돌파 또는 지지 반응 확인이 필요합니다.");
  } else if (supportBroken) {
    setFinalAction("SELL_RISK", "손절 위험", "단기 지지선을 이탈해 신규 진입보다 손절 기준과 비중 관리가 우선입니다.");
  } else if (currentEntryScore < 30 && pullbackEntryScore < 30 && breakoutEntryScore < 30 && score.holdScore < 40 && score.riskScore >= 70) {
    setFinalAction("NO_TRADE", "매매 부적합", "현재가, 눌림목, 돌파 진입 조건과 보유 조건이 모두 약하고 위험도가 높습니다.");
  } else if (supportArea) {
    if (pullbackEntryScore >= 60 || (finite(rrValues.pullback?.value) && rrValues.pullback.value >= 1.2)) {
      setFinalAction("PULLBACK_BUY_CANDIDATE", "지지권 눌림목 매수 후보", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 지지 반응 확인 후 눌림목 진입을 우선 검토할 수 있습니다.");
    } else {
      setFinalAction("WAIT_FOR_SUPPORT_CONFIRMATION", "지지 확인 대기", "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.");
    }
  } else if (score.riskScore >= 70 && score.holdScore < 60) {
    setFinalAction("REDUCE_POSITION", "위험 관리 우선 / 신규 진입 보류", "위험도가 높아 신규 진입보다 단기 손절 기준과 비중 관리가 우선입니다.");
  } else if (breakoutEntryScore >= 70 && breakoutRetestConfirmed && finite(breakoutRr) && breakoutRr >= 1.5) {
    setFinalAction("BREAKOUT_BUY_CANDIDATE", "돌파 매수 후보", "돌파 후 재지지와 손익비 조건이 확인되어 돌파 진입 후보로 볼 수 있습니다.");
  } else if (currentEntryScore >= 60 && finite(currentRr) && currentRr >= 1.2 && score.riskScore < 55 && !nearResistance) {
    setFinalAction("CONDITIONAL_BUY", "현재가 소액 조건부 진입 / 손절 짧게", "현재가 기준 손익비는 일부 확보되지만 짧은 손절 기준을 두고 보수적으로 접근해야 합니다.");
  } else if (pullbackEntryScore >= 75 && pullbackIsBest) {
    setFinalAction("PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다.");
  } else if (currentEntryPoor && pullbackEntryScore >= 70 && pullbackEntryScore > breakoutEntryScore) {
    setFinalAction("CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED", "현재가 진입 불리 / 눌림목 대기 우선", "현재가는 저항 또는 전환 가격에 가까워 손익비가 낮고, 주요 지지 구간에서 반등 확인 후 접근하는 편이 더 유리합니다.");
  } else if (breakoutEntryScore < 65 && pullbackEntryScore >= 65 && pivotExists && !breakoutRetestConfirmed) {
    setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기 / 눌림목 지지 확인 시 관심", "핵심 전환 가격 돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다.");
    applyMixedBreakoutPullbackGuide();
  } else if (breakoutEntryScore < 65 && pivotExists && !breakoutRetestConfirmed && priceNearOrBelowPivot) {
    setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다.");
  } else if (partialProfitAllowed) {
    setFinalAction(
      "PARTIAL_TAKE_PROFIT",
      priceLocation === "overextended" ? "급등 후 저항 근접 / 일부 익절 고려" : "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의",
      "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다.",
    );
  } else if (score.holdScore >= 70 && currentEntryScore < score.holdScore && pullbackEntryScore < score.holdScore) {
    setFinalAction("HOLD_AND_WATCH", "신규 진입보다 보유 관망 우세", "신규 진입 손익비는 제한적이지만, 보유자는 주요 지지선 이탈 전까지 관망할 수 있습니다.");
  } else if (report.finalSummary.finalAction === "CONDITIONAL_BUY" || report.finalSummary.finalAction === "BUY_CANDIDATE") {
    if (pullbackEntryScore >= Math.max(65, currentEntryScore, breakoutEntryScore)) {
      setFinalAction("PULLBACK_BUY_CANDIDATE", "눌림목 매수 후보", "현재가 추격보다 지지 확인 후 눌림목 진입을 우선 검토할 수 있는 구간입니다.");
    } else if (breakoutEntryScore >= 65 && !breakoutRetestConfirmed) {
      setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "돌파 진입은 핵심 전환 가격 돌파 후 재지지 확인까지 기다리는 편이 안전합니다.");
    }
  }

  if (report.finalSummary.finalAction === "BREAKOUT_WAIT" && report.finalSummary.title === "돌파 확인 대기 / 눌림목 지지 확인 시 관심") {
    applyMixedBreakoutPullbackGuide();
  }

  const action = report.finalSummary.finalAction;
  const buyActions: FinalAction[] = [
    "CURRENT_PARTIAL_ENTRY",
    "CURRENT_STARTER_POSITION",
    "MOMENTUM_CONTINUATION_ENTRY",
    "PRE_BREAKOUT_AGGRESSIVE_ENTRY",
    "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED",
    "PULLBACK_BUY_CANDIDATE",
    "BREAKOUT_BUY_CANDIDATE",
    "CONDITIONAL_BUY",
    "BUY_CANDIDATE",
  ];
  const waitOrHoldActions: FinalAction[] = ["NO_NEW_ENTRY_HOLD_OK", "BREAKOUT_WAIT", "WAIT_FOR_SUPPORT_CONFIRMATION", "WAIT_FOR_BREAKOUT", "WAIT_FOR_PULLBACK", "HOLD_AND_WATCH", "HOLD", "WAIT"];

  if (waitOrHoldActions.includes(action)) {
    score.buyScore = Math.min(score.buyScore, 64);
    score.holdScore = Math.max(score.holdScore, Math.min(100, score.buyScore + 10), 60);
  }
  if (action === "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED") {
    score.buyScore = Math.min(score.buyScore, 64);
  }
  if (action === "WAIT_FOR_SUPPORT_CONFIRMATION") {
    score.buyScore = Math.min(score.buyScore, 64);
    score.holdScore = Math.max(score.holdScore, 55);
  }
  if (action === "NO_NEW_ENTRY_HOLD_OK") {
    score.buyScore = Math.min(score.buyScore, 49);
  }
  if (action === "HOLD_AND_WATCH" || action === "HOLD") {
    score.holdScore = Math.max(score.holdScore, score.buyScore + 5, 65);
  }
  if (score.riskScore >= 70 && buyActions.includes(report.finalSummary.finalAction)) {
    if (score.holdScore >= 60) {
      setFinalAction("NO_NEW_ENTRY_HOLD_OK", "신규 진입보다 보유 관망 우세", "위험도가 높아 신규 진입은 불리하지만, 주요 지지선 이탈 전까지 보유 관망은 가능합니다.");
    } else {
      setFinalAction("BREAKOUT_WAIT", "돌파 확인 대기", "위험도가 높아 신규 진입보다 돌파 후 재지지 또는 지지 확인이 우선입니다.");
    }
    score.buyScore = Math.min(score.buyScore, 55);
    score.totalScore = Math.min(score.totalScore, 64);
  }
  if (buyActions.includes(report.finalSummary.finalAction) && !riskRewardAllowsEntry({ value: bestEntryRr, label: "", interpretation: "" }, 1)) {
    if (score.holdScore >= 60) {
      setFinalAction("NO_NEW_ENTRY_HOLD_OK", "신규 진입보다 보유 관망 우세", "손익비가 부족해 신규 진입은 불리하지만, 주요 지지선 이탈 전까지 보유 관망은 가능합니다.");
    } else {
      setFinalAction("WAIT_FOR_PULLBACK", "현재가 진입 불리 / 눌림목 대기 우선", "손익비가 부족해 신규 진입보다 눌림목 지지 확인을 기다리는 편이 보수적입니다.");
    }
    score.buyScore = Math.min(score.buyScore, 55);
    score.totalScore = Math.min(score.totalScore, 64);
  }
  if (report.finalSummary.finalAction === "NO_TRADE" && !(score.buyScore < 30 && score.holdScore < 40 && score.riskScore >= 70)) {
    if (score.holdScore >= 60) {
      setFinalAction("NO_NEW_ENTRY_HOLD_OK", "신규 진입보다 보유 관망 우세", "신규 진입 조건은 부족하지만, 보유자는 주요 지지선 이탈 전까지 관망 가능합니다.");
    } else {
      setFinalAction("WAIT_FOR_PULLBACK", "현재가 진입 불리 / 눌림목 대기 우선", "매매 부적합으로 단정하기보다 지지 확인 전까지 대기하는 구간입니다.");
    }
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
  score.holdScore = capHoldScoreForContext(score.holdScore, report, {
    nearResistance,
    breakoutRetestConfirmed,
    supportBroken,
    riskScore: score.riskScore,
  });
  score.totalScore = clamp(score.totalScore, 50);
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);
  score.entryScores = deriveEntryScores(report, score);
  score.explanation = entryModePreferenceExplanationClean(report, score);
  report.scoreSummary = score;
}
function validateReportConsistency(report: TradingReport) {
  const score = normalizeScoreSummary(report.scoreSummary);
  const entryScores = score.entryScores ?? {};
  const currentEntry = normalizeEntryScore(entryScores.currentEntry, "currentEntry", 0);
  const pullbackEntry = normalizeEntryScore(entryScores.pullbackEntry, "pullbackEntry", 0);
  const breakoutEntry = normalizeEntryScore(entryScores.breakoutEntry, "breakoutEntry", 0);
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const pullbackPrice = priceFromText(report.priceRoles?.pullbackEntry?.priceZone ?? report.tradePlan.entry.pullbackEntry?.priceZone);
  const shortStopPrice = priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone ?? report.priceRoles?.stopLoss?.shortTerm);
  const breakoutConfirmed = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.005;
  const nearResistance = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 0.97 && currentPrice <= pivotPrice * 1.01;
  const supportBroken = finite(currentPrice) && finite(shortStopPrice) && currentPrice < shortStopPrice;

  const cleanTargets = (targets: string[] | undefined, entryZone?: string | null, excludeZone?: string | null) => {
    const entry = priceFromText(entryZone);
    return sortPriceZones(targets ?? [])
      .filter((target) => !samePriceZone(target, entryZone))
      .filter((target) => !excludeZone || !samePriceZone(target, excludeZone))
      .filter((target) => {
        const targetPrice = priceFromText(target);
        return !finite(entry) || (finite(targetPrice) && targetPrice > entry * 1.005);
      });
  };

  const pullbackTargets = cleanTargets(report.priceRoles?.targets?.pullbackTargets, report.priceRoles?.pullbackEntry?.priceZone);
  const breakoutTargets = cleanTargets(report.priceRoles?.targets?.breakoutTargets, report.priceRoles?.pivot?.priceZone, report.priceRoles?.pivot?.priceZone);
  if (report.priceRoles?.targets) {
    report.priceRoles.targets.pullbackTargets = pullbackTargets;
    report.priceRoles.targets.breakoutTargets = breakoutTargets;
  }
  if (breakoutTargets[0]) {
    report.tradePlan.targets.firstTarget.priceZone = breakoutTargets[0];
    report.tradePlan.targets.breakoutTargets = {
      ...(report.tradePlan.targets.breakoutTargets ?? {}),
      firstTarget: { priceZone: breakoutTargets[0], action: "돌파 진입 기준 1차 목표" },
      ...(breakoutTargets[1] ? { secondTarget: { priceZone: breakoutTargets[1], action: "돌파 진입 기준 2차 목표" } } : {}),
    };
  }
  if (pullbackTargets[0]) {
    report.tradePlan.targets.pullbackTargets = {
      ...(report.tradePlan.targets.pullbackTargets ?? {}),
      firstTarget: { priceZone: pullbackTargets[0], action: "눌림목 진입 기준 1차 목표" },
      ...(pullbackTargets[1] ? { secondTarget: { priceZone: pullbackTargets[1], action: "눌림목 진입 기준 2차 목표" } } : {}),
      ...(pullbackTargets[2] ? { thirdTarget: { priceZone: pullbackTargets[2], action: "눌림목 진입 기준 3차 목표 후보" } } : {}),
    };
  }

  if (samePriceZone(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, report.priceRoles?.pullbackEntry?.priceZone)) {
    const lowerStop = nextLowerPriceZone(report.priceRoles?.pullbackEntry?.priceZone, [
      ...(report.keyLevels.supports ?? []).map((item) => item.priceZone),
      report.priceRoles?.stopLoss?.conservative,
      report.priceRoles?.stopLoss?.invalidation,
    ]);
    const replacement = lowerStop ?? "확인 필요";
    report.tradePlan.stopLoss.shortTerm = {
      priceZone: replacement,
      condition: lowerStop ? `${replacement} 이탈` : "눌림목 진입 기준 손절 가격 추가 확인 필요",
      meaning: lowerStop ? "눌림목 진입 기준 단기 손절 후보입니다." : "진입 가격과 같은 가격을 손절로 쓰지 않도록 계산을 보류합니다.",
    };
    report.tradePlan.stopLoss.priceZone = lowerStop ? `단기 ${replacement} 이탈` : "확인 필요";
    if (report.priceRoles?.stopLoss) report.priceRoles.stopLoss.shortTerm = replacement;
  }
  report.tradePlan.stopLossByEntry = deriveStopLossByEntry(report);
  const currentEntryStopPrice = priceFromText(report.tradePlan.stopLossByEntry.currentEntry?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.priceZone)
    ?? priceFromText(report.priceRoles?.stopLoss?.shortTerm);
  const currentEntryTargetPrice = priceFromText(cleanTargets([...pullbackTargets, ...breakoutTargets], report.priceRoles?.current?.priceZone)[0]);
  const pullbackEntryStopPrice = priceFromText(report.tradePlan.stopLossByEntry.pullbackEntry?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.priceZone);
  const breakoutEntryStopPrice = priceFromText(report.tradePlan.stopLossByEntry.breakoutEntry?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.shortTerm?.priceZone)
    ?? priceFromText(report.tradePlan.stopLoss.priceZone);

  report.tradePlan.riskRewardByEntry = {
    current: riskReward(
      currentPrice,
      currentEntryStopPrice,
      currentEntryTargetPrice,
    ),
    pullback: riskReward(
      pullbackPrice,
      pullbackEntryStopPrice,
      priceFromText(pullbackTargets[0]),
    ),
    breakout: riskReward(
      pivotPrice,
      breakoutEntryStopPrice,
      priceFromText(breakoutTargets[0]),
    ),
  };
  if (finite(report.tradePlan.riskRewardByEntry.current?.value) && finite(currentEntryStopPrice)) {
    const stopText = formatPrice(currentEntryStopPrice);
    report.tradePlan.riskRewardByEntry.current.interpretation = `단, ${stopText} 지지 이탈 시 빠른 손절이 필요합니다.`;
  }

  const currentRr = report.tradePlan.riskRewardByEntry.current?.value ?? null;
  const pullbackRr = report.tradePlan.riskRewardByEntry.pullback?.value ?? null;
  if (finite(currentRr) && currentRr < 1) {
    currentEntry.score = Math.min(currentEntry.score, 49);
    currentEntry.label = "현재가 진입 불리";
    currentEntry.explanation = "현재가 기준 손익비가 1 미만이므로 추격매수에는 불리합니다.";
  }
  if (finite(pullbackRr) && pullbackRr >= 1.5 && currentEntry.score < pullbackEntry.score) {
    pullbackEntry.explanation = "눌림목 기준 손익비가 더 좋아 현재가 추격보다 지지 확인 후 진입이 유리합니다.";
  }
  const breakoutHasUsableSetup = finite(pivotPrice) && finite(breakoutEntryStopPrice) && finite(priceFromText(breakoutTargets[0]));
  const breakoutRr = report.tradePlan.riskRewardByEntry.breakout?.value ?? null;
  if (!breakoutConfirmed) {
    if (breakoutHasUsableSetup && finite(breakoutRr) && breakoutRr >= 1) {
      breakoutEntry.score = Math.max(Math.min(breakoutEntry.score, 55), 40);
      breakoutEntry.label = "돌파 확인 필요";
      breakoutEntry.explanation = "돌파 후 재지지가 확인되기 전까지는 부적합보다 확인 대기 구간으로 보는 것이 자연스럽습니다.";
    } else if (breakoutEntry.score < 60) {
      breakoutEntry.score = Math.min(breakoutEntry.score, 59);
      breakoutEntry.label = "돌파 진입 확인 필요";
      breakoutEntry.explanation = "돌파 목표나 손절 기준이 부족해 돌파 진입은 추가 확인이 필요합니다.";
    }
  }

  score.entryScores = applyEntryScoreConsistencyCaps(report, score, { currentEntry, pullbackEntry, breakoutEntry });
  const consistentEntries = score.entryScores;
  const consistentCurrentEntry = consistentEntries.currentEntry!;
  const consistentPullbackEntry = consistentEntries.pullbackEntry!;
  const consistentBreakoutEntry = consistentEntries.breakoutEntry!;
  score.holdScore = capHoldScoreForContext(score.holdScore, report, {
    nearResistance,
    breakoutRetestConfirmed: breakoutConfirmed,
    supportBroken,
    riskScore: score.riskScore,
  });
  score.holdLabel = holdScoreLabel(score.holdScore);

  const entryValues = [consistentCurrentEntry.score, consistentPullbackEntry.score, consistentBreakoutEntry.score];
  const allEntriesWeak = entryValues.every((value) => value < 30);
  const pullbackIsHighest = consistentPullbackEntry.score >= consistentCurrentEntry.score && consistentPullbackEntry.score >= consistentBreakoutEntry.score;
  const terminalRisk = report.finalSummary.finalAction === "SELL_RISK" || report.finalSummary.finalAction === "REDUCE_POSITION";
  const marketContext = deriveMarketContext(report);
  const chartRegime = deriveChartRegime(report);
  report.marketContext = {
    ...marketContext,
    ...report.marketContext,
    chartRegime: chartRegime.regime,
    chartRegimeConfidence: chartRegime.confidence,
    chartRegimeReasons: chartRegime.reasons,
  };
  const supportArea = report.marketContext.priceLocation === "near_support" || report.marketContext.priceLocation === "lower_range";
  const priceLocation = report.marketContext.priceLocation;
  const regime = report.marketContext.chartRegime ?? chartRegime.regime;
  const partialProfitAllowed = Boolean(
    report.marketContext.nearResistance &&
      (priceLocation === "upper_range" || priceLocation === "near_resistance" || priceLocation === "overextended") &&
      finite(currentRr) &&
      currentRr < 1 &&
      score.holdScore >= 60 &&
      !supportArea,
  );

  if (!terminalRisk && regime === "support_breakdown") {
    report.finalSummary.finalAction = "SELL_RISK";
    report.finalSummary.title = "위험 관리 / 신규 진입 보류";
    report.finalSummary.oneLineConclusion = "주요 지지선 이탈이 확인되어 신규 진입보다 손절 기준과 비중 관리가 우선입니다.";
  } else if (!terminalRisk && regime === "downtrend") {
    report.finalSummary.finalAction = "WAIT_FOR_SUPPORT_CONFIRMATION";
    if (supportArea) {
      report.finalSummary.title = "하락 추세 반등 대기 / 지지 확인 필요";
      report.finalSummary.oneLineConclusion = "현재 구간은 기술적 반등 가능성은 있으나, 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.";
    } else if (report.marketContext.nearResistance) {
      report.finalSummary.title = "추세 전환 확인 대기";
      report.finalSummary.oneLineConclusion = "주요 저항 회복 또는 돌파 후 재지지 확인 전까지 신규 진입은 보류하는 것이 유리합니다.";
    } else {
      report.finalSummary.title = "하락 추세 / 신규 진입 보류";
      report.finalSummary.oneLineConclusion = "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다. 주요 저항 회복 또는 추세 전환 확인이 필요합니다.";
    }
  } else if (!terminalRisk && regime === "downtrend_rebound") {
    report.finalSummary.finalAction = "BREAKOUT_WAIT";
    report.finalSummary.title = report.marketContext.nearResistance ? "저항권 테스트 / 추격매수 주의" : "하락추세 반등 / 돌파 확인 대기";
    report.finalSummary.oneLineConclusion = "하락 이후 반등 구간은 추세 전환 확인 전까지 저항 돌파와 재지지 확인이 우선입니다.";
  } else if (!terminalRisk && (regime === "overextended_surge" || regime === "overheated_breakout")) {
    if (consistentPullbackEntry.score >= 65 && finite(pullbackRr) && pullbackRr >= 1.2) {
      report.finalSummary.finalAction = "WAIT_FOR_PULLBACK";
      report.finalSummary.title = regime === "overheated_breakout" ? "추격매수 주의 / 재지지 확인" : "급등 후 눌림 대기 / 지지 확인 시 관심";
      report.finalSummary.oneLineConclusion = "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리하고, 주요 지지 구간까지 눌림과 반등 확인이 필요합니다.";
    } else {
      report.finalSummary.finalAction = "PARTIAL_TAKE_PROFIT";
      report.finalSummary.title = score.holdScore >= 60
        ? "보유자는 일부 익절 고려 / 미보유자는 눌림 대기"
        : (regime === "overheated_breakout" ? "과열권 돌파 후 조정 대기" : "급등 후 저항 근접 / 추격매수 주의");
      report.finalSummary.oneLineConclusion = "보유자는 일부 익절을 고려할 수 있지만, 미보유자는 주요 지지 구간까지 눌림을 기다리는 전략이 유리합니다.";
    }
  } else if (!terminalRisk && regime === "breakout_retest_confirmed") {
    if (consistentBreakoutEntry.score >= 75 && finite(breakoutRr) && breakoutRr >= 1.5) {
      report.finalSummary.finalAction = "BREAKOUT_BUY_CANDIDATE";
      report.finalSummary.title = "돌파 후 재지지 확인 / 돌파 매수 후보";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 위에서 재지지가 유지되고 손익비가 충족되면 조건부 돌파 진입 후보로 볼 수 있습니다.";
    } else if (consistentBreakoutEntry.score >= 65) {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 후 지지 전환 후보 / 확인 필요";
      report.finalSummary.oneLineConclusion = "피벗 위에서 버티는 흐름은 확인되지만 이미지 기반 신뢰도와 손익비를 추가 확인해야 합니다.";
    } else {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 실패 위험 / 재이탈 주의";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 위 재지지가 약하면 재이탈 시 돌파 실패로 볼 수 있습니다.";
    }
  } else if (!terminalRisk && regime === "resistance_test") {
    report.finalSummary.finalAction = "BREAKOUT_WAIT";
    report.finalSummary.title = "저항권 테스트 / 돌파 확인 대기";
    report.finalSummary.oneLineConclusion = "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.";
  } else if (!terminalRisk && regime === "breakout_wait") {
    report.finalSummary.finalAction = "BREAKOUT_WAIT";
    if (consistentPullbackEntry.score >= 65) {
      report.finalSummary.title = "돌파 확인 대기 / 눌림목 지지 확인 시 관심";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다.";
    } else {
      report.finalSummary.title = "돌파 확인 대기";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다.";
    }
  } else if (!terminalRisk && regime === "range_upper_resistance") {
    if (partialProfitAllowed) {
      report.finalSummary.finalAction = "PARTIAL_TAKE_PROFIT";
      report.finalSummary.title = priceLocation === "overextended" ? "급등 후 저항 근접 / 일부 익절 고려" : "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의";
      report.finalSummary.oneLineConclusion = "가격이 주요 저항 또는 목표 구간에 가까워 보유자는 일부 익절 또는 돌파 확인이 우선이고, 미보유자는 추격매수에 주의해야 합니다.";
    } else {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 확인 대기";
      report.finalSummary.oneLineConclusion = "박스권 상단 또는 저항권에서는 추격매수보다 돌파 후 재지지 확인이 우선입니다.";
    }
  } else if (!terminalRisk && regime === "range_lower_support") {
    const strongPullbackSetup = consistentPullbackEntry.score >= 60 || (finite(pullbackRr) && pullbackRr >= 1.2);
    if (strongPullbackSetup) {
      report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
      report.finalSummary.title = "지지권 눌림목 매수 후보";
      report.finalSummary.oneLineConclusion = "주요 지지권에서 손절과 목표가가 비교적 분리되어 있어 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다.";
    } else {
      report.finalSummary.finalAction = "WAIT_FOR_SUPPORT_CONFIRMATION";
      report.finalSummary.title = "지지 확인 대기";
      report.finalSummary.oneLineConclusion = "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.";
    }
  } else if (!terminalRisk && regime === "uptrend_pullback") {
    report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
    report.finalSummary.title = "상승추세 눌림 / 지지 확인 시 관심";
    report.finalSummary.oneLineConclusion = "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (!terminalRisk && regime === "uptrend_consolidation") {
    report.finalSummary.finalAction = "WAIT_FOR_PULLBACK";
    report.finalSummary.title = "상승추세 조정 / 지지 확인 필요";
    report.finalSummary.oneLineConclusion = "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다.";
  } else if (!terminalRisk && regime === "healthy_pullback") {
    report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
    report.finalSummary.title = "눌림목 매수 후보";
    report.finalSummary.oneLineConclusion = "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 둘 수 있어 눌림목 진입 조건이 가장 유리합니다.";
  } else if (!terminalRisk && regime === "sideways") {
    report.finalSummary.finalAction = "WAIT_FOR_SUPPORT_CONFIRMATION";
    report.finalSummary.title = "방향 확인 대기";
    report.finalSummary.oneLineConclusion = "지지와 저항 사이 중간 구간이어서 돌파 또는 지지 반응 확인이 필요합니다.";
  } else if (!terminalRisk && allEntriesWeak && score.holdScore < 40 && score.riskScore >= 70) {
    report.finalSummary.finalAction = "NO_TRADE";
    report.finalSummary.title = "매매 부적합";
    report.finalSummary.oneLineConclusion = "현재가, 눌림목, 돌파 진입 조건과 보유 조건이 모두 약해 신규 대응은 부적합합니다.";
    score.totalScore = Math.min(score.totalScore, 49);
  } else if (report.finalSummary.finalAction === "NO_TRADE" && score.holdScore >= 40) {
    report.finalSummary.finalAction = score.holdScore >= 60 ? "NO_NEW_ENTRY_HOLD_OK" : "WAIT_FOR_PULLBACK";
    report.finalSummary.title = score.holdScore >= 60 ? "신규 진입보다 보유 관망 우세" : "신규 진입 보류 / 눌림목 대기";
    report.finalSummary.oneLineConclusion = score.holdScore >= 60
      ? "신규 진입 조건은 약하지만 보유자는 주요 지지선 이탈 전까지 관망 가능합니다."
      : "매매 부적합으로 단정하기보다 주요 지지 반응 확인 전까지 대기하는 구간입니다.";
  } else if (report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE" && (breakoutEntry.score < 60 || !breakoutConfirmed)) {
    report.finalSummary.finalAction = "BREAKOUT_WAIT";
    report.finalSummary.title = "돌파 확인 대기";
    report.finalSummary.oneLineConclusion = "핵심 전환 가격 돌파 후 재지지 확인 전까지는 돌파 매수 후보로 보기 어렵습니다.";
  } else if (!terminalRisk && regime === "breakout_retest_confirmed") {
    if (consistentBreakoutEntry.score >= 75 && finite(breakoutRr) && breakoutRr >= 1.5) {
      report.finalSummary.finalAction = "BREAKOUT_BUY_CANDIDATE";
      report.finalSummary.title = "돌파 후 재지지 확인 / 돌파 매수 후보";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 위에서 재지지가 유지되고 손익비가 충족되면 조건부 돌파 진입 후보로 볼 수 있습니다.";
    } else if (consistentBreakoutEntry.score >= 65) {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 후 지지 전환 후보 / 확인 필요";
      report.finalSummary.oneLineConclusion = "피벗 위에서 버티는 흐름은 확인되지만 이미지 기반 신뢰도와 손익비를 추가 확인해야 합니다.";
    } else {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = "돌파 실패 위험 / 재이탈 주의";
      report.finalSummary.oneLineConclusion = "핵심 전환 가격 위 재지지가 약하면 재이탈 시 돌파 실패로 볼 수 있습니다.";
    }
  } else if (!terminalRisk && regime === "downtrend") {
    report.finalSummary.finalAction = "WAIT_FOR_SUPPORT_CONFIRMATION";
    if (breakoutConfirmed && consistentBreakoutEntry.score >= 60) {
      report.finalSummary.title = "추세 전환 후보 / 돌파 후 재지지 확인";
      report.finalSummary.oneLineConclusion = "하락 흐름 이후 핵심 저항 회복 가능성이 보이지만, 돌파 후 재지지 유지 확인이 필요합니다.";
    } else if (supportArea) {
      report.finalSummary.title = "하락 추세 반등 대기 / 지지 확인 필요";
      report.finalSummary.oneLineConclusion = "현재 구간은 기술적 반등 가능성은 있으나, 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.";
    } else if (report.marketContext.nearResistance) {
      report.finalSummary.title = "추세 전환 확인 대기";
      report.finalSummary.oneLineConclusion = "주요 저항 회복 또는 돌파 후 재지지 확인 전까지 신규 진입은 보류하는 것이 유리합니다.";
    } else {
      report.finalSummary.title = "하락 추세 / 신규 진입 보류";
      report.finalSummary.oneLineConclusion = "하락 추세에서는 지지권 반등만으로 매수 후보를 강하게 보기 어렵습니다. 주요 저항 회복 또는 추세 전환 확인이 필요합니다.";
    }
  } else if (!terminalRisk && (regime === "overextended_surge" || regime === "overheated_breakout")) {
    if (breakoutConfirmed && consistentBreakoutEntry.score >= 60) {
      report.finalSummary.finalAction = "BREAKOUT_WAIT";
      report.finalSummary.title = regime === "overheated_breakout" ? "급등 돌파 후 재지지 확인" : "돌파 후 재지지 확인 시 잔여 상승 가능";
      report.finalSummary.oneLineConclusion = "급등 이후에도 핵심 가격 위에서 재지지가 유지되면 잔여 상승 가능성은 있지만, 현재가 추격보다 재지지 확인이 우선입니다.";
    } else if (consistentPullbackEntry.score >= 65 && finite(pullbackRr) && pullbackRr >= 1.2) {
      report.finalSummary.finalAction = "WAIT_FOR_PULLBACK";
      report.finalSummary.title = regime === "overheated_breakout" ? "추격매수 주의 / 재지지 확인" : "급등 후 눌림 대기 / 지지 확인 시 관심";
      report.finalSummary.oneLineConclusion = "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리하고, 주요 지지 구간까지 눌림과 반등 확인이 필요합니다.";
    } else {
      report.finalSummary.finalAction = "PARTIAL_TAKE_PROFIT";
      report.finalSummary.title = score.holdScore >= 60
        ? "보유자는 일부 익절 고려 / 미보유자는 눌림 대기"
        : (regime === "overheated_breakout" ? "과열권 돌파 후 조정 대기" : "급등 후 저항 근접 / 추격매수 주의");
      report.finalSummary.oneLineConclusion = "보유자는 일부 익절을 고려할 수 있지만, 미보유자는 주요 지지 구간까지 눌림을 기다리는 전략이 유리합니다.";
    }
  } else if (!terminalRisk && supportArea) {
    const strongPullbackSetup = consistentPullbackEntry.score >= 75 || (finite(pullbackRr) && pullbackRr >= 1.5);
    if (regime !== "range_lower_support" && (consistentPullbackEntry.score >= 60 || (finite(pullbackRr) && pullbackRr >= 1.2))) {
      report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
      report.finalSummary.title = "지지권 눌림목 매수 후보";
      report.finalSummary.oneLineConclusion = "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 지지 반응 확인 후 눌림목 진입을 우선 검토할 수 있습니다.";
    } else if (regime === "range_lower_support" && strongPullbackSetup) {
      report.finalSummary.finalAction = "PULLBACK_BUY_CANDIDATE";
      report.finalSummary.title = "지지권 눌림목 매수 후보";
      report.finalSummary.oneLineConclusion = "주요 지지권에서 손절과 목표가가 비교적 분리되어 있어 반등 확인 시 눌림목 진입 후보로 볼 수 있습니다.";
    } else {
      report.finalSummary.finalAction = "WAIT_FOR_SUPPORT_CONFIRMATION";
      report.finalSummary.title = "지지 확인 대기";
      report.finalSummary.oneLineConclusion = "박스권 하단 또는 주요 지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.";
    }
  } else if (!terminalRisk && pullbackIsHighest && consistentPullbackEntry.score >= 65) {
    report.finalSummary.finalAction = consistentCurrentEntry.score < 50 ? "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED" : "PULLBACK_BUY_CANDIDATE";
    report.finalSummary.title = consistentCurrentEntry.score < 50 ? "현재가 진입 불리 / 눌림목 대기 우선" : "눌림목 매수 후보";
    report.finalSummary.oneLineConclusion = consistentCurrentEntry.score < 50
      ? "현재가 추격매수보다 주요 지지 구간에서 반등 확인 후 진입하는 전략이 더 유리합니다."
      : "주요 지지 구간에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (!terminalRisk && consistentCurrentEntry.score < 50 && score.holdScore >= 60) {
    report.finalSummary.finalAction = "NO_NEW_ENTRY_HOLD_OK";
    report.finalSummary.title = "신규 진입보다 보유 관망 우세";
    report.finalSummary.oneLineConclusion = "현재가 진입은 불리하지만 보유자는 주요 지지선 이탈 전까지 관망 가능합니다.";
  }

  if (!partialProfitAllowed && report.finalSummary.finalAction === "PARTIAL_TAKE_PROFIT") {
    if (regime === "overextended_surge" || regime === "overheated_breakout") {
      report.finalSummary.title = score.holdScore >= 60
        ? "보유자는 일부 익절 고려 / 미보유자는 눌림 대기"
        : (regime === "overheated_breakout" ? "과열권 돌파 후 조정 대기" : "급등 후 저항 근접 / 추격매수 주의");
      report.finalSummary.oneLineConclusion = "단기 급등 후 저항 구간에 가까워 현재가 추격매수는 불리합니다. 눌림목 진입은 지지 구간 반등 확인 이후에만 후보로 봅니다.";
    } else if (supportArea) {
      report.finalSummary.finalAction = consistentPullbackEntry.score >= 60 ? "PULLBACK_BUY_CANDIDATE" : "WAIT_FOR_SUPPORT_CONFIRMATION";
      report.finalSummary.title = consistentPullbackEntry.score >= 60 ? "지지권 눌림목 매수 후보" : "지지 확인 대기";
      report.finalSummary.oneLineConclusion = consistentPullbackEntry.score >= 60
        ? "지지 구간에 가까워 일부 익절보다 반등 확인 후 눌림목 진입을 우선 검토할 수 있습니다."
        : "지지 구간에 가까워 일부 익절보다 반등 확인이 우선입니다.";
    } else {
      report.finalSummary.finalAction = score.holdScore >= 70 ? "HOLD_AND_WATCH" : "BREAKOUT_WAIT";
      report.finalSummary.title = score.holdScore >= 70 ? "신규 진입보다 보유 관망 우세" : "돌파 확인 대기";
      report.finalSummary.oneLineConclusion = score.holdScore >= 70
        ? "보유자는 지지선 이탈 전까지 관망 가능하지만, 미보유자는 진입 조건 확인이 필요합니다."
        : "일부 익절 조건이 명확하지 않아 돌파 또는 지지 확인 전까지 대기가 유리합니다.";
    }
  }
  if (report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE" && (!breakoutConfirmed || consistentBreakoutEntry.score < 65)) {
    report.finalSummary.finalAction = "BREAKOUT_WAIT";
    report.finalSummary.title = "돌파 확인 대기";
    report.finalSummary.oneLineConclusion = "돌파 후 재지지와 손익비가 충분히 확인되기 전까지는 돌파 매수 후보로 보기 어렵습니다.";
  }
  if ((report.finalSummary.finalAction === "CONDITIONAL_BUY" || report.finalSummary.finalAction === "BUY_CANDIDATE") && consistentCurrentEntry.score < 50) {
    report.finalSummary.finalAction = consistentPullbackEntry.score >= 65 ? "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED" : "WAIT_FOR_PULLBACK";
    report.finalSummary.title = consistentPullbackEntry.score >= 65 ? "현재가 진입 불리 / 눌림목 대기 우선" : "현재가 진입 불리 / 눌림목 대기 우선";
    report.finalSummary.oneLineConclusion = consistentPullbackEntry.score >= 65
      ? "현재가 진입은 불리하지만 주요 지지 구간에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다."
      : "현재가 기준 손익비가 낮아 신규 진입보다 지지 확인을 기다리는 편이 보수적입니다.";
  }
  const pullbackOverrideAllowed = ![
    "downtrend",
    "overextended_surge",
    "overheated_breakout",
    "breakout_retest_confirmed",
    "breakout_wait",
    "range_upper_resistance",
  ].includes(regime);
  if (!terminalRisk && pullbackOverrideAllowed && pullbackIsHighest && consistentPullbackEntry.score >= 65 && !/눌림목|지지/.test(report.finalSummary.title)) {
    report.finalSummary.finalAction = consistentCurrentEntry.score < 50 ? "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED" : "PULLBACK_BUY_CANDIDATE";
    report.finalSummary.title = consistentCurrentEntry.score < 50 ? "현재가 진입 불리 / 눌림목 대기 우선" : "눌림목 매수 후보";
    report.finalSummary.oneLineConclusion = "현재가보다 주요 지지 구간의 반등 확인을 우선하는 편이 점수와 손익비 측면에서 더 자연스럽습니다.";
  }
  const supportConditionZone = safeDisplayText(
    report.keyLevels.supports?.[0]?.priceZone
      ?? report.priceRoles?.pullbackEntry?.priceZone
      ?? report.tradePlan.stopLoss.shortTerm?.priceZone
      ?? report.tradePlan.stopLossByEntry?.currentEntry?.priceZone,
    "",
  );
  const stopConditionZone = safeDisplayText(
    report.tradePlan.stopLossByEntry?.currentEntry?.priceZone
      ?? report.tradePlan.stopLoss.shortTerm?.priceZone
      ?? supportConditionZone,
    "",
  );
  const supportFocusedAction =
    supportArea ||
    report.finalSummary.finalAction === "PULLBACK_BUY_CANDIDATE" ||
    report.finalSummary.finalAction === "WAIT_FOR_SUPPORT_CONFIRMATION" ||
    /지지권|눌림목/.test(report.finalSummary.title);
  if (!terminalRisk && supportFocusedAction && supportConditionZone) {
    if (!report.finalSummary.title.includes(supportConditionZone) && /지지권|지지 확인|눌림목/.test(report.finalSummary.title)) {
      report.finalSummary.title = `${report.finalSummary.title} / ${supportConditionZone} 지지 확인 필요`;
    }
    if (stopConditionZone && !report.finalSummary.oneLineConclusion.includes("이탈 시 관점 약화")) {
      report.finalSummary.oneLineConclusion = `${report.finalSummary.oneLineConclusion} ${stopConditionZone} 이탈 시 관점 약화에 유의해야 합니다.`;
    }
  }

  if (score.riskScore >= 60 && score.totalScore >= 80) score.totalScore = 79;
  if (report.analysisMeta?.dataBasis !== "image_with_ohlcv" && score.holdScore >= 90) {
    score.holdScore = 85;
    score.holdLabel = holdScoreLabel(score.holdScore);
  }
  score.totalScore = clamp(score.totalScore, 50);
  score.totalLabel = scoreLabel(score.totalScore);
  score.label = score.totalLabel;
  score.buyScore = clamp(score.buyScore, 40);
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.riskScore = clamp(score.riskScore, 50);
  score.riskLabel = riskScoreLabel(score.riskScore);
  score.explanation = entryModePreferenceExplanationClean(report, score);
  report.scoreSummary = score;
}

function deriveControlledAggressiveActionState(
  report: TradingReport,
  score: ScoreSummary,
  entries: {
    currentEntry?: EntryModeScore;
    pullbackEntry?: EntryModeScore;
    breakoutEntry?: EntryModeScore;
  },
  regime: ChartRegime,
  marketContext: MarketContext,
  supportBroken: boolean,
): TradingActionState | null {
  const currentScore = entries.currentEntry?.score ?? 0;
  const pullbackScore = entries.pullbackEntry?.score ?? 0;
  const breakoutScore = entries.breakoutEntry?.score ?? 0;
  const currentPriceZone = report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone;
  const currentPrice = priceFromText(currentPriceZone);
  const pivotPrice = priceFromText(report.priceRoles?.pivot?.priceZone ?? report.analysisMeta?.keyPivotPrice ?? report.tradePlan.transitionLevel?.priceZone);
  const supportPrice = priceFromText(
    report.priceRoles?.pullbackEntry?.priceZone ??
      report.keyLevels.supports?.[0]?.priceZone ??
      report.tradePlan.stopLoss.shortTerm?.priceZone ??
      report.tradePlan.stopLoss.priceZone,
  );
  const currentStop = priceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const resistancePrice = priceFromText(
    report.keyLevels.resistances?.[0]?.priceZone ??
      report.priceRoles?.pivot?.priceZone ??
      report.analysisMeta?.keyPivotPrice ??
      report.tradePlan.transitionLevel?.priceZone,
  );
  const targetZone = filterTargetsAbove(currentPriceZone, [
    ...(report.priceRoles?.targets?.breakoutTargets ?? []),
    ...(report.priceRoles?.targets?.pullbackTargets ?? []),
    report.tradePlan.targets.firstTarget?.priceZone,
    report.tradePlan.targets.secondTarget?.priceZone,
    report.analysisMeta?.mainResistances?.[1],
  ])[0];
  const targetPrice = priceFromText(targetZone);
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value ?? report.tradePlan.riskReward?.value ?? null;
  const stopDistance = finite(currentPrice) && finite(currentStop) && currentStop < currentPrice
    ? ((currentPrice - currentStop) / currentPrice) * 100
    : null;
  const supportDistance = finite(currentPrice) && finite(supportPrice) && supportPrice < currentPrice
    ? ((currentPrice - supportPrice) / currentPrice) * 100
    : null;
  const targetGap = finite(currentPrice) && finite(targetPrice) && targetPrice > currentPrice
    ? ((targetPrice - currentPrice) / currentPrice) * 100
    : null;
  const resistanceGap = finite(currentPrice) && finite(resistancePrice) && resistancePrice > currentPrice
    ? ((resistancePrice - currentPrice) / currentPrice) * 100
    : null;
  const priceUnitExtremelyUncertain =
    report.analysisMeta?.priceUnitConfidence === "low" &&
    /확인 필요|미확인|unknown|uncertain/i.test(safeText(report.analysisMeta?.priceUnit, ""));
  const evidenceText = [
    ...(report.evidence?.positive ?? []),
    ...(report.indicatorAnalysis?.confirmed ?? []).map((item) => `${item.name} ${item.signal} ${item.explanation}`),
    ...(report.marketContext?.chartRegimeReasons ?? []),
    report.scoreSummary?.explanation,
    report.finalSummary?.reason,
  ].map((item) => safeText(item, "")).join(" ");
  const momentumPositive = /상승|우호|골든크로스|정배열|거래량 증가|돌파|재지지|모멘텀|매수세|positive|bullish|MACD/i.test(evidenceText);
  const overboughtCaution = /과매수|과열|overbought|overheating|RSI[^0-9]{0,20}(?:7[0-9]|8[0-9]|9[0-9]|100)/i.test(evidenceText);
  const extremeOverheated =
    /(RSI[^0-9]{0,20}(?:8[0-9]|9[0-9]|100)|극단|포물선|parabolic|extreme)/i.test(evidenceText) &&
    (regime === "overheated_breakout" || regime === "overextended_surge" || Boolean(marketContext.isExtendedMove));
  const validStop = finite(currentPrice) && finite(currentStop) && currentStop < currentPrice;
  const stopTight = validStop && stopDistance !== null && stopDistance <= 6;
  const stopManageable = validStop && stopDistance !== null && stopDistance <= 8;
  const targetGapVeryLow = targetGap === null || targetGap <= 1.5;
  const targetGapMeaningful = targetGap !== null && targetGap >= 2.5;
  const currentRrUsable = finite(currentRr) ? currentRr >= 1.2 : stopTight && targetGapMeaningful;
  const currentRrStrong = finite(currentRr) ? currentRr >= 1.5 : stopTight && targetGap !== null && targetGap >= 3;
  const nearSupport =
    Boolean(marketContext.nearSupport) ||
    marketContext.priceLocation === "near_support" ||
    marketContext.priceLocation === "lower_range" ||
    (supportDistance !== null && supportDistance <= 4);
  const nearResistance =
    Boolean(marketContext.nearResistance) ||
    marketContext.priceLocation === "near_resistance" ||
    marketContext.priceLocation === "upper_range";
  const priceAbovePivot = finite(currentPrice) && finite(pivotPrice) && currentPrice >= pivotPrice * 1.002;
  const justBelowResistance = nearResistance && resistanceGap !== null && resistanceGap <= 2.5;
  const pullbackClearlyBetter = pullbackScore >= 70 && pullbackScore >= currentScore + 20;
  const supportiveRegime =
    regime === "uptrend_pullback" ||
    regime === "uptrend_consolidation" ||
    regime === "breakout_retest_confirmed" ||
    regime === "healthy_pullback";
  const hardSafetyBlock =
    supportBroken ||
    regime === "support_breakdown" ||
    (regime === "downtrend" && !marketContext.breakoutRetestConfirmed) ||
    score.riskScore >= 70 ||
    priceUnitExtremelyUncertain ||
    !validStop ||
    targetGapVeryLow ||
    (overboughtCaution && !marketContext.breakoutRetestConfirmed) ||
    extremeOverheated;

  if (hardSafetyBlock) return null;

  if (
    currentScore >= 55 &&
    currentScore <= 75 &&
    supportiveRegime &&
    !pullbackClearlyBetter &&
    (nearSupport || marketContext.breakoutRetestConfirmed || priceAbovePivot) &&
    stopManageable &&
    currentRrUsable &&
    score.riskScore < 60
  ) {
    return "CURRENT_PARTIAL_ENTRY";
  }

  if (
    currentScore >= 45 &&
    currentScore <= 65 &&
    momentumPositive &&
    !pullbackClearlyBetter &&
    stopManageable &&
    targetGapMeaningful &&
    score.riskScore < 65 &&
    regime !== "range_lower_support" &&
    (!nearResistance || marketContext.breakoutRetestConfirmed || priceAbovePivot)
  ) {
    return "CURRENT_STARTER_POSITION";
  }

  if (
    currentScore >= 60 &&
    momentumPositive &&
    (priceAbovePivot || marketContext.breakoutRetestConfirmed) &&
    currentRrStrong &&
    targetGap !== null &&
    targetGap >= 3 &&
    score.riskScore < 55 &&
    regime !== "resistance_test" &&
    regime !== "range_upper_resistance"
  ) {
    return "MOMENTUM_CONTINUATION_ENTRY";
  }

  if (
    currentScore >= 45 &&
    breakoutScore >= 55 &&
    justBelowResistance &&
    momentumPositive &&
    stopTight &&
    targetGap !== null &&
    targetGap >= 3 &&
    score.riskScore < 60 &&
    !marketContext.breakoutRetestConfirmed
  ) {
    return "PRE_BREAKOUT_AGGRESSIVE_ENTRY";
  }

  return null;
}

function inferTradingActionState(report: TradingReport): TradingActionState {
  const explicitState = knownTradingActionState(report.finalSummary.actionState)
    ? report.finalSummary.actionState
    : null;
  const score = normalizeScoreSummary(report.scoreSummary);
  const entries = score.entryScores ?? deriveEntryScores(report, score) ?? {};
  const current = entries.currentEntry?.score ?? 0;
  const pullback = entries.pullbackEntry?.score ?? 0;
  const breakout = entries.breakoutEntry?.score ?? 0;
  const marketContext = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  const regime = report.marketContext?.chartRegime ?? deriveChartRegime(report).regime;
  const location = report.marketContext?.priceLocation ?? marketContext.priceLocation;
  const action = report.finalSummary.finalAction;
  const currentPrice = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const stopPrice = priceFromText(report.tradePlan.stopLossByEntry?.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone);
  const supportBroken = finite(currentPrice) && finite(stopPrice) && currentPrice < stopPrice * 0.995;

  if (action === "NO_TRADE" || supportBroken || regime === "support_breakdown" || (score.riskScore >= 85 && current < 25 && pullback < 30)) return "AVOID";
  if (action === "SELL_RISK" || action === "REDUCE_POSITION" || regime === "overextended_surge" || regime === "overheated_breakout" || score.riskScore >= 75) return "HIGH_RISK";
  if (explicitState === "HIGH_RISK" || explicitState === "AVOID") return explicitState;
  if (explicitState === "STRONG_BUY") return explicitState;
  const controlledAggressiveState = deriveControlledAggressiveActionState(report, score, entries, regime, marketContext, supportBroken);
  if (explicitState && explicitState === controlledAggressiveState) return explicitState;
  if (controlledAggressiveState) return controlledAggressiveState;
  if (explicitState && !isControlledAggressiveActionState(explicitState)) return explicitState;
  if (regime === "breakout_retest_confirmed" && breakout >= 65 && score.riskScore < 60) return "STRONG_BUY";
  if (regime === "breakout_wait" || regime === "range_upper_resistance" || regime === "resistance_test" || regime === "downtrend_rebound" || action === "BREAKOUT_WAIT" || action === "WAIT_FOR_BREAKOUT") return "BREAKOUT_WAIT";
  if (regime === "downtrend") {
    return report.marketContext?.nearResistance || breakout >= Math.max(current, pullback) ? "BREAKOUT_WAIT" : "HOLD_ONLY";
  }
  if (action === "HOLD_AND_WATCH" || action === "NO_NEW_ENTRY_HOLD_OK" || action === "HOLD") return "HOLD_ONLY";
  if (regime === "uptrend_pullback" || regime === "uptrend_consolidation" || regime === "range_lower_support" || regime === "healthy_pullback" || action === "PULLBACK_BUY_CANDIDATE" || action === "CURRENT_ENTRY_UNFAVORABLE_PULLBACK_PREFERRED" || location === "near_support" || location === "lower_range") return "PULLBACK_ENTRY";
  if ((action === "CONDITIONAL_BUY" || action === "BUY_CANDIDATE" || action === "BREAKOUT_BUY_CANDIDATE") && score.totalScore >= 65 && score.riskScore < 55) return "STRONG_BUY";
  if (score.holdScore >= 60 && current < 45) return "HOLD_ONLY";
  if (pullback >= Math.max(current, breakout, 65)) return "PULLBACK_ENTRY";
  return "BREAKOUT_WAIT";
}

function stateFinalAction(state: TradingActionState): FinalAction {
  if (state === "STRONG_BUY") return "BREAKOUT_BUY_CANDIDATE";
  if (state === "CURRENT_PARTIAL_ENTRY") return "CURRENT_PARTIAL_ENTRY";
  if (state === "CURRENT_STARTER_POSITION") return "CURRENT_STARTER_POSITION";
  if (state === "MOMENTUM_CONTINUATION_ENTRY") return "MOMENTUM_CONTINUATION_ENTRY";
  if (state === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") return "PRE_BREAKOUT_AGGRESSIVE_ENTRY";
  if (state === "PULLBACK_ENTRY") return "PULLBACK_BUY_CANDIDATE";
  if (state === "BREAKOUT_WAIT") return "BREAKOUT_WAIT";
  if (state === "HOLD_ONLY") return "HOLD_AND_WATCH";
  if (state === "HIGH_RISK") return "REDUCE_POSITION";
  return "NO_TRADE";
}

function strategyProfileText(state: TradingActionState) {
  if (state === "CURRENT_PARTIAL_ENTRY") {
    return "공격형: 현재가 1차 소액 분할 진입 가능. 일반형: 주요 지지 재확인 후 추가 분할 진입. 보수형: 핵심 전환 가격 돌파 후 재지지 확인 시 진입.";
  }
  if (state === "CURRENT_STARTER_POSITION") {
    return "공격형: 현재가 소액 진입 가능. 일반형: 눌림목 지지 확인 후 분할 진입. 보수형: 돌파 후 재지지 또는 확정 신호 확인 후 접근.";
  }
  if (state === "MOMENTUM_CONTINUATION_ENTRY") {
    return "공격형: 모멘텀 추세추종 소액 진입 가능. 일반형: 눌림목에서 추가 진입. 보수형: 핵심 가격 위 재지지 확인 후 접근.";
  }
  if (state === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    return "공격형: 돌파 전 소액 선진입 가능. 일반형: 저항 돌파 확인 후 분할 진입. 보수형: 돌파 후 재지지 확인 전까지 대기.";
  }
  return "";
}

function normalizeTradingReportDecision(report: TradingReport) {
  const state = inferTradingActionState(report);
  const ranges = tradingActionStateRanges[state];
  const score = normalizeScoreSummary(report.scoreSummary);
  const entryScores = {
    currentEntry: normalizeEntryScore(score.entryScores?.currentEntry, "currentEntry"),
    pullbackEntry: normalizeEntryScore(score.entryScores?.pullbackEntry, "pullbackEntry"),
    breakoutEntry: normalizeEntryScore(score.entryScores?.breakoutEntry, "breakoutEntry"),
  };
  const label = tradingActionStateLabels[state];

  score.totalScore = clampToRange(score.totalScore, ranges.total);
  score.buyScore = clampToRange(score.buyScore, ranges.current);
  score.riskScore = clampToRange(score.riskScore, ranges.risk);
  score.holdScore = state === "HOLD_ONLY"
    ? Math.max(clampToRange(score.holdScore, [60, 75]), score.buyScore + 10)
    : state === "HIGH_RISK" || state === "AVOID"
      ? Math.min(clamp(score.holdScore, 45), state === "AVOID" ? 35 : 55)
      : clamp(score.holdScore, 60);

  entryScores.currentEntry.score = clampToRange(entryScores.currentEntry.score, ranges.current);
  entryScores.pullbackEntry.score = clampToRange(entryScores.pullbackEntry.score, ranges.pullback);
  entryScores.breakoutEntry.score = clampToRange(entryScores.breakoutEntry.score, ranges.breakout);

  refreshCurrentEntryScoreLabel(report, entryScores.currentEntry);
  refreshEntryScoreLabel(entryScores.pullbackEntry, "pullbackEntry");
  refreshEntryScoreLabel(entryScores.breakoutEntry, "breakoutEntry");
  if (state === "CURRENT_PARTIAL_ENTRY") {
    entryScores.currentEntry.label = "현재가 분할 진입";
    entryScores.currentEntry.explanation = "현재가는 추격 구간에 가까울 수 있지만, 손절 기준을 짧게 잡을 수 있어 소액 분할 진입은 검토 가능합니다.";
    entryScores.pullbackEntry.explanation = "추가 비중은 주요 지지 구간의 반응 확인 후 분할로 검토하는 편이 안전합니다.";
  } else if (state === "CURRENT_STARTER_POSITION") {
    entryScores.currentEntry.label = "현재가 소액 진입";
    entryScores.currentEntry.explanation = "확인 조건은 남아 있지만 추세가 유지되고 있어, 손절을 짧게 전제로 한 소액 진입은 가능합니다.";
    entryScores.pullbackEntry.explanation = "눌림이 나오면 주요 지지선 이탈 여부를 확인해 추가 진입 조건을 점검합니다.";
  } else if (state === "MOMENTUM_CONTINUATION_ENTRY") {
    entryScores.currentEntry.label = "모멘텀 진입";
    entryScores.currentEntry.explanation = "추세와 모멘텀이 유지되고 있어 눌림만 기다리기보다 일부 추세추종 진입도 검토할 수 있습니다.";
    entryScores.breakoutEntry.explanation = "핵심 전환 가격 위 유지와 거래량 확인이 이어지면 추세추종 근거가 강화됩니다.";
  } else if (state === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    entryScores.currentEntry.label = "돌파 전 소액 선진입";
    entryScores.currentEntry.explanation = "돌파 전 선진입은 실패 위험이 있으므로, 손절을 짧게 두는 소액 전략으로만 접근해야 합니다.";
    entryScores.breakoutEntry.explanation = "저항 돌파와 안착이 확인되면 돌파 진입 조건이 개선됩니다.";
  } else if (state === "PULLBACK_ENTRY") {
    entryScores.currentEntry.explanation = "현재가 진입보다 주요 지지 구간의 반등 확인을 우선하는 상태입니다.";
    entryScores.pullbackEntry.explanation = "지지 확인 후 손절 기준을 짧게 둘 수 있을 때 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (state === "BREAKOUT_WAIT") {
    entryScores.currentEntry.explanation = "돌파 확인 전 현재가 진입은 손익비와 변동성 확인이 필요합니다.";
    entryScores.breakoutEntry.explanation = "저항 돌파와 재지지 확인이 핵심 조건입니다.";
  } else if (state === "HOLD_ONLY") {
    entryScores.currentEntry.explanation = "신규 진입 조건은 약하고 보유자 중심 관망이 더 자연스럽습니다.";
  } else if (state === "HIGH_RISK" || state === "AVOID") {
    entryScores.currentEntry.explanation = "위험도가 높아 현재가 신규 진입은 피하거나 강하게 제한해야 합니다.";
    entryScores.pullbackEntry.explanation = "지지 구조가 안정되기 전까지 눌림목 진입도 보수적으로 봅니다.";
    entryScores.breakoutEntry.explanation = "추세 회복 또는 돌파 후 재지지가 확인되기 전까지 돌파 진입은 제한적입니다.";
  }

  score.entryScores = entryScores;
  score.totalLabel = label;
  score.label = label;
  score.buyLabel = buyScoreLabel(score.buyScore);
  score.holdLabel = holdScoreLabel(score.holdScore);
  score.riskLabel = riskScoreLabel(score.riskScore);
  score.explanation = `${label}: ${entryModePreferenceExplanationClean(report, score)}`;
  report.scoreSummary = score;

  report.finalSummary.actionState = state;
  report.finalSummary.finalAction = stateFinalAction(state);
  report.finalSummary.title = label;
  report.finalSummary.oneLineConclusion = {
    STRONG_BUY: "돌파 또는 지지 조건이 비교적 맞아 조건부 매수 후보로 볼 수 있지만, 손절 기준 확인은 필요합니다.",
    CURRENT_PARTIAL_ENTRY: "현재가 소액 분할 가능 / 눌림목 추가 대기",
    CURRENT_STARTER_POSITION: "현재가 소액 진입 가능 / 확인 병행",
    MOMENTUM_CONTINUATION_ENTRY: "모멘텀 추세추종 / 분할 접근",
    PRE_BREAKOUT_AGGRESSIVE_ENTRY: "돌파 전 소액 선진입 / 고위험",
    PULLBACK_ENTRY: "현재가 추격보다 주요 지지 구간에서 반등 확인 후 눌림목 진입을 검토하는 상태입니다.",
    BREAKOUT_WAIT: "저항 돌파와 재지지 확인 전까지는 신규 진입보다 확인 대기가 우선입니다.",
    HOLD_ONLY: "신규 진입 조건은 약하지만 보유자는 주요 지지선 이탈 전까지 관망할 수 있습니다.",
    HIGH_RISK: "위험도가 높아 신규 진입보다 손절 기준과 비중 관리가 우선입니다.",
    AVOID: "지지 구조나 손익비가 약해 신규 진입은 피하는 것이 보수적입니다.",
  }[state];
  const profileText = strategyProfileText(state);
  if (profileText) report.finalSummary.reason = profileText;

  report.userActionGuide = {
    ...report.userActionGuide,
    nonHolder: state === "STRONG_BUY"
      ? "조건이 확인된 경우에만 소액 조건부 진입 후보로 참고합니다."
      : state === "CURRENT_PARTIAL_ENTRY"
        ? "전량 추격보다 손절 기준을 짧게 둔 소액 분할 진입으로만 검토합니다."
        : state === "CURRENT_STARTER_POSITION"
          ? "확인 조건이 남아 있으므로 현재가는 소액 진입만 검토하고 비중 확대는 지지 확인 이후가 유리합니다."
          : state === "MOMENTUM_CONTINUATION_ENTRY"
            ? "추세추종 관점의 일부 진입은 가능하지만, 손절 기준 이탈 시 빠르게 관점을 낮춰야 합니다."
            : state === "PRE_BREAKOUT_AGGRESSIVE_ENTRY"
              ? "돌파 전 선진입은 실패 위험이 있으므로 짧은 손절을 전제로 한 소액 전략으로만 접근합니다."
              : state === "PULLBACK_ENTRY"
                ? "현재가보다 주요 지지 구간에서 반등 확인 후 눌림목 진입을 검토합니다."
                : state === "BREAKOUT_WAIT"
                  ? "저항 돌파 후 재지지 확인 전까지 신규 진입은 보류하는 것이 유리합니다."
                  : state === "HOLD_ONLY"
                    ? "신규 진입은 약하므로 지지 확인 전까지 대기하는 것이 유리합니다."
                    : "신규 진입은 피하고 위험 관리 조건을 우선 확인합니다.",
    holder: state === "HOLD_ONLY"
      ? "주요 지지선 이탈 전까지 보유 관망은 가능하지만, 이탈 시 관점 재검토가 필요합니다."
      : state === "HIGH_RISK" || state === "AVOID"
        ? "주요 지지 이탈 여부를 우선 확인하고, 반등 시 비중 축소도 고려할 수 있습니다."
        : report.userActionGuide.holder,
  };
  report.tradePlan.stopLoss.meaning = state === "HIGH_RISK" || state === "AVOID"
    ? "위험 관리가 우선이므로 단기 손절과 중기 무효화 조건을 분리해 확인합니다."
    : report.tradePlan.stopLoss.meaning;
  report.tradePlan.targets.firstTarget.action = state === "BREAKOUT_WAIT"
    ? "돌파 후 재지지 확인 시 목표 후보"
    : state === "CURRENT_PARTIAL_ENTRY" || state === "CURRENT_STARTER_POSITION"
      ? "현재가 소액/분할 진입 기준 목표 후보"
      : state === "MOMENTUM_CONTINUATION_ENTRY"
        ? "추세추종 진입 기준 목표 후보"
        : state === "PRE_BREAKOUT_AGGRESSIVE_ENTRY"
          ? "돌파 성공 시 확인할 목표 후보"
    : state === "PULLBACK_ENTRY"
      ? "눌림목 진입 기준 목표 후보"
      : report.tradePlan.targets.firstTarget.action;
}

function deriveFinalActionByRegime(report: TradingReport): NonNullable<TradingReport["normalizedFinalAction"]> {
  const score = normalizeScoreSummary(report.scoreSummary);
  const entryScores = score.entryScores ?? {};
  const pullbackEntry = clampScore(entryScores.pullbackEntry?.score, 0);
  const breakoutEntry = clampScore(entryScores.breakoutEntry?.score, 0);
  const holdScore = clampScore(score.holdScore, 50);
  const riskScore = clampScore(score.riskScore, 50);
  const marketContext = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  const regime = report.chartRegime?.type ?? marketContext.chartRegime ?? deriveChartRegime(report).type;
  const reasons = [
    ...(report.chartRegime?.reasons ?? []),
    ...(marketContext.chartRegimeReasons ?? []),
    score.explanation,
    report.finalSummary.reason,
  ].map((item) => safeText(item, "")).filter(Boolean);
  const reason = safeText(reasons[0], "차트 상태와 가격 위치를 기준으로 후처리 판단을 보정했습니다.");
  const supportArea = marketContext.priceLocation === "near_support" || marketContext.priceLocation === "lower_range";
  const holderValid = holdScore >= 60 && riskScore < 80;
  const actionState = report.finalSummary.actionState;

  if (regime === "support_breakdown") {
    return {
      title: "위험 관리 / 신규 진입 보류",
      subtitle: "주요 지지선 이탈이 확인되어 반등 확인 전까지 신규 진입보다 손절 기준과 비중 관리가 우선입니다.",
      actionType: "SUPPORT_BREAKDOWN_RISK",
      reason,
    };
  }
  if (regime === "downtrend") {
    return {
      title: supportArea ? "하락 추세 반등 대기 / 지지 확인 필요" : "하락 추세 / 신규 진입 보류",
      subtitle: "기술적 반등 가능성은 있으나, 추세 전환 확인 전까지 신규 진입은 신중해야 합니다.",
      actionType: "DOWNTREND_WAIT",
      reason,
    };
  }
  if (actionState === "CURRENT_PARTIAL_ENTRY") {
    return {
      title: "현재가 분할 진입 가능 / 손절 짧게",
      subtitle: "추세는 우호적이지만 저항 부담이 있어, 현재가는 소액으로만 접근하고 눌림목에서 추가 진입을 검토합니다.",
      actionType: "CURRENT_PARTIAL_ENTRY",
      reason: strategyProfileText("CURRENT_PARTIAL_ENTRY") || reason,
    };
  }
  if (actionState === "CURRENT_STARTER_POSITION") {
    return {
      title: "현재가 소액 진입 가능 / 확인 병행",
      subtitle: "확인 조건은 남아 있지만 추세가 유지되고 있어, 손절을 짧게 전제로 한 소액 진입은 가능합니다.",
      actionType: "CURRENT_STARTER_POSITION",
      reason: strategyProfileText("CURRENT_STARTER_POSITION") || reason,
    };
  }
  if (actionState === "MOMENTUM_CONTINUATION_ENTRY") {
    return {
      title: "모멘텀 추세추종 / 분할 접근",
      subtitle: "추세와 모멘텀이 유지되고 있어 눌림만 기다리기보다 일부 추세추종 진입도 검토할 수 있습니다.",
      actionType: "MOMENTUM_CONTINUATION_ENTRY",
      reason: strategyProfileText("MOMENTUM_CONTINUATION_ENTRY") || reason,
    };
  }
  if (actionState === "PRE_BREAKOUT_AGGRESSIVE_ENTRY") {
    return {
      title: "돌파 전 소액 선진입 / 고위험",
      subtitle: "돌파 전 선진입은 실패 위험이 있으므로, 손절을 짧게 두는 소액 전략으로만 접근해야 합니다.",
      actionType: "PRE_BREAKOUT_AGGRESSIVE_ENTRY",
      reason: strategyProfileText("PRE_BREAKOUT_AGGRESSIVE_ENTRY") || reason,
    };
  }
  if (regime === "downtrend_rebound") {
    return {
      title: marketContext.nearResistance ? "저항권 테스트 / 추격매수 주의" : "하락추세 반등 / 돌파 확인 대기",
      subtitle: "하락 이후 반등은 추세 전환으로 단정하기 어렵고, 주요 저항 회복과 돌파 후 재지지 확인이 필요합니다.",
      actionType: "DOWNTREND_REBOUND_WAIT",
      reason,
    };
  }
  if (regime === "overextended_surge" || regime === "overheated_breakout") {
    return {
      title: regime === "overheated_breakout"
        ? "추격매수 주의 / 재지지 확인"
        : holderValid ? "보유자는 일부 익절 고려 / 미보유자는 눌림 대기" : "급등 후 저항 근접 / 추격매수 주의",
      subtitle: regime === "overheated_breakout"
        ? "급등 돌파 이후 과열 신호가 있어 현재가 추격보다 눌림 또는 돌파 후 재지지 확인이 우선입니다."
        : "단기 급등 후 저항 구간에 가까워 미보유자는 추격매수보다 눌림 확인이 유리합니다.",
      actionType: regime === "overheated_breakout" ? "OVERHEATED_BREAKOUT_RETEST_WAIT" : holderValid ? "HOLDER_PARTIAL_PROFIT" : "OVEREXTENDED_CHASE_RISK",
      reason,
    };
  }
  if (regime === "breakout_retest_confirmed") {
    return {
      title: breakoutEntry >= 60 ? "돌파 후 재지지 확인 / 돌파 매수 후보" : "돌파 후 지지 전환 후보 / 확인 필요",
      subtitle: "핵심 전환 가격 위에서 지지가 유지되면 다음 저항까지 상승 여지를 볼 수 있습니다.",
      actionType: "BREAKOUT_RETEST_CONFIRMED",
      reason,
    };
  }
  if (regime === "resistance_test") {
    const currentEntry = clampScore(entryScores.currentEntry?.score, 0);
    const allowSmallOnly = currentEntry >= 45 && currentEntry <= 65 && riskScore < 60;
    return {
      title: allowSmallOnly ? "저항권 테스트 / 소액만 가능" : "저항권 테스트 / 돌파 확인 우선",
      subtitle: allowSmallOnly
        ? "현재가는 저항권에 가까워 전량 진입은 부담이 크며, 짧은 손절 전제의 소액 접근만 검토합니다."
        : "현재가는 주요 저항 또는 목표 구간에 가까워 신규 진입보다 돌파 후 재지지 확인이 우선입니다.",
      actionType: allowSmallOnly ? "RESISTANCE_TEST_SMALL_ONLY" : "RESISTANCE_TEST_WAIT",
      reason,
    };
  }
  if (regime === "breakout_wait") {
    return pullbackEntry >= 65
      ? {
          title: "돌파 확인 대기 / 눌림목 지지 확인 시 관심",
          subtitle: "돌파 후 재지지는 아직 확인되지 않았지만, 주요 지지 구간에서 반등이 나오면 눌림목 진입 후보로 볼 수 있습니다.",
          actionType: "BREAKOUT_WAIT_PULLBACK_INTEREST",
          reason,
        }
      : {
          title: "돌파 확인 대기",
          subtitle: "핵심 전환 가격 돌파 후 재지지 확인 전까지는 신규 진입보다 대기가 유리합니다.",
          actionType: "BREAKOUT_WAIT",
          reason,
        };
  }
  if (regime === "range_upper_resistance") {
    return {
      title: "저항 근접 / 보유자는 일부 익절, 미보유자는 추격매수 주의",
      subtitle: "현재가는 상단 저항에 가까워 신규 진입은 확인이 필요하며, 보유자는 일부 익절 또는 돌파 확인이 우선입니다.",
      actionType: "RANGE_UPPER_RESISTANCE",
      reason,
    };
  }
  if (regime === "range_lower_support") {
    return {
      title: "지지권 눌림목 매수 후보",
      subtitle: "주요 지지 구간에서 반등이 확인되면 손절 기준을 짧게 두고 진입 후보로 볼 수 있습니다.",
      actionType: "RANGE_LOWER_SUPPORT",
      reason,
    };
  }
  if (regime === "uptrend_pullback") {
    return {
      title: "상승추세 눌림 / 지지 확인 시 관심",
      subtitle: "상승 흐름 속 조정 구간으로, 주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.",
      actionType: "UPTREND_PULLBACK_INTEREST",
      reason,
    };
  }
  if (regime === "uptrend_consolidation") {
    return {
      title: "상승추세 조정 / 지지 확인 필요",
      subtitle: "상승 흐름은 유지될 수 있으나 지지 반응 또는 돌파 확인 전까지는 조건부 대기가 유리합니다.",
      actionType: "UPTREND_CONSOLIDATION_WAIT",
      reason,
    };
  }
  if (regime === "healthy_pullback") {
    return {
      title: "눌림목 매수 후보 / 지지 확인 필요",
      subtitle: "상승 흐름이 유지되는 가운데 지지 구간에서 반등이 확인되면 눌림목 진입 조건이 개선됩니다.",
      actionType: "HEALTHY_PULLBACK",
      reason,
    };
  }
  if (regime === "sideways") {
    return {
      title: "방향 확인 대기",
      subtitle: "지지와 저항 사이에서 방향성이 뚜렷하지 않아 돌파 또는 지지 반응 확인이 필요합니다.",
      actionType: "SIDEWAYS_WAIT",
      reason,
    };
  }
  return {
    title: "분석 정보 부족 / 주요 가격대 확인 필요",
    subtitle: "이미지 기반으로 차트 상태 판단이 제한적이므로 지지와 저항 확인이 우선입니다.",
    actionType: "UNKNOWN_REGIME",
    reason,
  };
}

export function validateTradingReportConsistency(report: TradingReport): string[] {
  const warnings: string[] = [];
  const score = normalizeScoreSummary(report.scoreSummary);
  const currentEntry = safeScore(score.entryScores?.currentEntry?.score, 0) ?? 0;
  const pullbackEntry = safeScore(score.entryScores?.pullbackEntry?.score, 0) ?? 0;
  const breakoutEntry = safeScore(score.entryScores?.breakoutEntry?.score, 0) ?? 0;
  const riskScore = clampScore(score.riskScore, 50);
  const regime = report.chartRegime?.type ?? report.marketContext?.chartRegime ?? deriveChartRegime(report).regime;
  const location = report.marketContext?.priceLocation ?? deriveMarketContext(report).priceLocation;
  const breakoutConfirmed = Boolean(report.marketContext?.breakoutRetestConfirmed);
  const currentPrice = parsePriceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const resistance = parsePriceFromText(report.keyLevels.resistances?.[0]?.priceZone ?? report.analysisMeta?.mainResistances?.[0]);
  const currentRr = report.tradePlan.riskRewardByEntry?.current?.value;
  const pivot = parsePriceFromText(report.priceRoles?.pivot?.priceZone ?? report.tradePlan.transitionLevel?.priceZone);
  const firstTarget = parsePriceFromText(report.tradePlan.targets.firstTarget?.priceZone);
  const pullbackTarget = parsePriceFromText(report.tradePlan.targets.pullbackTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.pullbackTargets?.[0]);
  const breakoutTarget = parsePriceFromText(report.tradePlan.targets.breakoutTargets?.firstTarget?.priceZone ?? report.priceRoles?.targets?.breakoutTargets?.[0]);
  const nearestTarget = [breakoutTarget, firstTarget, pullbackTarget].find(finite);
  const normalizedAction = report.normalizedFinalAction ?? deriveFinalActionByRegime(report);
  const actionText = [
    normalizedAction.title,
    normalizedAction.subtitle,
    normalizedAction.actionType,
  ].map((item) => safeText(item, "")).join(" ");
  const rawFinalText = `${report.finalSummary.finalAction} ${report.finalSummary.title} ${report.finalSummary.oneLineConclusion}`;
  const currentEntryLabel = safeText(score.entryScores?.currentEntry?.label, "");
  const entryLabelText = [
    currentEntryLabel,
    score.entryScores?.pullbackEntry?.label,
    score.entryScores?.breakoutEntry?.label,
  ].map((item) => safeText(item, "")).join(" ");
  const rsiRows = [
    ...(report.indicatorAnalysis?.confirmed ?? []).filter((item) => /RSI/i.test(safeText(item.name, ""))).map((item) => `${item.signal} ${item.explanation}`),
  ];
  const breakoutStopText = [
    report.tradePlan.stopLossByEntry?.breakoutEntry?.priceZone,
    report.tradePlan.stopLossByEntry?.breakoutEntry?.condition,
    report.tradePlan.stopLossByEntry?.breakoutEntry?.explanation,
  ].map((item) => safeText(item, "")).join(" ");

  const pullbackRestrictedRegime =
    regime === "support_breakdown" ||
    regime === "downtrend" ||
    regime === "downtrend_rebound" ||
    regime === "resistance_test" ||
    regime === "overextended_surge" ||
    regime === "overheated_breakout";

  if ((/PULLBACK_BUY|눌림목 매수 후보/.test(actionText)) && pullbackRestrictedRegime) {
    warnings.push("추세/과열 상태에서 눌림목 매수 판단이 과도하지 않은지 확인 필요");
  }
  if (rsiRows.some((text) => /과매수|과열|overbought|RSI[^0-9]{0,20}(?:7[0-9]|8[0-9]|9[0-9]|100)/i.test(text) && /^(매수|bullish)$/i.test(safeText(text.split(/\s+/)[0], "")))) {
    warnings.push("RSI 과매수 신호가 매수로 매핑될 수 있음");
  }
  if ((/BREAKOUT.*BUY|돌파 매수 후보/.test(actionText) || report.finalSummary.finalAction === "BREAKOUT_BUY_CANDIDATE") && !breakoutConfirmed) {
    warnings.push("돌파 후 재지지 확인 전 돌파 매수 후보 표시 여부 확인 필요");
  }
  if (finite(currentPrice) && finite(nearestTarget) && Math.abs(currentPrice - nearestTarget) / Math.max(Math.abs(currentPrice), 1) < 0.008 && !/목표가 근접|목표 여유 낮음|상승 여지 제한|상단 목표 미확인|저항|돌파 확인/.test(actionText)) {
    warnings.push("현재가와 목표가가 같은데 목표가 근접/상승 여지 제한 경고가 부족함");
  }
  if (finite(currentPrice) && finite(resistance) && finite(nearestTarget) && Math.abs(resistance - nearestTarget) / Math.max(Math.abs(resistance), 1) < 0.008 && Math.abs(currentPrice - resistance) / Math.max(Math.abs(currentPrice), 1) < 0.02 && !/목표가 근접|목표 여유 낮음|상승 여지 제한|상단 목표 미확인|다음 저항|저항|돌파 확인/.test(actionText)) {
    warnings.push("저항과 목표가가 같은데 목표 여유 경고가 부족함");
  }
  if (currentEntry >= 80 && (location === "near_resistance" || location === "upper_range" || location === "overextended")) {
    warnings.push("저항권에서 현재가 진입 점수가 높게 표시됨");
  }
  if ((/일부 익절/.test(actionText) || report.finalSummary.finalAction === "PARTIAL_TAKE_PROFIT") && (location === "near_support" || location === "lower_range")) {
    warnings.push("지지권에서 일부 익절 문구가 표시될 수 있음");
  }
  if (finite(currentRr) && currentRr < 1 && (currentEntry >= 70 || /현재가.*(유리|우위)|즉시 매수/.test(currentEntryLabel))) {
    warnings.push("현재가 손익비가 낮은데 현재가 진입 점수가 높게 표시됨");
  }
  if (breakoutEntry >= 70 && !breakoutConfirmed) {
    warnings.push("돌파 확인 전 돌파 진입 점수가 높게 표시됨");
  }
  if (riskScore > 60 && /낮|안정/.test(score.riskLabel)) {
    warnings.push("위험 점수와 위험 라벨이 일치하지 않음");
  }
  if (finite(pivot) && finite(breakoutTarget) && Math.abs(pivot - breakoutTarget) / Math.max(Math.abs(pivot), 1) < 0.005) {
    warnings.push(`핵심 전환 가격 ${formatPriceZone(pivot)}와 돌파 목표가가 너무 가까움`);
  }
  if (pullbackEntry >= 65 && currentEntry < 50 && !/눌림목|지지/.test(actionText)) {
    warnings.push("눌림목 우위인데 최종 제목에 지지 확인 조건이 부족함");
  }
  if (/주의|추격|저항권|목표가 근접|대기|보류|위험/.test(actionText) && /진입 우세|매수 우세|현재가 진입 우세|눌림목 진입 우세/.test(entryLabelText)) {
    warnings.push("최종 행동은 주의/대기인데 진입 우세 라벨이 표시될 수 있음");
  }
  if ((location === "near_resistance" || location === "upper_range" || location === "overextended" || regime === "resistance_test") && pullbackEntry >= 65 && /현재가 진입 우세|현재가.*유리|즉시/.test(entryLabelText)) {
    warnings.push("저항권에서 미래 눌림목 점수가 현재가 진입 허가처럼 표시될 수 있음");
  }
  if (regime === "downtrend" && (/STRONG_BUY|강한 매수|현재가.*유리/.test(actionText) || currentEntry >= 80)) {
    warnings.push("하락 추세에서 강한 매수 또는 현재가 우위로 표시됨");
  }
  if (regime === "support_breakdown" && (/STRONG_BUY|매수 후보|현재가.*유리|눌림목 매수/.test(actionText) || currentEntry >= 50 || pullbackEntry >= 55)) {
    warnings.push("지지선 이탈 구간에서 신규 진입 판단이 과도하게 우호적임");
  }
  if (regime === "downtrend_rebound" && (/건전한 눌림|눌림목 진입 우세|눌림목 매수 후보/.test(`${actionText} ${rawFinalText}`) || currentEntry >= 65 || pullbackEntry >= 75)) {
    warnings.push("하락추세 반등 구간에서 눌림목 우위 또는 진입 점수가 과도하게 표시됨");
  }
  if (regime === "resistance_test" && (/눌림목 진입 우세|눌림목 매수 후보/.test(`${actionText} ${rawFinalText}`) || currentEntry >= 60 || pullbackEntry >= 75)) {
    warnings.push("저항권 테스트 구간에서 눌림목 우위 또는 현재가 진입 점수가 과도함");
  }
  if ((regime === "overextended_surge" || regime === "overheated_breakout") && (/현재가.*유리|즉시 매수|매수 우위/.test(actionText) || currentEntry > 40)) {
    warnings.push("급등 과열 구간에서 현재가 진입이 과도하게 우호적으로 표시됨");
  }
  if (regime === "breakout_retest_confirmed" && breakoutEntry < 65) {
    warnings.push("돌파 후 재지지 구간에서 돌파 진입 점수가 너무 낮음");
  }
  if (regime === "breakout_retest_confirmed" && !/재이탈|돌파 실패|전환 가격|피벗|pivot/i.test(breakoutStopText)) {
    warnings.push("돌파 진입 손절 기준에 피벗 재이탈 또는 돌파 실패 조건이 부족함");
  }
  if (regime === "breakout_wait" && breakoutEntry >= 65 && !breakoutConfirmed) {
    warnings.push("돌파 대기 구간에서 돌파 진입 점수가 과도하게 높음");
  }
  if (regime === "range_lower_support" && !/지지|눌림|반등|SUPPORT|PULLBACK/i.test(actionText)) {
    warnings.push("박스권 하단 판단에 지지/눌림/반등 맥락이 부족함");
  }
  if ((regime === "uptrend_pullback" || regime === "uptrend_consolidation") && /박스권 하단|^대기$/.test(actionText.trim())) {
    warnings.push("상승추세 눌림/조정 구간이 박스권 하단 또는 단순 대기로 표시됨");
  }
  if (regime === "range_upper_resistance" && /지지권 눌림목 매수 후보/.test(actionText)) {
    warnings.push("박스권 상단에서 지지권 눌림목 매수 후보로 표시됨");
  }
  if (regime === "healthy_pullback" && /NO_TRADE|매매 부적합/.test(`${actionText} ${rawFinalText}`)) {
    warnings.push("지지가 유지되는 눌림 구간에서 매매 부적합으로 표시됨");
  }
  if (regime === "healthy_pullback" && !/상승|우상향|상승추세|higher high|higher low|정배열|지지.*유지/i.test(`${report.chartRegime?.reasons?.join(" ")} ${report.finalSummary.reason} ${score.explanation} ${report.evidence?.positive?.join(" ")}`)) {
    warnings.push("상승 추세 근거 없이 healthy_pullback으로 분류될 수 있음");
  }
  if (regime === "range_lower_support" && !/박스|횡보|range|sideways|레인지|box|상단.*하단|하단.*상단/i.test(`${report.chartRegime?.reasons?.join(" ")} ${report.finalSummary.reason} ${score.explanation} ${report.evidence?.positive?.join(" ")} ${report.evidence?.negative?.join(" ")}`)) {
    warnings.push("명확한 박스권 근거 없이 range_lower_support로 분류될 수 있음");
  }
  if (regime === "sideways" && (currentEntry >= 80 || pullbackEntry >= 85 || breakoutEntry >= 80 || /STRONG_BUY|돌파 매수 후보|지지권 눌림목 매수 후보/.test(actionText))) {
    warnings.push("중립/횡보 구간에서 진입 판단이 과도하게 강함");
  }
  [
    normalizedAction.title,
    normalizedAction.subtitle,
    normalizedAction.actionType,
    normalizedAction.reason,
    score.explanation,
    score.totalLabel,
    score.riskLabel,
  ].forEach((value) => {
    if (typeof value === "string" && /\b(undefined|null|NaN|Infinity)\b/i.test(value)) {
      warnings.push("UI 표시 문자열에 잘못된 값(undefined/null/NaN/Infinity)이 포함됨");
    }
  });
  [score.totalScore, score.holdScore, score.riskScore, currentEntry, pullbackEntry, breakoutEntry].forEach((value) => {
    if (!finite(value)) warnings.push("점수에 유효하지 않은 숫자가 포함됨");
  });
  return warnings.map((item) => safeText(item, "검증 정보 확인 필요"));
}

function applyNormalizedPostProcessingFields(report: TradingReport) {
  const regime = deriveChartRegime(report);
  const context = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  report.marketContext = {
    ...context,
    chartRegime: regime.regime,
    chartRegimeConfidence: regime.confidence,
    chartRegimeReasons: regime.reasons.map((item) => safeText(item, "분석 정보 부족")),
  };
  report.chartRegime = {
    type: report.marketContext.chartRegime ?? "unknown",
    confidence: report.marketContext.chartRegimeConfidence ?? "low",
    reasons: (report.marketContext.chartRegimeReasons ?? []).map((item) => safeText(item, "분석 정보 부족")),
  };
  report.normalizedFinalAction = deriveFinalActionByRegime(report);
  report.validationWarnings = validateTradingReportConsistency(report);
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    report.validationWarnings.length > 0
  ) {
    console.warn("[trading-report-validation]", report.validationWarnings);
  }
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
  const shortStopZone = report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone;
  const conservativeStopZone = report.tradePlan.stopLoss.conservative?.priceZone;
  if (samePriceZone(shortStopZone, conservativeStopZone)) {
    const lowerConservative = nextLowerPriceZone(shortStopZone, supportZones);
    if (lowerConservative) {
      report.tradePlan.stopLoss.conservative = {
        priceZone: lowerConservative,
        condition: `${lowerConservative} 이탈`,
        meaning: "단기 손절보다 한 단계 아래의 보수적 손절 기준입니다.",
      };
      if (report.priceRoles?.stopLoss) report.priceRoles.stopLoss.conservative = lowerConservative;
    } else {
      report.tradePlan.stopLoss.conservative = {
        priceZone: "확인 필요",
        condition: "보수적 손절 가격 추가 확인 필요",
        meaning: "단기 손절과 구분되는 하단 지지가 명확하지 않아 보수적 손절 산정을 보류합니다.",
      };
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
    current: report.priceRoles?.current ?? { priceZone: IMAGE_LIMIT_TEXT, meaning: "이미지에서 현재가를 명확히 산정하기 어렵습니다." },
    pivot: report.priceRoles?.pivot ?? { priceZone: "미확인", meaning: "핵심 전환 가격은 이미지 기준으로 명확히 확인되지 않았습니다." },
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

  report.tradePlan.stopLossByEntry = deriveStopLossByEntry(report);
  const breakoutRiskStopZone = nextLowerPriceZone(pivotZone, supportZones)
    ?? report.tradePlan.stopLoss.shortTerm?.priceZone
    ?? report.tradePlan.stopLoss.priceZone;
  report.tradePlan.riskReward = normalizeRiskRewardDetail(report.tradePlan.riskReward);
  report.tradePlan.riskRewardByEntry = {
    current: riskReward(
      priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone),
      priceFromText(report.tradePlan.stopLossByEntry.currentEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
      priceFromText(filterTargetsAbove(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone, [...sortedPullbackTargets, ...sortedBreakoutTargets])[0]),
    ),
    pullback: riskReward(
      priceFromText(pullbackEntryZone),
      priceFromText(report.tradePlan.stopLossByEntry.pullbackEntry?.priceZone ?? report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone),
      priceFromText(sortedPullbackTargets[0]),
    ),
    breakout: riskReward(
      priceFromText(pivotZone),
      priceFromText(breakoutRiskStopZone),
      priceFromText(sortedBreakoutTargets[0]),
    ),
  };

  report.finalSummary.title = safeDisplayText(report.finalSummary.title, "신규 진입 보류 / 조건 확인 대기");
  report.finalSummary.oneLineConclusion = safeDisplayText(report.finalSummary.oneLineConclusion, "이미지 기반 분석으로 핵심 가격대 확인 후 대응하는 것이 보수적입니다.");
  report.finalSummary.reason = safeDisplayText(report.finalSummary.reason, "본 분석은 이미지 기반 기술적 분석 참고 정보입니다.");
  report.analysisMeta = {
    symbol: safeDisplayText(report.analysisMeta?.symbol, "미확인"),
    chartTimeframe: normalizeTimeframeText(report.analysisMeta?.chartTimeframe),
    currentPriceZone: safeDisplayText(report.analysisMeta?.currentPriceZone, IMAGE_LIMIT_TEXT),
    keyPivotPrice: safeDisplayText(report.analysisMeta?.keyPivotPrice, "미확인"),
    mainSupports: report.analysisMeta?.mainSupports?.length ? report.analysisMeta.mainSupports.map((item) => safeDisplayText(item, "미확인")).filter((item) => item !== "미확인") : [],
    mainResistances: report.analysisMeta?.mainResistances?.length ? report.analysisMeta.mainResistances.map((item) => safeDisplayText(item, "미확인")).filter((item) => item !== "미확인") : [],
    analyzedAt: safeDisplayText(report.analysisMeta?.analyzedAt, nowKstText()),
    dataBasis: report.analysisMeta?.dataBasis ?? "image_only",
    ...inferPriceUnit(
      report.analysisMeta?.symbol,
      priceFromText(report.analysisMeta?.currentPriceZone ?? report.priceRoles?.current?.priceZone),
      report.analysisMeta?.priceUnit,
      report.analysisMeta?.priceUnitConfidence,
    ),
  };
  report.marketContext = {
    ...deriveMarketContext(report),
    ...report.marketContext,
  };
  const chartRegime = deriveChartRegime(report);
  report.marketContext = {
    ...report.marketContext,
    chartRegime: chartRegime.regime,
    chartRegimeConfidence: chartRegime.confidence,
    chartRegimeReasons: chartRegime.reasons,
  };
  adjustEntryScoresByRegime(report);
  report.indicatorAnalysis = normalizeIndicatorAnalysisClean(report.indicatorAnalysis);
  const guidePivot = safeDisplayText(report.priceRoles?.pivot?.priceZone ?? pivotZone, "핵심 저항");
  const guidePullback = safeDisplayText(report.priceRoles?.pullbackEntry?.priceZone ?? pullbackEntryZone, "주요 지지 구간");
  const guideShortStop = safeDisplayText(report.tradePlan.stopLoss.shortTerm?.priceZone ?? report.tradePlan.stopLoss.priceZone, "단기 손절 기준");
  const guideConservativeStop = safeDisplayText(report.tradePlan.stopLoss.conservative?.priceZone, "보수적 손절 기준");
  const guideInvalidation = safeDisplayText(report.tradePlan.invalidation.midTerm?.priceZone ?? report.tradePlan.invalidation.condition, "중기 무효화 기준");
  const supportArea = report.marketContext.priceLocation === "near_support" || report.marketContext.priceLocation === "lower_range";
  const profitArea = report.marketContext.priceLocation === "upper_range" || report.marketContext.priceLocation === "near_resistance" || report.marketContext.priceLocation === "overextended";
  report.userActionGuide = report.marketContext.chartRegime === "breakout_retest_confirmed"
    ? {
        nonHolder: "돌파 후 재지지가 유지되면 조건부 진입 후보로 볼 수 있습니다.",
        holder: "핵심 전환 가격 위에서 유지되는 동안 보유 관망이 가능하며, 다음 저항까지 상승 여지를 볼 수 있습니다.",
        shortTermTrader: "돌파 가격 재이탈을 손절 기준으로 짧게 대응할 수 있습니다.",
        addBuyer: "추가 매수는 돌파 가격 위에서 지지가 재확인될 때 분할로 접근하는 것이 유리합니다.",
        stopLoss: `${guidePivot} 재이탈 시 돌파 실패로 보고 짧게 대응합니다.`,
      }
    : report.marketContext.chartRegime === "downtrend"
    ? {
        nonHolder: "추세 전환 확인 전까지 신규 진입은 보류하는 것이 유리합니다.",
        holder: "주요 지지선 이탈 여부를 우선 확인하고, 반등 시 비중 축소도 고려할 수 있습니다.",
        shortTermTrader: "반등 매매는 짧은 손절 기준이 필요하며, 무리한 추격 진입은 피하는 것이 좋습니다.",
        addBuyer: "추가 매수는 주요 저항 회복 또는 돌파 후 재지지 확인 이후가 안전합니다.",
        stopLoss: "단기 지지 이탈 시 손절, 하위 지지 이탈 시 관점 약화로 구분합니다.",
      }
    : report.marketContext.chartRegime === "overextended_surge" || report.marketContext.chartRegime === "overheated_breakout"
      ? {
          nonHolder: report.marketContext.chartRegime === "overheated_breakout"
            ? "과열권 돌파 이후에는 추격매수를 피하고, 눌림 또는 돌파 후 재지지 확인까지 대기하는 것이 유리합니다."
            : "단기 급등 후 저항 구간에 가까워 추격매수는 피하고, 눌림 또는 돌파 후 재지지 확인까지 대기하는 것이 유리합니다.",
          holder: "보유자는 일부 익절을 고려할 수 있지만, 돌파 후 재지지가 유지되면 잔여 물량은 관망할 수 있습니다.",
          shortTermTrader: "급등 이후 변동성이 커질 수 있어 짧은 손절 기준 없이 추격 진입하는 것은 불리합니다.",
          addBuyer: `추가 매수는 ${guidePullback} 지지 확인 또는 ${guidePivot} 돌파 후 재지지 확인 이후가 안전합니다.`,
          stopLoss: `단기 ${guideShortStop} / 보수적 ${guideConservativeStop} / 중기 무효화 ${guideInvalidation}를 분리해서 대응합니다.`,
        }
    : supportArea
    ? {
        nonHolder: "주요 지지 구간에서 반등 확인 후 눌림목 진입을 검토할 수 있습니다.",
        holder: "주요 지지선 이탈 전까지 보유 관망이 가능하며, 저항 돌파 전까지는 무리한 추가 매수보다 확인이 우선입니다.",
        shortTermTrader: "지지 구간 반등 확인 시 짧은 손절 기준을 두고 대응할 수 있습니다.",
        addBuyer: "추가 매수는 지지 반응 확인 후 분할로 접근하는 것이 유리합니다.",
        stopLoss: "단기 지지 이탈 시 손절, 하위 지지 이탈 시 관점 약화로 구분합니다.",
      }
    : profitArea
      ? {
          nonHolder: "추격매수는 불리하며, 돌파 후 재지지 또는 눌림목 확인 전까지 대기가 유리합니다.",
          holder: "저항 구간에서는 일부 익절을 고려하되, 돌파 후 재지지에 성공하면 잔여 물량은 보유할 수 있습니다.",
          shortTermTrader: `${guidePivot} 부근에서는 짧은 손절 기준 없이 진입하면 손익비가 불리합니다.`,
          addBuyer: `추가 매수는 ${guidePullback} 지지 확인 또는 ${guidePivot} 돌파 후 재지지 확인 이후가 유리합니다.`,
          stopLoss: `단기 ${guideShortStop} / 보수적 ${guideConservativeStop} / 중기 무효화 ${guideInvalidation}를 분리해서 대응합니다.`,
        }
      : {
          nonHolder: `현재가보다 ${guidePullback} 지지 확인 또는 ${guidePivot} 돌파 후 재지지 확인까지 기다리는 전략이 유리합니다.`,
          holder: `주요 지지선 이탈 전까지 보유 관망이 가능하며, ${guidePivot} 부근에서는 돌파 확인이 필요합니다.`,
          shortTermTrader: "방향 확인 전까지 짧은 손절 기준을 우선 설정해야 합니다.",
          addBuyer: `추가 매수는 ${guidePullback} 지지 확인 또는 ${guidePivot} 돌파 후 재지지 확인 이후가 유리합니다.`,
          stopLoss: `단기 ${guideShortStop} / 보수적 ${guideConservativeStop} / 중기 무효화 ${guideInvalidation}를 분리해서 대응합니다.`,
        };

  alignScoreWithAction(report);
  adjustEntryScoresByRegime(report);
  validateReportConsistency(report);
  adjustEntryScoresByRegime(report);
  normalizeTradingReportDecision(report);
  adjustEntryScoresByRegime(report);
  normalizeEntryScoresByContext(report);
  enhanceScoreFactors(report);
  applyNormalizedPostProcessingFields(report);
  report.disclaimer = DISCLAIMER;
  return report;
}

const P0_BEARISH_PATTERNS = new Set([
  "head_and_shoulders",
  "double_top",
  "descending_triangle",
  "rising_wedge",
  "failed_breakout",
  "lower_high_reversal",
  "breakdown_risk",
]);

function legacyPatternConfidence(candidate: AnalysisResponse["aiAnalysis"]["patternCandidates"][number]) {
  if (typeof candidate.confidenceScore === "number" && Number.isFinite(candidate.confidenceScore)) {
    const normalized = candidate.confidenceScore > 0 && candidate.confidenceScore <= 1
      ? candidate.confidenceScore * 100
      : candidate.confidenceScore;
    return clamp(normalized, 30);
  }
  const confidence = String(candidate.confidence ?? "").toLowerCase();
  return confidence === "high" ? 80 : confidence === "medium" ? 60 : 30;
}

function legacyPatternName(candidate: AnalysisResponse["aiAnalysis"]["patternCandidates"][number]) {
  const name = String(candidate.name ?? "").toLowerCase();
  if (name === "wedge" && candidate.breakoutDirection === "downside_candidate") return "rising_wedge";
  if (P0_BEARISH_PATTERNS.has(name)) return name;
  const evidence = (candidate.evidence ?? []).join(" ").toLowerCase();
  if (/failed breakout|돌파 실패/.test(evidence)) return "failed_breakout";
  if (/lower high|낮아지는 고점/.test(evidence)) return "lower_high_reversal";
  return null;
}

function deriveLegacyPatternRiskProfile(raw: AnalysisResponse, report: TradingReport): PatternRiskProfile | null {
  const ranked = (raw.aiAnalysis?.patternCandidates ?? [])
    .map((candidate) => ({ candidate, name: legacyPatternName(candidate), confidence: legacyPatternConfidence(candidate) }))
    .filter((item): item is typeof item & { name: string } => Boolean(item.name))
    .sort((a, b) => b.confidence - a.confidence);
  const selected = ranked[0];
  if (!selected) return null;
  const { candidate, name, confidence } = selected;
  const current = priceFromText(report.priceRoles?.current?.priceZone ?? report.analysisMeta?.currentPriceZone);
  const candidateLevels = candidate.priceLevels ?? {};
  const keyValue = candidateLevels.neckline
    ?? candidateLevels.breakdownPrice
    ?? candidateLevels.confirmationLevel
    ?? candidateLevels.support
    ?? priceFromText(report.priceRoles?.stopLoss?.shortTerm ?? report.keyLevels.supports?.[0]?.priceZone);
  const invalidationValue = candidateLevels.invalidationLevel
    ?? candidateLevels.resistance
    ?? candidateLevels.patternHigh
    ?? priceFromText(report.priceRoles?.pivot?.priceZone ?? report.keyLevels.resistances?.[0]?.priceZone);
  let stage: PatternRiskProfile["stage"] = "forming";
  if (current !== null && invalidationValue != null && current >= invalidationValue * 1.005) stage = "invalidated";
  else if (name === "failed_breakout") stage = "failed";
  else if (current !== null && keyValue != null && current < keyValue * 0.995) stage = "confirmed";
  else if (current !== null && keyValue != null && Math.abs(current - keyValue) / Math.max(Math.abs(keyValue), 1) <= 0.015) {
    stage = name === "head_and_shoulders" || name === "double_top" ? "neckline_test" : "breakout_test";
  }
  const labels: Record<string, string> = {
    head_and_shoulders: "헤드앤숄더",
    double_top: "이중천장",
    descending_triangle: "하락 삼각형",
    rising_wedge: "상승 쐐기",
    failed_breakout: "돌파 실패",
    lower_high_reversal: "낮아지는 고점 / 반등 둔화",
    breakdown_risk: "지지 이탈 위험",
  };
  const active = confidence >= 51 && stage !== "invalidated";
  const strong = active && (confidence >= 71 || stage === "confirmed" || stage === "failed");
  const patternLabel = `${labels[name]}${strong ? " 확인" : " 의심"}`;
  const keyText = keyValue != null ? formatPrice(keyValue) : "핵심 가격대 확인 필요";
  const strategyImpact = name === "head_and_shoulders"
    ? strong ? "하락 전환 위험 / 위험 관리" : "넥라인 확인 / 신규 진입 보류"
    : name === "double_top" ? "저항 돌파 실패 / 지지 이탈 확인"
    : name === "descending_triangle" ? "하단 지지 이탈 주의"
    : name === "rising_wedge" ? "과열 상승 둔화 / 이탈 주의"
    : name === "failed_breakout" ? "돌파 실패 / 재돌파 확인"
    : "반등 둔화 / 저항 회복 확인";
  return {
    primaryPattern: name,
    patternLabel,
    directionBias: "bearish",
    confidence,
    confidenceLabel: confidence >= 71 ? "높음" : confidence >= 51 ? "보통" : "낮음",
    stage,
    keyLevel: keyText,
    necklineLevel: name === "head_and_shoulders" || name === "double_top" ? keyText : null,
    invalidationLevel: invalidationValue != null ? formatPrice(invalidationValue) : null,
    confirmationCondition: candidate.confirmationCondition,
    invalidationCondition: candidate.invalidationCondition,
    strategyImpact,
    riskImpact: active ? "entry_cap" : "none",
    shouldAffectDecision: active,
    scoreCaps: active ? {
      currentEntryMax: strong ? 25 : 35,
      pullbackEntryMax: strong ? 30 : 45,
      breakoutRetestMax: strong ? 40 : 55,
      totalSignalMax: strong ? 40 : 50,
      riskScoreMin: strong ? 70 : 55,
    } : null,
    heroSummary: active ? `${patternLabel} · ${name === "head_and_shoulders" ? "넥라인" : "핵심 가격"} ${keyText}` : null,
    explanation: candidate.tradingImplication ?? candidate.entryLogic,
    source: candidate.source ?? "image",
  };
}

function applyPatternRiskConsistency(report: TradingReport, raw: AnalysisResponse) {
  const profile = report.patternRiskProfile ?? deriveLegacyPatternRiskProfile(raw, report);
  report.patternRiskProfile = profile;
  if (!profile?.shouldAffectDecision || !profile.scoreCaps) return report;
  const caps = profile.scoreCaps;
  const score = report.scoreSummary;
  if (score) {
    const entries = score.entryScores;
    const capEntry = (key: keyof NonNullable<ScoreSummary["entryScores"]>, cap: number | undefined) => {
      const entry = entries?.[key];
      if (!entry || cap == null) return;
      entry.score = Math.min(clamp(entry.score, 50), cap);
      entry.label = key === "currentEntry" ? "신규 진입 보류" : "패턴 확인 우선";
      entry.explanation = "하락 반전 패턴 위험이 해소되기 전까지 확인을 우선합니다.";
    };
    capEntry("currentEntry", caps.currentEntryMax);
    capEntry("pullbackEntry", caps.pullbackEntryMax);
    capEntry("breakoutEntry", caps.breakoutRetestMax);
    if (caps.totalSignalMax != null) score.totalScore = Math.min(clamp(score.totalScore, 50), caps.totalSignalMax);
    if (caps.riskScoreMin != null) score.riskScore = Math.max(clamp(score.riskScore, 50), caps.riskScoreMin);
    score.totalLabel = scoreLabel(score.totalScore);
    score.riskLabel = riskScoreLabel(score.riskScore);
    score.scoreWarnings = Array.from(new Set([...(score.scoreWarnings ?? []), "PATTERN_RISK_SCORE_CAPPED"]));
  }
  const strong = profile.confidence >= 71 || profile.stage === "confirmed" || profile.stage === "failed";
  report.finalSummary.finalAction = strong ? "SELL_RISK" : "BREAKOUT_WAIT";
  report.finalSummary.actionState = strong ? "HIGH_RISK" : "BREAKOUT_WAIT";
  report.finalSummary.title = profile.primaryPattern === "head_and_shoulders" && !strong
    ? "넥라인 확인 / 신규 진입 보류"
    : profile.strategyImpact;
  report.finalSummary.oneLineConclusion = `${profile.patternLabel} 위험이 있어 확인 조건 충족 전까지 신규 진입은 신중해야 합니다.`;
  report.userActionGuide.nonHolder = "패턴 위험이 약화되고 핵심 가격대가 확인되기 전까지 신규 진입을 보류합니다.";
  report.userActionGuide.addBuyer = "패턴 무효화와 가격 회복 확인 후 분할 접근을 재검토합니다.";
  report.userActionGuide.newEntryGuidance = profile.strategyImpact;
  report.userActionGuide.mustConfirmCondition = profile.confirmationCondition ?? "패턴 확인 가격 회복";
  report.userActionGuide.mustNotTradeReason = `${profile.patternLabel} 위험이 아직 무효화되지 않았습니다.`;
  report.userActionGuide.nextReviewCondition = `${profile.keyLevel ?? "핵심 가격대"} 반응 확인`;
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
      stopLossByEntry: { ...(fallback.tradePlan.stopLossByEntry ?? {}), ...(report.tradePlan?.stopLossByEntry ?? {}) },
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
    marketContext: report.marketContext ?? fallback.marketContext,
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
  merged.marketContext = {
    ...deriveMarketContext(merged),
    ...merged.marketContext,
  };
  merged.patternAnalysis.primaryPattern.name = ensureCandidateLabel(merged.patternAnalysis.primaryPattern.name);
  if (merged.patternAnalysis.secondaryPattern) {
    merged.patternAnalysis.secondaryPattern.name = ensureCandidateLabel(merged.patternAnalysis.secondaryPattern.name);
  }
  merged.disclaimer = DISCLAIMER;
  return applyPatternRiskConsistency(sanitizeTradingReport(merged), raw);
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
  let oneLineConclusion = "주요 지지선 이탈 전까지는 보유 관망이 가능하지만 신규 진입은 추가 확인이 필요합니다.";
  if (supportBroken) {
    finalAction = "SELL_RISK";
    title = "손절 위험";
    oneLineConclusion = "단기 지지선을 이탈해 손절 위험이 커졌습니다.";
  } else if (scoreSummary.buyScore < 30 && scoreSummary.holdScore < 40 && scoreSummary.riskScore >= 70) {
    finalAction = "NO_TRADE";
    title = "매매 부적합";
    oneLineConclusion = "신규 진입, 보유, 단기 대응 모두 불리한 구간으로 해석합니다.";
  } else if (scoreSummary.riskScore >= 75) {
    if (scoreSummary.holdScore >= 60) {
      finalAction = "REDUCE_POSITION";
      title = "비중 축소 고려";
      oneLineConclusion = "위험 점수가 높아 신규 진입보다 보유 비중 조절과 손절 기준 확인이 우선입니다.";
    } else {
      finalAction = "SELL_RISK";
      title = "손절 위험";
      oneLineConclusion = "위험 점수가 높고 보유 점수가 낮아 관점 재검토가 필요합니다.";
    }
  } else if (breakoutRetestConfirmed && scoreSummary.buyScore >= 65 && breakoutRrValue !== null && breakoutRrValue >= 1.5) {
    finalAction = "BREAKOUT_BUY_CANDIDATE";
    title = "돌파 매수 후보";
    oneLineConclusion = "핵심 전환 가격 돌파 후 재지지 조건과 손익비가 충족되면 돌파 매수 후보로 볼 수 있습니다.";
  } else if (nearSupport && scoreSummary.buyScore >= 60 && pullbackRrValue !== null && pullbackRrValue >= 1.2) {
    finalAction = "PULLBACK_BUY_CANDIDATE";
    title = "눌림목 매수 후보";
    oneLineConclusion = "주요 지지 부근에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.";
  } else if (nearResistance && scoreSummary.buyScore < 50 && scoreSummary.holdScore >= 60) {
    finalAction = "NO_NEW_ENTRY_HOLD_OK";
    title = "신규 진입보다 보유 관망 우세";
    oneLineConclusion = "저항 구간에 가까워 신규 추격매수는 불리하지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다.";
  } else if (nearResistance) {
    finalAction = "BREAKOUT_WAIT";
    title = "돌파 확인 대기";
    oneLineConclusion = "현재 가격이 저항 구간에 가까워 돌파 후 재지지 확인이 필요합니다.";
  } else if (scoreSummary.buyScore < 50 && scoreSummary.riskScore >= 50 && scoreSummary.holdScore >= 60) {
    finalAction = "NO_NEW_ENTRY_HOLD_OK";
    title = "신규 진입보다 보유 관망 우세";
    oneLineConclusion = "신규 진입 점수는 낮지만 주요 지지선 이탈 전까지 보유 관망은 가능합니다.";
  } else if (scoreSummary.buyScore >= 65 && bestEntryRrValue !== null && bestEntryRrValue >= 1.5) {
    finalAction = pullbackRrValue !== null && pullbackRrValue >= (breakoutRrValue ?? 0)
      ? "PULLBACK_BUY_CANDIDATE"
      : "BREAKOUT_BUY_CANDIDATE";
    title = finalAction === "PULLBACK_BUY_CANDIDATE" ? "눌림목 매수 후보" : "돌파 매수 후보";
    oneLineConclusion = "손익비와 추세 조건이 일부 충족되어 조건 확인 후 매수 후보로 볼 수 있습니다.";
  }

  const pivotText = formatPrice(levels.pivot);
  const transitionNote = finite(levels.pivot)
    ? `${pivotText}는 핵심 전환 가격입니다. 아래에서는 저항으로 작용하지만 돌파 후 재지지에 성공하면 단기 상승 지속 근거가 됩니다.`
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
    : "상단 저항이 확인될 때까지 돌파 지지 여부를 우선 확인";

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
      stopLossByEntry: {
        currentEntry: {
          priceZone: formatPrice(currentStop),
          condition: `${formatPrice(currentStop)} 이탈`,
          explanation: "현재가 진입을 검토한다면 가까운 단기 지지 이탈을 우선 방어 기준으로 봅니다.",
        },
        pullbackEntry: {
          priceZone: formatPrice(pullbackStop),
          condition: `${formatPrice(pullbackStop)} 이탈`,
          explanation: "눌림목 진입은 진입 지지선보다 아래의 다음 지지 이탈을 실패 기준으로 봅니다.",
        },
        breakoutEntry: {
          priceZone: formatPrice(breakoutStop),
          condition: `${pivotText} 재이탈 또는 ${formatPrice(breakoutStop)} 이탈`,
          explanation: "돌파 진입은 핵심 전환 가격 재이탈 또는 그 아래 지지 이탈을 돌파 실패 기준으로 봅니다.",
        },
        mediumTermInvalidation: {
          priceZone: formatPrice(midInvalidation),
          condition: `${formatPrice(midInvalidation)} 이탈`,
          explanation: "중기 관점 무효화 가격은 단기 손익비 계산에는 사용하지 않습니다.",
        },
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
        meaning: "중기 관점 무효화 가격은 단기 손익비 계산에 사용하지 않습니다.",
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
        return item?.visible ? [] : [{ name: label, reason: unavailableIndicatorReason(key) }];
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
  const chartRegime = deriveChartRegime(report);
  report.marketContext = {
    ...deriveMarketContext(report),
    chartRegime: chartRegime.regime,
    chartRegimeConfidence: chartRegime.confidence,
    chartRegimeReasons: chartRegime.reasons,
  };
  return report;
}

export function normalizeTradingReport(raw: AnalysisResponse): TradingReport {
  return normalizeExistingReport(raw.tradingReport ?? buildFallbackReport(raw), raw);
}



