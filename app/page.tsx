"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AnalysisResult from "../components/AnalysisResult";
import AuthStatus from "../components/AuthStatus";
import ImageUploader from "../components/ImageUploader";
import PricingModal from "../components/PricingModal";
import UsageStatusCard from "../components/UsageStatusCard";
import { useAuth } from "../context/AuthContext";
import { analyzeChartImage, ApiError, getUsageStatus, type AnalysisMode } from "../lib/api";
import { getOrCreateGuestId } from "../lib/identity";
import type { AnalysisResponse } from "../types/analysis";
import type { UsageStatus, UserPlan } from "../types/billing";

const LOGIN_HINT_DISMISSED_KEY = "chart_vision_login_hint_dismissed";

const loadingSteps = [
  "이미지 최적화 중",
  "차트 구조 분석 중",
  "보조지표 인식 중",
  "가격 전략 후보 계산 중",
  "리포트 생성 중",
];

const analysisModeOptions: Array<{ value: AnalysisMode; label: string; description: string }> = [
  {
    value: "fast",
    label: "빠른 분석",
    description: "전체 이미지와 가격축 중심으로 빠르게 확인합니다.",
  },
  {
    value: "standard",
    label: "기본 분석",
    description: "속도와 리포트 품질의 균형을 맞춘 기본 모드입니다.",
  },
  {
    value: "precision",
    label: "정밀 분석",
    description: "보조지표와 중앙 차트 영역까지 더 자세히 확인합니다.",
  },
];

const allowedModesByPlan: Record<UserPlan, AnalysisMode[]> = {
  guest: ["fast"],
  free: ["fast"],
  plus: ["fast", "standard"],
  pro: ["fast", "standard", "precision"],
};

function createGuestFallbackUsageStatus(message?: string): UsageStatus {
  const guestId = typeof window === "undefined" ? "server-guest" : getOrCreateGuestId();
  return {
    identityType: "guest",
    id: guestId,
    userId: null,
    guestId,
    plan: "guest",
    planLabel: "鍮꾨줈洹몄씤 臾대즺 泥댄뿕",
    price: 0,
    dailyLimit: 1,
    monthlyLimit: 3,
    dailyUsed: 0,
    monthlyUsed: 0,
    dailyRemaining: 1,
    monthlyRemaining: 3,
    analysisMode: "fast",
    enabledFeatures: ["image_analysis"],
    isLoggedIn: false,
    isPaidPlan: false,
  };
}

function fileKey(file: File, analysisMode: AnalysisMode) {
  return `${file.name}:${file.size}:${file.lastModified}:${analysisMode}`;
}

function normalizeModeForPlan(mode: AnalysisMode, plan: UserPlan): AnalysisMode {
  const allowedModes = allowedModesByPlan[plan] ?? ["fast"];
  return allowedModes.includes(mode) ? mode : allowedModes[allowedModes.length - 1];
}

function buildLimitMessage(code: string | undefined, usageStatus: UsageStatus | null) {
  const plan = usageStatus?.plan ?? "guest";
  if (code === "daily_limit_exceeded") {
    if (plan === "guest") {
      return "?ㅻ뒛 鍮꾨줈洹몄씤 臾대즺 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. 濡쒓렇?명븯硫??섎（ 2?뚭퉴吏 臾대즺濡??ъ슜?????덉뒿?덈떎.";
    }
    if (plan === "free") {
      return "?ㅻ뒛 Free 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. Plus ?뚮옖? ?섎（ 20?뚭퉴吏 ?ъ슜?????덉뒿?덈떎.";
    }
    if (plan === "plus") {
      return "?ㅻ뒛 Plus 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. Pro ?뚮옖? ?섎（ 50?뚭퉴吏 ?ъ슜?????덉뒿?덈떎.";
    }
    return "?ㅻ뒛 Pro 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎.";
  }
  if (code === "monthly_limit_exceeded") {
    if (plan === "guest") {
      return "?대쾲 ??鍮꾨줈洹몄씤 臾대즺 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. 濡쒓렇?명븯硫???10?뚭퉴吏 臾대즺濡??ъ슜?????덉뒿?덈떎.";
    }
    if (plan === "free") {
      return "Free 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. Plus ?뚮옖? ??100?뚭퉴吏 ?ъ슜?????덉뒿?덈떎.";
    }
    if (plan === "plus") {
      return "Plus 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎. Pro ?뚮옖? ??300?뚭퉴吏 ?ъ슜?????덉뒿?덈떎.";
    }
    return "?대쾲 ??Pro 遺꾩꽍 ?잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎.";
  }
  return null;
}

function LoadingAnalysisCard({ stepIndex }: { stepIndex: number }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-soft">
      <div className="flex gap-4">
        <div className="mt-1 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-950">李⑦듃 ?대?吏瑜?遺꾩꽍 以묒엯?덈떎.</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            ?대?吏 援ъ“, 蹂댁“吏?? 吏吏쨌????꾨낫, 湲곗닠???좏샇瑜??쒖꽌?濡??뺤씤?섍퀬 ?덉뒿?덈떎.
          </p>
          <ol className="mt-4 grid gap-2 md:grid-cols-5">
            {loadingSteps.map((step, index) => {
              const isActive = index === stepIndex;
              const isDone = index < stepIndex;
              return (
                <li
                  key={step}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    isActive
                      ? "border-blue-300 bg-blue-50 text-blue-800"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("standard");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [loginHintDismissed, setLoginHintDismissed] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  const currentPlan = usageStatus?.plan ?? "guest";
  const allowedModes = useMemo(() => allowedModesByPlan[currentPlan] ?? ["fast"], [currentPlan]);
  const safeAnalysisMode = normalizeModeForPlan(analysisMode, currentPlan);
  const isUsageExceeded = Boolean(
    usageStatus && (usageStatus.dailyRemaining <= 0 || usageStatus.monthlyRemaining <= 0),
  );
  const showLoginHint = Boolean(
    usageStatus?.identityType === "guest" &&
      !session?.user &&
      !loginHintDismissed &&
      (usageStatus.dailyUsed >= 1 || usageStatus.monthlyUsed >= 1 || isUsageExceeded),
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoginHintDismissed(window.localStorage.getItem(LOGIN_HINT_DISMISSED_KEY) === "true");
      getOrCreateGuestId();
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    const loadUsageStatus = async () => {
      setUsageLoading(true);
      setUsageError(null);
      try {
        const nextUsageStatus = await getUsageStatus(session);
        if (!cancelled) {
          setUsageStatus(nextUsageStatus);
          setAnalysisMode((current) => normalizeModeForPlan(current, nextUsageStatus.plan));
        }
      } catch (requestError) {
        console.error("Failed to load usage status", requestError);
        if (!cancelled) {
          const fallback = createGuestFallbackUsageStatus();
          setUsageStatus(fallback);
          setUsageError(
            requestError instanceof Error
              ? requestError.message
              : "?ъ슜???뺣낫瑜?遺덈윭?ㅼ? 紐삵빐 ?꾩떆 ?뺣낫瑜??쒖떆?⑸땲??",
          );
          setAnalysisMode((current) => normalizeModeForPlan(current, fallback.plan));
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    };

    void loadUsageStatus();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const dismissLoginHint = () => {
    setLoginHintDismissed(true);
    window.localStorage.setItem(LOGIN_HINT_DISMISSED_KEY, "true");
  };

  const startLoadingSteps = () => {
    setLoadingStepIndex(0);
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }
    loadingTimerRef.current = setInterval(() => {
      setLoadingStepIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 1800);
  };

  const stopLoadingSteps = () => {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingStepIndex(0);
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setAnalysisResult(null);
    setError(null);
  };

  const refreshUsageStatus = async () => {
    try {
      const nextUsageStatus = await getUsageStatus(session);
      setUsageStatus(nextUsageStatus);
      setAnalysisMode((current) => normalizeModeForPlan(current, nextUsageStatus.plan));
    } catch (requestError) {
      console.error("Failed to refresh usage status", requestError);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return;
    }
    if (isUsageExceeded) {
      setError(buildLimitMessage("daily_limit_exceeded", usageStatus) ?? "遺꾩꽍 媛???잛닔瑜?紐⑤몢 ?ъ슜?덉뒿?덈떎.");
      setIsPricingOpen(true);
      return;
    }

    const requestKey = fileKey(selectedFile, safeAnalysisMode);
    if (isLoading && inFlightKeyRef.current === requestKey) {
      setError("?대? 媛숈? ?대?吏 遺꾩꽍??吏꾪뻾 以묒엯?덈떎.");
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    inFlightKeyRef.current = requestKey;

    setIsLoading(true);
    setError(null);
    startLoadingSteps();

    try {
      const result = await analyzeChartImage(selectedFile, safeAnalysisMode, abortController.signal, session);
      setAnalysisResult(result);
      if (result.usageStatus) {
        setUsageStatus(result.usageStatus);
        setAnalysisMode((current) => normalizeModeForPlan(current, result.usageStatus!.plan));
      } else {
        await refreshUsageStatus();
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.usageStatus) {
          setUsageStatus(requestError.usageStatus);
          setAnalysisMode((current) => normalizeModeForPlan(current, requestError.usageStatus!.plan));
        }
        const limitMessage = buildLimitMessage(requestError.code || requestError.message, requestError.usageStatus ?? usageStatus);
        setError(limitMessage || requestError.message);
        if (requestError.status === 429 || requestError.status === 403) {
          setIsPricingOpen(true);
        }
      } else {
        setError(requestError instanceof Error ? requestError.message : "AI 遺꾩꽍 ?붿껌 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
      }
    } finally {
      stopLoadingSteps();
      setIsLoading(false);
      inFlightKeyRef.current = null;
      abortControllerRef.current = null;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase text-blue-600">Chart Vision AI</p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">AI 二쇱떇 李⑦듃 ?대?吏 遺꾩꽍</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                李⑦듃 ?대?吏瑜??낅줈?쒗븯硫?AI媛 湲곗닠??遺꾩꽍???섑뻾?섏뿬 ?꾩옱 ?쒖옣 ?곹깭, 二쇱슂 媛寃⑸?, ?⑦꽩 ?꾨낫,
                吏꾩엯쨌?먯젅쨌紐⑺몴 援ш컙??吏곴??곸쑝濡??쒓났?⑸땲??
              </p>
            </div>
            <AuthStatus showLoginHint={showLoginHint} onDismissHint={dismissLoginHint} />
          </div>
        </header>

        <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900 shadow-soft">
          <p className="font-semibold text-blue-950">湲곗닠??吏??李멸퀬 ?덈궡</p>
          <p className="mt-2">
            遺꾩꽍 寃곌낵??湲곗닠??吏??湲곕컲 李멸퀬 ?뺣낫?낅땲?? RSI, MACD, 蹂쇰┛?諛대뱶, ?대룞?됯퇏?? 嫄곕옒?됱쓣 李멸퀬?섎ŉ,
            ?대떦 蹂댁“吏?쒕? 李⑦듃??耳쒕몢硫?AI媛 ?대?吏?먯꽌 ?몄떇?????덉뒿?덈떎.
          </p>
        </section>

        <UsageStatusCard
          usageStatus={usageStatus}
          loading={usageLoading}
          error={usageError}
          onOpenPricing={() => setIsPricingOpen(true)}
        />

        <ImageUploader file={selectedFile} disabled={isLoading} onFileSelect={handleFileSelect} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI 遺꾩꽍 ?붿껌</h2>
              <p className="mt-1 text-sm text-slate-500">
                ?좏깮???붽툑?쒖뿉 ?곕씪 ?ъ슜?????덈뒗 遺꾩꽍 紐⑤뱶媛 ?쒗븳?⑸땲?? 理쒖쥌 ?쒗븳? ?쒕쾭?먯꽌 ?ㅼ떆 寃利앺빀?덈떎.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-semibold text-slate-900">遺꾩꽍 紐⑤뱶</span>
                <select
                  value={safeAnalysisMode}
                  disabled={isLoading}
                  onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-44"
                >
                  {analysisModeOptions
                    .filter((option) => allowedModes.includes(option.value))
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!selectedFile || isLoading || isUsageExceeded || usageLoading}
                onClick={handleAnalyze}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "遺꾩꽍 以?.." : "AI 遺꾩꽍 ?쒖옉"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {analysisModeOptions.find((option) => option.value === safeAnalysisMode)?.description}
          </p>
          {isUsageExceeded ? (
            <button
              type="button"
              onClick={() => setIsPricingOpen(true)}
              className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              ?붽툑???뺤씤?섍린
            </button>
          ) : null}
        </section>

        {isLoading ? <LoadingAnalysisCard stepIndex={loadingStepIndex} /> : null}

        {!analysisResult && !isLoading && !error ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
            濡쒓렇?명븯吏 ?딆븘??鍮꾨줈洹몄씤 臾대즺 泥댄뿕?쇰줈 李⑦듃 遺꾩꽍???쒖옉?????덉뒿?덈떎. 濡쒓렇?명븯硫?臾대즺 ?ъ슜?됯낵
            遺꾩꽍 湲곕줉 ???湲곕뒫??怨꾩젙 湲곗??쇰줈 ?쒓났?⑸땲??
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </section>
        ) : null}

        {analysisResult?.cacheHit ? (
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            ?댁쟾 遺꾩꽍 寃곌낵瑜?遺덈윭?붿뒿?덈떎.
          </div>
        ) : null}

        {analysisResult?.appliedAnalysisMode && analysisResult.appliedAnalysisMode !== analysisMode ? (
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            ?꾩옱 ?붽툑?쒖뿉 留욎떠 {analysisResult.appliedAnalysisMode} 紐⑤뱶濡?遺꾩꽍?덉뒿?덈떎.
          </div>
        ) : null}

        {analysisResult ? (
          <div className={isLoading ? "relative opacity-40" : ""}>
            <AnalysisResult result={analysisResult} />
          </div>
        ) : null}
      </div>

      <PricingModal
        open={isPricingOpen}
        currentPlan={currentPlan}
        isLoggedIn={Boolean(session?.user)}
        onClose={() => setIsPricingOpen(false)}
        onLogin={() => router.push("/login")}
      />
    </main>
  );
}
