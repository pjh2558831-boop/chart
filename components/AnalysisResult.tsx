import type { ReactNode } from "react";

import {
  formatConfidence,
  formatPrice,
  formatPriceRange,
  formatScore,
  formatSignalLabel,
  formatStatus,
  getConfidenceTone,
} from "../lib/formatters";
import type {
  ActionParameter,
  AnalysisResponse,
  SummarySignal,
  TradeSignal,
  VisualZone,
} from "../types/analysis";
import MetricCard from "./MetricCard";
import ResultSection from "./ResultSection";
import StatusBadge from "./StatusBadge";

interface AnalysisResultProps {
  result: AnalysisResponse | null;
}

function fallback(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      {children}
    </div>
  );
}

function WarningBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
      {children}
    </div>
  );
}

function BasisList({ items }: { items?: string[] }) {
  const safeItems = items ?? [];

  if (safeItems.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">근거 정보가 충분하지 않습니다.</p>;
  }

  return (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
      {safeItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ZoneList({
  title,
  zones,
  emptyText,
  tone,
}: {
  title: string;
  zones?: VisualZone[];
  emptyText: string;
  tone: "emerald" | "orange";
}) {
  const safeZones = zones ?? [];
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-orange-200 bg-orange-50 text-orange-950";

  return (
    <article className={`rounded-lg border p-4 ${toneClasses}`}>
      <h3 className="font-bold">{title}</h3>
      {safeZones.length === 0 ? (
        <p className="mt-3 text-sm opacity-80">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {safeZones.map((zone, index) => (
            <li key={`${zone.label}-${index}`} className="rounded-lg bg-white/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{fallback(zone.label)}</p>
                <StatusBadge
                  label={formatConfidence(zone.confidence)}
                  tone={getConfidenceTone(zone.confidence)}
                />
              </div>
              <p className="mt-1 text-sm leading-6 opacity-80">{fallback(zone.note)}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function scoreRows(tradeSignal?: TradeSignal | null) {
  const buy = tradeSignal?.conditionScores?.buy;
  const sell = tradeSignal?.conditionScores?.sell;

  return [
    { group: "매수", label: "지지선 근처", score: buy?.supportProximity },
    { group: "매수", label: "RSI 반등", score: buy?.rsiRebound },
    { group: "매수", label: "MACD 상향", score: buy?.macdBullish },
    { group: "매수", label: "거래량 증가", score: buy?.volumeIncrease },
    { group: "매수", label: "추세", score: buy?.trend },
    { group: "매도", label: "저항선 근처", score: sell?.resistanceProximity },
    { group: "매도", label: "RSI 과열", score: sell?.rsiOverheated },
    { group: "매도", label: "MACD 하향", score: sell?.macdBearish },
    { group: "매도", label: "거래량 증가", score: sell?.volumeIncrease },
    { group: "매도", label: "볼린저 상단", score: sell?.bollingerUpper },
  ];
}

function scoreRowClasses(group: string) {
  if (group === "매수") {
    return {
      group: "text-red-700",
      label: "text-red-600",
      score: "text-red-700",
      background: "bg-red-50/50",
    };
  }

  return {
    group: "text-blue-700",
    label: "text-blue-600",
    score: "text-blue-700",
    background: "bg-blue-50/50",
  };
}

function getSignalTone(action: ActionParameter): "success" | "warning" | "danger" | "neutral" {
  switch (action) {
    case "buy_candidate":
      return "success";
    case "sell_candidate":
      return "danger";
    case "hold_candidate":
    case "neutral":
      return "neutral";
    case "insufficient_data":
      return "warning";
    default:
      return "neutral";
  }
}

function buildSummarySignal(tradeSignal?: TradeSignal | null): SummarySignal {
  const finalSignal = tradeSignal?.finalSignal ?? "insufficient_data";

  if (
    finalSignal === "strong_buy_candidate" ||
    finalSignal === "buy_candidate" ||
    finalSignal === "weak_buy_candidate"
  ) {
    return {
      actionParameter: "buy_candidate",
      actionLabel: "매수 후보",
      entryPriceCandidate: {
        from: tradeSignal?.buyZone?.priceRange?.from,
        to: tradeSignal?.buyZone?.priceRange?.to,
        basis: tradeSignal?.buyZone?.basis?.[0] ?? null,
      },
      targetPriceCandidate: {
        primary: tradeSignal?.targetPriceCandidate?.primary,
        secondary: tradeSignal?.targetPriceCandidate?.secondary,
        basis: tradeSignal?.targetPriceCandidate?.basis ?? null,
      },
    };
  }

  if (
    finalSignal === "strong_sell_candidate" ||
    finalSignal === "sell_candidate" ||
    finalSignal === "weak_sell_candidate"
  ) {
    return {
      actionParameter: "sell_candidate",
      actionLabel: "매도 후보",
      entryPriceCandidate: {
        from: tradeSignal?.sellZone?.priceRange?.from,
        to: tradeSignal?.sellZone?.priceRange?.to,
        basis: tradeSignal?.sellZone?.basis?.[0] ?? null,
      },
      targetPriceCandidate: {
        primary: tradeSignal?.targetPriceCandidate?.primary,
        secondary: tradeSignal?.targetPriceCandidate?.secondary,
        basis: tradeSignal?.targetPriceCandidate?.basis ?? null,
      },
    };
  }

  if (finalSignal === "neutral") {
    const current = tradeSignal?.currentPriceEstimate?.value;
    return {
      actionParameter: "hold_candidate",
      actionLabel: "보유 후보",
      entryPriceCandidate: {
        from: current ?? null,
        to: current ?? null,
        basis: "현재 기술적 조건 점수가 비슷해 중립 또는 보유 후보 구간으로 해석했습니다.",
      },
      targetPriceCandidate: {
        primary: tradeSignal?.targetPriceCandidate?.primary,
        secondary: tradeSignal?.targetPriceCandidate?.secondary,
        basis: tradeSignal?.targetPriceCandidate?.basis ?? null,
      },
    };
  }

  return {
    actionParameter: "insufficient_data",
    actionLabel: "데이터 부족",
    entryPriceCandidate: {
      from: null,
      to: null,
      basis: "진입가 후보를 계산할 수 있는 정보가 부족합니다.",
    },
    targetPriceCandidate: {
      primary: tradeSignal?.targetPriceCandidate?.primary,
      secondary: tradeSignal?.targetPriceCandidate?.secondary,
      basis: tradeSignal?.targetPriceCandidate?.basis ?? null,
    },
  };
}

export default function AnalysisResult({ result }: AnalysisResultProps) {
  if (!result) {
    return null;
  }

  const ai = result.aiAnalysis;
  const tradeSignal = result.tradeSignal;
  const summarySignal = tradeSignal?.summarySignal ?? buildSummarySignal(tradeSignal);
  const patterns = ai?.patternCandidates ?? [];
  const indicators = ai?.visibleIndicators ?? [];
  const riskNotes = unique([...(ai?.riskNotes ?? []), ...(tradeSignal?.warnings ?? [])]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <ResultSection title="AI 차트 요약" tone="blue">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="기술적 신호"
              value={summarySignal.actionLabel}
              badge={
                <StatusBadge
                  label={summarySignal.actionLabel}
                  tone={getSignalTone(summarySignal.actionParameter)}
                />
              }
            />
            <MetricCard
              title="진입가 후보"
              value={
                summarySignal.entryPriceCandidate?.from == null &&
                summarySignal.entryPriceCandidate?.to == null
                  ? "확인 불가"
                  : formatPriceRange(
                      summarySignal.entryPriceCandidate?.from,
                      summarySignal.entryPriceCandidate?.to,
                    )
              }
              description={fallback(summarySignal.entryPriceCandidate?.basis)}
            />
            <MetricCard
              title="목표가 후보"
              value={
                summarySignal.targetPriceCandidate?.primary == null &&
                summarySignal.targetPriceCandidate?.secondary == null
                  ? "확인 불가"
                  : `1차 ${formatPrice(summarySignal.targetPriceCandidate?.primary)} / 2차 ${formatPrice(
                      summarySignal.targetPriceCandidate?.secondary,
                    )}`
              }
              description={fallback(summarySignal.targetPriceCandidate?.basis)}
            />
          </div>

          <p className="text-base leading-7 text-slate-800">{fallback(ai?.summary)}</p>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="차트 형태" value={fallback(ai?.chartType)} />
            <MetricCard title="시간봉 추정" value={fallback(ai?.timeframeEstimate)} />
            <MetricCard title="시각적 추세" value={fallback(ai?.visualTrend)} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">보조지표 인식 결과</h3>
            {indicators.length === 0 ? (
              <EmptyState>확인된 보조지표가 없습니다.</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-2">
                {indicators.map((item) => (
                  <StatusBadge key={item} label={item} tone="info" />
                ))}
              </div>
            )}
          </div>
        </div>
      </ResultSection>

      <ResultSection title="시각적 기술 분석 요약" tone="blue">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="현재가 추정"
              value={formatPrice(tradeSignal?.currentPriceEstimate?.value)}
              badge={
                <StatusBadge
                  label={formatConfidence(tradeSignal?.currentPriceEstimate?.confidence)}
                  tone={getConfidenceTone(tradeSignal?.currentPriceEstimate?.confidence)}
                />
              }
              description="이미지 기반 추정 가격"
            />
            <MetricCard
              title="RSI 판독"
              value={formatStatus(ai?.indicatorReadings?.rsi?.status)}
              badge={
                <StatusBadge
                  label={formatConfidence(ai?.indicatorReadings?.rsi?.confidence)}
                  tone={getConfidenceTone(ai?.indicatorReadings?.rsi?.confidence)}
                />
              }
              description={ai?.indicatorReadings?.rsi?.visible ? "보이는 패널 기준 추정" : "확인 불가"}
            />
            <MetricCard
              title="MACD 판독"
              value={formatStatus(ai?.indicatorReadings?.macd?.status)}
              badge={
                <StatusBadge
                  label={formatConfidence(ai?.indicatorReadings?.macd?.confidence)}
                  tone={getConfidenceTone(ai?.indicatorReadings?.macd?.confidence)}
                />
              }
              description={ai?.indicatorReadings?.macd?.visible ? "교차 후보 중심 판독" : "확인 불가"}
            />
            <MetricCard
              title="거래량 관찰"
              value={formatStatus(ai?.indicatorReadings?.volume?.status)}
              badge={
                <StatusBadge
                  label={formatConfidence(ai?.indicatorReadings?.volume?.confidence)}
                  tone={getConfidenceTone(ai?.indicatorReadings?.volume?.confidence)}
                />
              }
              description={fallback(ai?.volumeObservation)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ZoneList
              title="시각적 지지 후보"
              zones={ai?.visualSupportZones}
              emptyText="시각적 지지 구간 후보를 확인하지 못했습니다."
              tone="emerald"
            />
            <ZoneList
              title="시각적 저항 후보"
              zones={ai?.visualResistanceZones}
              emptyText="시각적 저항 구간 후보를 확인하지 못했습니다."
              tone="orange"
            />
          </div>

          {patterns.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">패턴 후보</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {patterns.map((pattern, index) => (
                  <article
                    key={`${pattern.name}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{fallback(pattern.name)}</h4>
                      <StatusBadge
                        label={formatConfidence(pattern.confidence)}
                        tone={getConfidenceTone(pattern.confidence)}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{fallback(pattern.reason)}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>명확한 패턴 후보는 보이지 않습니다.</EmptyState>
          )}

          <p className="text-xs text-slate-500">
            실제 OHLCV 기반 정량 분석은 제공되지 않았습니다.
          </p>
        </div>
      </ResultSection>

      <ResultSection title="매매 신호 요약" tone="purple">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="기술적 신호"
              value={tradeSignal?.signalLabel || formatSignalLabel(tradeSignal?.finalSignal)}
              badge={
                <StatusBadge
                  label={formatConfidence(tradeSignal?.confidence)}
                  tone={getConfidenceTone(tradeSignal?.confidence)}
                />
              }
            />
            <MetricCard title="신호 코드" value={formatSignalLabel(tradeSignal?.finalSignal)} />
            <MetricCard title="매수 후보 점수" value={formatScore(tradeSignal?.buyScore)} />
            <MetricCard title="매도 후보 점수" value={formatScore(tradeSignal?.sellScore)} />
            <MetricCard
              title="현재가 추정"
              value={formatPrice(tradeSignal?.currentPriceEstimate?.value)}
              description="이미지 기반 추정 가격"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="font-bold text-emerald-950">매수 후보 구간</h3>
              <p className="mt-2 text-2xl font-bold text-emerald-950">
                {formatPriceRange(tradeSignal?.buyZone?.priceRange?.from, tradeSignal?.buyZone?.priceRange?.to)}
              </p>
              <BasisList items={tradeSignal?.buyZone?.basis} />
            </article>

            <article className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-bold text-orange-950">매도 후보 구간</h3>
              <p className="mt-2 text-2xl font-bold text-orange-950">
                {formatPriceRange(tradeSignal?.sellZone?.priceRange?.from, tradeSignal?.sellZone?.priceRange?.to)}
              </p>
              <BasisList items={tradeSignal?.sellZone?.basis} />
            </article>

            <article className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-bold text-red-950">손절 기준 후보</h3>
              <p className="mt-2 text-2xl font-bold text-red-950">
                {formatPrice(tradeSignal?.stopLossCandidate?.price)}
              </p>
              <p className="mt-2 text-sm leading-6 text-red-800">
                {fallback(tradeSignal?.stopLossCandidate?.basis)}
              </p>
            </article>

            <article className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-bold text-blue-950">목표가 후보</h3>
              <div className="mt-3 space-y-2 text-sm text-blue-900">
                <p>
                  <span className="font-semibold">1차 후보:</span>{" "}
                  {formatPrice(tradeSignal?.targetPriceCandidate?.primary)}
                </p>
                <p>
                  <span className="font-semibold">2차 후보:</span>{" "}
                  {formatPrice(tradeSignal?.targetPriceCandidate?.secondary)}
                </p>
                <p>
                  <span className="font-semibold">리스크 대비 보상비:</span>{" "}
                  {tradeSignal?.targetPriceCandidate?.riskRewardRatio ?? "-"}
                </p>
                <p className="pt-1 leading-6">{fallback(tradeSignal?.targetPriceCandidate?.basis)}</p>
              </div>
            </article>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900">조건별 점수</h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">구분</th>
                    <th className="px-4 py-3 font-semibold">조건</th>
                    <th className="px-4 py-3 font-semibold">점수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {scoreRows(tradeSignal).map((row) => {
                    const classes = scoreRowClasses(row.group);

                    return (
                    <tr key={`${row.group}-${row.label}`} className={classes.background}>
                      <td className={`px-4 py-3 font-medium ${classes.group}`}>{row.group}</td>
                      <td className={`px-4 py-3 ${classes.label}`}>{row.label}</td>
                      <td className={`px-4 py-3 font-semibold ${classes.score}`}>{formatScore(row.score)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ResultSection>

      <ResultSection title="리스크 노트" tone="yellow">
        {riskNotes.length === 0 ? (
          <EmptyState>추가 리스크 노트가 없습니다.</EmptyState>
        ) : (
          <WarningBox>
            <ul className="list-disc space-y-1 pl-5">
              {riskNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </WarningBox>
        )}
      </ResultSection>

      <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 shadow-soft">
        본 결과는 RSI, MACD, 볼린저밴드, 이동평균선, 거래량 등 기술적 지표와 차트
        이미지 기반 참고 정보이며, 투자 조언이나 매수·매도 추천이 아닙니다. 실제
        투자 판단은 사용자의 책임입니다.
      </section>
    </div>
  );
}
