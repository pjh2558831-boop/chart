import type { AnalysisViewModel } from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";

interface PriceStrategyCardsProps {
  strategy: AnalysisViewModel["priceStrategy"];
}

export default function PriceStrategyCards({ strategy }: PriceStrategyCardsProps) {
  return (
    <ResultSection
      title="가격 전략 후보"
      description="진입, 손절, 목표 가격은 추천가가 아니라 기술적 조건에 따른 후보 가격대입니다."
      tone="purple"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="진입 후보 가격" value={strategy.entryZoneText} description={strategy.entryZoneBasis} />
        <MetricCard title="손절 기준 후보" value={strategy.stopLossText} description={strategy.stopLossBasis} />
        <MetricCard title="1차 목표 가격 후보" value={strategy.target1Text} description={strategy.target1Basis} />
        <MetricCard title="2차 목표 가격 후보" value={strategy.target2Text} description={strategy.target2Basis} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-600">손익비</p>
        <p className="mt-1 text-xl font-bold text-slate-950">{strategy.riskRewardText}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{strategy.riskRewardBasis}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{strategy.priceBasisWarning}</p>
      </div>
    </ResultSection>
  );
}
