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
  const userId = sanitizeIdentity(request.headers.get("X-User-Id"));
  const guestId = sanitizeIdentity(request.headers.get("X-Guest-Id"));
  const authorization = request.headers.get("Authorization");

  if (!userId && !guestId) {
    return jsonError(400, "로그인 정보 또는 게스트 식별자가 필요합니다.");
  }

  try {
    const response = await fetch(`${getBackendUrl()}/usage-status`, {
      headers: {
        ...(userId ? { "X-User-Id": userId } : {}),
        ...(guestId ? { "X-Guest-Id": guestId } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
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
