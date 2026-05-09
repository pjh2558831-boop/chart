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
    description: "속도와 리포트 품질의 균형을 맞춘 기본 분석 모드입니다.",
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

const modeLabelByValue: Record<AnalysisMode, string> = {
  fast: "빠른 분석",
  standard: "기본 분석",
  precision: "정밀 분석",
};

function createGuestFallbackUsageStatus(): UsageStatus {
  const guestId = typeof window === "undefined" ? "server-guest" : getOrCreateGuestId();
  return {
    identityType: "guest",
    id: guestId,
    userId: null,
    guestId,
    plan: "guest",
    planLabel: "비로그인 무료 체험",
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
  if (!code) return null;
  const normalizedCode = code.toLowerCase();
  const isLimitCode =
    code === "LIMIT_REACHED" ||
    normalizedCode.includes("limit") ||
    normalizedCode.includes("daily_limit_exceeded") ||
    normalizedCode.includes("monthly_limit_exceeded");
  if (!isLimitCode) return null;

  const plan = usageStatus?.plan ?? "guest";
  const isMonthly = normalizedCode.includes("monthly");

  if (plan === "guest") {
    return isMonthly
      ? "이번 달 비로그인 무료 분석 횟수를 모두 사용했습니다. 로그인하면 월 10회까지 무료로 분석할 수 있습니다."
      : "오늘 무료 분석 횟수를 모두 사용했습니다. 로그인하면 하루 3회, 월 10회까지 무료로 분석할 수 있습니다.";
  }
  if (plan === "free") {
    return isMonthly
      ? "이번 달 Free 분석 횟수를 모두 사용했습니다. Plus 플랜은 월 100회 분석을 제공할 예정입니다."
      : "오늘 Free 분석 횟수를 모두 사용했습니다. Plus 플랜은 일 20회, 월 100회 분석을 제공할 예정입니다.";
  }
  if (plan === "plus") {
    return isMonthly
      ? "이번 달 Plus 분석 횟수를 모두 사용했습니다. Pro 플랜은 월 300회 분석을 제공할 예정입니다."
      : "오늘 Plus 분석 횟수를 모두 사용했습니다. Pro 플랜은 일 50회, 월 300회 분석을 제공할 예정입니다.";
  }
  return isMonthly
    ? "이번 달 Pro 분석 횟수를 모두 사용했습니다."
    : "오늘 Pro 분석 횟수를 모두 사용했습니다.";
}

function LoadingAnalysisCard({ stepIndex }: { stepIndex: number }) {
  return (
    <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-soft">
      <div className="flex gap-4">
        <div className="mt-1 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-950">차트 이미지를 분석 중입니다.</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            이미지 구조, 보조지표, 지지·저항 후보, 기술적 신호를 순서대로 확인하고 있습니다.
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
      getOrCreateGuestId();
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

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
              : "사용량 정보를 불러오지 못해 임시 정보를 표시합니다.",
          );
          setAnalysisMode((current) => normalizeModeForPlan(current, fallback.plan));
        }
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    };

    void loadUsageStatus();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const dismissLoginHint = () => {
    setLoginHintDismissed(true);
  };

  const startLoadingSteps = () => {
    setLoadingStepIndex(0);
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
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
    if (!selectedFile) return;
    if (isUsageExceeded) {
      setError(buildLimitMessage("LIMIT_REACHED", usageStatus) ?? "분석 가능한 횟수를 모두 사용했습니다.");
      setIsPricingOpen(true);
      return;
    }

    const requestKey = fileKey(selectedFile, safeAnalysisMode);
    if (isLoading && inFlightKeyRef.current === requestKey) {
      setError("이미 같은 이미지 분석이 진행 중입니다.");
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
        if (requestError.status === 429 || requestError.status === 403) setIsPricingOpen(true);
      } else {
        setError(requestError instanceof Error ? requestError.message : "AI 분석 요청 중 오류가 발생했습니다.");
      }
    } finally {
      stopLoadingSteps();
      setIsLoading(false);
      inFlightKeyRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const isLimitError = Boolean(error && (error.includes("분석 횟수") || error.includes("무료 분석")));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase text-blue-600">CHART VISION AI</p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">AI 주식 차트 분석, 이제 더 쉽게</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                차트 이미지를 업로드하면 AI가 추세, 지지선, 저항선, 패턴 후보와 매매 참고 구간을 빠르게 분석합니다.
              </p>
            </div>
            <AuthStatus showLoginHint={showLoginHint} onDismissHint={dismissLoginHint} />
          </div>
        </header>

        <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900 shadow-soft">
          <p className="font-semibold text-blue-950">이미지만 올리면 끝나는 차트 분석</p>
          <p className="mt-2">
            복잡한 설정 없이 차트 이미지만 업로드하세요. RSI, MACD, 이동평균선, 거래량, 지지선과 저항선을 종합해 현재 차트 흐름을 분석합니다.
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
              <h2 className="text-base font-semibold text-slate-900">AI 차트 분석</h2>
              <p className="mt-1 text-sm text-slate-500">
                업로드한 차트 이미지를 기반으로 추세, 지지선, 저항선, 패턴 후보와 매매 참고 구간을 분석합니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-semibold text-slate-900">분석 모드</span>
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
                disabled={!selectedFile || isLoading || usageLoading}
                onClick={handleAnalyze}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "분석 중..." : "AI 차트 분석 시작"}
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
              사용량 안내 보기
            </button>
          ) : null}
        </section>

        {isLoading ? <LoadingAnalysisCard stepIndex={loadingStepIndex} /> : null}

        {!analysisResult && !isLoading && !error ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
            로그인하지 않아도 비로그인 무료 체험으로 차트 분석을 시작할 수 있습니다. 로그인하면 하루 3회, 월 10회까지 무료로 사용할 수 있습니다.
          </section>
        ) : null}

        {error ? (
          <section
            className={
              isLimitError
                ? "rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800"
                : "rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
            }
          >
            <p>{error}</p>
            {usageStatus?.plan === "guest" && isLimitError ? (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-3 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Google로 로그인하고 추가 분석 받기
              </button>
            ) : null}
            {usageStatus?.plan === "free" && isLimitError ? (
              <button
                type="button"
                disabled
                className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400"
              >
                Plus 준비 중
              </button>
            ) : null}
          </section>
        ) : null}

        {analysisResult?.cacheHit ? (
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            이전 분석 결과를 불러왔습니다.
          </div>
        ) : null}

        {analysisResult?.appliedAnalysisMode && analysisResult.appliedAnalysisMode !== analysisMode ? (
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            현재 플랜에 맞춰 {modeLabelByValue[analysisResult.appliedAnalysisMode as AnalysisMode] ?? analysisResult.appliedAnalysisMode} 모드로 분석했습니다.
          </div>
        ) : null}

        {analysisResult ? (
          <div className={isLoading ? "relative opacity-40" : ""}>
            <AnalysisResult result={analysisResult} />
          </div>
        ) : null}

        <p className="text-xs leading-6 text-slate-500">
          투자 판단은 본인의 책임입니다. 본 서비스는 차트 기반 기술적 분석 참고 자료를 제공하며, 매수·매도 추천이나 수익 보장을 의미하지 않습니다.
        </p>
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
