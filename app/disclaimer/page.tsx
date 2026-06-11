import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

const title = "투자 유의사항 및 면책고지";
const description =
  "CHART VISION AI의 AI 주식 차트 분석 결과가 투자 자문이나 매수·매도 권유가 아님을 안내합니다.";

export const metadata: Metadata = {
  title: `${title} | CHART VISION AI`,
  description,
  alternates: {
    canonical: "/disclaimer",
  },
  openGraph: {
    title: `${title} | CHART VISION AI`,
    description,
    url: "https://www.chartvisionai.site/disclaimer",
    siteName: "CHART VISION AI",
    images: [
      {
        url: "https://www.chartvisionai.site/logo.png",
        width: 1000,
        height: 1000,
        alt: "CHART VISION AI",
      },
    ],
    type: "article",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | CHART VISION AI`,
    description,
    images: ["https://www.chartvisionai.site/logo.png"],
  },
};

function DisclaimerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← 홈으로 돌아가기
        </Link>

        <header className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-soft">
          <p className="text-sm font-semibold uppercase text-amber-700">CHART VISION AI</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-amber-900">
            CHART VISION AI는 투자 참고용 차트 분석 도구입니다. 본 페이지는 서비스 이용 전 반드시 확인해야 할
            투자 유의사항을 안내합니다.
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-800">마지막 업데이트: 2026년 6월 11일</p>
        </header>

        <DisclaimerSection title="1. 투자 자문이 아닙니다">
          <p>
            CHART VISION AI의 분석 결과는 투자 자문, 금융 자문, 매매 신호, 수익 보장, 특정 증권의 매수·매도·보유
            권유가 아닙니다.
          </p>
        </DisclaimerSection>

        <DisclaimerSection title="2. 특정 종목 매매를 권유하지 않습니다">
          <p>
            서비스는 업로드된 차트 이미지에서 확인 가능한 기술적 요소를 바탕으로 참고 정보를 정리합니다. 이는 특정 종목을
            사거나 팔거나 보유하라는 권고가 아니며, 투자 결정의 근거로 단독 사용해서는 안 됩니다.
          </p>
        </DisclaimerSection>

        <DisclaimerSection title="3. 미래 수익을 보장하지 않습니다">
          <p>
            기술적 분석과 AI 분석은 확률적 판단을 돕는 도구일 뿐입니다. 차트 패턴, RSI, MACD, 지지선, 저항선,
            거래량 분석은 미래 가격이나 수익을 보장하지 않습니다.
          </p>
        </DisclaimerSection>

        <DisclaimerSection title="4. 투자 판단은 사용자 책임입니다">
          <p>
            모든 투자 결정과 그 결과에 대한 책임은 사용자 본인에게 있습니다. 실제 투자 전에는 기업의 재무 상태,
            실적, 공시, 시장 상황, 뉴스, 금리, 환율, 유동성, 개인의 투자 기간과 위험 감내 수준을 종합적으로
            고려해야 합니다.
          </p>
        </DisclaimerSection>

        <DisclaimerSection title="5. 리스크 관리가 우선입니다">
          <p>
            변동성이 큰 종목, 레버리지 상품, 거래량이 적은 종목, 급등락 구간에서는 손실 위험이 커질 수 있습니다.
            사용자는 손절 기준, 투자 금액, 분산 여부, 비중 관리 기준을 스스로 정해야 합니다.
          </p>
        </DisclaimerSection>
      </div>
    </main>
  );
}
