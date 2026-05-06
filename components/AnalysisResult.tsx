"use client";

import { useState } from "react";

import { submitFeedback } from "../lib/api";
import { normalizeAnalysisResult } from "../lib/analysisViewModel";
import type { AnalysisResponse } from "../types/analysis";
import DecisionReasonList from "./DecisionReasonList";
import IndicatorAnalysisSection from "./IndicatorAnalysisSection";
import MarketStateSection from "./MarketStateSection";
import PatternCandidatesSection from "./PatternCandidatesSection";
import PriceStrategyCards from "./PriceStrategyCards";
import ResultSection from "./ResultSection";
import RiskWarningsSection from "./RiskWarningsSection";
import ScoreSummary from "./ScoreSummary";
import SignalSummaryCard from "./SignalSummaryCard";
import SupportResistanceSection from "./SupportResistanceSection";

interface AnalysisResultProps {
  result: AnalysisResponse | null;
}

function FeedbackSection({ analysisId }: { analysisId?: number }) {
  const [rating, setRating] = useState<number>(5);
  const [correctSignal, setCorrectSignal] = useState("neutral");
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
      setError(requestError instanceof Error ? requestError.message : "피드백 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResultSection title="피드백" description="분석 품질 개선을 위한 MVP용 피드백 영역입니다." tone="green">
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
          <span className="mb-2 block font-semibold text-slate-900">사용자 판단 신호</span>
          <select
            value={correctSignal}
            onChange={(event) => setCorrectSignal(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {[
              ["buy_candidate", "매수 후보"],
              ["sell_candidate", "매도 후보"],
              ["hold_candidate", "보유 후보"],
              ["neutral", "중립"],
              ["wrong", "분석 부정확"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">사용자가 본 패턴</span>
          <input
            value={correctPattern}
            onChange={(event) => setCorrectPattern(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="예: 이중바닥, 박스권"
          />
        </label>

        <label className="text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">코멘트</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="분석이 맞았는지, 어떤 점을 보완하면 좋을지 적어주세요."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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

  const viewModel = normalizeAnalysisResult(result);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <SignalSummaryCard summary={viewModel.signalSummary} />
      <PriceStrategyCards strategy={viewModel.priceStrategy} />
      <DecisionReasonList reasons={viewModel.decisionReasons} />
      <ScoreSummary summary={viewModel.scoreSummary} />
      <MarketStateSection state={viewModel.marketState} />
      <SupportResistanceSection data={viewModel.supportResistance} />
      <PatternCandidatesSection patternView={viewModel.patternView} />
      <IndicatorAnalysisSection indicators={viewModel.indicatorView} />
      <RiskWarningsSection warnings={viewModel.riskWarnings} />
      <FeedbackSection analysisId={result.analysisId} />

      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-soft">
        본 분석은 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다. 실제 투자 판단에는
        실시간 가격, 거래량, OHLCV 데이터, 재무 정보, 시장 상황을 함께 확인해야 합니다.
      </section>
    </div>
  );
}
