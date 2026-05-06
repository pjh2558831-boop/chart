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
    return typeof detail === "string" ? detail : "피드백 저장 중 오류가 발생했습니다.";
  } catch {
    return response.statusText || "피드백 저장 중 오류가 발생했습니다.";
  }
}

export async function POST(request: NextRequest) {
  const userId = sanitizeUserId(request.headers.get("X-User-Id"));
  if (!userId) {
    return jsonError(400, "유효한 X-User-Id 헤더가 필요합니다.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "올바른 JSON 요청이 필요합니다.");
  }

  try {
    const response = await fetch(`${getBackendUrl()}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify(body),
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
