import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const ROUTES: Record<string, Set<string>> = {
  "GET /usage-status": new Set(["usage-status"]),
  "GET /analysis-logs": new Set(["analysis-logs"]),
  "GET /analysis-logs/:id": new Set(["analysis-logs"]),
  "POST /analyze-chart": new Set(["analyze-chart"]),
  "POST /feedback": new Set(["feedback"]),
};

function jsonError(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    throw new Error("BACKEND_API_URL is not configured");
  }
  return backendUrl;
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "local";
}

function checkRateLimit(request: NextRequest) {
  const key = getClientKey(request);
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonError(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }

  current.count += 1;
  return null;
}

function isAllowedOrigin(request: NextRequest) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function sanitizeUserId(userId: string | null) {
  const trimmed = (userId ?? "").trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }
  if (!/^[a-zA-Z0-9._:@-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function routeKey(method: string, segments: string[]) {
  if (method === "GET" && segments.length === 1 && segments[0] === "usage-status") {
    return "GET /usage-status";
  }
  if (method === "GET" && segments.length === 1 && segments[0] === "analysis-logs") {
    return "GET /analysis-logs";
  }
  if (method === "GET" && segments.length === 2 && segments[0] === "analysis-logs") {
    return "GET /analysis-logs/:id";
  }
  if (method === "POST" && segments.length === 1 && segments[0] === "analyze-chart") {
    return "POST /analyze-chart";
  }
  if (method === "POST" && segments.length === 1 && segments[0] === "feedback") {
    return "POST /feedback";
  }
  return null;
}

function buildBackendPath(segments: string[]) {
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

function isSafeBackendStatus(status: number) {
  return [400, 403, 404, 413, 429].includes(status);
}

async function proxyResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json";
  const text = await response.text();

  if (response.ok) {
    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": contentType },
    });
  }

  if (!isSafeBackendStatus(response.status)) {
    return jsonError(response.status, "분석 서버 처리 중 오류가 발생했습니다.");
  }

  try {
    const body = JSON.parse(text) as { detail?: unknown };
    const detail = typeof body.detail === "string" ? body.detail : "요청을 처리할 수 없습니다.";
    return jsonError(response.status, detail);
  } catch {
    return jsonError(response.status, "요청을 처리할 수 없습니다.");
  }
}

async function validateAnalyzeFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: jsonError(400, "이미지 파일이 필요합니다.") };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: jsonError(400, "png, jpg, jpeg, webp 이미지 파일만 업로드할 수 있습니다.") };
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
    return { error: jsonError(413, "파일 크기는 최대 5MB까지 가능합니다.") };
  }

  return { formData };
}

async function validateFeedbackBody(request: NextRequest) {
  const body = (await request.json()) as {
    analysisId?: unknown;
    rating?: unknown;
    correctSignal?: unknown;
    correctPattern?: unknown;
    comment?: unknown;
  };

  if (!Number.isInteger(body.analysisId)) {
    return { error: jsonError(400, "analysisId가 필요합니다.") };
  }
  const rating = body.rating;
  if (rating != null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) {
    return { error: jsonError(400, "rating은 1부터 5까지 입력할 수 있습니다.") };
  }

  return { body };
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  if (!isAllowedOrigin(request)) {
    return jsonError(403, "허용되지 않은 요청 출처입니다.");
  }

  const rateLimited = checkRateLimit(request);
  if (rateLimited) {
    return rateLimited;
  }

  const params = await context.params;
  const segments = params.path ?? [];
  const key = routeKey(request.method, segments);
  if (!key || !ROUTES[key]) {
    return jsonError(404, "지원하지 않는 API 경로입니다.");
  }

  const userId = sanitizeUserId(request.headers.get("x-user-id"));
  if (!userId) {
    return jsonError(400, "유효한 X-User-Id 헤더가 필요합니다.");
  }

  const headers = new Headers({ "X-User-Id": userId });
  let body: BodyInit | undefined;

  if (key === "POST /analyze-chart") {
    const validated = await validateAnalyzeFormData(request);
    if (validated.error) {
      return validated.error;
    }
    body = validated.formData;
  } else if (key === "POST /feedback") {
    const validated = await validateFeedbackBody(request);
    if (validated.error) {
      return validated.error;
    }
    headers.set("content-type", "application/json");
    body = JSON.stringify(validated.body);
  }

  try {
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}${buildBackendPath(segments)}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    return proxyResponse(backendResponse);
  } catch {
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handleRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handleRequest(request, context);
}
