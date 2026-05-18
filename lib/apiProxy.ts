import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_API_URL = "https://chartbackend-production.up.railway.app";
const PRODUCTION_SITE_URL = "https://www.chartvisionai.site";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_ANALYSIS_MODES = new Set(["fast", "standard", "precision"]);
const DEFAULT_ANALYSIS_MODE = "standard";

const ANALYZE_TIMEOUT_MS = 55_000;
const GENERAL_TIMEOUT_MS = 20_000;

export function jsonError(status: number, detail: unknown) {
  return NextResponse.json({ detail }, { status });
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function isLocalUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/i.test(value);
}

function getBackendUrl(request: NextRequest) {
  const configuredBackendUrl = process.env.BACKEND_API_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  if (!configuredBackendUrl && isProduction) {
    return {
      error: jsonError(500, "BACKEND_API_URL 환경변수가 설정되지 않았습니다."),
    };
  }

  const backendUrl = stripTrailingSlash(configuredBackendUrl || DEFAULT_BACKEND_API_URL);
  if (isProduction && isLocalUrl(backendUrl)) {
    return {
      error: jsonError(500, "운영 환경에서는 localhost 백엔드 주소를 사용할 수 없습니다."),
    };
  }

  const requestOrigin = stripTrailingSlash(request.nextUrl.origin);
  const productionOrigin = stripTrailingSlash(PRODUCTION_SITE_URL);

  if (backendUrl === requestOrigin || backendUrl === productionOrigin) {
    return {
      error: jsonError(
        500,
        "BACKEND_API_URL은 Next.js 사이트 주소가 아니라 FastAPI 백엔드 주소여야 합니다.",
      ),
    };
  }

  return { backendUrl };
}

export function sanitizeIdentity(value: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }
  if (!/^[a-zA-Z0-9._:@-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function getForwardedIdentityHeaders(request: NextRequest) {
  const userId = sanitizeIdentity(request.headers.get("x-user-id"));
  const guestId = sanitizeIdentity(request.headers.get("x-guest-id"));
  const authorization = request.headers.get("authorization");

  const headers = new Headers();
  if (userId) headers.set("X-User-Id", userId);
  if (guestId) headers.set("X-Guest-Id", guestId);
  if (authorization) headers.set("Authorization", authorization);

  return { headers, userId, guestId, authorization };
}

function normalizeAnalysisMode(value: FormDataEntryValue | null) {
  const mode = typeof value === "string" ? value : DEFAULT_ANALYSIS_MODE;
  return ALLOWED_ANALYSIS_MODES.has(mode) ? mode : DEFAULT_ANALYSIS_MODE;
}

export async function parseBackendError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    return body.detail || body.error || body.message || fallback;
  } catch {
    return response.statusText || fallback;
  }
}

function mapBackendErrorStatus(status: number) {
  if ([400, 401, 403, 404, 413, 429, 502, 503, 504].includes(status)) {
    return status;
  }
  return 502;
}

async function proxyTextResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json; charset=utf-8";
  const bodyText = await response.text();

  return new NextResponse(bodyText, {
    status: response.status,
    headers: { "content-type": contentType },
  });
}

export async function proxyAnalyzeChart(request: NextRequest) {
  const backend = getBackendUrl(request);
  if (backend.error) return backend.error;

  const { headers, guestId, authorization } = getForwardedIdentityHeaders(request);
  if (!authorization && !guestId) {
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

  const analysisMode = normalizeAnalysisMode(
    incomingFormData.get("analysisMode") ?? incomingFormData.get("analysis_mode"),
  );
  const backendFormData = new FormData();
  backendFormData.append("file", file);
  backendFormData.append("analysis_mode", analysisMode);
  if (guestId) {
    backendFormData.append("guest_id", guestId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const backendResponse = await fetch(`${backend.backendUrl}/analyze-chart`, {
      method: "POST",
      headers,
      body: backendFormData,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!backendResponse.ok) {
      const detail = await parseBackendError(backendResponse, "분석 서버 처리 중 오류가 발생했습니다.");
      return jsonError(mapBackendErrorStatus(backendResponse.status), detail);
    }

    return proxyTextResponse(backendResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError(504, "AI 분석 응답 시간이 초과되었습니다. 다시 시도해주세요.");
    }
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyUsageStatus(request: NextRequest) {
  const backend = getBackendUrl(request);
  if (backend.error) return backend.error;

  const { headers, guestId, authorization } = getForwardedIdentityHeaders(request);
  if (!authorization && !guestId) {
    return jsonError(400, "로그인 정보 또는 게스트 식별자가 필요합니다.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERAL_TIMEOUT_MS);

  try {
    const response = await fetch(`${backend.backendUrl}/usage-status`, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return jsonError(response.status, await parseBackendError(response, "사용량 조회 중 오류가 발생했습니다."));
    }

    return proxyTextResponse(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError(504, "사용량 조회 응답 시간이 초과되었습니다.");
    }
    return jsonError(502, "분석 서버에 연결할 수 없어 임시 사용량 정보를 표시합니다.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyJsonToBackend(
  request: NextRequest,
  backendPath: string,
  body: unknown,
) {
  const backend = getBackendUrl(request);
  if (backend.error) return backend.error;

  const { headers, guestId, authorization } = getForwardedIdentityHeaders(request);
  if (!authorization && !guestId) {
    return jsonError(400, "로그인 정보 또는 게스트 식별자가 필요합니다.");
  }

  headers.set("content-type", "application/json");

  try {
    const response = await fetch(`${backend.backendUrl}${backendPath}`, {
      method: request.method,
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      return jsonError(response.status, await parseBackendError(response, "요청 처리 중 오류가 발생했습니다."));
    }

    return proxyTextResponse(response);
  } catch {
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  }
}

export async function proxyGetToBackend(request: NextRequest, backendPath: string) {
  const backend = getBackendUrl(request);
  if (backend.error) return backend.error;

  const { headers, guestId, authorization } = getForwardedIdentityHeaders(request);
  if (!authorization && !guestId) {
    return jsonError(400, "로그인 정보 또는 게스트 식별자가 필요합니다.");
  }

  try {
    const response = await fetch(`${backend.backendUrl}${backendPath}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return jsonError(response.status, await parseBackendError(response, "요청 처리 중 오류가 발생했습니다."));
    }

    return proxyTextResponse(response);
  } catch {
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  }
}
