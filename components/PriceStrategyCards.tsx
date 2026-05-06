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
        <MetricCard
          title="진입 후보 가격"
          value={strategy.entryZoneText}
          description="명확한 조건 확인 전에는 관찰 구간으로만 해석합니다."
        />
        <MetricCard
          title="손절 기준 후보"
          value={strategy.stopLossText}
          description="주요 무효화 기준 가격을 바탕으로 계산합니다."
        />
        <MetricCard
          title="1차 목표 가격 후보"
          value={strategy.target1Text}
          description="최근 저항 또는 패턴 목표 후보입니다."
        />
        <MetricCard
          title="2차 목표 가격 후보"
          value={strategy.target2Text}
          description="확장 목표 후보이며 확정 목표가가 아닙니다."
        />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-600">손익비</p>
        <p className="mt-1 text-xl font-bold text-slate-950">{strategy.riskRewardText}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{strategy.priceBasisWarning}</p>
      </div>
    </ResultSection>
  );
}
