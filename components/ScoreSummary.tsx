"use client";

import { useState } from "react";

import { formatScore } from "../lib/formatters";
import type { AnalysisViewModel } from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";

interface ScoreSummaryProps {
  summary: AnalysisViewModel["scoreSummary"];
}

function rowClasses(group: string) {
  if (group === "매수") {
    return {
      row: "bg-red-50/60",
      group: "text-red-700",
      label: "text-red-700",
      score: "text-red-800",
    };
  }
  if (group === "매도") {
    return {
      row: "bg-blue-50/60",
      group: "text-blue-700",
      label: "text-blue-700",
      score: "text-blue-800",
    };
  }
  return {
    row: "bg-slate-50",
    group: "text-slate-700",
    label: "text-slate-700",
    score: "text-slate-800",
  };
}

export default function ScoreSummary({ summary }: ScoreSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ResultSection
      title="신호 점수 요약"
      description="점수는 100점 기준으로 정규화한 참고 지표이며, 단독 판단 기준이 아닙니다."
      tone="purple"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="매수 점수" value={formatScore(summary.buyScore)} />
        <MetricCard title="매도 점수" value={formatScore(summary.sellScore)} />
        <MetricCard title="관망/보유 점수" value={formatScore(summary.holdScore)} />
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        {summary.interpretation}
      </p>

      {summary.deductions.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">감점 요인</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
            {summary.deductions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {isOpen ? "상세 점수 접기" : "상세 점수 보기"}
      </button>

      {isOpen ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">구분</th>
                <th className="px-4 py-3 font-semibold">조건</th>
                <th className="px-4 py-3 font-semibold">점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {summary.rows.map((row) => {
                const classes = rowClasses(row.group);
                return (
                  <tr key={`${row.group}-${row.label}`} className={classes.row}>
                    <td className={`px-4 py-3 font-medium ${classes.group}`}>{row.group}</td>
                    <td className={`px-4 py-3 ${classes.label}`}>{row.label}</td>
                    <td className={`px-4 py-3 font-semibold ${classes.score}`}>{formatScore(row.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </ResultSection>
  );
}
