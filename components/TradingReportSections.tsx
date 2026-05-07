"use client";

import type { FinalAction, TradingReport } from "../types/analysis";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

const actionTone: Record<FinalAction, string> = {
  BUY_CANDIDATE: "border-emerald-500 bg-emerald-50 text-emerald-950",
  WAIT: "border-blue-400 bg-blue-50 text-blue-950",
  HOLD: "border-violet-400 bg-violet-50 text-violet-950",
  TAKE_PROFIT: "border-orange-400 bg-orange-50 text-orange-950",
  SELL_RISK: "border-red-500 bg-red-50 text-red-950",
  NO_TRADE: "border-slate-300 bg-slate-100 text-slate-950",
};

const actionLabel: Record<FinalAction, string> = {
  BUY_CANDIDATE: "매수 후보",
  WAIT: "신규 진입 보류",
  HOLD: "보유 관망",
  TAKE_PROFIT: "일부 익절 고려",
  SELL_RISK: "손절 위험",
  NO_TRADE: "매매 부적합",
};

function confidenceLabel(value?: string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  if (value === "unavailable") return "확인 제한";
  return "낮음";
}

function reliabilityLabel(value?: string | null) {
  if (value === "high") return "높음";
  if (value === "medium") return "보통";
  return "낮음";
}

function signalLabel(value?: string | null) {
  if (value === "bullish") return "상승 우위";
  if (value === "bearish") return "하락 우위";
  return "중립";
}

function BulletList({ items, tone = "slate" }: { items: string[]; tone?: "green" | "red" | "amber" | "slate" }) {
  const color = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    red: "border-rose-100 bg-rose-50 text-rose-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  if (!items.length) {
    return <p className="text-sm text-slate-500">표시할 내용이 없습니다.</p>;
  }

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${color}`}>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function FinalActionCard({ report }: { report: TradingReport }) {
  const { finalSummary, userActionGuide, tradePlan } = report;
  const tone = finalSummary.finalAction === "SELL_RISK"
    ? "danger"
    : finalSummary.finalAction === "BUY_CANDIDATE"
      ? "success"
      : finalSummary.finalAction === "TAKE_PROFIT"
        ? "warning"
        : "info";

  return (
    <section className={`rounded-lg border p-5 shadow-soft ${actionTone[finalSummary.finalAction]}`}>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-sm font-semibold opacity-80">최종 행동 판단</p>
          <h2 className="mt-3 text-3xl font-bold">{finalSummary.title || actionLabel[finalSummary.finalAction]}</h2>
          <p className="mt-4 text-base leading-7">{finalSummary.oneLineConclusion}</p>
          {finalSummary.reason ? <p className="mt-3 text-sm leading-6 opacity-80">{finalSummary.reason}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge label={actionLabel[finalSummary.finalAction]} tone={tone} />
            <StatusBadge label={`신뢰도 ${confidenceLabel(finalSummary.confidence)}`} tone="neutral" />
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">신규 진입</p>
            <p className="mt-1 leading-6">{userActionGuide.nonHolder}</p>
          </div>
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">보유자 대응</p>
            <p className="mt-1 leading-6">{userActionGuide.holder}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
              <p className="font-semibold">손절 기준</p>
              <p className="mt-1">{tradePlan.stopLoss.priceZone}</p>
            </div>
            <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
              <p className="font-semibold">목표 구간</p>
              <p className="mt-1">1차 {tradePlan.targets.firstTarget.priceZone}</p>
              {tradePlan.targets.secondTarget ? <p className="mt-1">2차 {tradePlan.targets.secondTarget.priceZone}</p> : null}
            </div>
          </div>
          <div className="rounded-lg border border-white/40 bg-white/75 p-3 text-slate-900">
            <p className="font-semibold">무효화 조건</p>
            <p className="mt-1 leading-6">{tradePlan.invalidation.condition}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function UserActionGuideTable({ guide }: { guide: TradingReport["userActionGuide"] }) {
  const rows = [
    ["미보유자", guide.nonHolder],
    ["보유자", guide.holder],
    ["단기 매매자", guide.shortTermTrader],
    ["추가 매수자", guide.addBuyer],
    ["손절 기준", guide.stopLoss],
  ];

  return (
    <ResultSection title="사용자 상태별 대응표" tone="blue">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-36 px-4 py-3 font-semibold">사용자 상태</th>
              <th className="px-4 py-3 font-semibold">대응</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-4 py-3 font-semibold text-slate-950">{label}</td>
                <td className="px-4 py-3 leading-6 text-slate-700">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResultSection>
  );
}

export function TradePlanTable({ plan }: { plan: TradingReport["tradePlan"] }) {
  const rows = [
    ["눌림목 진입", plan.entry.pullbackEntry?.priceZone, plan.entry.pullbackEntry?.condition, plan.entry.pullbackEntry?.action],
    ["돌파 진입", plan.entry.breakoutEntry?.priceZone, plan.entry.breakoutEntry?.condition, plan.entry.breakoutEntry?.action],
    ["추격매수 금지", plan.entry.noChaseZone?.priceZone, plan.entry.noChaseZone?.reason, "신규 추격 진입보다 조건 확인을 우선합니다."],
    ["손절 기준", plan.stopLoss.priceZone, plan.stopLoss.condition, plan.stopLoss.meaning],
    ["1차 목표", plan.targets.firstTarget.priceZone, "주요 저항 또는 목표 후보", plan.targets.firstTarget.action],
    ["2차 목표", plan.targets.secondTarget?.priceZone, "확장 목표 후보", plan.targets.secondTarget?.action],
    ["무효화 조건", plan.invalidation.condition, "기존 판단 폐기 기준", plan.invalidation.meaning],
  ].filter((row) => row[1]);

  return (
    <ResultSection title="진입 / 손절 / 목표 / 무효화 조건" description="가격은 추천가가 아니라 기술적 조건 기준의 후보 구간입니다." tone="purple">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">구분</th>
              <th className="px-4 py-3 font-semibold">가격 구간</th>
              <th className="px-4 py-3 font-semibold">조건</th>
              <th className="px-4 py-3 font-semibold">대응 의미</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map(([label, zone, condition, action]) => (
              <tr key={label}>
                <td className="px-4 py-3 font-semibold text-slate-950">{label}</td>
                <td className="px-4 py-3 text-slate-800">{zone}</td>
                <td className="px-4 py-3 leading-6 text-slate-700">{condition}</td>
                <td className="px-4 py-3 leading-6 text-slate-600">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-600">손익비</p>
        <p className="mt-1 text-xl font-bold text-slate-950">
          {plan.riskReward.value === null ? plan.riskReward.label : `${plan.riskReward.value} / ${plan.riskReward.label}`}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{plan.riskReward.interpretation}</p>
      </div>
    </ResultSection>
  );
}

export function KeyLevelsSection({ levels }: { levels: TradingReport["keyLevels"] }) {
  const rows = [
    ...levels.supports.map((item) => ({ ...item, type: "지지" })),
    ...levels.resistances.map((item) => ({ ...item, type: "저항" })),
  ];

  return (
    <ResultSection title="핵심 가격대" description="비슷한 가격대는 묶어서 표시하며, 지지와 저항은 각각 최대 3개까지만 보여줍니다." tone="green">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">이미지 기반 분석으로 핵심 가격대 산정이 제한됩니다.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <article key={`${row.type}-${row.label}-${row.priceZone}`} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-950">{row.label}</p>
                <StatusBadge label={`${row.type} / 신뢰도 ${reliabilityLabel(row.reliability)}`} tone={row.type === "지지" ? "success" : "warning"} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{row.priceZone}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{row.meaning}</p>
            </article>
          ))}
        </div>
      )}
    </ResultSection>
  );
}

export function ScenarioSection({ scenarios }: { scenarios: TradingReport["scenarios"] }) {
  const rows: Array<{
    label: string;
    scenario: TradingReport["scenarios"]["bullish"];
    tone: "success" | "neutral" | "danger";
  }> = [
    { label: "상승 시나리오", scenario: scenarios.bullish, tone: "success" },
    { label: "중립 시나리오", scenario: scenarios.neutral, tone: "neutral" },
    { label: "하락 시나리오", scenario: scenarios.bearish, tone: "danger" },
  ];

  return (
    <ResultSection title="상승 / 중립 / 하락 시나리오" tone="blue">
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map(({ label, scenario, tone }) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <StatusBadge label={label} tone={tone} />
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-950">조건</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.condition}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">예상 흐름</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.expectedMove}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">대응</dt>
                <dd className="mt-1 leading-6 text-slate-600">{scenario.action}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </ResultSection>
  );
}

export function EvidenceSection({ evidence }: { evidence: TradingReport["evidence"] }) {
  return (
    <ResultSection title="판단 근거" tone="green">
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-bold text-emerald-800">긍정 근거</h3>
          <BulletList items={evidence.positive} tone="green" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-rose-800">부정 근거</h3>
          <BulletList items={evidence.negative} tone="red" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-amber-800">리스크 요인</h3>
          <BulletList items={evidence.riskFactors} tone="amber" />
        </div>
      </div>
    </ResultSection>
  );
}

export function PatternAnalysisSection({ analysis }: { analysis: TradingReport["patternAnalysis"] }) {
  const primary = analysis.primaryPattern;

  return (
    <ResultSection title="주요 패턴 분석" description="가장 유력한 패턴 1개와 보조 시나리오 1개만 우선 표시합니다." tone="purple">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="주요 패턴" tone="info" />
            <StatusBadge label={`신뢰도 ${confidenceLabel(primary.confidence)}`} tone="neutral" />
          </div>
          <h3 className="mt-3 text-xl font-bold text-slate-950">{primary.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{primary.reason}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-950">확인 조건</dt>
              <dd className="mt-1 leading-6 text-slate-600">{primary.confirmationCondition}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">무효화 조건</dt>
              <dd className="mt-1 leading-6 text-slate-600">{primary.invalidationCondition}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-950">매매 의미</dt>
              <dd className="mt-1 leading-6 text-slate-600">{primary.tradingMeaning}</dd>
            </div>
          </dl>
        </article>

        <div className="space-y-4">
          {analysis.secondaryPattern ? (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <StatusBadge label="보조 시나리오" tone="neutral" />
              <h3 className="mt-3 font-bold text-slate-950">{analysis.secondaryPattern.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.secondaryPattern.reason}</p>
            </article>
          ) : (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              보조 시나리오는 뚜렷하게 확인되지 않습니다.
            </article>
          )}
          {analysis.excludedPatterns?.length ? (
            <article className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-950">제외 패턴</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                {analysis.excludedPatterns.map((item) => (
                  <li key={`${item.name}-${item.reason}`}>{item.name} - {item.reason}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </div>
    </ResultSection>
  );
}

export function IndicatorSummarySection({ analysis }: { analysis: TradingReport["indicatorAnalysis"] }) {
  return (
    <ResultSection title="보조지표 분석" description="화면에서 확인 가능한 지표와 확인이 제한되는 지표를 분리해 표시합니다." tone="blue">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-950">확인된 지표</h3>
          {analysis.confirmed.length ? (
            <div className="space-y-3">
              {analysis.confirmed.map((item) => (
                <article key={`${item.name}-${item.explanation}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-950">{item.name}</p>
                    <StatusBadge label={signalLabel(item.signal)} tone={item.signal === "bullish" ? "success" : item.signal === "bearish" ? "danger" : "neutral"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.explanation}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">명확하게 확인된 보조지표가 제한적입니다.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-950">확인 제한 지표</h3>
          <BulletList items={analysis.unavailable.map((item) => `${item.name}: ${item.reason}`)} tone="slate" />
        </div>
      </div>
    </ResultSection>
  );
}

export function ImageLimitNotice({ disclaimer }: { disclaimer: string }) {
  return (
    <ResultSection title="이미지 기반 한계 안내" tone="yellow">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p>{disclaimer}</p>
        <p className="mt-2">
          본 분석은 차트 이미지와 기술적 지표 기반 참고 정보이며 투자 조언이나 매수·매도 추천이 아닙니다. 실제 판단에는 실시간 가격, 거래량, OHLCV 데이터와 시장 상황을 함께 확인해야 합니다.
        </p>
      </div>
    </ResultSection>
  );
}
