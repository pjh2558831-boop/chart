import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

async function parseBackendError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown; message?: unknown };
    const detail = body.detail || body.error || body.message;
    return typeof detail === "string" ? detail : "사용량 조회 중 오류가 발생했습니다.";
  } catch {
    return response.statusText || "사용량 조회 중 오류가 발생했습니다.";
  }
}

export async function GET(request: NextRequest) {
  const userId = sanitizeUserId(request.headers.get("X-User-Id"));
  if (!userId) {
    return jsonError(400, "유효한 X-User-Id 헤더가 필요합니다.");
  }

  try {
    const response = await fetch(`${getBackendUrl()}/usage-status`, {
      headers: { "X-User-Id": userId },
      cache: "no-store",
    });
    if (!response.ok) {
      return jsonError(response.status, await parseBackendError(response));
    }
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return jsonError(502, "분석 서버에 연결할 수 없습니다.");
  }
}
