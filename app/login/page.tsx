"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signInWithGoogle } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next || "/");
  }, [loading, router, user]);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Google 로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase text-blue-600">Chart Vision AI</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">Google 로그인</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Supabase Auth로 로그인하면 새로고침 후에도 세션이 유지되고 보호된 분석 페이지를 사용할 수 있습니다.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || loading}
          className="mt-6 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "로그인 이동 중..." : "Google로 계속하기"}
        </button>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <Link href="/" className="mt-5 inline-flex text-sm font-semibold text-slate-600 hover:text-slate-950">
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
