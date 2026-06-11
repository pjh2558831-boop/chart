import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

const title = "이용약관";
const description =
  "CHART VISION AI의 서비스 목적, 사용자 책임, 금지 행위, 분석 결과의 성격과 서비스 이용 기준을 안내합니다.";

export const metadata: Metadata = {
  title: `${title} | CHART VISION AI`,
  description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: `${title} | CHART VISION AI`,
    description,
    url: "https://www.chartvisionai.site/terms",
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

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          ← 홈으로 돌아가기
        </Link>

        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase text-blue-600">CHART VISION AI</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            본 약관은 CHART VISION AI 서비스 이용과 관련해 사용자와 서비스 사이의 기본적인 권리, 의무,
            책임 사항을 설명합니다.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">마지막 업데이트: 2026년 6월 11일</p>
        </header>

        <TermsSection title="1. 서비스 목적">
          <p>
            CHART VISION AI는 사용자가 업로드한 주식 차트 이미지를 기반으로 추세, 지지선, 저항선, 보조지표,
            가격대 후보 등을 정리한 투자 참고용 AI 분석 리포트를 제공합니다.
          </p>
        </TermsSection>

        <TermsSection title="2. 분석 결과의 성격">
          <p>
            서비스에서 제공하는 분석 결과는 정보 제공과 학습 보조 목적의 참고 자료입니다. 특정 종목의 매수, 매도,
            보유를 권유하는 투자 자문이 아니며, 분석 결과의 정확성이나 수익을 보장하지 않습니다.
          </p>
        </TermsSection>

        <TermsSection title="3. 사용자 책임">
          <p>
            사용자는 본인의 판단과 책임으로 서비스를 이용해야 합니다. 실제 투자 판단에는 기업 실적, 시장 상황,
            뉴스, 금리, 환율, 거래량, 개인의 투자 성향과 위험 감내 수준 등을 함께 고려해야 합니다.
          </p>
        </TermsSection>

        <TermsSection title="4. 금지 행위">
          <p>
            사용자는 서비스의 정상 운영을 방해하거나, 자동화된 과도한 요청을 보내거나, 타인의 권리를 침해하는 이미지를
            업로드하거나, 서비스를 불법적 목적 또는 허위 정보 생성 목적으로 사용해서는 안 됩니다.
          </p>
        </TermsSection>

        <TermsSection title="5. 서비스 변경과 중단">
          <p>
            서비스 기능, 제공 범위, 사용량 제한, 분석 모델, 화면 구성은 운영 상황에 따라 변경될 수 있습니다.
            장애, 점검, 외부 API 문제, 보안상 필요가 있는 경우 서비스가 일시적으로 제한될 수 있습니다.
          </p>
        </TermsSection>

        <TermsSection title="6. 면책">
          <p>
            CHART VISION AI는 기술적 분석과 AI 분석 결과가 미래 가격이나 수익을 보장하지 않음을 명확히 안내합니다.
            사용자가 분석 결과를 활용해 내린 판단과 그 결과에 대한 책임은 사용자 본인에게 있습니다.
          </p>
        </TermsSection>
      </div>
    </main>
  );
}
