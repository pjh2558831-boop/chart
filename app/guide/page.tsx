import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const guideTitle = "CHART VISION AI 사용 방법 | AI 주식 차트 분석 가이드";
const guideDescription =
  "차트 이미지를 업로드하고 AI가 생성한 주식 차트 분석 리포트를 확인하는 방법을 단계별로 안내합니다. RSI, MACD, 지지선, 저항선, 거래량을 참고하는 투자 참고용 분석 가이드입니다.";
const guideUrl = "https://www.chartvisionai.site/guide";

export const metadata: Metadata = {
  title: guideTitle,
  description: guideDescription,
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: guideTitle,
    description: guideDescription,
    url: guideUrl,
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
    title: guideTitle,
    description: guideDescription,
    images: ["https://www.chartvisionai.site/logo.png"],
  },
};

const guideSteps = [
  {
    title: "1. 홈 화면에서 차트 분석 시작하기",
    image: {
      src: "/guide/guide-home-start.png",
      width: 1166,
      height: 1033,
      alt: "CHART VISION AI 홈 화면 예시",
      caption: "홈 화면 예시",
    },
    body:
      "홈 화면에서는 CHART VISION AI의 핵심 기능을 확인하고 바로 차트 분석을 시작할 수 있습니다. 로그인하지 않아도 비로그인 무료 체험 분석을 사용할 수 있으며, 로그인하면 제공되는 분석 횟수와 기능이 달라질 수 있습니다.",
    bullets: [
      "차트 이미지 기반 분석",
      "지지선과 저항선 후보 정리",
      "RSI, MACD, 거래량 등 기술적 요소 참고",
      "투자 참고용 리포트 생성",
    ],
  },
  {
    title: "2. 분석할 차트 이미지 업로드하기",
    image: {
      src: "/guide/guide-upload-preview.png",
      width: 1048,
      height: 1010,
      alt: "차트 이미지 업로드 후 미리보기 화면",
      caption: "이미지 업로드와 미리보기 예시",
    },
    body:
      "업로드 영역을 클릭하거나 차트 이미지를 끌어다 놓으면 이미지가 등록됩니다. 업로드가 완료되면 선택한 차트 이미지가 미리보기로 표시되고, 분석 모드를 선택한 뒤 AI 차트 분석을 시작할 수 있습니다.",
    bullets: [
      "PNG, JPG, JPEG, WEBP 형식 지원",
      "최대 5MB 이미지 권장",
      "최대 3000px x 3000px 이미지 권장",
      "캔들, 가격축, 거래량이 선명하게 보이는 이미지 권장",
      "RSI, MACD, 이동평균선이 보이면 더 풍부한 분석 가능",
    ],
  },
  {
    title: "3. AI 분석 진행 상태 확인하기",
    image: {
      src: "/guide/guide-analyzing.png",
      width: 1042,
      height: 148,
      alt: "AI 차트 분석 진행 중 화면",
      caption: "AI 분석 진행 중 화면",
    },
    body:
      "분석을 시작하면 AI가 차트 이미지 구조, 보조지표, 지지·저항 후보, 기술적 신호를 순서대로 확인합니다. 분석이 완료되면 자동으로 리포트 화면이 표시됩니다.",
    bullets: ["이미지 최적화", "차트 구조 분석", "보조지표 인식", "가격 전략 후보 계산", "리포트 생성"],
  },
  {
    title: "4. 분석 리포트 확인하기",
    image: {
      src: "/guide/guide-report-result.png",
      width: 1119,
      height: 961,
      alt: "최종 AI 차트 분석 리포트 예시",
      caption: "최종 분석 리포트 예시",
    },
    body:
      "분석 결과 화면에서는 종목 요약, 매매 전략, 진입 시나리오, 시그널 요약, 핵심 가격대를 한 화면에서 확인할 수 있습니다. 리포트는 매수·매도 추천이 아니라 차트 기반 투자 참고 자료입니다.",
    bullets: [
      "종목 요약: 종목명, 현재가 추정, 현재 위치 해석",
      "매매 전략: 신규 진입, 관망, 돌파 실패 주의 등 차트 기반 대응 방향",
      "진입 시나리오: 현재가, 눌림목, 돌파·재지지 진입 후보 비교",
      "시그널 요약: 모멘텀, 돌파 확률, 리스크 수준 요약",
      "핵심 가격대: 현재가, 주요 지지, 주요 저항, 손절, 목표 후보 확인",
    ],
  },
];

const reportItems = [
  ["종목 요약", "종목명, 현재가 추정, 현재가 해석을 확인합니다."],
  ["매매 전략", "신규 진입, 관망, 돌파 실패 주의 등 차트 기반 대응 방향을 확인합니다."],
  ["진입 시나리오", "현재가 진입, 눌림목 진입, 돌파·재지지 진입 후보의 점수를 비교합니다."],
  ["시그널 요약", "모멘텀, 돌파 확률, 리스크 수준 등 핵심 신호를 요약합니다."],
  ["핵심 가격대", "현재가, 주요 지지, 주요 저항, 돌파 기준, 손절, 목표 후보를 확인합니다."],
];

const captureTips = [
  "차트가 너무 작게 보이지 않도록 캡처하세요.",
  "가격축과 날짜축이 가능하면 보이게 캡처하세요.",
  "거래량, RSI, MACD 같은 보조지표가 있으면 함께 포함하세요.",
  "종목명이 보이면 리포트의 종목 인식에 도움이 됩니다.",
  "불필요한 창이나 복잡한 UI는 가급적 제외해 주세요.",
];

function GuideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← 홈으로 돌아가기
          </Link>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase text-blue-600">CHART VISION AI GUIDE</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              CHART VISION AI 사용 방법
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              CHART VISION AI는 주식 차트 이미지를 업로드하면 AI가 추세, 지지선, 저항선, RSI, MACD, 거래량
              등을 참고해 투자 참고용 리포트를 생성하는 서비스입니다. 아래 순서대로 차트 이미지를 업로드하고 분석
              결과를 확인할 수 있습니다.
            </p>
          </div>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft">
          본 서비스는 투자 참고용 분석 도구이며, 특정 종목의 매수·매도 추천이나 투자 자문을 제공하지 않습니다.
        </section>

        <div className="space-y-8">
          {guideSteps.map((step) => (
            <GuideCard key={step.title} title={step.title}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
                <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <Image
                    src={step.image.src}
                    width={step.image.width}
                    height={step.image.height}
                    alt={step.image.alt}
                    className="h-auto w-full"
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    priority={step.title.startsWith("1.")}
                  />
                  <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                    {step.image.caption}
                  </figcaption>
                </figure>
                <div>
                  <p>{step.body}</p>
                  <ul className="mt-4 grid gap-2">
                    {step.bullets.map((item) => (
                      <li key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GuideCard>
          ))}
        </div>

        <GuideCard title="리포트에서 확인할 수 있는 항목">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {reportItems.map(([title, description]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </GuideCard>

        <GuideCard title="좋은 분석 결과를 위한 차트 캡처 팁">
          <p>
            차트 이미지가 선명할수록 AI가 더 많은 정보를 참고할 수 있습니다. 업로드 전 아래 항목을 확인해 주세요.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {captureTips.map((tip) => (
              <li key={tip} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {tip}
              </li>
            ))}
          </ul>
        </GuideCard>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft sm:p-6">
          <h2 className="text-xl font-bold text-amber-950">투자 유의사항</h2>
          <p className="mt-3">
            CHART VISION AI의 분석 결과는 투자 참고 정보입니다. 특정 종목의 매수, 매도, 보유를 권유하는 투자
            자문이 아니며, 기술적 분석과 AI 분석은 미래 수익을 보장하지 않습니다. 모든 투자 판단과 그 결과에 대한
            책임은 사용자 본인에게 있습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
