"use client";

type PricingModalProps = {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
};

const plans = [
  {
    name: "Free",
    price: "0원",
    badge: "로그인 무료",
    features: ["일 2회 / 월 10회", "fast 분석", "분석 기록 저장", "피드백 제출"],
    button: "로그인하기",
    variant: "login",
  },
  {
    name: "Plus",
    price: "5,900원 / 월",
    badge: "준비 중",
    features: ["일 20회 / 월 100회", "standard 분석", "고급 패턴 분석", "광고 제거", "리포트 저장"],
    button: "Plus 준비 중",
    variant: "paid",
  },
  {
    name: "Pro",
    price: "12,900원 / 월",
    badge: "준비 중",
    features: ["일 50회 / 월 300회", "precision 분석", "히스토리 비교", "뉴스 기반 리서치 예정", "실시간 정보 분석 예정"],
    button: "Pro 준비 중",
    variant: "paid",
  },
];

export default function PricingModal({ open, onClose, onLogin }: PricingModalProps) {
  if (!open) {
    return null;
  }

  const handlePlanClick = (variant: string) => {
    if (variant === "login") {
      onLogin();
      return;
    }
    window.alert("결제 기능은 준비 중입니다. 현재는 무료 플랜으로 이용할 수 있습니다.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-600">Pricing</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">요금제 선택</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              결제 연동은 아직 준비 중입니다. 현재는 무료 체험과 로그인 무료 플랜을 사용할 수 있습니다.
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-lg border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-950">{plan.name}</h3>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {plan.badge}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handlePlanClick(plan.variant)}
                className="mt-5 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {plan.button}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
