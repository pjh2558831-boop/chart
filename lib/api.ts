import type { Session } from "@supabase/supabase-js";

import type { AnalysisResponse } from "../types/analysis";
import type { AnalysisLogRecord, FeedbackRecord, UsageStatus } from "../types/billing";
import { getAuthHeaders } from "./identity";

export type AnalysisMode = "fast" | "standard" | "precision";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  usageStatus?: UsageStatus;

  constructor(message: string, status: number, code?: string, usageStatus?: UsageStatus) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.usageStatus = usageStatus;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = "요청 처리 중 오류가 발생했습니다.";
  let code: string | undefined;
  let usageStatus: UsageStatus | undefined;

  try {
    const body = (await response.json()) as {
      detail?: string | { code?: string; message?: string; usageStatus?: UsageStatus };
      error?: string;
      message?: string;
      usageStatus?: UsageStatus;
    };

    if (typeof body.detail === "object" && body.detail !== null) {
      code = body.detail.code;
      usageStatus = body.detail.usageStatus;
      message = body.detail.message || code || message;
    } else {
      message = body.detail || body.error || body.message || message;
      usageStatus = body.usageStatus;
    }
  } catch {
    message = response.statusText || message;
  }

  throw new ApiError(message, response.status, code, usageStatus);
}

export async function analyzeChartImage(
  file: File,
  analysisMode: AnalysisMode = "standard",
  signal?: AbortSignal,
  session?: Session | null,
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("analysisMode", analysisMode);

  const response = await fetch(apiUrl("/api/analyze-chart"), {
    method: "POST",
    headers: getAuthHeaders(session),
    body: formData,
    signal,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisResponse>;
}

export async function getUsageStatus(session?: Session | null): Promise<UsageStatus> {
  const response = await fetch(apiUrl("/api/usage-status"), {
    headers: getAuthHeaders(session),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<UsageStatus>;
}

export async function getAnalysisLogs(session?: Session | null): Promise<AnalysisLogRecord[]> {
  const response = await fetch(apiUrl("/api/analysis-logs"), {
    headers: getAuthHeaders(session),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisLogRecord[]>;
}

export async function getAnalysisLog(
  id: number,
  session?: Session | null,
): Promise<AnalysisLogRecord> {
  const response = await fetch(apiUrl(`/api/analysis-logs/${id}`), {
    headers: getAuthHeaders(session),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisLogRecord>;
}

export async function submitFeedback(
  params: {
    analysisId: number;
    rating?: number | null;
    correctSignal?: string | null;
    correctPattern?: string | null;
    comment?: string | null;
  },
  session?: Session | null,
): Promise<FeedbackRecord> {
  const response = await fetch(apiUrl("/api/feedback"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(session),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<FeedbackRecord>;
}
