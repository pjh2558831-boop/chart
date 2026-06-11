"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import AnalysisResult from "../components/AnalysisResult";
import AuthStatus from "../components/AuthStatus";
import ImageUploader from "../components/ImageUploader";
import PricingModal from "../components/PricingModal";
import UsageStatusCard from "../components/UsageStatusCard";
import { useAuth } from "../context/AuthContext";
import { analyzeChartImage, ApiError, getUsageStatus, type AnalysisMode } from "../lib/api";
import { getGuestFallbackUsageStatus, recordGuestFallbackAnalysisSuccess } from "../lib/guestUsageFallback";
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

const analysisProcessCards = [
  {
    title: "차트 업로드",
    body: "분석할 주식 차트 이미지를 업로드합니다.",
  },
  {
    title: "AI 기술적 분석",
    body: "AI가 추세, 거래량, 지지선, 저항선, RSI, MACD 등 확인 가능한 요소를 종합적으로 해석합니다.",
  },
  {
    title: "리포트 확인",
    body: "진입 후보, 핵심 가격대, 리스크 요인을 투자 참고용 리포트로 확인합니다.",
  },
];

const indicatorExplanationCards = [
  {
    title: "RSI",
    body: "RSI는 가격이 단기간에 과하게 올랐는지, 또는 과하게 내려갔는지를 확인하는 모멘텀 지표입니다. 다만 RSI 하나만으로 매수·매도를 판단하기보다 추세, 거래량, 지지선과 함께 해석해야 합니다.",
  },
  {
    title: "MACD",
    body: "MACD는 단기 이동평균과 장기 이동평균의 차이를 활용해 추세 전환 가능성을 참고하는 지표입니다. MACD선과 신호선의 교차, 히스토그램 변화는 상승 또는 하락 흐름을 판단하는 보조 단서가 됩니다.",
  },
  {
    title: "이동평균선",
    body: "이동평균선은 일정 기간의 평균 가격을 연결한 선입니다. 가격이 이동평균선 위에 있는지, 아래에 있는지에 따라 추세의 방향과 강도를 참고할 수 있습니다.",
  },
  {
    title: "거래량",
    body: "거래량은 가격 움직임에 참여한 시장의 힘을 보여줍니다. 가격 상승과 함께 거래량이 증가하면 신뢰도가 높아질 수 있고, 거래량이 부족한 움직임은 되돌림 위험을 함께 고려해야 합니다.",
  },
  {
    title: "지지선",
    body: "지지선은 가격이 하락하다가 매수세가 들어올 가능성이 있는 구간입니다. 과거에 여러 번 반등한 가격대일수록 중요한 지지 구간으로 볼 수 있습니다.",
  },
  {
    title: "저항선",
    body: "저항선은 가격이 상승하다가 매도 압력이 강해질 수 있는 구간입니다. 과거에 여러 번 돌파에 실패한 가격대는 중요한 저항 구간이 될 수 있습니다.",
  },
  {
    title: "추세선",
    body: "추세선은 고점과 저점의 흐름을 연결해 가격의 방향성을 확인하는 기준입니다. 상승 추세선이 유지되는지, 추세가 훼손되는지는 리스크 관리에 중요한 참고 요소입니다.",
  },
];

const serviceBenefitCards = [
  {
    title: "복잡한 설정 없이 사용",
    body: "차트 이미지만 업로드하면 분석을 시작할 수 있습니다.",
  },
  {
    title: "핵심 가격대 정리",
    body: "지지선, 저항선, 손절 기준, 목표가 후보처럼 중요한 가격 구간을 한눈에 확인할 수 있습니다.",
  },
  {
    title: "감정적 매매 방지",
    body: "급등 추격이나 불안한 손절을 줄이고 차트 기준의 대응 계획을 세우는 데 도움을 줍니다.",
  },
];

const faqItems = [
  {
    question: "CHART VISION AI는 어떤 서비스인가요?",
    answer: "CHART VISION AI는 사용자가 업로드한 주식 차트 이미지를 AI가 분석해 추세, 지지선, 저항선, 기술지표, 리스크 요인을 정리해주는 차트 분석 보조 서비스입니다.",
  },
  {
    question: "AI 분석 결과는 투자 추천인가요?",
    answer: "아닙니다. CHART VISION AI의 분석 결과는 투자 참고 정보입니다. 특정 종목의 매수·매도 추천이 아니며, 최종 투자 판단과 책임은 사용자 본인에게 있습니다.",
  },
  {
    question: "어떤 차트를 분석할 수 있나요?",
    answer: "국내 주식, 해외 주식, ETF 등 일반적인 캔들 차트 이미지를 분석할 수 있습니다. 다만 이미지가 흐리거나 가격축과 지표가 보이지 않는 경우 분석 정확도가 낮아질 수 있습니다.",
  },
  {
    question: "RSI나 MACD가 없는 차트도 분석되나요?",
    answer: "가능합니다. RSI나 MACD가 보이지 않는 경우에는 가격 흐름, 캔들 구조, 지지선, 저항선, 추세를 중심으로 분석합니다. 보조지표가 함께 보이면 더 풍부한 해석이 가능합니다.",
  },
  {
    question: "분석 결과가 항상 맞나요?",
    answer: "아닙니다. 기술적 분석은 확률적 판단 도구이며 미래 가격을 보장하지 않습니다. 시장 뉴스, 실적, 금리, 수급, 거래량 변화에 따라 결과는 달라질 수 있습니다.",
  },
  {
    question: "초보 투자자도 사용할 수 있나요?",
    answer: "네. 복잡한 차트 용어를 몰라도 핵심 가격대와 리스크 요인을 쉽게 확인할 수 있도록 구성되어 있습니다. 동시에 기술적 분석을 공부하는 보조 자료로도 활용할 수 있습니다.",
  },
  {
    question: "회원가입 없이 사용할 수 있나요?",
    answer: "일부 무료 체험은 로그인 없이 사용할 수 있습니다. 분석 기록 저장이나 확장 기능은 로그인 후 제공될 수 있으며, 실제 사용 가능 범위는 현재 서비스 정책을 기준으로 적용됩니다.",
  },
  {
    question: "업로드한 이미지는 어떻게 사용되나요?",
    answer: "업로드한 이미지는 차트 분석을 위해 사용됩니다. 개인정보와 데이터 보관 방식은 서비스의 개인정보 처리 기준에 따라 안내되어야 하며, 민감한 개인정보가 포함된 이미지는 업로드하지 않는 것이 좋습니다.",
  },
  {
    question: "왜 지지선과 저항선이 중요한가요?",
    answer: "지지선은 가격이 반등할 가능성이 있는 구간이고, 저항선은 가격 상승이 막힐 가능성이 있는 구간입니다. 두 가격대는 진입, 손절, 목표가를 계획하는 중요한 기준이 됩니다.",
  },
  {
    question: "AI 차트 분석만 보고 매매해도 되나요?",
    answer: "권장하지 않습니다. AI 분석은 참고 자료입니다. 실제 투자는 기업 실적, 시장 상황, 뉴스, 거래량, 본인의 투자 성향과 리스크 관리 기준을 함께 고려해야 합니다.",
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

function HomepageContentSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function HomepageExpandableSection({
  title,
  description,
  openLabel,
  closeLabel,
  children,
}: {
  title: string;
  description: string;
  openLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <summary className="list-none">
        <div className="flex cursor-pointer flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition group-open:hidden">
            {openLabel}
          </span>
          <span className="hidden shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition group-open:inline-flex">
            {closeLabel}
          </span>
        </div>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function HomepageInfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="h-full rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function HomepagePublisherContent() {
  return (
    <div className="space-y-6">
      <HomepageContentSection
        title="CHART VISION AI 분석 흐름"
        description="차트 이미지를 업로드하면 AI가 확인 가능한 기술적 요소를 정리하고, 투자 참고용 리포트로 요약합니다."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {analysisProcessCards.map((card) => (
            <HomepageInfoCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </HomepageContentSection>

      <HomepageExpandableSection
        title="AI가 참고하는 주요 기술지표"
        description="RSI, MACD, 이동평균선, 거래량, 지지선, 저항선 등 차트 해석에 사용하는 주요 기준을 확인할 수 있습니다."
        openLabel="기술지표 설명 보기"
        closeLabel="기술지표 설명 접기"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {indicatorExplanationCards.map((card) => (
            <HomepageInfoCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </HomepageExpandableSection>

      <HomepageContentSection title="왜 CHART VISION AI를 사용하나요?">
        <div className="grid gap-4 md:grid-cols-3">
          {serviceBenefitCards.map((card) => (
            <HomepageInfoCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </HomepageContentSection>

      <HomepageExpandableSection
        title="자주 묻는 질문"
        description="AI 분석 결과, 지원 차트, 투자 책임, 이미지 처리 방식 등 자주 묻는 내용을 확인할 수 있습니다."
        openLabel="FAQ 전체 보기"
        closeLabel="FAQ 접기"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-950">{item.question}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </HomepageExpandableSection>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft sm:p-6">
        <h2 className="text-xl font-bold text-amber-950">투자 유의사항</h2>
        <p className="mt-3">
          CHART VISION AI는 투자 참고 정보 제공 서비스입니다. 본 서비스에서 제공하는 분석 결과는 특정 종목의 매수, 매도,
          보유를 권유하는 투자 자문이 아닙니다. 기술적 분석과 AI 분석은 미래 수익을 보장하지 않으며, 모든 투자 판단과 그
          결과에 대한 책임은 사용자 본인에게 있습니다.
        </p>
      </section>
    </div>
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
  const [useGuestFallbackUsage, setUseGuestFallbackUsage] = useState(false);
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
          setUseGuestFallbackUsage(false);
          setAnalysisMode((current) => normalizeModeForPlan(current, nextUsageStatus.plan));
        }
      } catch (requestError) {
        console.error("Failed to load usage status", requestError);
        if (!cancelled) {
          if (session?.user) {
            setUsageStatus(null);
            setUseGuestFallbackUsage(false);
            setUsageError("사용량 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
          } else {
            const fallback = getGuestFallbackUsageStatus();
            setUsageStatus(fallback);
            setUseGuestFallbackUsage(true);
            setUsageError(null);
            setAnalysisMode((current) => normalizeModeForPlan(current, fallback.plan));
          }
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
      setUseGuestFallbackUsage(false);
      setAnalysisMode((current) => normalizeModeForPlan(current, nextUsageStatus.plan));
    } catch (requestError) {
      console.error("Failed to refresh usage status", requestError);
      if (!session?.user) {
        setUseGuestFallbackUsage(true);
        setUsageStatus(getGuestFallbackUsageStatus());
        setUsageError(null);
      } else {
        setUsageError("사용량 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
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
      const requestSession = useGuestFallbackUsage ? null : session;
      const result = await analyzeChartImage(
        selectedFile,
        safeAnalysisMode,
        abortController.signal,
        requestSession,
        useGuestFallbackUsage,
      );
      setAnalysisResult(result);
      if (useGuestFallbackUsage) {
        setUsageStatus(recordGuestFallbackAnalysisSuccess());
      } else if (result.usageStatus) {
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
        if (!session?.user && requestError.status === 503 && !useGuestFallbackUsage) {
          const fallbackStatus = getGuestFallbackUsageStatus();
          setUseGuestFallbackUsage(true);
          setUsageStatus(fallbackStatus);
          setUsageError(null);
          if (fallbackStatus.dailyRemaining <= 0 || fallbackStatus.monthlyRemaining <= 0) {
            setError(buildLimitMessage("LIMIT_REACHED", fallbackStatus) ?? "무료 분석 횟수를 모두 사용했습니다.");
            setIsPricingOpen(true);
            return;
          }

          try {
            const fallbackResult = await analyzeChartImage(
              selectedFile,
              safeAnalysisMode,
              abortController.signal,
              null,
              true,
            );
            setAnalysisResult(fallbackResult);
            setUsageStatus(recordGuestFallbackAnalysisSuccess());
            return;
          } catch (fallbackError) {
            if (fallbackError instanceof ApiError) {
              const limitMessage = buildLimitMessage(
                fallbackError.code || fallbackError.message,
                fallbackError.usageStatus ?? fallbackStatus,
              );
              setError(limitMessage || fallbackError.message);
              if (fallbackError.status === 429 || fallbackError.status === 403) setIsPricingOpen(true);
              return;
            }
            setError(fallbackError instanceof Error ? fallbackError.message : "AI 분석 요청 중 오류가 발생했습니다.");
            return;
          }
        }
        if (session?.user && requestError.status === 503) {
          setError("사용량 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
          return;
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
              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                CHART VISION AI - AI 주식 차트 분석
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                CHART VISION AI는 주식 차트 이미지를 업로드하면 AI가 추세, 지지선, 저항선, 패턴 후보, RSI, MACD 등 기술적 분석 요소를 바탕으로 차트 해석을 도와주는 서비스입니다.
              </p>
            </div>
            <AuthStatus showLoginHint={showLoginHint} onDismissHint={dismissLoginHint} />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["AI 차트 이미지 분석", "업로드한 차트 이미지를 기반으로 현재 추세와 주요 가격 구간을 정리합니다."],
            ["지지선과 저항선 분석", "이미지에서 확인되는 지지 후보와 저항 후보를 분리해 대응 기준을 보여줍니다."],
            ["RSI, MACD 기반 기술적 분석", "보조지표가 보이는 경우 RSI, MACD, 이동평균선 등 기술적 분석 요소를 함께 해석합니다."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <h2 className="text-base font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <UsageStatusCard
          usageStatus={usageStatus}
          loading={usageLoading}
          error={usageError}
          fallbackPlan={session?.user ? "free" : "guest"}
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
                  disabled={isLoading || usageLoading || isUsageExceeded}
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
                disabled={!selectedFile || isLoading || usageLoading || isUsageExceeded}
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

        <HomepagePublisherContent />

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
