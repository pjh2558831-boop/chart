"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AnalysisResult from "../components/AnalysisResult";
import AuthStatus from "../components/AuthStatus";
import ImageUploader from "../components/ImageUploader";
import PricingModal from "../components/PricingModal";
import { useAuth } from "../context/AuthContext";
import { analyzeChartImage, getUsageStatus, type AnalysisMode } from "../lib/api";
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
  { value: "fast", label: "빠른 분석", description: "전체 이미지와 가격축 중심으로 빠르게 확인합니다." },
  { value: "standard", label: "기본 분석", description: "속도와 리포트 품질의 균형을 맞춘 기본 모드입니다." },
  { value: "precision", label: "정밀 분석", description: "보조지표와 중앙 차트 영역까지 더 자세히 확인합니다." },
];

const allowedModesByPlan: Record<UserPlan, AnalysisMode[]> = {
  guest: ["fast"],
  free: ["fast"],
  plus: ["fast", "standard"],
  pro: ["fast", "standard", "precision"],
};

const planLabels: Record<UserPlan, string> = {
  guest: "비로그인 무료 체험",
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

function UsageCard({
  usageStatus,
  onOpenPricing,
}: {
  usageStatus: UsageStatus | null;
  onOpenPricing: () => void;
}) {
  if (!usageStatus) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-slate-500">사용량 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  const isGuest = usageStatus.plan === "guest";
  const helperText = isGuest
    ? "로그인하면 하루 2회, 월 10회까지 사용할 수 있습니다."
    : usageStatus.plan === "free"
      ? "Plus로 업그레이드하면 하루 20회, 월 100회까지 사용할 수 있습니다."
      : "현재 요금제 기준으로 분석 제한이 적용됩니다.";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 플랜</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{planLabels[usageStatus.plan]}</p>
          <p className="mt-1 text-sm text-slate-500">{helperText}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">오늘 남은 분석</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {usageStatus.dailyRemaining} / {usageStatus.dailyLimit}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">이번 달 남은 분석</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {usageStatus.monthlyRemaining} / {usageStatus.monthlyLimit}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 분석 모드</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{usageStatus.analysisMode}</p>
        </div>
        <button
          type="button"
          onClick={onOpenPricing}
          className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          요금제 보기
        </button>
      </div>
    </section>
  );
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

function fileKey(file: File, analysisMode: AnalysisMode) {
  return `${file.name}:${file.size}:${file.lastModified}:${analysisMode}`;
}

function normalizeModeForPlan(mode: AnalysisMode, plan: UserPlan): AnalysisMode {
  const allowedModes = allowedModesByPlan[plan] ?? ["fast"];
  return allowedModes.includes(mode) ? mode : allowedModes[allowedModes.length - 1];
}

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("standard");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  const currentPlan = usageStatus?.plan ?? "guest";
  const allowedModes = useMemo(() => allowedModesByPlan[currentPlan] ?? ["fast"], [currentPlan]);
  const isUsageExceeded = Boolean(
    usageStatus && (usageStatus.dailyRemaining <= 0 || usageStatus.monthlyRemaining <= 0),
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    const loadUsageStatus = async () => {
      setIsUsageLoading(true);
      try {
        const nextUsageStatus = await getUsageStatus(session);
        if (!cancelled) {
          setUsageStatus(nextUsageStatus);
          setAnalysisMode((current) => normalizeModeForPlan(current, nextUsageStatus.plan));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "사용량 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsUsageLoading(false);
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

  const handleAnalyze = async () => {
    if (!selectedFile || isUsageExceeded) {
      if (isUsageExceeded) {
        setError(
          currentPlan === "guest"
            ? "오늘 무료 체험 횟수를 모두 사용했습니다. 로그인하면 더 많이 분석할 수 있습니다."
            : "현재 요금제의 분석 횟수를 모두 사용했습니다.",
        );
      }
      return;
    }

    const safeMode = normalizeModeForPlan(analysisMode, currentPlan);
    const requestKey = fileKey(selectedFile, safeMode);
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
      const result = await analyzeChartImage(selectedFile, safeMode, abortController.signal, session);
      setAnalysisResult(result);
      if (result.usageStatus) {
        setUsageStatus(result.usageStatus);
        setAnalysisMode((current) => normalizeModeForPlan(current, result.usageStatus!.plan));
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "AI 분석 요청 중 오류가 발생했습니다.";
      if (message === "daily_limit_exceeded") {
        setError(
          currentPlan === "guest"
            ? "오늘 무료 체험 횟수를 모두 사용했습니다. 로그인하면 더 많이 분석할 수 있습니다."
            : "오늘 Free 분석 횟수를 모두 사용했습니다. Plus 업그레이드 시 하루 20회까지 사용할 수 있습니다.",
        );
        setIsPricingOpen(true);
      } else if (message === "monthly_limit_exceeded") {
        setError("이번 달 분석 횟수를 모두 사용했습니다.");
        setIsPricingOpen(true);
      } else {
        setError(message);
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
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">AI 주식 차트 이미지 분석</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                차트 이미지를 업로드하면 AI가 기술적 분석을 수행하여 현재 시장 상태, 주요 가격대,
                패턴 후보, 진입·손절·목표 구간을 직관적으로 제공합니다.
              </p>
            </div>
            <AuthStatus />
          </div>
        </header>

        <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900 shadow-soft">
          <p className="font-semibold text-blue-950">기술적 지표 참고 안내</p>
          <p className="mt-2">
            분석 결과는 기술적 지표 기반 참고 정보입니다. RSI, MACD, 볼린저밴드, 이동평균선,
            거래량을 참고하며, 해당 보조지표를 차트에 켜두면 AI가 이미지에서 인식할 수 있습니다.
          </p>
        </section>

        {isUsageLoading ? null : (
          <UsageCard usageStatus={usageStatus} onOpenPricing={() => setIsPricingOpen(true)} />
        )}

        <ImageUploader file={selectedFile} disabled={isLoading} onFileSelect={handleFileSelect} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI 분석 요청</h2>
              <p className="mt-1 text-sm text-slate-500">
                선택한 요금제에 따라 사용할 수 있는 분석 모드가 제한됩니다. 최종 제한은 서버에서 다시 검증합니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-semibold text-slate-900">분석 모드</span>
                <select
                  value={normalizeModeForPlan(analysisMode, currentPlan)}
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
                disabled={!selectedFile || isLoading || isUsageExceeded}
                onClick={handleAnalyze}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "분석 중..." : "AI 분석 시작"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {analysisModeOptions.find((option) => option.value === normalizeModeForPlan(analysisMode, currentPlan))
              ?.description}
          </p>
          {isUsageExceeded ? (
            <button
              type="button"
              onClick={() => setIsPricingOpen(true)}
              className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              요금제 확인하기
            </button>
          ) : null}
        </section>

        {isLoading ? <LoadingAnalysisCard stepIndex={loadingStepIndex} /> : null}

        {!analysisResult && !isLoading && !error ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
            로그인하지 않아도 비로그인 무료 체험으로 차트 분석을 시작할 수 있습니다. 로그인하면 무료 사용량과
            분석 기록 저장 기능이 계정 기준으로 제공됩니다.
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </section>
        ) : null}

        {analysisResult?.cacheHit ? (
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            이전 분석 결과를 불러왔습니다.
          </div>
        ) : null}

        {analysisResult?.appliedAnalysisMode && analysisResult.appliedAnalysisMode !== analysisMode ? (
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            현재 요금제에 맞춰 {analysisResult.appliedAnalysisMode} 모드로 분석했습니다.
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
        onClose={() => setIsPricingOpen(false)}
        onLogin={() => router.push("/login")}
      />
    </main>
  );
}
