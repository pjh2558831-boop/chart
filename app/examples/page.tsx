import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { exampleReports } from "../../lib/exampleReports";

const title = "AI 차트 분석 예시 | CHART VISION AI";
const description =
  "SPY, QQQ, NVDA, TSLA 차트 이미지를 기반으로 생성한 AI 주식 차트 분석 리포트 예시를 확인하세요. 모든 내용은 투자 참고용 교육 자료입니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/examples",
  },
  openGraph: {
    title,
    description,
    url: "https://www.chartvisionai.site/examples",
    siteName: "CHART VISION AI",
    images: [
      {
        url: "https://www.chartvisionai.site/logo.png",
        width: 1000,
        height: 1000,
        alt: "CHART VISION AI",
      },
    ],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["https://www.chartvisionai.site/logo.png"],
  },
};

const serviceLinks = [
  { href: "/", label: "차트 분석 시작" },
  { href: "/guide", label: "사용 방법" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
  { href: "/disclaimer", label: "투자 유의사항" },
];

export default function ExamplesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← 홈으로 돌아가기
          </Link>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase text-blue-600">CHART VISION AI EXAMPLES</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              AI 차트 분석 예시
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              CHART VISION AI가 실제 차트 이미지를 기반으로 생성한 분석 예시입니다. 각 예시는 추세, 지지선,
              저항선, RSI, MACD, 거래량과 핵심 가격대를 참고해 구성한 투자 참고용 리포트입니다.
            </p>
          </div>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft">
          아래 예시는 서비스의 분석 화면과 해석 방식을 설명하기 위한 교육용 자료입니다. 특정 종목이나 ETF의
          매수·매도·보유를 권유하는 투자 자문이 아니며, 표시 가격은 첨부 이미지 촬영 시점의 추정값입니다.
        </section>

        <section aria-labelledby="example-list-heading">
          <div className="max-w-3xl">
            <h2 id="example-list-heading" className="text-2xl font-bold tracking-tight text-slate-950">
              종목별 공개 리포트
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              같은 리포트 구조가 서로 다른 차트 상태를 어떻게 설명하는지 비교해 볼 수 있습니다.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {exampleReports.map((report, index) => (
              <article
                key={report.slug}
                className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-slate-200 bg-slate-100">
                  <Image
                    src={report.chartImage.src}
                    alt={report.chartImage.alt}
                    fill
                    className="object-contain"
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority={index < 2}
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase text-blue-600">
                    {report.companyName} · {report.market}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">{report.indexTitle}</h3>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    업로드 날짜 <time dateTime={report.uploadedAt}>{report.uploadedAtLabel}</time>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{report.indexDescription}</p>
                  <Link
                    href={`/examples/${report.slug}`}
                    className="mt-5 inline-flex items-center text-sm font-bold text-blue-700 hover:text-blue-800"
                  >
                    상세 리포트 보기 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">예시를 읽을 때 확인할 점</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
            <p className="rounded-lg bg-slate-50 p-4">
              가격 수치는 업로드된 이미지에서 추정한 값이므로 실제 현재 시세와 다를 수 있습니다.
            </p>
            <p className="rounded-lg bg-slate-50 p-4">
              신호 점수는 해당 차트의 조건을 비교하기 위한 표시값이며 수익 가능성을 뜻하지 않습니다.
            </p>
            <p className="rounded-lg bg-slate-50 p-4">
              실제 판단에는 기업 실적, 뉴스, 시장 상황과 개인의 위험 감내 수준을 함께 고려해야 합니다.
            </p>
          </div>
        </section>

        <nav
          aria-label="예시 및 서비스 안내 링크"
          className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-soft"
        >
          {serviceLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-blue-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
