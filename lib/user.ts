const USER_ID_STORAGE_KEY = "chart_ai_user_id";

function createFallbackUserId() {
  return `chart-ai-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") {
    return "server-render-user";
  }

  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextUserId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : createFallbackUserId();

  window.localStorage.setItem(USER_ID_STORAGE_KEY, nextUserId);
  return nextUserId;
}
