import type { AnalysisViewModel } from "../types/analysis";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

interface DecisionReasonListProps {
  reasons: AnalysisViewModel["decisionReasons"];
}

function reasonMeta(type: "positive" | "neutral" | "negative") {
  if (type === "positive") return { label: "긍정", tone: "success" };
  if (type === "negative") return { label: "부정", tone: "danger" };
  return { label: "중립", tone: "neutral" };
}

export default function DecisionReasonList({ reasons }: DecisionReasonListProps) {
  return (
    <ResultSection title="판단 근거" description="최종 신호 후보가 나온 이유를 긍정, 중립, 부정 근거로 나눠 정리했습니다." tone="blue">
      {reasons.length === 0 ? (
        <p className="text-sm text-slate-500">표시할 판단 근거가 부족합니다.</p>
      ) : (
        <ul className="space-y-3">
          {reasons.map((reason, index) => {
            const meta = reasonMeta(reason.type);
            return (
              <li key={`${reason.type}-${index}`} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="shrink-0">
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
                <p className="text-sm leading-6 text-slate-700">{reason.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </ResultSection>
  );
}
