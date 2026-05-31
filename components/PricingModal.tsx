"use client";

import type { UserPlan } from "../types/billing";

type PricingModalProps = {
  open: boolean;
  currentPlan?: UserPlan;
  isLoggedIn?: boolean;
  onClose: () => void;
  onLogin: () => void;
};

const plans: Array<{
  id: Exclude<UserPlan, "guest">;
  name: string;
  price: string;
  description: string;
  features: string[];
  button: string;
  highlighted?: boolean;
  disabled?: boolean;
}> = [
  {
    id: "free",
    name: "Free",
    price: "0원 / 월",
    description: "로그인하면 무료 분석 횟수가 늘어납니다.",
    features: [
      "비로그인: 일 1회 / 월 3회",
      "로그인: 일 3회 / 월 10회",
      "기본 차트 분석",
      "분석 기록 저장",
    ],
    button: "로그인하고 무료로 시작",
  },
  {
    id: "plus",
    name: "Plus",
    price: "4,900원 / 월",
    description: "일반 투자자를 위한 실사용 분석 플랜입니다.",
    features: [
      "GPT-4.1 Mini 기반 분석",
      "일 20회 / 월 100회",
      "분석 기록 저장",
      "광고 제거",
      "뉴스 기반 리서치 10회 제공 예정",
    ],
    button: "준비 중",
    highlighted: true,
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "12,900원 / 월",
    description: "더 깊은 분석이 필요한 사용자를 위한 플랜입니다.",
    features: [
      "GPT-5.4 Mini 기반 분석",
      "일 50회 / 월 300회",
      "고급 패턴 분석",
      "분석 기록 저장",
      "뉴스 기반 리서치 30회 제공 예정",
      "심층 리서치 10회 제공 예정",
    ],
    button: "준비 중",
    disabled: true,
  },
];

export default function PricingModal({
  open,
  currentPlan = "guest",
  isLoggedIn = false,
  onClose,
  onLogin,
}: PricingModalProps) {
  if (!open) return null;

  const handlePlanClick = (planId: UserPlan) => {
    if (planId === "free" && !isLoggedIn) {
      onLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Pricing</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">요금제 안내</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              결제 기능은 아직 준비 중입니다. 현재는 비로그인 무료 체험과 로그인 Free 플랜을 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const disabled = plan.disabled || isCurrent;
            return (
              <article
                key={plan.id}
                className={[
                  "flex min-h-[500px] flex-col rounded-2xl border p-7",
                  plan.highlighted ? "border-blue-200 bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-bold text-slate-950">{plan.name}</h3>
                  {isCurrent ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      현재 플랜
                    </span>
                  ) : plan.disabled ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                      제공 예정
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 text-4xl font-bold text-slate-950">{plan.price}</p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p>

                <button
                  type="button"
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={disabled}
                  className={[
                    "mt-6 w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed",
                    disabled
                      ? "border border-slate-200 bg-white text-slate-400"
                      : plan.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-950 text-white hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isCurrent ? "현재 플랜" : plan.button}
                </button>

                <ul className="mt-8 flex-1 space-y-4 text-sm leading-6 text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
