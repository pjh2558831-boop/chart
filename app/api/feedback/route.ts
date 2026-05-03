import { NextRequest, NextResponse } from "next/server";

import { createFeedback, sanitizeUserId } from "../../../lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = sanitizeUserId(request.headers.get("X-User-Id"));
  if (!userId) {
    return NextResponse.json({ detail: "X-User-Id 헤더가 필요합니다." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      analysisId?: number;
      rating?: number | null;
      correctSignal?: string | null;
      correctPattern?: string | null;
      comment?: string | null;
    };

    const analysisId = Number(body.analysisId);
    if (!Number.isInteger(analysisId) || analysisId <= 0) {
      return NextResponse.json({ detail: "analysisId가 필요합니다." }, { status: 400 });
    }
    if (body.rating !== null && body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json({ detail: "rating은 1~5 사이여야 합니다." }, { status: 400 });
    }

    const feedback = await createFeedback({
      userId,
      analysisId,
      rating: body.rating ?? null,
      correctSignal: body.correctSignal ?? null,
      correctPattern: body.correctPattern ?? null,
      comment: body.comment ?? null,
    });

    return NextResponse.json(feedback);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "피드백 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
