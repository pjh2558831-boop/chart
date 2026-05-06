export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Chart Vision AI</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          요청한 페이지가 없거나 이동되었습니다. 홈으로 돌아가서 차트 이미지를 다시 업로드해 주세요.
        </p>
      </div>
    </main>
  );
}
