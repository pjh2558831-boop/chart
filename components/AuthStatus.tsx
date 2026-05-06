"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "../context/AuthContext";

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "로그아웃 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
        로그인 상태 확인 중
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Google 로그인
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
