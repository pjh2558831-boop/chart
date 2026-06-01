"use client";

import type { ReactNode } from "react";

import {
  buildInstitutionalReportViewModel,
  type EntryModeCard,
  type EntryTone,
  type IndicatorRow,
  type IndicatorTone,
  type InstitutionalReportViewModel,
  type ReportDecision,
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

type StrategyActionTone = "default" | "positive" | "caution" | "risk";

type StrategyExecutionItem = {
  label: string;
  value: string;
  tone?: StrategyActionTone;
};

type HeroStrategyDisplay = {
  title: string;
  summary: string[];
  execution: StrategyExecutionItem[];
  badges: string[];
};

function safeValue(value: string | number | null | undefined, fallback = "-") {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || /^(undefined|null|nan|infinity|\[object object\])$/i.test(text)) return fallback;
  if (/\b(undefined|null|NaN|Infinity)\b/.test(text) || text.includes("[object Object]")) return fallback;
  return text;
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

const strategyActionToneClass: Record<StrategyActionTone, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
        <h1 className="text-xl font-bold tracking-normal text-slate-950 [word-break:keep-all]">AI 기술적 분석 리포트</h1>
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

function truncateText(value: string | number | null | undefined, fallback = "확인 필요", maxLength = 58) {
  const text = safeValue(value, fallback);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function scoreText(score: number | null | undefined) {
  return typeof score === "number" && Number.isFinite(score) ? `${score} / 100` : "확인 필요";
}

function regimePositionLabel(regime: string) {
  const labels: Record<string, string> = {
    uptrend_pullback: "상승추세 눌림 구간",
    uptrend_consolidation: "상승추세 조정 구간",
    downtrend_rebound: "하락추세 반등 구간",
    resistance_test: "저항권 테스트",
    support_breakdown: "지지 이탈 위험",
    overextended_surge: "단기 과열 구간",
    overheated_breakout: "과열권 돌파 구간",
    breakout_retest_confirmed: "돌파 후 재지지 구간",
    breakout_wait: "돌파 확인 구간",
    range_lower_support: "박스권 하단",
    range_upper_resistance: "박스권 상단",
    healthy_pullback: "건전한 눌림 구간",
    sideways: "박스권 중단",
  };
  return labels[regime] ?? "확인 필요";
}

function formatCurrentPriceStatus(decision: ReportDecision, vm: InstitutionalReportViewModel) {
  const text = safeValue(
    decision.priceRoles.currentPrice.status,
    safeValue(vm.basisSummary.currentLocation, regimePositionLabel(decision.chartRegime)),
  );
  return truncateText(text, regimePositionLabel(decision.chartRegime), 28);
}

function compactStrategyLine(value: string, maxLength = 74) {
  return truncateText(value, "확인 필요", maxLength);
}

function uniqueSafeTextItems(items: string[]) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of items) {
    const text = safeValue(item, "");
    if (!text || seen.has(text)) continue;
    seen.add(text);
    values.push(text);
  }
  return values;
}

function formatHeroGuidanceItems(decision: ReportDecision) {
  const items = [
    { label: "신규", value: safeValue(decision.newEntryDecision, "") },
    { label: "보유", value: safeValue(decision.holderDecision, "") },
  ];
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.value || seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

function formatDecisionPrimaryStrategy(decision: ReportDecision): HeroStrategyDisplay {
  const entryTone: StrategyActionTone = decision.finalActionTone === "risk"
    ? "caution"
    : decision.finalActionTone === "caution"
      ? "caution"
      : "positive";
  return {
    title: safeValue(decision.primaryStrategy.title, "매매 전략 확인 필요"),
    summary: [compactStrategyLine(decision.primaryStrategy.summary, 112)],
    execution: [
      { label: "진입", value: decision.primaryStrategy.entry, tone: entryTone },
      { label: "손절", value: decision.primaryStrategy.stop, tone: "risk" },
      { label: "목표", value: decision.primaryStrategy.target, tone: "default" },
    ],
    badges: decision.primaryStrategy.badges.length ? decision.primaryStrategy.badges : [decision.displayedEntrySignal.label],
  };
}

function formatEntryCard(item: ReportDecision["entryStrategies"]["current"]): EntryModeCard {
  return {
    score: item.score,
    label: item.label,
    condition: item.condition,
    stopLoss: item.stop,
    target: item.target,
    riskReward: item.riskReward,
    explanation: item.explanation,
    tone: item.tone,
  };
}

function entryWarningText(warning: string) {
  if (/MISSING_CONFIRMATION/.test(warning)) return "확인 조건 보완 필요";
  if (/MISSING_INVALIDATION/.test(warning)) return "무효화 기준 확인 필요";
  if (/MISSING_TARGET/.test(warning)) return "목표가 여유 확인 필요";
  if (/LOW_RR_ENTRY/.test(warning)) return "손익비 확인 필요";
  if (/SUPPORT_STOP_OVERLAP/.test(warning)) return "손절 여유 좁음";
  if (/BREAKOUT_TARGET_OVERLAP/.test(warning)) return "돌파 목표 추가 확인 필요";
  if (/PRICE_ROLE_COLLAPSE|TARGET_TOO_CLOSE|TARGET_NOT_ABOVE_ENTRY|RESISTANCE_TOO_CLOSE/.test(warning)) return "가격대 재확인 필요";
  if (/SCENARIO_INCOMPLETE/.test(warning)) return "시나리오 보완 필요";
  return "";
}

function formatEntryDetailRows(item: ReportDecision["entryStrategies"]["current"]) {
  const rows = [
    ["진입 조건", item.entryTrigger],
    ["확인 조건", item.confirmationCondition],
    ["무효화", item.invalidation],
    ["1차 목표", item.target1],
    ["2차 목표", item.target2],
    ["비중 힌트", item.positionSizingHint],
    ["실패 조건", item.failureCondition],
  ] as const;
  const seen = new Set<string>();
  return rows.filter(([, value]) => {
    const text = safeValue(value, "");
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  }).slice(0, 6);
}

function formatEntryCompletenessNotes(item: ReportDecision["entryStrategies"]["current"]) {
  const notes = uniqueSafeTextItems([
    ...(item.isComplete === false ? ["확인 조건 보완 필요"] : []),
    ...(item.completenessWarnings ?? []).map(entryWarningText),
  ]);
  return notes.slice(0, 2);
}

function formatDecisionEntryScenarios(decision: ReportDecision) {
  const current = formatEntryCard(decision.entryStrategies.current);
  const pullback = formatEntryCard(decision.entryStrategies.pullback);
  const breakout = formatEntryCard(decision.entryStrategies.breakout);

  return [
    {
      key: "current",
      title: "현재가 진입",
      item: current,
      status: current.label,
      context: truncateText(current.condition, "조건 확인 필요", 34),
    },
    {
      key: "pullback",
      title: "눌림목 진입",
      item: pullback,
      status: pullback.label,
      context: truncateText(pullback.condition, "지지 확인 필요", 34),
    },
    {
      key: "breakout",
      title: "돌파/재지지 진입",
      item: breakout,
      status: breakout.label,
      context: truncateText(breakout.condition, "안착 확인 필요", 34),
    },
  ];
}

function compactHeroStatus(value: string) {
  const text = safeValue(value, "확인 필요");
  if (text.includes("돌파 후 재지지")) return "재지지 확인";
  if (text.includes("미래 눌림목")) return "눌림 관심";
  if (text.includes("추격매수")) return "추격 주의";
  if (text.includes("현재가 소액")) return "소액 진입";
  if (text.includes("현재가 분할")) return "분할 진입";
  if (text.includes("소액 선진입")) return "소액 선진입";
  return text;
}

function formatSignalSummaryItems(decision: ReportDecision) {
  const summary = decision.signalSummary;
  return [
    { label: "모멘텀", score: summary.momentumScore, riskMode: false },
    { label: "돌파 확률", score: summary.breakoutScore, riskMode: false },
    { label: "리스크 수준", score: summary.riskScore, riskMode: true },
  ];
}

function formatSignalBreakdownItems(summary: ReportDecision["signalSummary"]) {
  const primaryItems = [
    { label: "추세", score: summary.trendScore, riskMode: false },
    { label: "위치", score: summary.locationScore, riskMode: false },
    { label: "거래량", score: summary.volumeScore, riskMode: false },
    { label: "지지/저항", score: summary.srQualityScore, riskMode: false },
    { label: "손익비", score: summary.riskRewardScore, riskMode: false },
    { label: "데이터 신뢰", score: summary.dataConfidenceScore, riskMode: false },
  ];
  const fallbackItems = [
    { label: "돌파 신뢰", score: summary.breakoutReliabilityScore, riskMode: false },
    { label: "변동성", score: summary.volatilityRiskScore, riskMode: true },
  ];
  return [...primaryItems, ...fallbackItems]
    .filter((item) => typeof item.score === "number" && Number.isFinite(item.score))
    .slice(0, 6);
}

function scoreWarningText(warning: string) {
  if (/SCORE_CAPPED_BY_CONFIDENCE/.test(warning)) return "데이터 신뢰도 때문에 점수를 보수적으로 해석해야 합니다.";
  if (/SCORE_CAPPED_BY_PRICE_COLLAPSE/.test(warning)) return "가격대가 겹쳐 목표 여유 판단을 보수적으로 조정했습니다.";
  if (/SCORE_CAPPED_BY_LOW_RR/.test(warning)) return "손익비가 충분하지 않아 진입 품질을 낮게 평가했습니다.";
  if (/SCORE_CAPPED_BY_STATE/.test(warning)) return "현재 차트 상태를 반영해 종합 점수를 보수적으로 제한했습니다.";
  if (/CURRENT_ENTRY_SCORE_CAPPED/.test(warning)) return "저항권 접근으로 현재가 진입 매력도를 낮게 반영했습니다.";
  if (/SCORE_CAPPED_BY_INCOMPLETE_SCENARIO/.test(warning)) return "진입 조건이 완전하지 않아 점수를 보수적으로 조정했습니다.";
  if (/BREAKOUT_SCORE_CAPPED/.test(warning)) return "돌파 기준과 목표가가 가까워 돌파 신뢰도를 낮게 반영했습니다.";
  return "";
}

function formatScoreWarningNotes(summary: ReportDecision["signalSummary"]) {
  return uniqueSafeTextItems((summary.scoreWarnings ?? []).map(scoreWarningText)).slice(0, 2);
}

function getHeroMetadataItems(vm: InstitutionalReportViewModel) {
  return [
    { label: "리포트 신뢰도", value: vm.hero.confidenceScore === null ? "확인 필요" : `${vm.hero.confidenceScore} / 100` },
    { label: "트렌드 상태", value: safeValue(vm.hero.trendLabel, "확인 필요") },
    { label: "분석 기준", value: safeValue(vm.basisSummary.chartBasis, "추정") },
    { label: "가격 단위", value: safeValue(vm.basisSummary.priceUnit, "가격 단위 확인 필요") },
  ];
}

function formatDecisionCorePriceItems(decision: ReportDecision, vm: InstitutionalReportViewModel) {
  const levels = decision.priceRoles;
  const target = formatHeroTargetText(decision);
  const stopLoss = compactStopLossText(safeValue(levels.stopLoss?.text, safeValue(vm.keyLevels.stopLoss, "손절 기준 확인 필요")));

  return [
    { label: "현재가", value: safeValue(levels.currentPrice.text, safeValue(vm.keyLevels.currentPrice, safeValue(vm.hero.currentPrice, "확인 필요"))), tone: "text-slate-950" },
    { label: "주요 지지", value: safeValue(levels.mainSupport.text, safeValue(vm.keyLevels.mainSupport, "확인 필요")), tone: "text-emerald-700" },
    { label: "주요 저항", value: safeValue(levels.mainResistance.text, safeValue(vm.keyLevels.mainResistance, "확인 필요")), tone: "text-rose-600" },
    { label: "돌파 기준", value: safeValue(levels.breakoutLevel?.text, safeValue(vm.keyLevels.breakoutTrigger, "확인 필요")), tone: "text-blue-700" },
    { label: "손절", value: stopLoss, tone: "text-red-600" },
    { label: "목표", value: target, tone: "text-blue-700" },
  ];
}

function priceWarningText(warning: string) {
  if (/TARGET_TOO_CLOSE/.test(warning)) return "1차 목표 여유가 부족합니다.";
  if (/TARGET_NOT_ABOVE_ENTRY/.test(warning)) return "목표가가 현재가 대비 충분히 위에 있지 않습니다.";
  if (/RESISTANCE_TOO_CLOSE/.test(warning)) return "현재가가 저항권에 가까워 추격 진입은 신중해야 합니다.";
  if (/SUPPORT_STOP_OVERLAP/.test(warning)) return "지지선과 손절/무효화 기준이 가까워 리스크 관리가 중요합니다.";
  if (/BREAKOUT_TARGET_OVERLAP/.test(warning)) return "돌파 확인가와 목표가가 가까워 추가 목표 확인이 필요합니다.";
  if (/PRICE_ROLE_COLLAPSE/.test(warning)) return "일부 가격 역할이 같은 구간에 겹쳐 보수적으로 병합했습니다.";
  return "";
}

function formatPriceWarningNotes(decision: ReportDecision) {
  return uniqueSafeTextItems((decision.consistencyWarnings ?? []).map(priceWarningText)).slice(0, 3);
}

function formatHeroTargetText(decision: ReportDecision) {
  const status = safeValue(decision.priceRoles.targetStatus, "");
  const target = safeValue(decision.priceRoles.target?.text, "");
  const warningStatus = /목표 여유 낮음|추가 목표|상승 여지 제한|목표가 근접|상단 저항|다음 저항|확인 필요/.test(status);
  if (warningStatus) return status;
  if (target && !isVagueTargetText(target)) return target;
  if (status && !isVagueTargetText(status)) return status;
  return "추가 목표 확인 필요";
}

function isVagueTargetText(value: string) {
  return value.includes("상단 목표 " + "확인") || value === "목표 확인";
}

function compactStopLossText(value: string) {
  const text = safeValue(value, "손절 기준 확인 필요");
  if (/손절 기준 확인 필요|확인 필요/.test(text)) return "손절 기준 확인 필요";

  const priceMatch = text.match(/[\d,.]+(?:\s*부근)?/);
  const condition = text.includes("재이탈")
    ? "재이탈"
    : text.includes("이탈")
      ? "이탈"
      : text.includes("붕괴")
        ? "붕괴"
        : text.includes("하회")
          ? "하회"
          : "";

  if (priceMatch && condition) return `${priceMatch[0].trim()} ${condition}`;
  if (priceMatch) return priceMatch[0].trim();

  const cleaned = text
    .replace(/현재가\s*진입\s*시\s*/g, "")
    .replace(/신규\s*진입\s*시\s*/g, "")
    .replace(/단기\s*손절/g, "")
    .replace(/손절/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return truncateText(cleaned, "손절 기준 확인 필요", 26);
}

function hasInternalFinalSignalText(value: string) {
  return [
    "최종 판단이 " + "주의",
    "주의/대기 " + "성격",
    "즉시 진입 우선 " + "레이블",
    "표시하지 " + "않습니다",
    "즉시 진입 우세가 " + "아닌",
  ].some((pattern) => value.includes(pattern));
}

function userFacingFinalSignalExplanation(decision: ReportDecision, fallback: string) {
  const raw = safeValue(decision.displayedEntrySignal.explanation, "");
  if (raw && !hasInternalFinalSignalText(raw)) return raw;
  if (decision.finalActionTone === "risk" || decision.chartRegime === "support_breakdown") {
    return "지지 이탈 가능성이 있어 신규 진입보다 손절 기준과 비중 관리가 우선입니다.";
  }
  if (/현재가|분할|소액/.test(decision.finalActionLabel)) {
    return "손절 기준이 비교적 명확할 때 소액 분할 진입은 검토 가능하지만, 이탈 시 빠른 대응이 필요합니다.";
  }
  if (decision.chartRegime === "uptrend_pullback" || decision.chartRegime === "healthy_pullback") {
    return "주요 지지에서 반등이 확인되면 눌림목 진입 후보로 볼 수 있습니다.";
  }
  if (decision.finalActionTone === "caution" || decision.finalActionTone === "watch") {
    return "현재가는 저항권에 가까워 즉시 진입보다 돌파 후 재지지 확인이 우선입니다.";
  }
  return safeValue(fallback, "주요 가격대 확인 후 조건부로 접근하는 것이 좋습니다.");
}

function formatDecisionFinalSignal(decision: ReportDecision, vm: InstitutionalReportViewModel) {
  return {
    title: truncateText(decision.finalActionLabel, "재지지 확인 우선", 36),
    explanation: userFacingFinalSignalExplanation(decision, vm.finalAction.subtitle),
    keyPoint: safeValue(decision.displayedEntrySignal.label, "주요 가격대 확인"),
  };
}

function HeroPanel({ children, className = "" }: CardProps) {
  return (
    <section className={`box-border flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm [overflow-wrap:break-word] [word-break:keep-all] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function HeroPanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-2">
      <span className="h-7 w-7 shrink-0 rounded-lg border border-blue-100 bg-blue-50" />
      <h2 className="text-base font-extrabold tracking-normal text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{title}</h2>
    </div>
  );
}

function HeroInfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-extrabold tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(value, "확인 필요")}</p>
    </div>
  );
}

function HeroScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const stroke = score === null ? "#CBD5E1" : value >= 70 ? "#2563EB" : value >= 40 ? "#F59E0B" : "#DC2626";
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 90 90" className="h-28 w-28 -rotate-90">
        <circle cx="45" cy="45" r="34" fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="45"
          cy="45"
          r="34"
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-extrabold leading-none text-slate-950">{score === null ? "-" : score}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

function HeroMetricBar({ label, score, riskMode = false }: { label: string; score: number | null; riskMode?: boolean }) {
  const value = score ?? 0;
  const color = score === null
    ? "bg-slate-300"
    : riskMode
      ? score >= 70 ? "bg-rose-500" : score >= 45 ? "bg-amber-500" : "bg-emerald-500"
      : score >= 70 ? "bg-blue-600" : score >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="grid min-w-0 grid-cols-[70px_minmax(0,1fr)_48px] items-center gap-2 text-xs">
      <span className="font-bold leading-5 text-slate-700 [overflow-wrap:break-word] [word-break:keep-all]">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right font-extrabold text-slate-900">{score === null ? "확인" : score}</span>
    </div>
  );
}

function SummaryHero({ vm }: { vm: InstitutionalReportViewModel }) {
  const hero = vm.hero;
  const displayIdentity = hero.displayIdentity;
  const decision = vm.reportDecision;
  const currentInterpretation = formatCurrentPriceStatus(decision, vm);
  const entryItems = formatDecisionEntryScenarios(decision);
  const signalItems = formatSignalSummaryItems(decision);
  const metadataItems = getHeroMetadataItems(vm);
  const corePriceItems = formatDecisionCorePriceItems(decision, vm);
  const finalAction = formatDecisionFinalSignal(decision, vm);
  const primaryStrategyDisplay = formatDecisionPrimaryStrategy(decision);
  const heroGuidanceItems = formatHeroGuidanceItems(decision);
  const finalTone = decision.finalActionTone;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <div className="space-y-4">
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1fr)] md:items-stretch xl:grid-cols-[minmax(240px,0.85fr)_minmax(360px,1.35fr)_minmax(300px,1fr)]">
        <HeroPanel className="order-1">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-extrabold tracking-normal text-slate-950 [word-break:keep-all]">종목 요약</p>
            <h2
              className="max-w-full overflow-visible whitespace-nowrap text-[clamp(2.2rem,4.4vw,4.25rem)] font-extrabold leading-none tracking-normal text-slate-950 [text-overflow:clip]"
              title={safeValue(displayIdentity.ticker, "티커 필요")}
            >
              {safeValue(displayIdentity.ticker, "티커 필요")}
            </h2>
          </div>
          <p
            className="mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-6 text-slate-600"
            title={safeValue(displayIdentity.companyLine, "종목명을 확인해 주세요")}
          >
            {safeValue(displayIdentity.companyLine, "종목명을 확인해 주세요")}
          </p>
          <div className="mt-5">
            <p
              className="max-w-full min-w-0 overflow-visible whitespace-nowrap text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-none tracking-[-0.02em] text-slate-950 [text-overflow:clip]"
              title={safeValue(displayIdentity.priceText, "가격 확인 필요")}
            >
              {safeValue(displayIdentity.priceText, "가격 확인 필요")}
            </p>
            <p className="mt-2 text-base font-semibold leading-6 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
              {safeValue(displayIdentity.priceUnitNote, "이미지 축 기준 추정")}
            </p>
          </div>
          <div className="mt-4 grid gap-2.5">
            <HeroInfoBox label="현재가 해석" value={currentInterpretation} />
          </div>
        </HeroPanel>

        <HeroPanel className="order-3 md:order-2">
          <HeroPanelTitle title="매매 전략" />
          <p className="max-w-full overflow-hidden text-[clamp(1.3rem,1.75vw,1.9rem)] font-extrabold leading-tight tracking-normal text-slate-950 [display:-webkit-box] [overflow-wrap:break-word] [word-break:keep-all] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {primaryStrategyDisplay.title}
          </p>
          <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
            {primaryStrategyDisplay.summary.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            {primaryStrategyDisplay.execution.map((item) => (
              <div
                key={item.label}
                className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)] items-center gap-3 text-xs leading-5"
              >
                <span className={`inline-flex max-w-full items-center justify-center rounded-md border px-2 py-1 text-center font-extrabold leading-4 ${strategyActionToneClass[item.tone ?? "default"]}`}>
                  {item.label}
                </span>
                <p className="min-w-0 font-extrabold text-slate-800 [overflow-wrap:break-word] [word-break:keep-all]">
                  {safeValue(item.value, "확인 필요")}
                </p>
              </div>
            ))}
          </div>
          {heroGuidanceItems.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {heroGuidanceItems.map((item) => (
                <div key={item.label} className="min-w-0 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
                  <p className="text-xs font-extrabold text-blue-700">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-700 [overflow-wrap:break-word] [word-break:keep-all]">
                    {truncateText(item.value, "확인 필요", 78)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {primaryStrategyDisplay.badges.slice(0, 2).map((badge, index) => (
              <SmallBadge
                key={badge}
                className={index === 0 ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}
              >
                {badge}
              </SmallBadge>
            ))}
          </div>
        </HeroPanel>

        <HeroPanel className={`order-2 md:order-3 ${signalToneClass[finalTone]}`}>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-white/60 text-3xl font-black leading-none">
                !
              </div>
              <div className="min-w-0">
                <p className="max-w-full text-[clamp(1.45rem,2.15vw,2.3rem)] font-extrabold leading-tight tracking-normal [overflow-wrap:break-word] [word-break:keep-all]">
                  {finalAction.title}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 [overflow-wrap:break-word] [word-break:keep-all]">
                  {truncateText(finalAction.explanation, "주요 가격대 확인 후 접근이 필요합니다.", 132)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-current/20 bg-white/60 px-4 py-3">
              <p className="shrink-0 text-sm font-extrabold">핵심 포인트</p>
              <p className="mt-2 text-sm font-semibold leading-6 [overflow-wrap:break-word] [word-break:keep-all]">{finalAction.keyPoint}</p>
            </div>
          </div>
        </HeroPanel>
        </div>

        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] lg:items-stretch xl:grid-cols-[minmax(420px,1.5fr)_minmax(260px,0.8fr)_minmax(280px,0.9fr)]">
        <HeroPanel className="md:col-span-2 lg:col-span-1">
          <HeroPanelTitle title="진입 시나리오" />
          <div className="space-y-3">
            {entryItems.map(({ key, title, item, status, context }) => (
              <article key={key} className="grid min-w-0 max-w-full gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-snug lg:grid-cols-[minmax(160px,1fr)_auto_minmax(112px,auto)] lg:items-center lg:gap-4">
                <div className="min-w-0">
                  <h3 className="font-extrabold tracking-normal text-slate-950 [overflow-wrap:break-word] [word-break:keep-all]">{title}</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">{context}</p>
                </div>
                <p className={`whitespace-nowrap text-lg font-extrabold leading-none lg:justify-self-center lg:text-xl ${item.tone === "risk" ? "text-rose-600" : item.tone === "caution" ? "text-amber-600" : item.tone === "positive" ? "text-emerald-600" : "text-blue-700"}`}>
                  {scoreText(item.score)}
                </p>
                <SmallBadge className={`${entryToneClass[item.tone]} max-w-full justify-center whitespace-normal text-[11px] leading-4 lg:justify-self-end`}>
                  {compactHeroStatus(status)}
                </SmallBadge>
              </article>
            ))}
          </div>
        </HeroPanel>

        <HeroPanel>
          <HeroPanelTitle title="시그널 요약" />
          <div className="grid min-w-0 gap-4 sm:grid-cols-[120px_minmax(0,1fr)] md:grid-cols-1">
            <HeroScoreRing score={decision.signalSummary.overallScore} />
            <div className="space-y-3">
              {signalItems.map((item) => (
                <HeroMetricBar key={item.label} label={item.label} score={item.score} riskMode={item.riskMode} />
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="font-extrabold text-slate-700">진입 관점</span>
              <span className="font-extrabold text-blue-700">{decision.displayedEntrySignal.score === null ? "확인 필요" : decision.displayedEntrySignal.score}</span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">
              {safeValue(decision.signalSummary.entryPerspective, "확인 필요")}
            </p>
          </div>
        </HeroPanel>

        <HeroPanel>
          <HeroPanelTitle title="핵심 가격대" />
          <div className="rounded-lg border border-slate-200 bg-slate-50">
            {corePriceItems.map((item, index) => (
              <div key={item.label} className={`grid min-w-0 grid-cols-[86px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm ${index === 0 ? "" : "border-t border-slate-200"}`}>
                <span className="whitespace-nowrap font-bold text-slate-600">{item.label}</span>
                <span className={`min-w-0 text-right font-extrabold leading-6 [overflow-wrap:break-word] [word-break:keep-all] ${item.tone}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </HeroPanel>
        </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {metadataItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
            <span className="whitespace-nowrap font-extrabold text-slate-500">{item.label}</span>
            <span className="min-w-0 font-bold text-slate-900 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(item.value, "확인 필요")}</span>
          </div>
        ))}
      </div>

      {vm.basisSummary.priceUnit.includes("확인 필요") || vm.basisSummary.priceUnit.includes("이미지") ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [word-break:keep-all]">
          가격 단위는 이미지 축 기준 추정값일 수 있어 실제 시세 단위와 차이가 있을 수 있습니다.
        </p>
      ) : null}
      </div>
    </Card>
  );
}

function EntryModeItem({ title, item, decisionItem }: { title: string; item: EntryModeCard; decisionItem: ReportDecision["entryStrategies"]["current"] }) {
  const detailRows = formatEntryDetailRows(decisionItem);
  const completenessNotes = formatEntryCompletenessNotes(decisionItem);

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
      {detailRows.length ? (
        <dl className="mt-4 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-5">
          {detailRows.map(([label, value]) => (
            <div key={label} className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2">
              <dt className="whitespace-nowrap font-extrabold text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-800 [overflow-wrap:break-word] [word-break:keep-all]">{safeValue(value, "확인 필요")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {completenessNotes.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {completenessNotes.map((note) => (
            <SmallBadge key={note} className="border-amber-200 bg-amber-50 text-amber-700">
              {note}
            </SmallBadge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function EntryModesCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const decision = vm.reportDecision.entryStrategies;
  const currentEntry = formatEntryCard(decision.current);
  const pullbackEntry = formatEntryCard(decision.pullback);
  const breakoutEntry = formatEntryCard(decision.breakout);

  return (
    <Card>
      <SectionTitle title="진입 방식별 판단" description="현재가, 눌림목, 돌파 진입을 조건과 손절 기준별로 분리합니다." />
      <div className="grid gap-4 xl:grid-cols-3">
        <EntryModeItem title="현재가 진입" item={currentEntry} decisionItem={decision.current} />
        <EntryModeItem title="눌림목 진입" item={pullbackEntry} decisionItem={decision.pullback} />
        <EntryModeItem title="돌파 진입" item={breakoutEntry} decisionItem={decision.breakout} />
      </div>
    </Card>
  );
}

function MarketSummaryCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const decision = vm.reportDecision;
  const actionRows = [
    ["확인 조건", decision.mustConfirmCondition, "bg-blue-500"],
    ["진입 보류 사유", decision.mustNotTradeReason, "bg-rose-500"],
    ["다음 점검", decision.nextReviewCondition, "bg-sky-500"],
  ].filter(([, value]) => Boolean(safeValue(value, "")));
  const rows = [
    ["시장 관점", decision.finalActionLabel, "bg-blue-500"],
    ["핵심 해석", decision.primaryStrategy.summary, "bg-emerald-500"],
    ...actionRows,
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
    <div className="grid min-w-0 grid-cols-[minmax(88px,124px)_minmax(0,1fr)_minmax(56px,70px)] items-center gap-3 text-sm">
      <span className="font-semibold leading-5 text-slate-700 [overflow-wrap:break-word] [word-break:keep-all]">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right text-xs font-bold leading-5 text-slate-900 [overflow-wrap:break-word]">{score === null ? "확인 필요" : score}</span>
    </div>
  );
}

function entryMetricLabel(mode: InstitutionalReportViewModel["reportDecision"]["displayedEntrySignal"]["mode"]) {
  switch (mode) {
    case "current":
      return "현재가 진입 점수";
    case "pullback":
      return "눌림목 대기 점수";
    case "breakout":
      return "돌파 확인 점수";
    case "risk":
      return "진입 보류";
    case "wait":
      return "진입 판단";
    default:
      return "진입 판단";
  }
}

function SignalScoreCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const summary = vm.reportDecision.signalSummary;
  const displayedEntry = vm.reportDecision.displayedEntrySignal;
  const breakdownItems = formatSignalBreakdownItems(summary);
  const warningNotes = formatScoreWarningNotes(summary);

  return (
    <Card>
      <SectionTitle title="AI 시그널 점수" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[170px_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center">
          <ScoreCircle score={summary.overallScore} />
        </div>
        <div className="space-y-4">
          <MetricBar label="모멘텀" score={summary.momentumScore} />
          <MetricBar label="돌파 확률" score={summary.breakoutScore} />
          <MetricBar label="리스크 수준" score={summary.riskScore} riskMode />
          <div>
            <MetricBar label={entryMetricLabel(displayedEntry.mode)} score={displayedEntry.score} />
            <p
              className="mt-1 text-right text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]"
              title={safeValue(displayedEntry.explanation, "")}
            >
              {safeValue(summary.entryPerspective, "확인 필요")}
            </p>
          </div>
        </div>
      </div>
      {breakdownItems.length ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {breakdownItems.map((item) => (
            <div key={item.label} className="grid min-w-0 grid-cols-[70px_minmax(0,1fr)_42px] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-extrabold text-slate-600">{item.label}</span>
              <div className="h-1.5 rounded-full bg-slate-200">
                <div
                  className={`${item.riskMode ? "bg-amber-500" : "bg-blue-500"} h-1.5 rounded-full`}
                  style={{ width: `${Math.max(0, Math.min(100, item.score ?? 0))}%` }}
                />
              </div>
              <span className="text-right font-extrabold text-slate-900">{item.score}</span>
            </div>
          ))}
        </div>
      ) : null}
      {warningNotes.length ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [overflow-wrap:break-word] [word-break:keep-all]">
          {warningNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function PriceLevelsCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const decision = vm.reportDecision.priceRoles;
  const warningNotes = formatPriceWarningNotes(vm.reportDecision);
  const rows = [
    ["현재 가격", decision.currentPrice.text, "bg-slate-500"],
    ["핵심 전환 가격", decision.breakoutLevel?.text ?? vm.basisSummary.pivotPrice, "bg-blue-900"],
    ["주요 지지선", decision.mainSupport.text, "bg-emerald-500"],
    ["보조 지지선", decision.secondarySupport?.text ?? vm.keyLevels.secondarySupport, "bg-emerald-400"],
    ["주요 저항선", decision.mainResistance.text, "bg-rose-500"],
    ["돌파 기준", decision.breakoutLevel?.text ?? vm.keyLevels.breakoutTrigger, "bg-blue-700"],
    ["1차 목표", decision.target?.text ?? vm.keyLevels.target, "bg-blue-500"],
    ["확장 목표", vm.keyLevels.upperBreakoutTarget, "bg-sky-500"],
    ["손절 기준", decision.stopLoss?.text ?? vm.keyLevels.stopLoss, "bg-red-500"],
    ["중기 무효화", decision.invalidation?.text ?? vm.keyLevels.invalidation, "bg-red-700"],
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
        <span className="font-bold text-slate-900">{safeValue(decision.targetStatus, vm.keyLevels.targetGapLabel)}</span>
        <span className="mx-2 text-slate-300">|</span>
        {vm.keyLevels.targetGapExplanation}
      </p>
      {warningNotes.length ? (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [overflow-wrap:break-word] [word-break:keep-all]">
          <p className="font-extrabold text-amber-900">가격대 주의</p>
          <ul className="mt-1 space-y-1">
            {warningNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
