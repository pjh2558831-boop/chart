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

type StrategyActionTone = "default" | "positive" | "caution" | "risk";

type StrategyExecutionItem = {
  label: string;
  value: string;
  tone?: StrategyActionTone;
};

type RepresentativeStrategy = {
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
  if (text.includes("대기")) {
    if (text.includes("돌파")) return "돌파 대기";
    if (text.includes("눌림")) return "눌림 대기";
    if (text.includes("지지")) return "지지 확인";
    return "관망";
  }
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

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function truncateText(value: string | number | null | undefined, fallback = "확인 필요", maxLength = 58) {
  const text = safeValue(value, fallback);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function scoreText(score: number | null | undefined) {
  return typeof score === "number" && Number.isFinite(score) ? `${score} / 100` : "확인 필요";
}

function getSpecificActionTitle(vm: InstitutionalReportViewModel) {
  const actionText = [
    vm.finalAction.title,
    vm.finalAction.subtitle,
    vm.finalAction.reason,
    vm.hero.signalLabel,
    vm.hero.trendLabel,
    vm.basisSummary.currentLocation,
    vm.basisSummary.preferredStrategy,
    vm.keyLevels.targetGapLabel,
    vm.scorePanel.entryScoreLabel,
  ].map((item) => safeValue(item, "")).join(" ");

  if (hasAny(actionText, ["현재가 분할 진입", "분할 진입 가능"])) return "현재가 분할 진입 가능 / 손절 짧게";
  if (hasAny(actionText, ["현재가 소액 진입", "소액 진입 가능"])) return "현재가 소액 진입 가능 / 확인 병행";
  if (hasAny(actionText, ["모멘텀 추세추종", "모멘텀 진입", "추세추종"])) return "모멘텀 추세추종 / 분할 접근";
  if (hasAny(actionText, ["돌파 전 소액 선진입", "선진입"])) return "돌파 전 소액 선진입 / 고위험";
  if (hasAny(actionText, ["위험", "이탈", "붕괴", "손절 위험"]) || vm.hero.signalTone === "risk") return "위험 관리";
  if (hasAny(actionText, ["진입 보류", "매매 부적합", "회피"])) return "진입 회피";
  if (hasAny(actionText, ["급등", "과열"])) return "급등 후 과열 / 눌림 대기";
  if (hasAny(actionText, ["목표가 근접", "목표 여유 낮음"])) return "추격매수 주의 / 목표 여유 낮음";
  if (hasAny(actionText, ["소액만 가능"])) return "저항권 테스트 / 소액만 가능";
  if (hasAny(actionText, ["추격매수", "저항권", "저항 근접"])) return "추격매수 주의 / 재지지 확인";
  if (hasAny(actionText, ["보유 관망", "보유자", "보유 가능"])) return "보유 우세, 신규는 대기";
  if (hasAny(actionText, ["돌파 후 재지지", "재지지 확인", "돌파 매수 후보"])) return "돌파 후 재지지 확인 대기";
  if (hasAny(actionText, ["저항권 테스트", "돌파 확인 대기", "돌파 대기"])) return "저항권 테스트 / 돌파 확인 대기";
  if (hasAny(actionText, ["상승추세 눌림"])) return "상승추세 눌림 / 지지 확인";
  if (hasAny(actionText, ["눌림목", "눌림", "지지 확인"])) return "눌림목 진입 후보";
  return "돌파 후 재지지 확인 대기";
}

function getCurrentPriceInterpretation(vm: InstitutionalReportViewModel) {
  const text = [
    vm.basisSummary.currentLocation,
    vm.keyLevels.targetGapLabel,
    vm.finalAction.title,
    vm.hero.trendLabel,
  ].map((item) => safeValue(item, "")).join(" ");

  if (hasAny(text, ["현재가 분할", "현재가 소액"])) return "짧은 손절 전제 / 소액 접근";
  if (hasAny(text, ["모멘텀", "추세추종"])) return "추세 지속 / 손절 기준 확인";
  if (hasAny(text, ["선진입"])) return "돌파 전 고위험 소액 구간";
  if (hasAny(text, ["과열", "급등"])) return "단기 과열권 / 추격매수 주의";
  if (hasAny(text, ["목표가 근접", "목표 여유 낮음", "저항"])) return "저항권 근접 / 추격매수 주의";
  if (hasAny(text, ["지지권", "박스권 하단", "상승추세 눌림"])) return "지지 반응 확인 구간";
  if (hasAny(text, ["돌파", "재지지"])) return "돌파 후 재지지 확인 구간";
  if (hasAny(text, ["하락", "위험", "이탈"])) return "위험 관리 우선 구간";
  return safeValue(vm.basisSummary.currentLocation, "가격 위치 확인 필요");
}

function getPrimaryStrategyText(vm: InstitutionalReportViewModel) {
  const preferred = safeValue(vm.basisSummary.preferredStrategy, "");
  if (preferred && preferred !== "주요 지지/저항 확인 필요") return truncateText(preferred, "주요 지지/저항 확인 필요", 70);

  const action = getSpecificActionTitle(vm);
  if (action.includes("분할")) return "손절 기준을 짧게 두고 소액 분할 접근";
  if (action.includes("선진입")) return "돌파 실패 시 빠른 손절 전제의 소액 전략";
  if (action.includes("소액")) return "현재가 소액 진입 후 지지 확인 시 추가 검토";
  if (action.includes("모멘텀")) return "추세 유지 시 일부 추세추종, 이탈 시 빠른 축소";
  if (action.includes("추격매수")) return "현재가 추격보다 재지지 또는 눌림목 확인 후 접근";
  if (action.includes("눌림")) return `${safeValue(vm.keyLevels.mainSupport, "주요 지지선")} 지지 확인 후 관심`;
  if (action.includes("돌파")) return `${safeValue(vm.keyLevels.breakoutTrigger, "핵심 전환 가격")} 돌파 후 재지지 확인`;
  if (action.includes("위험")) return "신규 진입보다 손절 기준과 위험 관리 우선";
  return "주요 지지/저항 확인 필요";
}

function isMissingLevel(value: string) {
  return !safeValue(value, "") || hasAny(value, ["확인 필요", "미확인", "분석 불가", "[object Object]"]);
}

function compactStrategyLine(value: string, maxLength = 74) {
  return truncateText(value, "확인 필요", maxLength);
}

function getRepresentativeTradingStrategy(vm: InstitutionalReportViewModel): RepresentativeStrategy {
  const strategyTitle = getSpecificActionTitle(vm);
  const actionText = [
    strategyTitle,
    vm.finalAction.title,
    vm.finalAction.subtitle,
    vm.finalAction.reason,
    vm.finalAction.actionType,
    vm.hero.trendLabel,
    vm.basisSummary.currentLocation,
    vm.keyLevels.targetGapLabel,
    vm.keyLevels.targetGapExplanation,
    vm.scorePanel.entryScoreLabel,
  ].map((item) => safeValue(item, "")).join(" ");

  const current = safeValue(vm.keyLevels.currentPrice, safeValue(vm.hero.currentPrice, "현재가 확인 필요"));
  const support = safeValue(vm.keyLevels.mainSupport, "주요 지지 확인 필요");
  const secondarySupport = safeValue(
    vm.keyLevels.secondarySupport,
    safeValue(vm.keyLevels.invalidation, "보조 지지 확인 필요"),
  );
  const breakout = safeValue(
    vm.keyLevels.breakoutTrigger,
    safeValue(vm.basisSummary.pivotPrice, "돌파 기준 확인 필요"),
  );
  const resistance = safeValue(vm.keyLevels.mainResistance, "주요 저항 확인 필요");
  const stopLoss = safeValue(
    vm.keyLevels.stopLoss,
    safeValue(vm.entryMode.currentEntry.stopLoss, safeValue(vm.entryMode.pullbackEntry.stopLoss, "손절 기준 확인 필요")),
  );
  const target = safeValue(vm.keyLevels.target, safeValue(vm.keyLevels.upperBreakoutTarget, "추가 목표 확인 필요"));
  const extensionTarget = safeValue(vm.keyLevels.upperBreakoutTarget, target);
  const currentScore = vm.entryMode.currentEntry.score;
  const pullbackScore = vm.entryMode.pullbackEntry.score;
  const breakoutScore = vm.entryMode.breakoutEntry.score;
  const riskScore = vm.scorePanel.riskScore;
  const highRisk = vm.hero.signalTone === "risk"
    || (typeof riskScore === "number" && riskScore >= 70)
    || hasAny(actionText, ["위험", "이탈", "붕괴", "진입 보류", "회피"]);
  const targetGapLow = hasAny(actionText, ["목표가 근접", "목표 여유 낮음", "상승 여지 제한"]);
  const overheat = hasAny(actionText, ["과열", "급등", "과열권", "OVERHEATED"]);
  const reboundOrResistanceTest = hasAny(actionText, [
    "DOWNTREND_REBOUND",
    "RESISTANCE_TEST",
    "하락추세 반등",
    "저항권 테스트",
  ]);
  const stopMissing = isMissingLevel(stopLoss);
  const currentEntryAllowed = typeof currentScore === "number"
    && currentScore >= 45
    && currentScore <= 70
    && !targetGapLow
    && !highRisk
    && !stopMissing;
  const strategySuggestsCurrent = hasAny(strategyTitle, ["현재가 소액", "현재가 분할", "모멘텀"])
    && !targetGapLow
    && !highRisk
    && !stopMissing;
  const pullbackFocused = hasAny(actionText, ["눌림", "지지 확인", "미래 눌림목", "지지 반응"]);
  const breakoutFocused = hasAny(actionText, ["돌파", "재지지", "안착"]);
  const currentWeak = typeof currentScore === "number" && currentScore < 45;
  const pullbackLeads = typeof pullbackScore === "number"
    && (typeof currentScore !== "number" || pullbackScore >= currentScore + 10)
    && (typeof breakoutScore !== "number" || pullbackScore >= breakoutScore - 5);
  const breakoutLeads = breakoutFocused
    || (typeof breakoutScore === "number"
      && (typeof currentScore !== "number" || breakoutScore >= currentScore)
      && (typeof pullbackScore !== "number" || breakoutScore >= pullbackScore - 5));

  if (reboundOrResistanceTest) {
    return {
      title: "신규 진입 보류 / 돌파 확인 대기",
      summary: [
        compactStrategyLine(`현재가는 반등 과정에서 ${resistance} 부근 저항권을 테스트하고 있습니다.`),
        compactStrategyLine(`추세 전환 확인 전까지 신규 진입은 ${breakout} 돌파 후 재지지 확인이 우선입니다.`),
        compactStrategyLine(`${support} 지지가 무너지면 반등 시나리오는 약화됩니다.`),
      ],
      execution: [
        { label: "진입", value: `${breakout} 돌파 후 재지지`, tone: "positive" },
        { label: "손절", value: `${support} 이탈`, tone: "risk" },
        { label: "목표", value: target, tone: "default" },
      ],
      badges: ["추격매수 주의", "재지지 확인"],
    };
  }

  if (currentEntryAllowed || strategySuggestsCurrent) {
    return {
      title: "현재가 분할진입 가능",
      summary: [
        compactStrategyLine(`현재가는 주요 지지와 손절 기준이 비교적 명확해 소액 분할 진입이 가능합니다.`),
        compactStrategyLine(`다만 ${stopLoss} 이탈 시 빠르게 손절하는 조건이 필요합니다.`),
      ],
      execution: [
        { label: "진입", value: `${current} 부근 분할`, tone: "positive" },
        { label: "손절", value: stopLoss, tone: "risk" },
        { label: "목표", value: target, tone: "default" },
      ],
      badges: ["소액 가능", "손절 엄수"],
    };
  }

  if (highRisk) {
    return {
      title: "신규 진입 보류 / 위험 관리",
      summary: [
        compactStrategyLine("위험 신호가 우선이므로 신규 진입보다 손절 기준과 비중 관리가 먼저입니다."),
        compactStrategyLine(`${support} 회복 또는 ${breakout} 안착 확인 전까지 추가 진입은 신중합니다.`),
      ],
      execution: [
        { label: "진입", value: "신규 대기", tone: "caution" },
        { label: "손절", value: stopLoss, tone: "risk" },
        { label: "목표", value: `${resistance} / ${target}`, tone: "default" },
      ],
      badges: ["위험 관리", "신규 대기"],
    };
  }

  if (overheat && targetGapLow) {
    return {
      title: "일부 익절 후 관망",
      summary: [
        compactStrategyLine("현재가는 단기 과열 또는 저항 근접 구간으로 보유자는 일부 이익 실현이 유리합니다."),
        compactStrategyLine("신규 진입은 보류하고 재지지 또는 눌림 확인 이후 다시 접근합니다."),
      ],
      execution: [
        { label: "진입", value: "신규 대기", tone: "caution" },
        { label: "손절", value: stopLoss, tone: "risk" },
        { label: "목표", value: `${resistance} / ${target}`, tone: "default" },
      ],
      badges: ["일부 익절 고려", "신규 대기"],
    };
  }

  if ((currentWeak && pullbackLeads) || (pullbackFocused && !breakoutLeads)) {
    return {
      title: "추격매수 주의 / 눌림목 확인 우선",
      summary: [
        compactStrategyLine("현재가에서 무리한 신규 진입보다 주요 지지 구간 반등 확인 후 접근이 유리합니다."),
        compactStrategyLine(`${support} 부근에서 하락이 멈추고 반등이 확인되면 분할 진입을 검토합니다.`),
      ],
      execution: [
        { label: "진입", value: `${support} 반등 확인 후`, tone: "positive" },
        { label: "손절", value: `${secondarySupport} 이탈`, tone: "risk" },
        { label: "목표", value: `${resistance} 또는 ${target}`, tone: "default" },
      ],
      badges: ["신규 진입 신중", "눌림 대기"],
    };
  }

  if (hasAny(actionText, ["보유", "관망"]) || targetGapLow) {
    return {
      title: "보유 우세 / 신규 대기",
      summary: [
        compactStrategyLine("신규 진입보다 기존 보유자 관점 대응이 더 유리합니다."),
        compactStrategyLine(`보유자는 ${resistance} 부근 반응을 보며 일부 익절 또는 관망 전략이 적절합니다.`),
      ],
      execution: [
        { label: "진입", value: "신규는 대기", tone: "caution" },
        { label: "손절", value: stopLoss, tone: "risk" },
        { label: "목표", value: `${resistance} / ${target}`, tone: "default" },
      ],
      badges: ["보유 가능", "신규는 대기"],
    };
  }

  return {
    title: "돌파 확인 대기 / 재지지 우선",
    summary: [
      compactStrategyLine(`현재 위치에서는 추격매수보다 ${breakout} 돌파 후 재지지 여부 확인이 우선입니다.`),
      compactStrategyLine(`돌파 후 해당 가격 위에서 안착하면 ${extensionTarget} 구간까지 열어둘 수 있습니다.`),
    ],
    execution: [
      { label: "진입", value: `${breakout} 돌파 후 재지지`, tone: "positive" },
      { label: "손절", value: `${breakout} 재이탈 또는 ${support} 이탈`, tone: "risk" },
      { label: "목표", value: target, tone: "default" },
    ],
    badges: ["돌파 대기", "안착 확인"],
  };
}

function entryScenarioStatus(mode: "current" | "pullback" | "breakout", item: EntryModeCard) {
  const label = safeValue(item.label, "");
  const explanation = safeValue(item.explanation, "");
  const score = item.score ?? null;
  const joined = `${label} ${explanation}`;

  if (mode === "current") {
    if (hasAny(joined, ["분할 진입"])) return "분할 진입";
    if (hasAny(joined, ["소액 진입"])) return "소액 진입";
    if (hasAny(joined, ["모멘텀"])) return "모멘텀 진입";
    if (hasAny(joined, ["선진입"])) return "소액 선진입";
    if (hasAny(joined, ["추격", "저항", "목표"]) || (score !== null && score <= 39)) return score !== null && score <= 19 ? "부적합" : "추격매수 주의";
    if (score !== null && score >= 55) return "조건부 진입";
    return safeValue(label, "확인 필요");
  }
  if (mode === "pullback") {
    if (hasAny(joined, ["미래"])) return "미래 눌림목 관심";
    if (hasAny(joined, ["지지"])) return "지지 확인";
    if (score !== null && score >= 55) return "조건부 관심";
    return safeValue(label, "눌림목 관심");
  }
  if (hasAny(joined, ["재지지"])) return "돌파 후 재지지 확인";
  if (hasAny(joined, ["돌파"])) return "돌파 대기";
  return safeValue(label, "확인 필요");
}

function getEntryScenarioItems(vm: InstitutionalReportViewModel) {
  return [
    {
      key: "current",
      title: "현재가 진입",
      item: vm.entryMode.currentEntry,
      status: entryScenarioStatus("current", vm.entryMode.currentEntry),
      context: hasAny(`${vm.entryMode.currentEntry.label} ${vm.entryMode.currentEntry.explanation}`, ["추격", "저항", "목표"])
        ? "추격매수 부담"
        : truncateText(vm.entryMode.currentEntry.condition, "조건 확인 필요", 34),
    },
    {
      key: "pullback",
      title: "눌림목 진입",
      item: vm.entryMode.pullbackEntry,
      status: entryScenarioStatus("pullback", vm.entryMode.pullbackEntry),
      context: truncateText(vm.entryMode.pullbackEntry.condition, "지지 확인 필요", 34),
    },
    {
      key: "breakout",
      title: "돌파/재지지 진입",
      item: vm.entryMode.breakoutEntry,
      status: entryScenarioStatus("breakout", vm.entryMode.breakoutEntry),
      context: truncateText(vm.entryMode.breakoutEntry.condition, "안착 확인 필요", 34),
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

function getSignalSummaryItems(vm: InstitutionalReportViewModel) {
  return [
    { label: "모멘텀", score: vm.scorePanel.momentumScore, riskMode: false },
    { label: "돌파 확률", score: vm.scorePanel.breakoutScore, riskMode: false },
    { label: "리스크 수준", score: vm.scorePanel.riskScore, riskMode: true },
  ];
}

function getHeroMetadataItems(vm: InstitutionalReportViewModel) {
  return [
    { label: "리포트 신뢰도", value: vm.hero.confidenceScore === null ? "확인 필요" : `${vm.hero.confidenceScore} / 100` },
    { label: "트렌드 상태", value: safeValue(vm.hero.trendLabel, "확인 필요") },
    { label: "분석 기준", value: safeValue(vm.basisSummary.chartBasis, "추정") },
    { label: "가격 단위", value: safeValue(vm.basisSummary.priceUnit, "가격 단위 확인 필요") },
  ];
}

function getCorePriceItems(vm: InstitutionalReportViewModel) {
  const stopOrInvalidation = safeValue(vm.keyLevels.stopLoss, "") || safeValue(vm.keyLevels.invalidation, "");

  return [
    { label: "현재가", value: safeValue(vm.keyLevels.currentPrice, safeValue(vm.hero.currentPrice, "확인 필요")), tone: "text-slate-950" },
    { label: "주요 지지", value: safeValue(vm.keyLevels.mainSupport, "확인 필요"), tone: "text-emerald-700" },
    { label: "주요 저항", value: safeValue(vm.keyLevels.mainResistance, "확인 필요"), tone: "text-rose-600" },
    { label: "손절 / 무효화", value: safeValue(stopOrInvalidation, "확인 필요"), tone: "text-slate-950" },
  ];
}

function getFinalActionCardText(vm: InstitutionalReportViewModel) {
  const strategyTitle = getSpecificActionTitle(vm);
  const actionText = `${strategyTitle} ${vm.finalAction.title} ${vm.finalAction.subtitle}`;
  const title = strategyTitle.includes("추격매수") || strategyTitle.includes("과열")
    ? "추격매수 주의"
    : strategyTitle.includes("분할 진입")
      ? "분할 진입 가능"
    : strategyTitle.includes("선진입")
      ? "소액 선진입"
        : strategyTitle.includes("소액 진입") || strategyTitle.includes("소액만")
          ? "소액 진입 가능"
          : strategyTitle.includes("모멘텀")
            ? "추세추종 진입"
            : strategyTitle.includes("재지지")
              ? "돌파 후 재지지 확인"
              : strategyTitle.includes("눌림")
                ? "눌림목 확인 대기"
                : strategyTitle.includes("보유")
                  ? "보유자 관망"
                  : strategyTitle.includes("위험")
                    ? "위험 관리"
                    : strategyTitle.includes("회피") || strategyTitle.includes("보류")
                      ? "진입 보류"
                      : strategyTitle.includes("지지")
                        ? "지지 확인"
                        : "재지지 확인 우선";

  const explanation = safeValue(
    vm.finalAction.subtitle,
    "신규 진입은 주요 가격대의 지지 또는 돌파 후 재지지 확인 뒤 접근하는 편이 유리합니다.",
  );
  const keyPoint = hasAny(actionText, ["추격", "저항", "목표"])
    ? "현재가 추격보다 재지지 확인"
    : hasAny(actionText, ["분할", "소액", "모멘텀", "선진입"])
      ? "짧은 손절과 비중 제한"
      : hasAny(actionText, ["눌림", "지지"])
        ? "주요 지지 반응 확인"
        : hasAny(actionText, ["위험", "이탈"])
          ? "손절 기준과 비중 관리"
          : "돌파 후 안착 여부 확인";

  return { title, explanation, keyPoint };
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
  const strategyTitle = getSpecificActionTitle(vm);
  const currentInterpretation = getCurrentPriceInterpretation(vm);
  const primaryStrategy = getPrimaryStrategyText(vm);
  const entryItems = getEntryScenarioItems(vm);
  const signalItems = getSignalSummaryItems(vm);
  const metadataItems = getHeroMetadataItems(vm);
  const corePriceItems = getCorePriceItems(vm);
  const finalAction = getFinalActionCardText(vm);
  const representativeStrategy = getRepresentativeTradingStrategy(vm);
  const finalTone = strategyTitle.includes("위험") || strategyTitle.includes("회피") || strategyTitle.includes("보류")
    ? "risk"
    : strategyTitle.includes("추격") || strategyTitle.includes("과열") || strategyTitle.includes("저항")
      ? "caution"
      : hero.signalTone;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <div className="space-y-4">
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1fr)] md:items-stretch xl:grid-cols-[minmax(240px,0.85fr)_minmax(360px,1.35fr)_minmax(300px,1fr)]">
        <HeroPanel className="order-1">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-extrabold tracking-normal text-slate-950 [word-break:keep-all]">종목 요약</p>
            <h2
              className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(2.4rem,4.8vw,4.5rem)] font-extrabold leading-none tracking-normal text-slate-950"
              title={safeValue(hero.stockName, "미확인")}
            >
              {safeValue(hero.stockName, "미확인")}
            </h2>
          </div>
          <p
            className="mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-6 text-slate-600"
            title={`${safeValue(hero.ticker, "티커 확인 필요")} · ${safeValue(hero.marketTag, "시장 확인 필요")}`}
          >
            {safeValue(hero.ticker, "티커 확인 필요")} · {safeValue(hero.marketTag, "시장 확인 필요")}
          </p>
          <div className="mt-5">
            <p
              className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(3rem,5.5vw,4.75rem)] font-extrabold leading-none tracking-normal text-slate-950"
              title={safeValue(hero.currentPrice)}
            >
              {safeValue(hero.currentPrice)}
            </p>
            <p className="mt-2 text-base font-semibold leading-6 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
              {safeValue(hero.currencyOrUnit, safeValue(vm.basisSummary.priceUnit, "가격 단위 확인 필요"))}
            </p>
          </div>
          <div className="mt-4 grid gap-2.5">
            <HeroInfoBox label="현재가 해석" value={currentInterpretation} />
            <HeroInfoBox label="우선 전략" value={primaryStrategy} />
          </div>
        </HeroPanel>

        <HeroPanel className="order-3 md:order-2">
          <HeroPanelTitle title="매매 전략" />
          <p className="max-w-full overflow-hidden text-[clamp(1.3rem,1.75vw,1.9rem)] font-extrabold leading-tight tracking-normal text-slate-950 [display:-webkit-box] [overflow-wrap:break-word] [word-break:keep-all] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {representativeStrategy.title}
          </p>
          <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-slate-600 [overflow-wrap:break-word] [word-break:keep-all]">
            {representativeStrategy.summary.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            {representativeStrategy.execution.map((item) => (
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
          <div className="mt-3 flex flex-wrap gap-2">
            {representativeStrategy.badges.slice(0, 2).map((badge, index) => (
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
            <HeroScoreRing score={vm.scorePanel.overallScore} />
            <div className="space-y-3">
              {signalItems.map((item) => (
                <HeroMetricBar key={item.label} label={item.label} score={item.score} riskMode={item.riskMode} />
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
              <span className="font-extrabold text-slate-700">진입 관점</span>
              <span className="font-extrabold text-blue-700">{vm.scorePanel.entryScore === null ? "확인 필요" : vm.scorePanel.entryScore}</span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">
              {safeValue(vm.scorePanel.entryScoreLabel, "확인 필요")}
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
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]">
            {safeValue(vm.keyLevels.targetGapLabel, "추가 목표 확인 필요")}
          </p>
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
    <div className="grid min-w-0 grid-cols-[minmax(88px,124px)_minmax(0,1fr)_minmax(56px,70px)] items-center gap-3 text-sm">
      <span className="font-semibold leading-5 text-slate-700 [overflow-wrap:break-word] [word-break:keep-all]">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right text-xs font-bold leading-5 text-slate-900 [overflow-wrap:break-word]">{score === null ? "확인 필요" : score}</span>
    </div>
  );
}

function entryMetricLabel(mode: InstitutionalReportViewModel["scorePanel"]["entryScoreMode"]) {
  switch (mode) {
    case "current":
      return "현재가 진입 점수";
    case "pullback_wait":
      return "눌림목 대기 점수";
    case "breakout_wait":
      return "돌파 확인 점수";
    case "breakout_confirmed":
      return "재지지 확인 점수";
    case "risk":
      return "진입 보류";
    default:
      return "진입 판단";
  }
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
            <MetricBar label={entryMetricLabel(vm.scorePanel.entryScoreMode)} score={vm.scorePanel.entryScore} />
            <p
              className="mt-1 text-right text-xs font-semibold leading-5 text-slate-500 [overflow-wrap:break-word] [word-break:keep-all]"
              title={safeValue(vm.scorePanel.entryScoreExplanation, "")}
            >
              {safeValue(vm.scorePanel.entryScoreLabel, "확인 필요")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PriceLevelsCard({ vm }: { vm: InstitutionalReportViewModel }) {
  const rows = [
    ["현재 가격", vm.keyLevels.currentPrice, "bg-slate-500"],
    ["핵심 전환 가격", vm.basisSummary.pivotPrice, "bg-blue-900"],
    ["주요 지지선", vm.keyLevels.mainSupport, "bg-emerald-500"],
    ["보조 지지선", vm.keyLevels.secondarySupport, "bg-emerald-400"],
    ["주요 저항선", vm.keyLevels.mainResistance, "bg-rose-500"],
    ["돌파 기준", vm.keyLevels.breakoutTrigger, "bg-blue-700"],
    ["1차 목표", vm.keyLevels.target, "bg-blue-500"],
    ["확장 목표", vm.keyLevels.upperBreakoutTarget, "bg-sky-500"],
    ["손절 기준", vm.keyLevels.stopLoss, "bg-red-500"],
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
