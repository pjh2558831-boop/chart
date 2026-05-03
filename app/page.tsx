"use client";

import { useState } from "react";

import AnalysisResult from "../components/AnalysisResult";
import ImageUploader from "../components/ImageUploader";
import { analyzeChartImage } from "../lib/api";
import type { AnalysisResponse } from "../types/analysis";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setAnalysisResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeChartImage(selectedFile);
      setAnalysisResult(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "AI 분석 요청 중 예상하지 못한 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase text-blue-600">Chart Vision MVP</p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                AI 주식 차트 이미지 분석
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                차트 이미지를 업로드하면 AI가 이미지에서 보이는 구조를 분석하고, 가능한 경우
                실제 OHLCV 데이터로 기술적 후보 구간을 계산합니다.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900 shadow-soft">
          <p className="font-semibold text-blue-950">기술적 지표 참고 안내</p>
          <p className="mt-2">
            분석 결과는 기술적 지표 기반 참고 정보입니다. RSI, MACD, 볼린저밴드,
            이동평균선, 거래량을 참고하며, 해당 보조지표를 차트에 켜두면 AI가
            이미지에서 인식할 수 있습니다.
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

        <ImageUploader file={selectedFile} disabled={isLoading} onFileSelect={handleFileSelect} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI 분석 요청</h2>
              <p className="mt-1 text-sm text-slate-500">
                이미지만 전송합니다. 이미지에 보이는 보조지표와 가격축을 바탕으로
                기술적 신호와 후보 구간을 계산합니다.
              </p>
            </div>
            <button
              type="button"
              disabled={!selectedFile || isLoading}
              onClick={handleAnalyze}
              className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "AI 분석 중..." : "AI 분석 시작"}
            </button>
          </div>
        </section>

        {!analysisResult && !isLoading && !error ? (
          <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
            차트 이미지를 업로드하면 AI가 이미지에서 보이는 구조를 분석하고, 가능한 경우
            실제 OHLCV 데이터로 기술적 후보 구간을 계산합니다.
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-blue-100 bg-white px-5 py-4 shadow-soft">
            <p className="text-sm font-medium text-slate-900">
              이미지를 최적화하고 AI 분석 및 데이터 검증을 진행하고 있습니다.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              완료되면 아래에 기술적 신호와 후보 가격대가 표시됩니다.
            </p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </section>
        ) : null}

        {analysisResult ? <AnalysisResult result={analysisResult} /> : null}
      </div>
    </main>
  );
}
