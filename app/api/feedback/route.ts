import type { NextRequest } from "next/server";

import { jsonError, proxyJsonToBackend, sanitizeIdentity } from "../../../lib/apiProxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = sanitizeIdentity(request.headers.get("x-user-id"));
  if (!userId) {
    return jsonError(400, "유효한 X-User-Id 헤더가 필요합니다.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "올바른 JSON 요청이 필요합니다.");
  }

  return proxyJsonToBackend(request, "/feedback", body);
}
