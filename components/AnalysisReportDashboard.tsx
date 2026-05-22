"use client";

import type { ReactNode } from "react";

import {
  buildInstitutionalReportViewModel,
  type EntryModeCard,
  type EntryTone,
  type IndicatorRow,
  type IndicatorTone,
  type InstitutionalReportViewModel,
  type ScenarioCard,
  type ScenarioTone,
  type SignalTone,
} from "../lib/institutionalReportViewModel";
import type { AnalysisResponse } from "../types/analysis";

type DashboardProps = {
  result: AnalysisResponse;
};

type CardProps = {
  children: ReactNode;
  className?: string;
};

function safeValue(value: string | number | null | undefined, fallback = "-") {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || /^(undefined|null|nan|infinity|\[object object\])$/i.test(text)) return fallback;
  if (/\b(undefined|null|NaN|Infinity)\b/.test(text) || text.includes("[object Object]")) return fallback;
  return text;
}

function compactSignalLabel(label: string | number | null | undefined) {
  const text = safeValue(label, "관망");
  const compactLabels = ["돌파 대기", "눌림 대기", "지지 확인", "저항 확인", "관망", "주의", "위험 관리", "진입 보류", "매수 후보"];
  if (compactLabels.includes(text)) return text;
  if (text.includes("매수 후보")) return "매수 후보";
  if (text.includes("돌파") && (text.includes("대기") || text.includes("확인"))) return "돌파 대기";
  if (text.includes("눌림")) return "눌림 대기";
  if (text.includes("지지") && text.includes("확인")) return "지지 확인";
  if (text.includes("저항") && text.includes("확인")) return "저항 확인";
  if (text.includes("위험")) return "위험 관리";
  if (text.includes("주의")) return "주의";
  if (text.includes("보유") || text.includes("관망")) return "관망";
  if (text.includes("진입 보류")) return "진입 보류";
  if (text.includes("보류")) return "진입 보류";
  if (text.includes("대기")) return "관망";
  return text.length > 5 ? "관망" : text;
}

function cardClass(extra = "") {
  return `box-border min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-5 leading-relaxed shadow-sm [overflow-wrap:break-word] [word-break:keep-all] sm:p-6 [&_*]:min-w-0 ${extra}`;
}

function Card({ children, className = "" }: CardProps) {
  return <section className={cardClass(className)}>{children}</section>;
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

const signalToneClass: Record<SignalTone, string> = {
  buy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-blue-200 bg-blue-50 text-blue-700",
  caution: "border-amber-200 bg-amber-50 text-amber-700",
  hold: "border-slate-200 bg-slate-50 text-slate-700",
  risk: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

const entryToneClass: Record<EntryTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  caution: "border-amber-200 bg-amber-50 text-amber-700",
  risk: "border-rose-200 bg-rose-50 text-rose-700",
};

const scenarioToneClass: Record<ScenarioTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-blue-100 bg-blue-50 text-blue-700",
  risk: "border-rose-200 bg-rose-50 text-rose-700",
};

const indicatorToneClass: Record<IndicatorTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  caution: "border-amber-200 bg-amber-50 text-amber-700",
  risk: "border-rose-200 bg-rose-50 text-rose-700",
};

function SmallBadge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-center text-xs font-semibold leading-5 [overflow-wrap:break-word] [word-break:keep-all] ${className}`}>
      {children}
    </span>
  );
}

function ReportHeader() {
  return (
    <header>
      <div>
        <p className="text-sm font-semibold tracking-tight text-slate-500">CHART VISION AI</p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">AI 기술적 분석 리포트</h1>
      </div>
    </header>
  );
}

function MiniLevelChart({ data }: { data?: Array<{ label: string; value: string }> }) {
  const levels = data?.length ? data : [
    { label: "지지", value: "-" },
    { label: "현재", value: "-" },
    { label: "저항", value: "-" },
  ];

  return (
    <div className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="relative h-2 rounded-full bg-slate-200">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-blue-500" />
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs leading-5">
        {levels.map((item, index) => (
          <div key={item.label} className={`min-w-0 ${index === 1 ? "text-center" : index === 2 ? "text-right" : ""}`}>
            <p className="font-semibold text-slate-500">{item.label}</p>
            <p className="mt-1 font-bold text-slate-900 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryHero({ vm }: { vm: InstitutionalReportViewModel }) {
  const hero = vm.hero;
  const signalLabel = compactSignalLabel(hero.signalLabel);
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="grid grid-cols-1 gap-7 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_minmax(170px,260px)] 2xl:items-stretch">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="max-w-full text-3xl font-extrabold tracking-tight text-slate-950 [overflow-wrap:break-word] [word-break:keep-all] sm:text-4xl">{safeValue(hero.stockName, "미확인")}</h2>
            <span className="max-w-full text-base font-semibold text-slate-600 [overflow-wrap:break-word]">{safeValue(hero.ticker)}</span>
            {hero.marketTag !== "-" ? <SmallBadge className="border-blue-200 bg-blue-50 text-blue-700">{hero.marketTag}</SmallBadge> : null}
          </div>
          <div className="mt-7 space-y-4">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="max-w-full text-[clamp(2.5rem,7vw,3.75rem)] font-extrabold leading-none tracking-tight text-slate-950 [overflow-wrap:break-word]">{safeValue(hero.currentPrice)}</p>
              {hero.currencyOrUnit !== "-" ? <p className="pb-2 text-base font-semibold text-slate-600">{hero.currencyOrUnit}</p> : null}
              <p className="pb-2 text-sm font-semibold text-slate-400">{safeValue(hero.priceChange, "등락 데이터 없음")}</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 leading-6 text-slate-600">
                <span className="font-bold text-slate-900">현재가 해석</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="[overflow-wrap:break-word] [word-break:keep-all]">{vm.basisSummary.currentPrice}</span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 leading-6 text-slate-600">
                <span className="font-bold text-slate-900">우선 전략</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="[overflow-wrap:break-word] [word-break:keep-all]">{vm.basisSummary.preferredStrategy}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <div className="min-w-0 rounded-lg border border-slate-100 bg-white/80 p-4">
            <p className="text-sm font-semibold tracking-normal text-slate-500">리포트 신뢰도</p>
            <p className="mt-3 text-3xl font-bold leading-tight text-blue-700 [overflow-wrap:break-word]">
              {hero.confidenceScore === null ? "점수 확인 필요" : `${hero.confidenceScore} / 100`}
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">{hero.confidenceLabel}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-slate-100 bg-white/80 p-4">
            <p className="text-sm font-semibold text-slate-500">트렌드 방향</p>
            <p className="mt-3 text-xl font-bold leading-7 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{hero.trendLabel}</p>
            <p className="mt-2 text-sm leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">{hero.trendDescription}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-slate-100 bg-white/80 p-4">
            <p className="text-sm font-semibold text-slate-500">분석 기준 차트</p>
            <p className="mt-3 text-xl font-bold leading-7 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{vm.basisSummary.chartBasis}</p>
            <p className="mt-2 text-sm leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">{vm.basisSummary.currentLocation}</p>
          </div>
          <div className="md:col-span-3">
            <p className="mb-2 text-sm font-semibold text-slate-600">가격 흐름 요약</p>
            <MiniLevelChart data={hero.miniChartData} />
          </div>
        </div>

        <div className={`box-border flex min-h-32 min-w-0 max-w-full flex-col items-center justify-center overflow-hidden rounded-lg border px-4 py-5 text-center sm:px-6 ${signalToneClass[hero.signalTone]}`}>
          <p className="max-w-full whitespace-normal text-[clamp(1.75rem,4vw,3.5rem)] font-extrabold leading-tight tracking-tight [overflow-wrap:break-word] [word-break:keep-all]">{signalLabel}</p>
          <p className="mt-3 max-w-full text-sm font-extrabold leading-6 [overflow-wrap:break-word] [word-break:keep-all]">{vm.finalAction.title}</p>
          <p className="mt-2 max-w-full text-xs font-semibold leading-5 opacity-80 [overflow-wrap:break-word] [word-break:keep-all]">{vm.finalAction.subtitle}</p>
        </div>
      </div>
      {vm.basisSummary.priceUnit.includes("확인 필요") || vm.basisSummary.priceUnit.includes("이미지") ? (
        <p className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [word-break:keep-all]">
          가격 단위는 이미지 축 기준 추정값일 수 있어 실제 시세 단위와 차이가 있을 수 있습니다.
        </p>
      ) : null}
    </Card>
  );
}

function EntryModeItem({ title, item }: { title: string; item: EntryModeCard }) {
  return (
    <article className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 [overflow-wrap:break-word] [word-break:keep-all]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{item.score === null ? "점수 확인 필요" : `${item.score} / 100`}</p>
        </div>
        <SmallBadge className={entryToneClass[item.tone]}>{item.label}</SmallBadge>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">{item.explanation}</p>
      <dl className="mt-4 space-y-2 text-sm">
        {[
          ["조건", item.condition],
          ["손절", item.stopLoss],
          ["목표", item.target],
          ["손익비", item.riskReward],
        ].map(([label, value]) => (
          <div key={label} className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-3">
            <dt className="whitespace-nowrap font-bold text-slate-500">{label}</dt>
            <dd className="font-semibold leading-6 text-slate-900 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(value, "확인 필요")}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function EntryModesCard({ vm }: { vm: InstitutionalReportViewModel }) {
  return (
    <Card>
      <SectionTitle title="진입 방식별 판단" description="현재가, 눌림목, 돌파 진입을 조건과 손절 기준별로 분리합니다." />
      <div className="grid gap-4 xl:grid-cols-3">
        <EntryModeItem title="현재가 진입" item={vm.entryMode.currentEntry} />
        <EntryModeItem title="눌림목 진입" item={vm.entryMode.pullbackEntry} />
        <EntryModeItem title="돌파 진입" item={vm.entryMode.breakoutEntry} />
      </div>
    </Card>
  );
}

function MarketSummaryCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const rows = [
    ["시장 관점", vm.marketSummary.observation, "bg-blue-500"],
    ["핵심 해석", vm.marketSummary.coreInterpretation, "bg-emerald-500"],
    ["지지·저항 해석", vm.marketSummary.supportResistanceInterpretation, "bg-slate-400"],
    ["리스크 요인", vm.marketSummary.riskPoint, "bg-amber-500"],
  ];

  return (
    <Card>
      <SectionTitle title="AI 시장 요약" />
      <div className="space-y-4">
        {rows.map(([label, value, marker]) => (
          <div key={label} className="flex min-w-0 gap-3">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${marker}`} />
            <div className="min-w-0">
              <p className="whitespace-nowrap text-sm font-bold text-slate-950">{label}</p>
              <p className="mt-1 text-sm leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(value, "분석 데이터 없음")}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  const value = score ?? 0;
  const stroke = score === null ? "#CBD5E1" : value >= 70 ? "#2563EB" : value >= 40 ? "#F59E0B" : "#DC2626";
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 110 110" className="h-40 w-40 -rotate-90">
        <circle cx="55" cy="55" r="44" fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r="44"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className={score === null ? "text-base font-bold text-slate-500" : "text-4xl font-bold text-slate-950"}>
          {score === null ? "점수 확인 필요" : score}
        </p>
        <p className="text-sm font-semibold text-slate-500">{score === null ? "점수 없음" : "/ 100"}</p>
      </div>
    </div>
  );
}

function MetricBar({ label, score, riskMode = false }: { label: string; score: number | null; riskMode?: boolean }) {
  const value = score ?? 0;
  const color = score === null
    ? "bg-slate-300"
    : riskMode
      ? score >= 70 ? "bg-rose-500" : score >= 45 ? "bg-amber-500" : "bg-emerald-500"
      : score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(72px,92px)_minmax(0,1fr)_minmax(64px,74px)] items-center gap-3 text-sm">
      <span className="whitespace-nowrap font-semibold text-slate-700">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right text-xs font-bold leading-5 text-slate-900 [overflow-wrap:break-word]">{score === null ? "확인 필요" : score}</span>
    </div>
  );
}

function SignalScoreCard({ vm }: { vm: InstitutionalReportViewModel }) {
  return (
    <Card>
      <SectionTitle title="AI 시그널 점수" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center">
          <ScoreCircle score={vm.scorePanel.overallScore} />
        </div>
        <div className="space-y-4">
          <MetricBar label="모멘텀" score={vm.scorePanel.momentumScore} />
          <MetricBar label="돌파 확률" score={vm.scorePanel.breakoutScore} />
          <MetricBar label="리스크 수준" score={vm.scorePanel.riskScore} riskMode />
          <div>
            <MetricBar label="진입 점수" score={vm.scorePanel.entryScore} />
            <p className="mt-1 text-right text-xs font-semibold leading-5 text-slate-500 [word-break:keep-all]">
              {safeValue(vm.scorePanel.entryScoreLabel, "확인 필요")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PriceLevelsCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const targetValue = vm.keyLevels.targetGapLabel === "목표 여유 낮음"
    ? `${safeValue(vm.keyLevels.target)} · 목표가 근접`
    : vm.keyLevels.target;
  const rows = [
    ["현재 가격", vm.keyLevels.currentPrice, "bg-slate-500"],
    ["핵심 전환 가격", vm.basisSummary.pivotPrice, "bg-blue-900"],
    ["주요 지지선", vm.keyLevels.mainSupport, "bg-emerald-500"],
    ["보조 지지선", vm.keyLevels.secondarySupport, "bg-emerald-400"],
    ["주요 저항선", vm.keyLevels.mainResistance, "bg-rose-500"],
    ["상단 돌파 기준", vm.keyLevels.breakoutTrigger, "bg-blue-700"],
    ["손절 기준", vm.keyLevels.stopLoss, "bg-red-500"],
    ["목표 주가", targetValue, "bg-blue-500"],
    ["중기 무효화", vm.keyLevels.invalidation, "bg-red-700"],
  ];

  return (
    <Card>
      <SectionTitle title="핵심 가격 레벨" />
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, value, marker]) => (
              <tr key={label}>
                <th className="w-32 whitespace-nowrap bg-slate-50 px-3 py-3 font-semibold text-slate-600 sm:w-40 sm:px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-0.5 w-4 rounded-full ${marker}`} />
                    {label}
                  </span>
                </th>
                <td className="px-3 py-3 font-semibold leading-6 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all] sm:px-4">{safeValue(value, "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
        <span className="font-bold text-slate-900">{vm.keyLevels.targetGapLabel}</span>
        <span className="mx-2 text-slate-300">|</span>
        {vm.keyLevels.targetGapExplanation}
      </p>
    </Card>
  );
}

function IndicatorSummaryCard({ indicators }: { indicators: IndicatorRow[] }) {
  return (
    <Card>
      <SectionTitle title="기술적 지표 요약" />
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">지표</th>
              <th className="px-4 py-3 font-semibold">수치</th>
              <th className="px-4 py-3 font-semibold">해석</th>
              <th className="px-4 py-3 font-semibold">신호</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {indicators.map((row) => (
              <tr key={row.name}>
                <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{row.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.value}</td>
                <td className="px-4 py-3 leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">{row.interpretation}</td>
                <td className="px-4 py-3">
                  <SmallBadge className={indicatorToneClass[row.tone]}>{row.signal}</SmallBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ScenarioItem({ scenario }: { scenario: ScenarioCard }) {
  return (
    <article className={`min-w-0 rounded-lg border p-4 [overflow-wrap:break-word] [word-break:keep-all] ${scenarioToneClass[scenario.tone]}`}>
      <h3 className="text-sm font-bold">{scenario.title}</h3>
      <dl className="mt-3 space-y-2 text-xs leading-6 [overflow-wrap:break-word] [word-break:keep-all]">
        <div>
          <dt className="font-bold opacity-70">조건</dt>
          <dd>{scenario.condition}</dd>
        </div>
        <div>
          <dt className="font-bold opacity-70">채택 가능성</dt>
          <dd>{scenario.probability}</dd>
        </div>
        <div>
          <dt className="font-bold opacity-70">예상 흐름</dt>
          <dd>{scenario.expectedMove}</dd>
        </div>
        <div>
          <dt className="font-bold opacity-70">전략적 해석</dt>
          <dd>{scenario.interpretation}</dd>
        </div>
      </dl>
    </article>
  );
}

function ScenarioAnalysisCard({ vm }: { vm: InstitutionalReportViewModel }) {
  return (
    <Card>
      <SectionTitle title="시나리오 분석" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <ScenarioItem scenario={vm.scenarios.bullish} />
        <ScenarioItem scenario={vm.scenarios.neutral} />
        <ScenarioItem scenario={vm.scenarios.bearish} />
      </div>
    </Card>
  );
}

function PatternDetectionCard({ vm }: { vm: InstitutionalReportViewModel }) {
  if (vm.pattern.category === "no_clear_pattern") {
    return (
      <Card>
        <SectionTitle title="AI 패턴 감지" />
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 [overflow-wrap:break-word] [word-break:keep-all]">
          <p className="text-sm font-bold text-slate-950">주요 패턴: {vm.pattern.detectedStructure}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{vm.pattern.interpretation}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle title="AI 패턴 감지" />
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">패턴 신뢰도</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{vm.pattern.confidence}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">감지된 구조</p>
          <p className="mt-2 text-lg font-bold leading-7 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{vm.pattern.detectedStructure}</p>
        </div>
        {vm.pattern.metrics.map((metric) => (
          <div key={metric.label}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-bold leading-7 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(metric.value, "확인 필요")}</p>
          </div>
        ))}
        <div>
          <p className="text-sm font-semibold text-slate-500">핵심 해석</p>
          <p className="mt-2 text-sm leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">{vm.pattern.interpretation}</p>
        </div>
      </div>
    </Card>
  );
}

function InsightNoteCard({ notes }: { notes: string[] }) {
  const lines = notes.length ? notes : ["주요 가격대와 지표 확인을 통해 조건부 대응이 필요합니다."];
  return (
    <Card>
      <SectionTitle title="기관 인사이트 노트" />
      <ul className="max-h-40 list-disc space-y-2 overflow-hidden pl-5 text-sm leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
        {lines.slice(0, 4).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Card>
  );
}

function RiskNoticeCard({ notices }: { notices: string[] }) {
  return (
    <Card>
      <SectionTitle title="리스크 고지" />
      <div className="space-y-2 text-sm leading-7 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
        {notices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
      </div>
    </Card>
  );
}

function ReportFooter() {
  return (
    <footer className="flex min-w-0 flex-col gap-2 px-2 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>AI Technical Analysis Report</p>
      <p>분석 모델: AI Technical Analysis Engine</p>
      <p>© 2026 CHART VISION AI</p>
    </footer>
  );
}

export default function AnalysisReportDashboard({ result }: DashboardProps) {
  const vm = buildInstitutionalReportViewModel(result);

  return (
    <div className="mx-auto box-border max-w-[1440px] space-y-5 overflow-x-hidden rounded-2xl bg-slate-50/90 p-3 text-slate-950 sm:p-5">
      <ReportHeader />
      <SummaryHero vm={vm} />

      <div className="grid gap-5 xl:grid-cols-2">
        <MarketSummaryCard vm={vm} />
        <SignalScoreCard vm={vm} />
      </div>

      <EntryModesCard vm={vm} />

      <div className="grid gap-5 xl:grid-cols-2">
        <PriceLevelsCard vm={vm} />
        <IndicatorSummaryCard indicators={vm.indicators} />
      </div>

      <ScenarioAnalysisCard vm={vm} />
      <PatternDetectionCard vm={vm} />
      <InsightNoteCard notes={vm.insightNotes} />
      <RiskNoticeCard notices={vm.riskNotice} />
      <ReportFooter />
    </div>
  );
}
