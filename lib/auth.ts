import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

const PRODUCTION_SITE_URL = "https://chart-umber.vercel.app";

function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const browserOrigin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
  const isBrowserLocal =
    browserOrigin.includes("localhost") || browserOrigin.includes("127.0.0.1");

  if (browserOrigin && isBrowserLocal) {
    return browserOrigin;
  }

  if (configuredSiteUrl) {
    const isConfiguredLocal =
      configuredSiteUrl.includes("localhost") || configuredSiteUrl.includes("127.0.0.1");

    if (isConfiguredLocal && browserOrigin && !isBrowserLocal) {
      return browserOrigin;
    }

    return configuredSiteUrl;
  }

  if (browserOrigin) {
    return browserOrigin || PRODUCTION_SITE_URL;
  }

  return PRODUCTION_SITE_URL;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return supabase;
}

export async function signInWithGoogle() {
  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback`;

  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

export async function upsertProfileForUser(user: User) {
  const { error } = await requireSupabase().from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      plan: "free",
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}
