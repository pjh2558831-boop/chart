import type { AnalysisViewModel } from "../types/analysis";
import ResultSection from "./ResultSection";

interface RiskWarningsSectionProps {
  warnings: AnalysisViewModel["riskWarnings"];
}

export default function RiskWarningsSection({ warnings }: RiskWarningsSectionProps) {
  return (
    <ResultSection title="리스크 체크" tone="yellow">
      {warnings.length === 0 ? (
        <p className="text-sm text-slate-500">추가 리스크 문구가 없습니다.</p>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </ResultSection>
  );
}
