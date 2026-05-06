"use client";

import { useEffect, useRef, useState } from "react";

import AnalysisResult from "../components/AnalysisResult";
import AuthStatus from "../components/AuthStatus";
import ImageUploader from "../components/ImageUploader";
import ProtectedRoute from "../components/ProtectedRoute";
import { analyzeChartImage, getUsageStatus, type AnalysisMode } from "../lib/api";
import type { AnalysisResponse } from "../types/analysis";
import type { UsageStatus } from "../types/billing";

const loadingSteps = [
  "이미지 최적화 중",
  "차트 구조 분석 중",
  "보조지표 인식 중",
  "가격 전략 후보 계산 중",
  "리포트 생성 중",
];

const analysisModeOptions: Array<{ value: AnalysisMode; label: string; description: string }> = [
  { value: "fast", label: "빠른 분석", description: "전체 이미지와 가격축 중심으로 빠르게 확인합니다." },
  { value: "standard", label: "기본 분석", description: "속도와 리포트 품질의 균형을 맞춘 기본값입니다." },
  { value: "precision", label: "정밀 분석", description: "보조지표와 중앙 차트 영역까지 더 자세히 확인합니다." },
];

function UsageCard({ usageStatus }: { usageStatus: UsageStatus | null }) {
  if (!usageStatus) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-slate-500">사용량 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">현재 플랜</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{usageStatus.plan}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">오늘 남은 분석 횟수</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {usageStatus.dailyRemaining} / {usageStatus.dailyLimit}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">이번 달 남은 분석 횟수</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {usageStatus.monthlyRemaining} / {usageStatus.monthlyLimit}
          </p>
        </div>
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

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("standard");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUsageStatus = async () => {
      try {
        const nextUsageStatus = await getUsageStatus();
        if (!cancelled) {
          setUsageStatus(nextUsageStatus);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "사용량 정보를 불러오는 중 오류가 발생했습니다.",
          );
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
  }, []);

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
    if (!selectedFile) {
      return;
    }

    const requestKey = fileKey(selectedFile, analysisMode);
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
      const result = await analyzeChartImage(selectedFile, analysisMode, abortController.signal);
      setAnalysisResult(result);
      if (result.usageStatus) {
        setUsageStatus(result.usageStatus);
      }
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("분석 요청이 취소되었습니다.");
      } else {
        const message =
          requestError instanceof Error ? requestError.message : "AI 분석 요청 중 오류가 발생했습니다.";

        if (message.includes("사용량 제한 초과")) {
          setError("사용량 제한 초과");
        } else if (message.includes("현재 요금제")) {
          setError("현재 요금제에서 사용할 수 없는 기능입니다.");
        } else {
          setError(message);
        }
      }
    } finally {
      stopLoadingSteps();
      setIsLoading(false);
      inFlightKeyRef.current = null;
      abortControllerRef.current = null;
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase text-blue-600">Chart Vision AI</p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                AI 주식 차트 이미지 분석
              </h1>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {["RSI", "MACD", "볼린저밴드", "이동평균선", "거래량"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        {isUsageLoading ? null : <UsageCard usageStatus={usageStatus} />}

        <ImageUploader file={selectedFile} disabled={isLoading} onFileSelect={handleFileSelect} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI 분석 요청</h2>
              <p className="mt-1 text-sm text-slate-500">
                기본 분석은 속도와 품질의 균형을 맞춘 모드입니다. 복잡한 보조지표가 많은 차트는 정밀 분석을 사용할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm text-slate-700">
                <span className="mb-2 block font-semibold text-slate-900">분석 모드</span>
                <select
                  value={analysisMode}
                  disabled={isLoading}
                  onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-44"
                >
                  {analysisModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!selectedFile || isLoading}
                onClick={handleAnalyze}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "분석 중..." : "AI 분석 시작"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {analysisModeOptions.find((option) => option.value === analysisMode)?.description}
          </p>
        </section>

        {isLoading ? <LoadingAnalysisCard stepIndex={loadingStepIndex} /> : null}

        {!analysisResult && !isLoading && !error ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
            차트 이미지를 업로드하면 AI가 이미지에서 보이는 차트 구조를 분석합니다. 종목 정보가 이미지에서 충분히
            확인되면 실제 가격 데이터 기반 검증도 함께 시도합니다.
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

        {analysisResult ? (
          <div className={isLoading ? "relative opacity-40" : ""}>
            {isLoading ? (
              <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                새 분석 진행 중
              </div>
            ) : null}
            <AnalysisResult result={analysisResult} />
          </div>
        ) : null}
      </div>
      </main>
    </ProtectedRoute>
  );
}
