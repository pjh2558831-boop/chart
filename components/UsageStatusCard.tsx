"use client";

import type { UsageStatus, UserPlan } from "../types/billing";

const planLabels: Record<UserPlan, string> = {
  guest: "비로그인 무료 체험",
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

const modeLabels = {
  fast: "빠른 분석",
  standard: "기본 분석",
  precision: "정밀 분석",
};

function planHelperText(status: UsageStatus) {
  if (status.plan === "guest") {
    return "로그인하면 하루 2회, 월 10회까지 무료로 사용할 수 있습니다.";
  }
  if (status.plan === "free") {
    return "Plus로 업그레이드하면 하루 20회, 월 100회까지 사용할 수 있습니다.";
  }
  if (status.plan === "plus") {
    return "Plus 플랜 기준으로 표준 분석과 고급 패턴 후보를 사용할 수 있습니다.";
  }
  return "Pro 플랜 기준으로 정밀 분석과 향후 고급 리서치 기능을 사용할 수 있습니다.";
}

export default function UsageStatusCard({
  usageStatus,
  loading,
  error,
  onOpenPricing,
}: {
  usageStatus: UsageStatus | null;
  loading: boolean;
  error?: string | null;
  onOpenPricing: () => void;
}) {
  if (loading && !usageStatus) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          사용량 정보를 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (!usageStatus) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-soft">
        사용량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </section>
    );
  }

  const title = usageStatus.planLabel || planLabels[usageStatus.plan];
  const dailyUsed = Math.min(usageStatus.dailyUsed, usageStatus.dailyLimit);
  const monthlyUsed = Math.min(usageStatus.monthlyUsed, usageStatus.monthlyLimit);
  const modeLabel = modeLabels[usageStatus.analysisMode] ?? usageStatus.analysisMode;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 플랜</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{planHelperText(usageStatus)}</p>
          {error ? <p className="mt-2 text-xs font-medium text-amber-700">{error}</p> : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">오늘 사용량</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {dailyUsed} / {usageStatus.dailyLimit}
          </p>
          <p className="mt-1 text-xs text-slate-500">남은 분석 {usageStatus.dailyRemaining}회</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">이번 달 사용량</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {monthlyUsed} / {usageStatus.monthlyLimit}
          </p>
          <p className="mt-1 text-xs text-slate-500">남은 분석 {usageStatus.monthlyRemaining}회</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 분석 모드</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{modeLabel}</p>
        </div>
        <button
          type="button"
          onClick={onOpenPricing}
          className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          요금제 보기
        </button>
      </div>
    </section>
  );
}
