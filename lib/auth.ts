import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export async function signInWithGoogle() {
  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
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
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

export async function upsertProfileForUser(user: User) {
  const { error } = await supabase.from("profiles").upsert(
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
