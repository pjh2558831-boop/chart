import type { AnalysisViewModel, SignalTone } from "../types/analysis";
import MetricCard from "./MetricCard";

interface SignalSummaryCardProps {
  summary: AnalysisViewModel["signalSummary"];
}

const toneClasses: Record<SignalTone, string> = {
  strongPositive: "border-emerald-700 bg-emerald-950 text-white",
  positive: "border-emerald-500 bg-emerald-50 text-emerald-950",
  neutral: "border-blue-400 bg-blue-50 text-blue-950",
  caution: "border-orange-400 bg-orange-50 text-orange-950",
  negative: "border-red-400 bg-red-50 text-red-950",
  danger: "border-red-700 bg-red-950 text-white",
  unknown: "border-slate-300 bg-slate-100 text-slate-900",
};

export default function SignalSummaryCard({ summary }: SignalSummaryCardProps) {
  return (
    <section className={`rounded-lg border p-5 shadow-soft ${toneClasses[summary.signalTone]}`}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="text-sm font-semibold opacity-80">판단 요약</p>
          <h2 className="mt-3 break-words text-3xl font-bold">{summary.finalLabel}</h2>
          <p className="mt-4 text-base leading-7 opacity-90">{summary.oneLineSummary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="현재 추세" value={summary.currentState} />
          <MetricCard title="전략 유형" value={summary.strategyTypeLabel} />
          <MetricCard title="매수 점수" value={summary.buyScoreText} description={summary.buyScoreLevel} />
          <MetricCard title="매도 점수" value={summary.sellScoreText} description={summary.sellScoreLevel} />
          <MetricCard title="관망/보유 점수" value={summary.holdScoreText} description={summary.holdScoreLevel} />
        </div>
      </div>
    </section>
  );
}
