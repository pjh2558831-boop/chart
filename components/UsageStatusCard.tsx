"use client";

import type { UsageStatus } from "../types/billing";
import { PLAN_DISPLAY_LABELS } from "../lib/planLimits";

const fallbackGuestUsage: UsageStatus = {
  identityType: "guest",
  id: "guest",
  userId: null,
  guestId: "guest",
  plan: "guest",
  planLabel: "GUEST",
  price: 0,
  dailyLimit: 1,
  monthlyLimit: 3,
  dailyUsed: 0,
  monthlyUsed: 0,
  dailyRemaining: 1,
  monthlyRemaining: 3,
  analysisMode: "fast",
  enabledFeatures: ["image_analysis"],
  isLoggedIn: false,
  isPaidPlan: false,
};

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
  if (error && !usageStatus) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-amber-700">현재 플랜</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">확인 중</p>
          </div>
          <p className="text-sm leading-6 text-amber-800 md:col-span-2">{error}</p>
          <button
            type="button"
            onClick={onOpenPricing}
            className="rounded-md border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            요금제 보기
          </button>
        </div>
      </section>
    );
  }

  const status = usageStatus ?? fallbackGuestUsage;
  const title = PLAN_DISPLAY_LABELS[status.plan] ?? "GUEST";
  const dailyUsed = Math.min(Math.max(status.dailyUsed, 0), status.dailyLimit);
  const monthlyUsed = Math.min(Math.max(status.monthlyUsed, 0), status.monthlyLimit);
  const dailyRemaining = Math.max(0, status.dailyRemaining);
  const monthlyRemaining = Math.max(0, status.monthlyRemaining);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 플랜</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-bold text-slate-950">{title}</p>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">오늘 사용량</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {dailyUsed} / {status.dailyLimit}
          </p>
          <p className="mt-1 text-xs text-slate-500">남은 분석 {dailyRemaining}회</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">이번 달 사용량</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {monthlyUsed} / {status.monthlyLimit}
          </p>
          <p className="mt-1 text-xs text-slate-500">남은 분석 {monthlyRemaining}회</p>
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
