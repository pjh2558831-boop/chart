import {
  formatConfidence,
  formatPatternCategory,
  formatPrice,
  formatRiskLevel,
  formatScore,
  getConfidenceTone,
  getRiskTone,
} from "../lib/formatters";
import type { AnalysisViewModel, PatternCandidate } from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

interface PatternCandidatesSectionProps {
  patternView: AnalysisViewModel["patternView"];
}

function formatStage(stage?: string | null) {
  switch (stage) {
    case "confirmed":
      return "확인";
    case "failed":
      return "실패";
    case "invalid":
      return "무효";
    case "candidate":
      return "후보";
    default:
      return "후보";
  }
}

function formatDirection(direction?: string | null) {
  switch (direction) {
    case "bullish":
      return "상승 방향 후보";
    case "bearish":
      return "하락 방향 후보";
    case "neutral":
      return "중립";
    default:
      return "방향 확인 필요";
  }
}

function PatternCard({ candidate }: { candidate: PatternCandidate }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">패턴 후보</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{candidate.label || candidate.name}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={formatPatternCategory(candidate.category)} tone="neutral" />
          <StatusBadge label={formatConfidence(candidate.confidence)} tone={getConfidenceTone(candidate.confidence)} />
          <StatusBadge label={formatRiskLevel(candidate.riskLevel)} tone={getRiskTone(candidate.riskLevel)} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="방향성" value={formatDirection(candidate.direction)} />
        <MetricCard title="단계" value={formatStage(candidate.stage)} />
        <MetricCard title="신뢰도 점수" value={formatScore(candidate.confidenceScore)} />
        <MetricCard title="손익비" value={candidate.tradePlan?.riskRewardRatio ? String(candidate.tradePlan.riskRewardRatio) : "-"} />
        <MetricCard title="진입 후보 가격" value={formatPrice(candidate.tradePlan?.entryPriceAggressive)} />
        <MetricCard title="손절 기준 후보" value={formatPrice(candidate.tradePlan?.stopLossPrice)} />
        <MetricCard title="1차 목표 후보" value={formatPrice(candidate.tradePlan?.targetPrice1)} />
        <MetricCard title="2차 목표 후보" value={formatPrice(candidate.tradePlan?.targetPrice2)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">확인 조건</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{candidate.confirmationCondition || "추가 확인 필요"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">무효화 조건</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{candidate.invalidationCondition || "무효화 기준 확인 필요"}</p>
        </div>
      </div>

      {candidate.tradingImplication ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="font-semibold text-blue-950">매매 해석 참고</p>
          <p className="mt-1 text-sm leading-6 text-blue-900">{candidate.tradingImplication}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="font-semibold text-slate-900">근거</p>
        {candidate.evidence?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            {candidate.evidence.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">근거 없음</p>
        )}
      </div>
    </article>
  );
}

export default function PatternCandidatesSection({ patternView }: PatternCandidatesSectionProps) {
  return (
    <ResultSection title="차트 패턴 후보" description={patternView.summaryText} tone="blue">
      {patternView.candidates.length === 0 ? (
        <p className="text-sm text-slate-500">현재 이미지에서는 명확한 패턴 후보가 확인되지 않습니다.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {patternView.candidates.slice(0, 3).map((candidate, index) => (
            <PatternCard key={`${candidate.name}-${index}`} candidate={candidate} />
          ))}
        </div>
      )}
    </ResultSection>
  );
}
