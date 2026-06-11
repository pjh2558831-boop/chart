import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

const title = "개인정보처리방침";
const description =
  "CHART VISION AI의 차트 이미지 처리, 로그인 정보, 사용 기록, 쿠키 및 광고 기술 사용 기준을 안내합니다.";

export const metadata: Metadata = {
  title: `${title} | CHART VISION AI`,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: `${title} | CHART VISION AI`,
    description,
    url: "https://www.chartvisionai.site/privacy",
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

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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
            본 방침은 CHART VISION AI가 차트 분석 서비스를 제공하는 과정에서 어떤 정보를 처리할 수 있는지,
            그리고 사용자가 알아야 할 개인정보 보호 기준을 설명합니다.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">마지막 업데이트: 2026년 6월 11일</p>
        </header>

        <PolicySection title="1. 처리하는 정보">
          <p>
            CHART VISION AI는 사용자가 업로드한 주식 차트 이미지를 AI 분석 리포트 생성 목적으로 처리할 수 있습니다.
            이미지에는 차트, 가격축, 보조지표, 종목명 등이 포함될 수 있으므로 민감한 개인정보나 불필요한 화면 정보가
            포함된 이미지는 업로드하지 않는 것이 좋습니다.
          </p>
          <p>
            사용자가 로그인하는 경우 계정 식별자, 인증 제공자 정보, 서비스 이용 상태 등 계정 운영에 필요한 정보가
            처리될 수 있습니다.
          </p>
        </PolicySection>

        <PolicySection title="2. 사용 기록과 서비스 운영 정보">
          <p>
            분석 요청 횟수, 사용량 제한 확인, 오류 대응, 부정 사용 방지, 서비스 안정성 개선을 위해 사용 기록과
            기술적 로그가 처리될 수 있습니다.
          </p>
          <p>
            이러한 정보는 서비스 운영, 보안, 장애 대응, abuse prevention을 위한 목적으로 사용됩니다.
          </p>
        </PolicySection>

        <PolicySection title="3. 쿠키와 광고 기술">
          <p>
            CHART VISION AI는 로그인 상태 유지, 서비스 품질 개선, 트래픽 분석, 광고 제공을 위해 쿠키 또는 유사한
            기술을 사용할 수 있습니다.
          </p>
          <p>
            Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 사용자의 이전 사이트 방문 기록 등을 기반으로 광고를
            게재할 수 있습니다.
          </p>
          <p>
            사용자는 브라우저 설정 또는 Google 광고 설정에서 맞춤형 광고 사용 여부를 관리할 수 있습니다.
          </p>
        </PolicySection>

        <PolicySection title="4. 정보 보관과 보호">
          <p>
            서비스 운영에 필요한 정보는 목적 달성에 필요한 기간 동안 보관될 수 있으며, 보안과 접근 통제를 통해
            보호됩니다. 법령 또는 서비스 운영상 필요한 경우에는 필요한 범위에서 보관될 수 있습니다.
          </p>
        </PolicySection>

        <PolicySection title="5. 사용자 유의사항과 문의">
          <p>
            사용자는 민감한 개인정보, 계좌 정보, 주민등록번호, 사적인 메시지 등이 포함된 이미지를 업로드하지 않아야 합니다.
          </p>
          <p>
            개인정보 관련 문의가 필요한 경우 서비스 내에 안내된 공식 연락 수단을 이용해 주세요. 별도의 공식 연락처가
            공지되지 않은 경우, 추후 제공되는 고객 지원 안내를 기준으로 합니다.
          </p>
        </PolicySection>
      </div>
    </main>
  );
}
