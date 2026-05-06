"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getCurrentUser, upsertProfileForUser } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인 처리 중...");

  useEffect(() => {
    const completeLogin = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        }

        const user = await getCurrentUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        await upsertProfileForUser(user);
        router.replace("/");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "로그인 처리 중 오류가 발생했습니다.",
        );
        setTimeout(() => router.replace("/login"), 1800);
      }
    };

    void completeLogin();
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
