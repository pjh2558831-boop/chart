import Link from "next/link";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <p className="text-sm font-semibold uppercase text-blue-600">Chart Vision AI</p>
        <h1 className="mt-3 text-xl font-bold text-slate-950">로그인 경로 확인</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Google 로그인을 시작하려면 로그인 페이지로 이동하세요.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          로그인 페이지로 이동
        </Link>
      </section>
    </main>
  );
}
