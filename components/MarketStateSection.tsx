import type { AnalysisViewModel } from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";

interface MarketStateSectionProps {
  state: AnalysisViewModel["marketState"];
}

export default function MarketStateSection({ state }: MarketStateSectionProps) {
  return (
    <ResultSection title="시장 상태" tone="blue">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="추세 방향" value={state.trendDirection} />
        <MetricCard title="변동성" value={state.volatilityState} />
        <MetricCard title="가격 위치" value={state.pricePosition} />
        <MetricCard title="패턴 상태" value={state.patternState} />
      </div>
      <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        {state.interpretation}
      </p>
    </ResultSection>
  );
}
