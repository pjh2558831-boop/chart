import type { AnalysisResponse } from "../types/analysis";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export async function analyzeChartImage(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/analyze-chart`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "AI 분석 요청에 실패했습니다.";

    try {
      const errorBody = (await response.json()) as { detail?: string };
      if (errorBody.detail) {
        message = errorBody.detail;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json() as Promise<AnalysisResponse>;
}
