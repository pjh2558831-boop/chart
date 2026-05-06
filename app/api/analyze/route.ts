import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_ANALYSIS_MODES = new Set(["fast", "standard", "precision"]);
const DEFAULT_ANALYSIS_MODE = "standard";
const BACKEND_TIMEOUT_MS = 120_000;

function jsonError(status: number, detail: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ detail, ...(extra ?? {}) }, { status });
}

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    throw new Error("BACKEND_API_URL is not configured");
  }
  return backendUrl;
}

function sanitizeIdentity(value: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }
  if (!/^[a-zA-Z0-9._:@-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizeAnalysisMode(value: FormDataEntryValue | null) {
  const mode = typeof value === "string" ? value : DEFAULT_ANALYSIS_MODE;
  return ALLOWED_ANALYSIS_MODES.has(mode) ? mode : DEFAULT_ANALYSIS_MODE;
}

async function parseBackendError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown; message?: unknown };
    const detail = body.detail || body.error || body.message;
    return typeof detail === "string" ? detail : "분석 서버 처리 중 오류가 발생했습니다.";
  } catch {
    return response.statusText || "분석 서버 처리 중 오류가 발생했습니다.";
  }
}

function mapBackendErrorStatus(status: number) {
  if ([400, 403, 404, 413, 429, 502, 504].includes(status)) {
    return status;
  }
  return 502;
}

export async function POST(request: NextRequest) {
  const userId = sanitizeIdentity(request.headers.get("X-User-Id"));
  const guestId = sanitizeIdentity(request.headers.get("X-Guest-Id"));
  const authorization = request.headers.get("Authorization");

  if (!userId && !guestId) {
    return jsonError(400, "로그인 정보 또는 게스트 식별자가 필요합니다.");
  }

  let incomingFormData: FormData;
  try {
    incomingFormData = await request.formData();
  } catch {
    return jsonError(400, "multipart/form-data 요청만 처리할 수 있습니다.");
  }

  const file = incomingFormData.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "이미지 파일이 필요합니다.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return jsonError(400, "png, jpg, jpeg, webp 이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
    return jsonError(413, "이미지 파일은 최대 5MB까지 업로드할 수 있습니다.");
  }

  const analysisMode = normalizeAnalysisMode(incomingFormData.get("analysisMode"));
  const backendFormData = new FormData();
  backendFormData.append("file", file);
  backendFormData.append("analysis_mode", analysisMode);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const backendResponse = await fetch(`${getBackendUrl()}/analyze-chart`, {
      method: "POST",
      headers: {
        ...(userId ? { "X-User-Id": userId } : {}),
        ...(guestId ? { "X-Guest-Id": guestId } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: backendFormData,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!backendResponse.ok) {
      const detail = await parseBackendError(backendResponse);
      return jsonError(mapBackendErrorStatus(backendResponse.status), detail);
    }

    const contentType = backendResponse.headers.get("content-type") ?? "application/json";
    const bodyText = await backendResponse.text();
    return new NextResponse(bodyText, {
      status: backendResponse.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError(504, "AI 분석 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  } finally {
    clearTimeout(timeout);
  }
}
