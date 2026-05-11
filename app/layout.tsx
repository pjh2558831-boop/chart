import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

const siteUrl = "https://www.chartvisionai.site";
const seoTitle = "CHART VISION AI | AI 주식 차트 분석";
const seoDescription =
  "차트 이미지를 업로드하면 AI가 추세, 지지선, 저항선, 패턴을 분석합니다.";
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CHART VISION AI",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seoTitle,
  description: seoDescription,
  keywords: [
    "CHART VISION AI",
    "AI 주식 차트 분석",
    "차트 이미지 분석",
    "주식 차트 분석",
    "지지선 저항선",
    "기술적 분석",
    "RSI 분석",
    "MACD 분석",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    url: siteUrl,
    siteName: "CHART VISION AI",
    images: [
      {
        url: `${siteUrl}/logo.png`,
        width: 1200,
        height: 630,
        alt: "CHART VISION AI",
      },
    ],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
  },
  verification: {
    google: "cdgS99SDtWbWNT8XcWAaiszDs6nGgjGuzua_uQbcDPM",
    other: {
      "naver-site-verification": "9b8c1c6deb5d2ee5b7d3f17d4feb602e84988611",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5178506221455818"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
