import type { NextRequest } from "next/server";

import { proxyUsageStatus } from "../../../lib/apiProxy";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return proxyUsageStatus(request);
}
