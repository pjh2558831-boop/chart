import type { AnalysisResponse } from "../types/analysis";
import type { AnalysisLogRecord, FeedbackRecord, UsageStatus } from "../types/billing";
import { getOrCreateUserId } from "./user";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function parseError(response: Response): Promise<never> {
  let message = "요청 처리 중 오류가 발생했습니다.";

  try {
    const body = (await response.json()) as { detail?: string; error?: string; message?: string };
    message = body.detail || body.error || body.message || message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

function createUserHeaders() {
  return {
    "X-User-Id": getOrCreateUserId(),
  };
}

export async function analyzeChartImage(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/api/analyze"), {
    method: "POST",
    headers: createUserHeaders(),
    body: formData,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisResponse>;
}

export async function getUsageStatus(): Promise<UsageStatus> {
  const response = await fetch(apiUrl("/api/usage-status"), {
    headers: createUserHeaders(),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<UsageStatus>;
}

export async function getAnalysisLogs(): Promise<AnalysisLogRecord[]> {
  const response = await fetch(apiUrl("/api/analysis-logs"), {
    headers: createUserHeaders(),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisLogRecord[]>;
}

export async function getAnalysisLog(id: number): Promise<AnalysisLogRecord> {
  const response = await fetch(apiUrl(`/api/analysis-logs/${id}`), {
    headers: createUserHeaders(),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<AnalysisLogRecord>;
}

export async function submitFeedback(params: {
  analysisId: number;
  rating?: number | null;
  correctSignal?: string | null;
  correctPattern?: string | null;
  comment?: string | null;
}): Promise<FeedbackRecord> {
  const response = await fetch(apiUrl("/api/feedback"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...createUserHeaders(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json() as Promise<FeedbackRecord>;
}
