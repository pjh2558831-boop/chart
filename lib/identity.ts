import type { Session } from "@supabase/supabase-js";

const GUEST_ID_STORAGE_KEY = "chart_guest_id";
const LEGACY_GUEST_ID_STORAGE_KEY = "chart_vision_guest_id";

function createGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "server-guest";
  }

  const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const legacyGuestId = window.localStorage.getItem(LEGACY_GUEST_ID_STORAGE_KEY);
  if (legacyGuestId) {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, legacyGuestId);
    return legacyGuestId;
  }

  const nextGuestId = createGuestId();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, nextGuestId);
  return nextGuestId;
}

export function getAuthHeaders(session?: Session | null): Record<string, string> {
  if (session?.user?.id) {
    return {
      Authorization: `Bearer ${session.access_token}`,
      "X-User-Id": session.user.id,
    };
  }

  return {
    "X-Guest-Id": getOrCreateGuestId(),
  };
}
