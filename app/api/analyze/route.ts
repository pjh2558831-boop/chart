import type { NextRequest } from "next/server";

import { proxyAnalyzeChart } from "../../../lib/apiProxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return proxyAnalyzeChart(request);
}
