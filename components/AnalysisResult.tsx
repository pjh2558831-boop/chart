"use client";

import { useState } from "react";

import { submitFeedback } from "../lib/api";
import {
  formatBreakoutDirection,
  formatConfidence,
  formatNumber,
  formatPatternCategory,
  formatPrice,
  formatPriceRange,
  formatRiskLevel,
  formatScore,
  formatSignalLabel,
  formatStatus,
  getBreakoutTone,
  getConfidenceTone,
  getPatternCategoryTone,
  getRiskTone,
  getStatusTone,
} from "../lib/formatters";
import type { AnalysisResponse, PatternCandidate, TradeSignal, VisualZone } from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

interface AnalysisResultProps {
  result: AnalysisResponse | null;
}

function fallback(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function BasisList({ items }: { items?: string[] }) {
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">근거 정보가 충분하지 않습니다.</p>;
  }

  return (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
      {safeItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ZoneList({
  title,
  zones,
  emptyText,
}: {
  title: string;
  zones?: VisualZone[];
  emptyText: string;
}) {
  const safeZones = zones ?? [];

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {safeZones.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {safeZones.map((zone, index) => (
            <li key={`${zone.label}-${index}`} className="rounded-lg bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{fallback(zone.label)}</p>
                <StatusBadge
                  label={formatConfidence(zone.confidence)}
                  tone={getConfidenceTone(zone.confidence)}
                />
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{fallback(zone.note)}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function scoreRows(tradeSignal?: TradeSignal | null) {
  const buy = tradeSignal?.conditionScores?.buy;
  const sell = tradeSignal?.conditionScores?.sell;

  return [
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
  ];
}

function scoreRowClasses(group: string) {
  if (group === "매수") {
    return {
      group: "text-red-700",
      label: "text-red-600",
      score: "text-red-700",
      background: "bg-red-50/50",
    };
  }

  return {
    group: "text-blue-700",
    label: "text-blue-600",
    score: "text-blue-700",
    background: "bg-blue-50/50",
  };
}

function formatPatternStage(stage?: string | null) {
  switch (stage) {
    case "candidate":
      return "후보";
    case "confirmed":
      return "확인됨";
    case "failed":
      return "실패";
    case "invalid":
      return "무효";
    default:
      return "후보";
  }
}

function formatPatternDirection(direction?: string | null) {
  switch (direction) {
    case "bullish":
      return "상승형";
    case "bearish":
      return "하락형";
    case "neutral":
      return "중립";
    default:
      return "불명확";
  }
}

function formatEntryType(entryType?: string | null) {
  switch (entryType) {
    case "aggressive":
      return "공격적";
    case "conservative":
      return "보수적";
    case "wait":
      return "대기";
    case "none":
      return "없음";
    default:
      return "-";
  }
}

function PatternCandidateCard({ candidate }: { candidate: PatternCandidate }) {
  const evidenceText =
    candidate.evidence?.length ? candidate.evidence.join(" / ") : "근거 없음";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">패턴 후보</p>
          <h4 className="mt-1 text-lg font-bold text-slate-950">{fallback(candidate.label)}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={formatPatternCategory(candidate.category)}
            tone={getPatternCategoryTone(candidate.category)}
          />
          <StatusBadge
            label={formatConfidence(candidate.confidence)}
            tone={getConfidenceTone(candidate.confidence)}
          />
          <StatusBadge
            label={formatBreakoutDirection(candidate.breakoutDirection)}
            tone={getBreakoutTone(candidate.breakoutDirection)}
          />
          <StatusBadge
            label={`리스크 ${formatRiskLevel(candidate.riskLevel)}`}
            tone={getRiskTone(candidate.riskLevel)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="패턴 상태"
          value={formatPatternStage(candidate.stage)}
          badge={<StatusBadge label={formatPatternDirection(candidate.direction)} tone="info" />}
        />
        <MetricCard title="신뢰도 점수" value={formatScore(candidate.confidenceScore)} />
        <MetricCard
          title="공격적 진입 후보"
          value={formatPrice(candidate.tradePlan?.entryPriceAggressive)}
          description={`진입 유형: ${formatEntryType(candidate.tradePlan?.entryType)}`}
        />
        <MetricCard title="무효화 기준 후보" value={formatPrice(candidate.tradePlan?.stopLossPrice)} />
        <MetricCard title="1차 목표 후보" value={formatPrice(candidate.tradePlan?.targetPrice1)} />
        <MetricCard title="2차 목표 후보" value={formatPrice(candidate.tradePlan?.targetPrice2)} />
        <MetricCard title="손익비" value={formatNumber(candidate.tradePlan?.riskRewardRatio)} />
        <MetricCard
          title="패턴 높이"
          value={formatPrice(candidate.calculation?.patternHeight)}
          description={candidate.calculation?.estimated ? "이미지 기반 추정값" : "계산값"}
        />
      </div>

      {candidate.baseReliability ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">기본 신뢰도 {candidate.baseReliability.score}점</p>
          <p className="mt-1">{candidate.baseReliability.reason}</p>
        </div>
      ) : null}

      <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">근거</p>
          <p className="mt-1">{evidenceText}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">확인 조건</p>
          <p className="mt-1">{fallback(candidate.confirmationCondition)}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">무효화 조건</p>
          <p className="mt-1">{fallback(candidate.invalidationCondition)}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">진입 후보 조건</p>
          <p className="mt-1">{fallback(candidate.entryLogic)}</p>
        </div>
      </div>
    </article>
  );
}

function FeedbackSection({ analysisId }: { analysisId?: number }) {
  const [rating, setRating] = useState<number>(5);
  const [correctSignal, setCorrectSignal] = useState("buy_candidate");
  const [correctPattern, setCorrectPattern] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!analysisId) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await submitFeedback({
        analysisId,
        rating,
        correctSignal,
        correctPattern: correctPattern || null,
        comment: comment || null,
      });
      setMessage("피드백이 저장되었습니다.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "피드백 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResultSection title="피드백" tone="green">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">별점</span>
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}점
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">올바른 신호</span>
          <select
            value={correctSignal}
            onChange={(event) => setCorrectSignal(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {["buy_candidate", "sell_candidate", "hold_candidate", "neutral", "wrong"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">올바른 패턴</span>
          <input
            value={correctPattern}
            onChange={(event) => setCorrectPattern(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="예: ascending_triangle"
          />
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">코멘트</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="분석이 맞았는지, 보완이 필요한 점이 있었는지 남겨주세요."
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "저장 중..." : "피드백 제출"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </ResultSection>
  );
}

export default function AnalysisResult({ result }: AnalysisResultProps) {
  if (!result) {
    return null;
  }

  const ai = result.aiAnalysis;
  const tradeSignal = result.tradeSignal;
  const patterns = ai?.patternCandidates ?? [];
  const indicators = ai?.visibleIndicators ?? [];
  const riskNotes = unique([...(ai?.riskNotes ?? []), ...(tradeSignal?.warnings ?? [])]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <ResultSection title="AI 차트 요약" tone="blue">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="분석 ID" value={fallback(result.analysisId)} />
            <MetricCard title="차트 형태" value={fallback(ai?.chartType)} />
            <MetricCard title="시간봉 추정" value={fallback(ai?.timeframeEstimate)} />
            <MetricCard title="시각적 추세" value={fallback(ai?.visualTrend)} />
          </div>
          <p className="text-base leading-7 text-slate-800">{fallback(ai?.summary)}</p>
          {ai?.patternSummary ? (
            <div className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="우선 패턴 후보" value={fallback(ai.patternSummary.primaryPattern)} />
              <MetricCard title="패턴 방향성" value={fallback(ai.patternSummary.overallPatternBias)} />
              <MetricCard title="핵심 무효화 가격" value={formatPrice(ai.patternSummary.keyInvalidationPrice)} />
              <MetricCard title="핵심 목표 가격 후보" value={formatPrice(ai.patternSummary.keyTargetPrice)} />
              <p className="md:col-span-2 xl:col-span-4 text-sm leading-6 text-blue-900">
                {ai.patternSummary.comment}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {indicators.length === 0 ? (
              <span className="text-sm text-slate-500">확인된 보조지표가 없습니다.</span>
            ) : (
              indicators.map((item) => <StatusBadge key={item} label={item} tone="info" />)
            )}
          </div>
        </div>
      </ResultSection>

      <ResultSection title="패턴 후보" tone="blue">
        {patterns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            명확한 패턴 후보가 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {patterns.map((pattern, index) => (
              <PatternCandidateCard key={`${pattern.name}-${index}`} candidate={pattern} />
            ))}
          </div>
        )}
      </ResultSection>

      <ResultSection title="시각적 지지·저항 후보" tone="blue">
        <div className="grid gap-4 lg:grid-cols-2">
          <ZoneList
            title="시각적 지지 후보"
            zones={ai?.visualSupportZones}
            emptyText="시각적 지지 후보를 확인하지 못했습니다."
          />
          <ZoneList
            title="시각적 저항 후보"
            zones={ai?.visualResistanceZones}
            emptyText="시각적 저항 후보를 확인하지 못했습니다."
          />
        </div>
      </ResultSection>

      <ResultSection title="매매 신호 요약" tone="purple">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="기술적 신호"
              value={tradeSignal?.signalLabel || formatSignalLabel(tradeSignal?.finalSignal)}
              badge={
                <StatusBadge
                  label={formatConfidence(tradeSignal?.confidence)}
                  tone={getConfidenceTone(tradeSignal?.confidence)}
                />
              }
            />
            <MetricCard title="신호 코드" value={formatSignalLabel(tradeSignal?.finalSignal)} />
            <MetricCard title="매수 후보 점수" value={formatScore(tradeSignal?.buyScore)} />
            <MetricCard title="매도 후보 점수" value={formatScore(tradeSignal?.sellScore)} />
            <MetricCard
              title="현재가 추정"
              value={formatPrice(tradeSignal?.currentPriceEstimate?.value)}
              badge={
                <StatusBadge
                  label={formatConfidence(tradeSignal?.currentPriceEstimate?.confidence)}
                  tone={getConfidenceTone(tradeSignal?.currentPriceEstimate?.confidence)}
                />
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="font-bold text-emerald-950">매수 후보 구간</h3>
              <p className="mt-2 text-2xl font-bold text-emerald-950">
                {formatPriceRange(tradeSignal?.buyZone?.priceRange?.from, tradeSignal?.buyZone?.priceRange?.to)}
              </p>
              <BasisList items={tradeSignal?.buyZone?.basis} />
            </article>

            <article className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-bold text-orange-950">매도 후보 구간</h3>
              <p className="mt-2 text-2xl font-bold text-orange-950">
                {formatPriceRange(tradeSignal?.sellZone?.priceRange?.from, tradeSignal?.sellZone?.priceRange?.to)}
              </p>
              <BasisList items={tradeSignal?.sellZone?.basis} />
            </article>

            <article className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-bold text-red-950">손절 기준 후보</h3>
              <p className="mt-2 text-2xl font-bold text-red-950">
                {formatPrice(tradeSignal?.stopLossCandidate?.price)}
              </p>
              <p className="mt-2 text-sm leading-6 text-red-800">
                {fallback(tradeSignal?.stopLossCandidate?.basis)}
              </p>
            </article>

            <article className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-bold text-blue-950">목표 가격 후보</h3>
              <div className="mt-3 space-y-2 text-sm text-blue-900">
                <p>
                  <span className="font-semibold">1차 목표 후보:</span>{" "}
                  {formatPrice(tradeSignal?.targetPriceCandidate?.primary)}
                </p>
                <p>
                  <span className="font-semibold">2차 목표 후보:</span>{" "}
                  {formatPrice(tradeSignal?.targetPriceCandidate?.secondary)}
                </p>
                <p>
                  <span className="font-semibold">리스크 대비 보상비:</span>{" "}
                  {tradeSignal?.targetPriceCandidate?.riskRewardRatio ?? "-"}
                </p>
                <p className="pt-1 leading-6">{fallback(tradeSignal?.targetPriceCandidate?.basis)}</p>
              </div>
            </article>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">조건별 점수</h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">구분</th>
                    <th className="px-4 py-3 font-semibold">조건</th>
                    <th className="px-4 py-3 font-semibold">점수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {scoreRows(tradeSignal).map((row) => {
                    const classes = scoreRowClasses(row.group);
                    return (
                      <tr key={`${row.group}-${row.label}`} className={classes.background}>
                        <td className={`px-4 py-3 font-medium ${classes.group}`}>{row.group}</td>
                        <td className={`px-4 py-3 ${classes.label}`}>{row.label}</td>
                        <td className={`px-4 py-3 font-semibold ${classes.score}`}>{formatScore(row.score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {result.technicalAnalysis ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="실제 종가" value={formatPrice(result.technicalAnalysis.latestClose)} />
              <MetricCard
                title="RSI"
                value={formatNumber(result.technicalAnalysis.rsi.value)}
                badge={
                  <StatusBadge
                    label={formatStatus(result.technicalAnalysis.rsi.status)}
                    tone={getStatusTone(result.technicalAnalysis.rsi.status)}
                  />
                }
              />
              <MetricCard
                title="MACD"
                value={formatNumber(result.technicalAnalysis.macd.macd)}
                badge={
                  <StatusBadge
                    label={formatStatus(result.technicalAnalysis.macd.status)}
                    tone={getStatusTone(result.technicalAnalysis.macd.status)}
                  />
                }
              />
              <MetricCard
                title="최근 평균 거래량"
                value={formatNumber(result.technicalAnalysis.volume.recentAverageVolume)}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">실제 OHLCV 기반 정량 분석은 제공되지 않았습니다.</p>
          )}
        </div>
      </ResultSection>

      <ResultSection title="리스크 노트" tone="yellow">
        {riskNotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            추가 리스크 노트가 없습니다.
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            <ul className="list-disc space-y-1 pl-5">
              {riskNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </ResultSection>

      <FeedbackSection analysisId={result.analysisId} />

      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-soft">
        본 결과는 RSI, MACD, 볼린저밴드, 이동평균선, 거래량 등 기술적 지표와 차트 이미지 기반 참고 정보이며,
        투자 조언이나 매수·매도 추천이 아닙니다. 실제 투자 판단은 사용자의 책임입니다.
      </section>
    </div>
  );
}
