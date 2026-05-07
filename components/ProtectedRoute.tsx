"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;

    const query = typeof window === "undefined" ? "" : window.location.search;
    const next = encodeURIComponent(`${pathname}${query}`);
    router.replace(`/login?next=${next}`);
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <h1 className="mt-4 text-lg font-bold text-slate-950">로그인 상태 확인 중...</h1>
          <p className="mt-2 text-sm text-slate-600">저장된 Supabase 세션을 복원하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
