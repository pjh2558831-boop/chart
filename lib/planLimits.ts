import type { UsageStatus, UserPlan } from "../types/billing";

export const PLAN_LIMITS: Record<
  UserPlan,
  {
    dailyLimit: number;
    monthlyLimit: number;
    label: string;
    price: number;
    analysisMode: "fast" | "standard" | "precision";
  }
> = {
  guest: {
    dailyLimit: 1,
    monthlyLimit: 3,
    label: "GUEST",
    price: 0,
    analysisMode: "fast",
  },
  free: {
    dailyLimit: 3,
    monthlyLimit: 10,
    label: "FREE",
    price: 0,
    analysisMode: "fast",
  },
  plus: {
    dailyLimit: 20,
    monthlyLimit: 100,
    label: "PLUS",
    price: 4900,
    analysisMode: "standard",
  },
  pro: {
    dailyLimit: 50,
    monthlyLimit: 300,
    label: "PRO",
    price: 12900,
    analysisMode: "precision",
  },
};

export const PLAN_DISPLAY_LABELS: Record<UserPlan, string> = {
  guest: "비로그인",
  free: "free",
  plus: "Plus",
  pro: "Pro",
};

export function normalizePlan(plan: unknown): UserPlan {
  const normalized = String(plan ?? "free").trim().toLowerCase();
  if (normalized === "guest" || normalized === "free" || normalized === "plus" || normalized === "pro") {
    return normalized;
  }
  return "free";
}

export function buildUsageStatusFromCounts({
  identityType,
  id,
  plan,
  dailyUsed,
  monthlyUsed,
  guestId,
  userId,
}: {
  identityType: "guest" | "user";
  id: string;
  plan: UserPlan;
  dailyUsed: number;
  monthlyUsed: number;
  guestId?: string | null;
  userId?: string | null;
}): UsageStatus {
  const limits = PLAN_LIMITS[plan];
  const safeDailyUsed = Math.max(0, dailyUsed);
  const safeMonthlyUsed = Math.max(0, monthlyUsed);

  return {
    identityType,
    id,
    userId: userId ?? null,
    guestId: guestId ?? null,
    plan,
    planLabel: PLAN_DISPLAY_LABELS[plan],
    price: limits.price,
    dailyLimit: limits.dailyLimit,
    monthlyLimit: limits.monthlyLimit,
    dailyUsed: safeDailyUsed,
    monthlyUsed: safeMonthlyUsed,
    dailyRemaining: Math.max(limits.dailyLimit - safeDailyUsed, 0),
    monthlyRemaining: Math.max(limits.monthlyLimit - safeMonthlyUsed, 0),
    analysisMode: limits.analysisMode,
    enabledFeatures: plan === "guest" ? ["image_analysis"] : ["image_analysis", "analysis_history"],
    isLoggedIn: identityType === "user",
    isPaidPlan: plan === "plus" || plan === "pro",
  };
}
