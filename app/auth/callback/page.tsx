"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser, upsertProfileForUser } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인 처리 중입니다...");

  useEffect(() => {
    let mounted = true;

    const finishOnHome = () => {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }
      router.replace("/");
    };

    async function handleCallback() {
      try {
        if (!supabase) {
          setMessage("Supabase 환경변수가 설정되지 않아 게스트 모드로 이동합니다.");
          finishOnHome();
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          await supabase.auth.getSession();
        }

        const user = await getCurrentUser();
        if (user) {
          try {
            await upsertProfileForUser(user);
          } catch (profileError) {
            console.warn("Profile upsert failed after OAuth callback:", profileError);
          }
        }

        if (!mounted) return;
        finishOnHome();
      } catch (error) {
        console.error("Auth callback error:", error);
        if (!mounted) return;
        setMessage("로그인 처리 중 오류가 발생해 메인 화면으로 이동합니다.");
        finishOnHome();
      }
    }

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <h1 className="mt-4 text-lg font-bold text-slate-950">로그인 처리 중...</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </section>
    </main>
  );
}
