"use client";

import { useEffect } from "react";

export function AuthCallbackRedirect() {
  useEffect(() => {
    const target = `/auth/callback${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <h1 className="mt-4 text-lg font-bold text-slate-950">로그인 경로를 정리하는 중...</h1>
        <p className="mt-2 text-sm text-slate-600">
          올바른 로그인 콜백 주소로 이동하고 있습니다.
        </p>
      </section>
    </main>
  );
}
