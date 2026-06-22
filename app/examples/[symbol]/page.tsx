import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { exampleReports, exampleReportSlugs, getExampleReport } from "../../../lib/exampleReports";

const siteUrl = "https://www.chartvisionai.site";

export const dynamicParams = false;

export function generateStaticParams() {
  return exampleReportSlugs.map((symbol) => ({ symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const report = getExampleReport(symbol);

  if (!report) return {};

  const canonicalUrl = `${siteUrl}/examples/${report.slug}`;
  const imageUrl = `${siteUrl}${report.chartImage.src}`;

  return {
    title: report.metadataTitle,
    description: report.metadataDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: report.metadataTitle,
      description: report.metadataDescription,
      url: canonicalUrl,
      siteName: "CHART VISION AI",
      images: [
        {
          url: imageUrl,
          width: report.chartImage.width,
          height: report.chartImage.height,
          alt: report.chartImage.alt,
        },
      ],
      type: "article",
      publishedTime: report.uploadedAt,
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: report.metadataTitle,
      description: report.metadataDescription,
      images: [imageUrl],
    },
  };
}

const scenarioClasses = {
  bullish: "border-emerald-200 bg-emerald-50 text-emerald-950",
  neutral: "border-blue-200 bg-blue-50 text-blue-950",
  bearish: "border-rose-200 bg-rose-50 text-rose-950",
};

export default async function ExampleDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const report = getExampleReport(symbol);

  if (!report) notFound();

  const otherReports = exampleReports.filter((item) => item.slug !== report.slug);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <Link href="/examples" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← 분석 예시 목록
          </Link>
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase text-blue-600">
              {report.companyName} · {report.market}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {report.heading}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              업로드 날짜 <time dateTime={report.uploadedAt}>{report.uploadedAtLabel}</time>
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600">{report.intro}</p>
          </div>
        </header>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft">
          이 페이지는 서비스 기능을 설명하기 위한 투자 참고용 예시입니다. 특정 종목의 매수·매도·보유를 권유하지
          않으며, 표시 가격은 첨부 차트 이미지 기준 추정값으로 현재 시세와 다를 수 있습니다.
        </aside>

        <section aria-labelledby="chart-heading" className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft sm:p-6">
          <h2 id="chart-heading" className="text-2xl font-bold tracking-tight text-slate-950">
            분석 대상 차트
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            아래 원본 차트에서 확인되는 가격 흐름과 보조지표를 리포트의 입력 자료로 사용했습니다.
          </p>
          <figure className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <Image
              src={report.chartImage.src}
              width={report.chartImage.width}
              height={report.chartImage.height}
              alt={report.chartImage.alt}
              className="h-auto w-full"
              sizes="(min-width: 1280px) 1152px, 100vw"
              priority
            />
            <figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
              {report.chartImage.caption}
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="report-images-heading">
          <div className="max-w-3xl">
            <h2 id="report-images-heading" className="text-2xl font-bold tracking-tight text-slate-950">
              AI 분석 리포트 화면
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              종목 요약부터 신호 점수, 진입 조건, 핵심 가격대와 시나리오까지 실제 출력 형태를 순서대로 보여줍니다.
            </p>
          </div>
          <div className="mt-5 space-y-6">
            {report.reportImages.map((image) => (
              <figure key={image.src} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                <Image
                  src={image.src}
                  width={image.width}
                  height={image.height}
                  alt={image.alt}
                  className="h-auto w-full"
                  sizes="(min-width: 1280px) 1152px, 100vw"
                />
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">핵심 요약</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              {report.summary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">주요 가격대</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">첨부 이미지 기준 추정값이며 현재 시세가 아닙니다.</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full table-fixed text-left text-sm">
                <tbody className="divide-y divide-slate-200">
                  {report.priceLevels.map((level) => (
                    <tr key={level.label}>
                      <th scope="row" className="w-[45%] bg-slate-50 px-3 py-3 font-semibold text-slate-600">
                        {level.label}
                      </th>
                      <td className="break-words px-3 py-3 font-bold text-slate-950">{level.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">기술적 해석</h2>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 md:grid-cols-2">
            {report.technicalInterpretation.map((paragraph) => (
              <p key={paragraph} className="rounded-lg bg-slate-50 p-4">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">시나리오 해석</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            시나리오는 가능한 조건을 비교하기 위한 참고 구조이며 실제 가격 흐름을 예측하거나 보장하지 않습니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {report.scenarios.map((scenario) => (
              <section key={scenario.title} className={`rounded-lg border p-4 ${scenarioClasses[scenario.tone]}`}>
                <h3 className="text-base font-bold">{scenario.title}</h3>
                <p className="mt-4 text-xs font-semibold opacity-70">확인 조건</p>
                <p className="mt-1 text-sm font-bold leading-6">{scenario.condition}</p>
                <p className="mt-4 text-xs font-semibold opacity-70">해석</p>
                <p className="mt-1 text-sm leading-6">{scenario.interpretation}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 shadow-soft sm:p-6">
          <h2 className="text-xl font-bold text-amber-950">공통 투자 유의사항</h2>
          <p className="mt-3">
            본 분석은 CHART VISION AI가 업로드된 차트 이미지를 바탕으로 생성한 투자 참고용 예시 리포트입니다.
            특정 종목 또는 ETF의 매수·매도·보유를 권유하는 투자 자문이 아니며, 기술적 분석과 AI 분석은 미래
            가격이나 수익을 보장하지 않습니다.
          </p>
          <p className="mt-3">
            실제 투자 판단에는 기업 실적, 공시, 시장 상황, 뉴스, 금리, 환율, 거래량, 개인의 투자 성향과 위험
            감내 수준을 함께 고려해야 하며 최종 결정과 결과에 대한 책임은 사용자 본인에게 있습니다.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">다른 분석 예시</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {otherReports.map((item) => (
              <Link
                key={item.slug}
                href={`/examples/${item.slug}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.symbol} 분석 예시 →
              </Link>
            ))}
          </div>
        </section>

        <nav
          aria-label="예시 및 서비스 안내 링크"
          className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-soft"
        >
          <Link href="/examples" className="hover:text-blue-700">전체 예시</Link>
          <Link href="/guide" className="hover:text-blue-700">사용 방법</Link>
          <Link href="/privacy" className="hover:text-blue-700">개인정보처리방침</Link>
          <Link href="/terms" className="hover:text-blue-700">이용약관</Link>
          <Link href="/disclaimer" className="hover:text-blue-700">투자 유의사항</Link>
        </nav>
      </article>
    </main>
  );
}
