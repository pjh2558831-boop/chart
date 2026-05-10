import type { UsageStatus } from "../types/billing";
import { getOrCreateGuestId } from "./identity";
import { buildUsageStatusFromCounts } from "./planLimits";

const FALLBACK_USAGE_PREFIX = "chartvision_guest_usage:";

type FallbackUsageRecord = {
  action: "analysis_success";
  createdAt: string;
};

function usageKey(guestId: string) {
  return `${FALLBACK_USAGE_PREFIX}${guestId}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function readRecords(guestId: string): FallbackUsageRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(usageKey(guestId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is FallbackUsageRecord =>
        record?.action === "analysis_success" && typeof record.createdAt === "string",
    );
  } catch {
    return [];
  }
}

function writeRecords(guestId: string, records: FallbackUsageRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(usageKey(guestId), JSON.stringify(records));
}

export function getGuestFallbackUsageStatus(): UsageStatus {
  const guestId = getOrCreateGuestId();
  const records = readRecords(guestId);
  const today = startOfToday();
  const month = startOfMonth();
  const dailyUsed = records.filter((record) => Date.parse(record.createdAt) >= today).length;
  const monthlyUsed = records.filter((record) => Date.parse(record.createdAt) >= month).length;

  return buildUsageStatusFromCounts({
    identityType: "guest",
    id: guestId,
    guestId,
    plan: "guest",
    dailyUsed,
    monthlyUsed,
  });
}

export function recordGuestFallbackAnalysisSuccess(): UsageStatus {
  const guestId = getOrCreateGuestId();
  const records = readRecords(guestId);
  records.push({ action: "analysis_success", createdAt: new Date().toISOString() });
  writeRecords(guestId, records);
  return getGuestFallbackUsageStatus();
}
