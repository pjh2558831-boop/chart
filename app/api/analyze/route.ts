import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import analysisRules from "../../../config/analysis-rules.json";
import { detectChartPatterns, normalizeChartImageAnalysis } from "../../../lib/server/chartPatternDetector";
import {
  createAnalysisLog,
  getUsageStatus,
  recordUsage,
  sanitizeUserId,
} from "../../../lib/server/supabaseRest";
import type {
  AIAnalysis,
  AnalysisResponse,
  BreakoutDirection,
  Confidence,
  PatternCandidate,
  PatternCategory,
  RiskLevel,
  TradeSignal,
  VisualZone,
} from "../../../types/analysis";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DEFAULT_MODEL = "gpt-4.1-mini";
const ANALYSIS_RULES_PROMPT = JSON.stringify(analysisRules, null, 2);

const SYSTEM_PROMPT = `
너는 주식 차트 이미지를 시각적으로 해석하는 보조 분석기다.
실제 가격 데이터에 접근한 것처럼 말하지 말고, 이미지에 보이는 정보만 분석한다.
매수 추천, 매도 추천, 목표가 확정, 손절가 확정, 수익률 예측은 하지 않는다.
모든 패턴은 확정이 아니라 후보로 표현한다.
가격축이 보이면 가격을 추정값으로만 반환하고, 불명확하면 null을 반환한다.
결과는 반드시 JSON 객체 하나만 반환한다.
`.trim();

const USER_PROMPT = `
차트 이미지와 우측 가격축 영역을 보고 아래 JSON 스키마로만 응답해라.

{
  "symbolDetection": {
    "detectedName": string | null,
    "detectedTicker": string | null,
    "detectedMarket": "KR" | "US" | "UNKNOWN",
    "detectedExchange": string | null,
    "currency": string | null,
    "confidence": "low" | "medium" | "high",
    "reason": string | null
  },
  "chartType": "캔들차트" | "선차트" | "영역차트" | "혼합 차트" | "확인 불가",
  "timeframeEstimate": string,
  "visualTrend": string,
  "patternCandidates": [
    {
      "name": "double_bottom | double_top | head_and_shoulders | inverse_head_and_shoulders | ascending_triangle | descending_triangle | bull_flag | bear_flag | cup_and_handle | rectangle_breakout | unknown",
      "label": string,
      "category": "reversal" | "continuation" | "range" | "breakout" | "unknown",
      "confidence": "low" | "medium" | "high",
      "evidence": string[],
      "breakoutDirection": "upside_candidate" | "downside_candidate" | "neutral" | "unknown",
      "confirmationCondition": string,
      "invalidationCondition": string,
      "entryLogic": string,
      "riskLevel": "low" | "medium" | "high"
    }
  ],
  "visibleIndicators": string[],
  "visualSupportZones": [{"label": string, "confidence": "low" | "medium" | "high", "note": string}],
  "visualResistanceZones": [{"label": string, "confidence": "low" | "medium" | "high", "note": string}],
  "priceAxisObservations": {
    "currentPriceEstimate": {"value": number | null, "confidence": "low" | "medium" | "high", "note": string | null},
    "visibleSupportPrices": [{"value": number | null, "label": string, "confidence": "low" | "medium" | "high"}],
    "visibleResistancePrices": [{"value": number | null, "label": string, "confidence": "low" | "medium" | "high"}],
    "recentHighEstimate": {"value": number | null, "confidence": "low" | "medium" | "high"},
    "recentLowEstimate": {"value": number | null, "confidence": "low" | "medium" | "high"}
  },
  "indicatorReadings": {
    "rsi": {"visible": boolean, "valueEstimate": number | null, "status": "oversold | rebound_candidate | neutral | overbought | unknown", "confidence": "low" | "medium" | "high"},
    "macd": {"visible": boolean, "status": "bullish_cross_candidate | bullish | bearish_cross_candidate | bearish | neutral | unknown", "confidence": "low" | "medium" | "high"},
    "bollingerBands": {"visible": boolean, "position": "near_lower | middle | near_upper | above_upper | below_lower | unknown", "upperEstimate": number | null, "lowerEstimate": number | null, "confidence": "low" | "medium" | "high"},
    "movingAverages": {"visible": boolean, "status": "price_above_ma | price_below_ma | mixed | unknown", "confidence": "low" | "medium" | "high"},
    "volume": {"visible": boolean, "status": "increasing | decreasing | neutral | unknown", "confidence": "low" | "medium" | "high"},
    "ichimoku": {"visible": boolean, "status": "above_cloud | inside_cloud | below_cloud | unknown", "cloudPosition": "above_cloud | inside_cloud | below_cloud | unknown", "confidence": "low" | "medium" | "high"}
  },
  "volumeObservation": string,
  "riskNotes": string[],
  "summary": string,
  "disclaimer": string
}

명확한 패턴 구조가 없으면 patternCandidates는 빈 배열로 둔다.
패턴 후보에는 반드시 근거, 확인 조건, 무효화 조건, 진입 후보 조건, 리스크 수준을 넣는다.
모든 가격은 이미지 기반 추정값이며 투자 조언이 아니라고 명시한다.
`.trim();

function jsonError(detail: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ detail, ...(extra ?? {}) }, { status });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map((item) => String(item)).filter(Boolean);
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeConfidence(value: unknown, fallback: Confidence = "low"): Confidence {
  return enumValue(value, ["low", "medium", "high", "unavailable"] as const, fallback);
}

function normalizeZone(value: unknown): VisualZone {
  const zone = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    label: asString(zone.label, "확인 불가"),
    confidence: normalizeConfidence(zone.confidence),
    note: asString(zone.note, "이미지 기반 후보 구간입니다."),
  };
}

function normalizePattern(value: unknown): PatternCandidate | null {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const reason = asString(raw.reason);
  const evidence = asStringArray(raw.evidence ?? (reason ? [reason] : []));
  const confirmationCondition = asString(
    raw.confirmationCondition,
    "주요 지지·저항 또는 추세선 돌파 여부를 추가 확인해야 합니다.",
  );
  const invalidationCondition = asString(
    raw.invalidationCondition,
    "현재 구조만으로는 명확한 무효화 기준을 설정하기 어렵습니다.",
  );
  const entryLogic = asString(
    raw.entryLogic,
    "패턴 기반 진입 후보는 확인 조건 충족 이후에만 참고해야 합니다.",
  );
  const hasRequiredFields = evidence.length > 0 && confirmationCondition && invalidationCondition;

  const category = enumValue<PatternCategory>(
    raw.category,
    ["reversal", "continuation", "range", "breakout", "unknown"] as const,
    "unknown",
  );
  const breakoutDirection = enumValue<BreakoutDirection>(
    raw.breakoutDirection,
    ["upside_candidate", "downside_candidate", "neutral", "unknown"] as const,
    "unknown",
  );
  const riskLevel = enumValue<RiskLevel>(raw.riskLevel, ["low", "medium", "high"] as const, "high");
  const confidence = hasRequiredFields ? normalizeConfidence(raw.confidence) : "low";
  const name = asString(raw.name, "unknown");
  const label = asString(raw.label, name === "unknown" ? "명확한 패턴 없음" : name);

  if (!name && !label && evidence.length === 0) {
    return null;
  }

  return {
    name,
    label,
    category,
    confidence,
    evidence,
    breakoutDirection,
    confirmationCondition,
    invalidationCondition,
    entryLogic,
    riskLevel,
  };
}

function normalizeAiAnalysis(rawValue: unknown): AIAnalysis {
  const raw = typeof rawValue === "object" && rawValue !== null ? (rawValue as Record<string, unknown>) : {};
  const price = typeof raw.priceAxisObservations === "object" && raw.priceAxisObservations !== null
    ? (raw.priceAxisObservations as Record<string, unknown>)
    : {};
  const indicators = typeof raw.indicatorReadings === "object" && raw.indicatorReadings !== null
    ? (raw.indicatorReadings as Record<string, unknown>)
    : {};
  const symbol = typeof raw.symbolDetection === "object" && raw.symbolDetection !== null
    ? (raw.symbolDetection as Record<string, unknown>)
    : {};

  return {
    symbolDetection: {
      detectedName: asString(symbol.detectedName) || null,
      detectedTicker: asString(symbol.detectedTicker) || null,
      detectedMarket: asString(symbol.detectedMarket, "UNKNOWN"),
      detectedExchange: asString(symbol.detectedExchange) || null,
      currency: asString(symbol.currency) || null,
      confidence: normalizeConfidence(symbol.confidence),
      reason: asString(symbol.reason) || null,
    },
    chartType: asString(raw.chartType, "확인 불가"),
    timeframeEstimate: asString(raw.timeframeEstimate, "불명확"),
    visualTrend: asString(raw.visualTrend, "추세 불명확"),
    patternCandidates: asArray(raw.patternCandidates).map(normalizePattern).filter(Boolean) as PatternCandidate[],
    visibleIndicators: asStringArray(raw.visibleIndicators),
    visualSupportZones: asArray(raw.visualSupportZones).map(normalizeZone),
    visualResistanceZones: asArray(raw.visualResistanceZones).map(normalizeZone),
    priceAxisObservations: {
      currentPriceEstimate: normalizePriceEstimate(price.currentPriceEstimate),
      visibleSupportPrices: asArray(price.visibleSupportPrices).map(normalizeVisiblePriceLevel),
      visibleResistancePrices: asArray(price.visibleResistancePrices).map(normalizeVisiblePriceLevel),
      recentHighEstimate: normalizePriceEstimate(price.recentHighEstimate),
      recentLowEstimate: normalizePriceEstimate(price.recentLowEstimate),
    },
    indicatorReadings: {
      rsi: normalizeIndicator(indicators.rsi, { valueEstimate: true }),
      macd: normalizeIndicator(indicators.macd),
      bollingerBands: normalizeBollinger(indicators.bollingerBands),
      movingAverages: normalizeIndicator(indicators.movingAverages),
      volume: normalizeIndicator(indicators.volume),
      ichimoku: normalizeIchimoku(indicators.ichimoku),
    },
    volumeObservation: asString(raw.volumeObservation, "거래량은 이미지상 확인이 필요합니다."),
    riskNotes: asStringArray(raw.riskNotes),
    summary: asString(raw.summary, "이미지 기반 차트 구조를 분석했습니다."),
    disclaimer: asString(
      raw.disclaimer,
      "본 결과는 차트 이미지의 시각적 해석이며 투자 조언이 아닙니다.",
    ),
  };
}

function normalizePriceEstimate(value: unknown) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    value: asNumber(raw.value),
    confidence: normalizeConfidence(raw.confidence),
    note: asString(raw.note) || null,
  };
}

function normalizeVisiblePriceLevel(value: unknown) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    value: asNumber(raw.value),
    label: asString(raw.label, "가격 후보"),
    confidence: normalizeConfidence(raw.confidence),
  };
}

function normalizeIndicator(value: unknown, options?: { valueEstimate?: boolean }) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    visible: Boolean(raw.visible),
    ...(options?.valueEstimate ? { valueEstimate: asNumber(raw.valueEstimate) } : {}),
    status: asString(raw.status, "unknown"),
    confidence: normalizeConfidence(raw.confidence),
  };
}

function normalizeBollinger(value: unknown) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    visible: Boolean(raw.visible),
    position: asString(raw.position, "unknown"),
    upperEstimate: asNumber(raw.upperEstimate),
    lowerEstimate: asNumber(raw.lowerEstimate),
    confidence: normalizeConfidence(raw.confidence),
  };
}

function normalizeIchimoku(value: unknown) {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    visible: Boolean(raw.visible),
    status: asString(raw.status, "unknown"),
    cloudPosition: asString(raw.cloudPosition, "unknown"),
    confidence: normalizeConfidence(raw.confidence),
  };
}

function extractOpenAiText(data: unknown): string {
  const raw = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  if (typeof raw.output_text === "string") {
    return raw.output_text;
  }
  return raw.output?.flatMap((item) => item.content ?? []).map((item) => item.text).find(Boolean) ?? "";
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
    }
    return JSON.parse(match[0]);
  }
}

function distancePercent(price: number, level: number) {
  return Math.abs((price - level) / level) * 100;
}

function nearestBelow(price: number | null, levels: Array<number | null | undefined>) {
  if (price === null) return null;
  const candidates = levels.filter((level): level is number => typeof level === "number" && level > 0 && level <= price);
  return candidates.sort((a, b) => Math.abs(price - a) - Math.abs(price - b))[0] ?? null;
}

function nearestAbove(price: number | null, levels: Array<number | null | undefined>) {
  if (price === null) return null;
  const candidates = levels.filter((level): level is number => typeof level === "number" && level > 0 && level >= price);
  return candidates.sort((a, b) => Math.abs(price - a) - Math.abs(price - b))[0] ?? null;
}

function labelForSignal(signal: string) {
  switch (signal) {
    case "strong_buy_candidate":
      return "강한 매수 후보 신호";
    case "buy_candidate":
      return "매수 후보 신호";
    case "strong_sell_candidate":
      return "강한 매도 후보 신호";
    case "sell_candidate":
      return "매도 후보 신호";
    case "neutral":
      return "중립 신호";
    case "insufficient_visual_data":
      return "시각 정보 부족";
    default:
      return "약한 후보 신호";
  }
}

function generateVisualTradeSignal(ai: AIAnalysis): TradeSignal {
  const price = ai.priceAxisObservations?.currentPriceEstimate?.value ?? null;
  const supportLevels = ai.priceAxisObservations?.visibleSupportPrices?.map((level) => level.value) ?? [];
  const resistanceLevels = ai.priceAxisObservations?.visibleResistancePrices?.map((level) => level.value) ?? [];
  const nearestSupport = nearestBelow(price, supportLevels);
  const nearestResistance = nearestAbove(price, resistanceLevels);
  const rsi = ai.indicatorReadings?.rsi;
  const macd = ai.indicatorReadings?.macd;
  const volume = ai.indicatorReadings?.volume;
  const bollinger = ai.indicatorReadings?.bollingerBands;
  const trend = ai.visualTrend;

  let supportProximity = 0;
  if (price && nearestSupport) {
    const distance = distancePercent(price, nearestSupport);
    supportProximity = distance <= 2.5 ? 30 : distance <= 5 ? 15 : 0;
  } else if (ai.visualSupportZones.length > 0) {
    supportProximity = 10;
  }

  let rsiRebound = 0;
  if (rsi?.status === "rebound_candidate") rsiRebound = 25;
  else if (rsi?.status === "oversold") rsiRebound = 20;
  else if (rsi?.status === "neutral") rsiRebound = 10;
  else if (rsi?.status === "overbought") rsiRebound = -20;

  let macdBullish = 0;
  if (macd?.status === "bullish_cross_candidate") macdBullish = 25;
  else if (macd?.status === "bullish") macdBullish = 15;
  else if (macd?.status === "bearish_cross_candidate") macdBullish = -20;
  else if (macd?.status === "bearish") macdBullish = -10;

  let volumeIncreaseBuy = 0;
  if (volume?.status === "increasing") volumeIncreaseBuy = 20;
  else if (volume?.status === "neutral") volumeIncreaseBuy = 5;
  else if (volume?.status === "decreasing") volumeIncreaseBuy = -10;

  let trendScore = 0;
  if (trend.includes("상승")) trendScore = 15;
  else if (trend.includes("횡보")) trendScore = 5;
  else if (trend.includes("하락")) trendScore = -15;

  let resistanceProximity = 0;
  if (price && nearestResistance) {
    const distance = distancePercent(price, nearestResistance);
    resistanceProximity = distance <= 2.5 ? 30 : distance <= 5 ? 15 : 0;
  } else if (ai.visualResistanceZones.length > 0) {
    resistanceProximity = 10;
  }

  let rsiOverheated = 0;
  if (rsi?.status === "overbought") rsiOverheated = 25;
  else if (typeof rsi?.valueEstimate === "number" && rsi.valueEstimate >= 60 && rsi.valueEstimate < 70) rsiOverheated = 15;
  else if (rsi?.status === "oversold") rsiOverheated = -20;

  let macdBearish = 0;
  if (macd?.status === "bearish_cross_candidate") macdBearish = 25;
  else if (macd?.status === "bearish") macdBearish = 15;
  else if (macd?.status === "bullish_cross_candidate") macdBearish = -20;
  else if (macd?.status === "bullish") macdBearish = -10;

  let volumeIncreaseSell = 0;
  if (volume?.status === "increasing") volumeIncreaseSell = 20;
  else if (volume?.status === "neutral") volumeIncreaseSell = 5;
  else if (volume?.status === "decreasing") volumeIncreaseSell = -5;

  let bollingerUpper = 0;
  if (bollinger?.position === "above_upper") bollingerUpper = 20;
  else if (bollinger?.position === "near_upper") bollingerUpper = 15;
  else if (bollinger?.position === "near_lower") bollingerUpper = -15;

  const buyScore = supportProximity + rsiRebound + macdBullish + volumeIncreaseBuy + trendScore;
  const sellScore = resistanceProximity + rsiOverheated + macdBearish + volumeIncreaseSell + bollingerUpper;

  let finalSignal = "neutral";
  if (!price && !nearestSupport && !nearestResistance && ai.visibleIndicators.length === 0) {
    finalSignal = "insufficient_visual_data";
  } else if (buyScore >= 75 && buyScore > sellScore + 15) {
    finalSignal = "strong_buy_candidate";
  } else if (buyScore >= 55 && buyScore > sellScore) {
    finalSignal = "buy_candidate";
  } else if (sellScore >= 75 && sellScore > buyScore + 15) {
    finalSignal = "strong_sell_candidate";
  } else if (sellScore >= 55 && sellScore > buyScore) {
    finalSignal = "sell_candidate";
  }

  const stopLoss = nearestSupport
    ? nearestSupport * 0.98
    : ai.priceAxisObservations?.recentLowEstimate?.value
      ? ai.priceAxisObservations.recentLowEstimate.value * 0.98
      : null;
  const primaryTarget =
    nearestResistance ??
    (price && stopLoss ? price + 2 * (price - stopLoss) : null);
  const secondaryTarget =
    bollinger?.upperEstimate ??
    ai.priceAxisObservations?.recentHighEstimate?.value ??
    (price && stopLoss ? price + 3 * (price - stopLoss) : null);
  const riskRewardRatio = price && stopLoss && primaryTarget && price > stopLoss
    ? (primaryTarget - price) / (price - stopLoss)
    : null;

  const buyTo = price ?? (nearestSupport ? nearestSupport * 1.025 : null);
  const sellFrom = nearestResistance ? nearestResistance * 0.975 : null;

  return {
    analysisType: "visual_image_based",
    finalSignal,
    signalLabel: labelForSignal(finalSignal),
    buyScore,
    sellScore,
    confidence: Math.max(buyScore, sellScore) >= 75 ? "medium" : "low",
    currentPriceEstimate: {
      value: price,
      confidence: ai.priceAxisObservations?.currentPriceEstimate?.confidence ?? "low",
    },
    buyZone: {
      priceRange: nearestSupport ? { from: nearestSupport, to: buyTo } : null,
      basis: [
        nearestSupport ? "이미지상 주요 지지 후보 구간을 기준으로 계산했습니다." : "명확한 지지 가격 추정값이 부족합니다.",
        macdBullish > 0 ? "MACD가 상향 흐름 후보로 보입니다." : "",
        volumeIncreaseBuy > 0 ? "거래량이 신호 신뢰도를 보조합니다." : "",
      ].filter(Boolean),
    },
    sellZone: {
      priceRange: nearestResistance ? { from: sellFrom, to: nearestResistance } : null,
      basis: [
        nearestResistance ? "이미지상 주요 저항 후보 구간을 기준으로 계산했습니다." : "명확한 저항 가격 추정값이 부족합니다.",
        bollingerUpper > 0 ? "볼린저밴드 상단 근접 신호가 관찰됩니다." : "",
      ].filter(Boolean),
    },
    stopLossCandidate: {
      price: stopLoss,
      basis: stopLoss ? "이미지상 주요 지지 후보 구간을 약 2% 이탈하는 가격입니다." : "손절 기준 후보를 계산할 가격 정보가 부족합니다.",
    },
    targetPriceCandidate: {
      primary: primaryTarget,
      secondary: secondaryTarget,
      riskRewardRatio,
      basis: "최근 저항 후보, 볼린저밴드 상단 추정값, 리스크 보상비를 참고해 계산했습니다.",
    },
    summarySignal: {
      actionParameter: finalSignal.includes("buy")
        ? "buy_candidate"
        : finalSignal.includes("sell")
          ? "sell_candidate"
          : finalSignal.includes("insufficient")
            ? "insufficient_data"
            : "hold_candidate",
      actionLabel: finalSignal.includes("buy")
        ? "매수 후보"
        : finalSignal.includes("sell")
          ? "매도 후보"
          : finalSignal.includes("insufficient")
            ? "데이터 부족"
            : "보유 후보",
      entryPriceCandidate: {
        from: finalSignal.includes("sell") ? sellFrom : nearestSupport,
        to: finalSignal.includes("sell") ? nearestResistance : buyTo,
        basis: "주요 지지·저항 후보와 현재가 근접도를 기준으로 계산했습니다.",
      },
      targetPriceCandidate: {
        primary: primaryTarget,
        secondary: secondaryTarget,
        basis: "최근 저항 후보와 볼린저밴드 상단 추정값을 기준으로 계산했습니다.",
      },
    },
    conditionScores: {
      buy: {
        supportProximity,
        rsiRebound,
        macdBullish,
        volumeIncrease: volumeIncreaseBuy,
        trend: trendScore,
        total: buyScore,
      },
      sell: {
        resistanceProximity,
        rsiOverheated,
        macdBearish,
        volumeIncrease: volumeIncreaseSell,
        bollingerUpper,
        total: sellScore,
      },
    },
    warnings: [
      "이 가격대는 이미지 기반 추정값입니다.",
      "실제 OHLCV 데이터 기반 계산값이 아니므로 오차가 있을 수 있습니다.",
      "본 신호는 매수·매도 추천이 아닙니다.",
    ],
  };
}

async function callOpenAi(dataUrl: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `${SYSTEM_PROMPT}\n\nUse these project analysis rules as the source of truth:\n${ANALYSIS_RULES_PROMPT}`,
            },
          ],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: USER_PROMPT },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
      max_output_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API 오류 (${response.status}): ${message.slice(0, 1000)}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY 환경변수가 없습니다.", 500);
    }

    const userId = sanitizeUserId(request.headers.get("X-User-Id"));
    if (!userId) {
      return jsonError("X-User-Id 헤더가 필요합니다.", 400);
    }

    const usageStatus = await getUsageStatus(userId);
    if (usageStatus.dailyRemaining <= 0 || usageStatus.monthlyRemaining <= 0) {
      return jsonError("사용량 제한 초과", 429, { usageStatus });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("이미지 파일이 필요합니다.", 400);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("png, jpg, jpeg, webp 이미지만 업로드할 수 있습니다.", 400);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError("이미지 파일은 최대 5MB까지 업로드할 수 있습니다.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    let aiAnalysis: AIAnalysis;
    try {
      const openAiResult = await callOpenAi(dataUrl, model);
      const outputText = extractOpenAiText(openAiResult);
      if (!outputText) {
        return jsonError("OpenAI 응답 본문이 비어 있습니다.", 502, { raw: openAiResult });
      }
      aiAnalysis = normalizeAiAnalysis(parseJsonObject(outputText));
      const patternAnalysis = detectChartPatterns(normalizeChartImageAnalysis(aiAnalysis));
      aiAnalysis = {
        ...aiAnalysis,
        patternCandidates: patternAnalysis.patternCandidates,
        patternSummary: patternAnalysis.patternSummary,
      };
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "AI 분석 실패", 502);
    }

    const tradeSignal = generateVisualTradeSignal(aiAnalysis);
    const baseResult: AnalysisResponse = {
      aiAnalysis,
      technicalAnalysis: null,
      tradeSignal,
      imageInfo: {
        original: {
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
      },
      usageStatus,
    };

    await recordUsage(userId, "image_analysis");
    const updatedUsageStatus = await getUsageStatus(userId);
    const resultForLog: AnalysisResponse = {
      ...baseResult,
      usageStatus: updatedUsageStatus,
    };
    const analysisId = await createAnalysisLog({
      userId,
      analysisType: "image_analysis",
      inputImageHash: sha256,
      result: resultForLog,
      modelName: model,
    });

    return NextResponse.json({
      ...resultForLog,
      analysisId: analysisId ?? undefined,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "분석 요청 처리 중 오류가 발생했습니다.", 500);
  }
}
