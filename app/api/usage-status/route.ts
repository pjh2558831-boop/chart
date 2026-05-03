import { NextRequest, NextResponse } from "next/server";

import { getUsageStatus, sanitizeUserId } from "../../../lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = sanitizeUserId(request.headers.get("X-User-Id"));
  if (!userId) {
    return NextResponse.json({ detail: "X-User-Id 헤더가 필요합니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getUsageStatus(userId));
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "사용량 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
