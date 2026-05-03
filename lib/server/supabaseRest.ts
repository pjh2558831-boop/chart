const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type UsageStatus = {
  userId: string;
  plan: "free" | "basic" | "pro" | "premium";
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  enabledFeatures: string[];
};

const PLAN_LIMITS = {
  free: {
    dailyLimit: 3,
    monthlyLimit: 10,
    enabledFeatures: ["image_analysis"],
  },
  basic: {
    dailyLimit: 10,
    monthlyLimit: 100,
    enabledFeatures: ["image_analysis"],
  },
  pro: {
    dailyLimit: 30,
    monthlyLimit: 300,
    enabledFeatures: ["image_analysis", "visual_trade_signal"],
  },
  premium: {
    dailyLimit: 100,
    monthlyLimit: 1000,
    enabledFeatures: ["image_analysis", "visual_trade_signal", "news_analysis", "realtime_analysis"],
  },
} as const;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function headers(prefer?: string) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY ?? "",
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function periodStart(period: "daily" | "monthly") {
  const now = new Date();
  if (period === "daily") {
    now.setUTCHours(0, 0, 0, 0);
  } else {
    now.setUTCDate(1);
    now.setUTCHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

export function sanitizeUserId(userId: string | null) {
  const trimmed = (userId ?? "").trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }
  if (!/^[a-zA-Z0-9._:@-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export async function getOrCreateUser(userId: string) {
  const fallback = { id: userId, plan: "free" as const };
  if (!isSupabaseConfigured()) {
    return fallback;
  }

  try {
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,plan`, {
      headers: headers(),
      cache: "no-store",
    });
    if (userResponse.ok) {
      const rows = (await userResponse.json()) as Array<{ id: string; plan?: string | null }>;
      const existing = rows[0];
      if (existing?.id) {
        return {
          id: existing.id,
          plan: isPlan(existing.plan) ? existing.plan : "free",
        };
      }
    }

    const timestamp = nowIso();
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: headers("resolution=merge-duplicates"),
      body: JSON.stringify({
        id: userId,
        plan: "free",
        created_at: timestamp,
        updated_at: timestamp,
      }),
      cache: "no-store",
    });
  } catch {
    return fallback;
  }

  return fallback;
}

function isPlan(plan: unknown): plan is keyof typeof PLAN_LIMITS {
  return typeof plan === "string" && plan in PLAN_LIMITS;
}

async function countUsage(userId: string, period: "daily" | "monthly") {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/usage_logs?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(
        periodStart(period),
      )}&select=id`,
      {
        headers: {
          ...headers(),
          prefer: "count=exact",
        },
        cache: "no-store",
      },
    );
    const contentRange = response.headers.get("content-range");
    const count = contentRange?.split("/")[1];
    return count ? Number(count) : 0;
  } catch {
    return 0;
  }
}

export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const user = await getOrCreateUser(userId);
  const plan = isPlan(user.plan) ? user.plan : "free";
  const limits = PLAN_LIMITS[plan];
  const [dailyUsed, monthlyUsed] = await Promise.all([
    countUsage(user.id, "daily"),
    countUsage(user.id, "monthly"),
  ]);

  return {
    userId: user.id,
    plan,
    dailyLimit: limits.dailyLimit,
    monthlyLimit: limits.monthlyLimit,
    dailyUsed,
    monthlyUsed,
    dailyRemaining: Math.max(limits.dailyLimit - dailyUsed, 0),
    monthlyRemaining: Math.max(limits.monthlyLimit - monthlyUsed, 0),
    enabledFeatures: [...limits.enabledFeatures],
  };
}

export async function recordUsage(userId: string, analysisType: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/usage_logs`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        user_id: userId,
        analysis_type: analysisType,
        created_at: nowIso(),
      }),
      cache: "no-store",
    });
  } catch {
    // Logging should never break analysis.
  }
}

export async function createAnalysisLog(params: {
  userId: string;
  analysisType: string;
  inputImageHash?: string | null;
  result: unknown;
  modelName?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const payload = {
      user_id: params.userId,
      analysis_type: params.analysisType,
      input_image_hash: params.inputImageHash ?? null,
      result_json: params.result,
      model_name: params.modelName ?? null,
      created_at: nowIso(),
    };
    let response = await fetch(`${SUPABASE_URL}/rest/v1/analysis_logs?select=id`, {
      method: "POST",
      headers: headers("return=representation"),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!response.ok) {
      response = await fetch(`${SUPABASE_URL}/rest/v1/analysis_logs?select=id`, {
        method: "POST",
        headers: headers("return=representation"),
        body: JSON.stringify({
          ...payload,
          result_json: JSON.stringify(params.result),
        }),
        cache: "no-store",
      });
    }
    if (!response.ok) {
      return null;
    }
    const rows = (await response.json()) as Array<{ id: number }>;
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function createFeedback(params: {
  userId: string;
  analysisId: number;
  rating?: number | null;
  correctSignal?: string | null;
  correctPattern?: string | null;
  comment?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return {
      id: 0,
      userId: params.userId,
      analysisId: params.analysisId,
      rating: params.rating ?? null,
      correctSignal: params.correctSignal ?? null,
      correctPattern: params.correctPattern ?? null,
      comment: params.comment ?? null,
      createdAt: nowIso(),
    };
  }

  const createdAt = nowIso();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback_logs?select=id,user_id,analysis_id,rating,correct_signal,correct_pattern,comment,created_at`, {
    method: "POST",
    headers: headers("return=representation"),
    body: JSON.stringify({
      user_id: params.userId,
      analysis_id: params.analysisId,
      rating: params.rating ?? null,
      correct_signal: params.correctSignal ?? null,
      correct_pattern: params.correctPattern ?? null,
      comment: params.comment ?? null,
      created_at: createdAt,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("피드백 저장에 실패했습니다.");
  }

  const rows = (await response.json()) as Array<{
    id: number;
    user_id: string;
    analysis_id: number;
    rating?: number | null;
    correct_signal?: string | null;
    correct_pattern?: string | null;
    comment?: string | null;
    created_at: string;
  }>;
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    analysisId: row.analysis_id,
    rating: row.rating ?? null,
    correctSignal: row.correct_signal ?? null,
    correctPattern: row.correct_pattern ?? null,
    comment: row.comment ?? null,
    createdAt: row.created_at,
  };
}
