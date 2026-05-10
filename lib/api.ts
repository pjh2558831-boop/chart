import type { Session } from "@supabase/supabase-js";

import type { AnalysisResponse } from "../types/analysis";
import type { AnalysisLogRecord, FeedbackRecord, LimitOfferType, UsageStatus } from "../types/billing";
import { getAuthHeaders, getOrCreateGuestId } from "./identity";

export type AnalysisMode = "fast" | "standard" | "precision";

function apiUrl(path: string) {
  return path;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  offerType?: LimitOfferType;
  usageStatus?: UsageStatus;

  constructor(
    message: string,
    status: number,
    code?: string,
    usageStatus?: UsageStatus,
    offerType?: LimitOfferType,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.usageStatus = usageStatus;
    this.offerType = offerType;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = "요청 처리 중 오류가 발생했습니다.";
  let code: string | undefined;
  let offerType: LimitOfferType | undefined;
  let usageStatus: UsageStatus | undefined;

  try {
    const body = (await response.json()) as {
      detail?: string | { code?: string; message?: string; usageStatus?: UsageStatus; offerType?: LimitOfferType };
      error?: string;
      message?: string;
      usageStatus?: UsageStatus;
      offerType?: LimitOfferType;
    };

    if (typeof body.detail === "object" && body.detail !== null) {
      code = body.detail.code;
      offerType = body.detail.offerType;
      usageStatus = body.detail.usageStatus;
      message = body.detail.message || code || message;
    } else {
      message = body.detail || body.error || body.message || message;
      usageStatus = body.usageStatus;
      offerType = body.offerType;
    }
  } catch {
    message = response.statusText || message;
  }

  throw new ApiError(message, response.status, code, usageStatus, offerType);
}

async function postAnalysisRequest(
  url: string,
  file: File,
  analysisMode: AnalysisMode,
  signal: AbortSignal | undefined,
  session: Session | null | undefined,
  useGuestUsageFallback = false,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("analysisMode", analysisMode);
  formData.append("analysis_mode", analysisMode);
  formData.append("guest_id", getOrCreateGuestId());

  return fetch(url, {
    method: "POST",
    headers: getAuthHeaders(session, { guestUsageFallback: useGuestUsageFallback }),
    body: formData,
    signal,
  });
}

export async function analyzeChartImage(
  file: File,
  analysisMode: AnalysisMode = "standard",
  signal?: AbortSignal,
  session?: Session | null,
  useGuestUsageFallback = false,
): Promise<AnalysisResponse> {
  const proxyUrl = apiUrl("/api/analyze-chart");
  const response = await postAnalysisRequest(
    proxyUrl,
    file,
    analysisMode,
    signal,
    session,
    useGuestUsageFallback,
  );

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
