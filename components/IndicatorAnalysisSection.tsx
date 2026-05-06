import type { AnalysisViewModel } from "../types/analysis";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

interface IndicatorAnalysisSectionProps {
  indicators: AnalysisViewModel["indicatorView"];
}

export default function IndicatorAnalysisSection({ indicators }: IndicatorAnalysisSectionProps) {
  return (
    <ResultSection
      title="보조지표 해석"
      description="RSI, MACD, 볼린저밴드, 일목구름, 이동평균선, 거래량을 각각 분리해서 해석합니다."
      tone="green"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {indicators.map((indicator) => (
          <article key={indicator.name} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-950">{indicator.name}</h3>
              <StatusBadge label={indicator.confidence} tone="neutral" />
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-900">{indicator.status}</p>
            <p className="mt-1 text-sm text-slate-500">{indicator.direction}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{indicator.interpretation}</p>
          </article>
        ))}
      </div>
    </ResultSection>
  );
}
