import { formatPrice } from "../lib/formatters";
import type { AnalysisViewModel } from "../types/analysis";
import ResultSection from "./ResultSection";

interface SupportResistanceSectionProps {
  data: AnalysisViewModel["supportResistance"];
}

export default function SupportResistanceSection({ data }: SupportResistanceSectionProps) {
  const rows = [
    ...data.supports.map((item) => ({ ...item, type: "지지 후보" })),
    ...data.resistances.map((item) => ({ ...item, type: "저항 후보" })),
  ];

  return (
    <ResultSection title="주요 가격대" description="현재가 대비 가까운 지지/저항 후보를 우선 표시합니다." tone="green">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">계산 가능한 주요 가격대가 부족합니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">구분</th>
                <th className="px-4 py-3 font-semibold">가격대</th>
                <th className="px-4 py-3 font-semibold">현재가 대비</th>
                <th className="px-4 py-3 font-semibold">의미</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={`${row.type}-${row.label}-${row.value}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.type}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPrice(row.value)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.distanceText}</td>
                  <td className="px-4 py-3 text-slate-600">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ResultSection>
  );
}
