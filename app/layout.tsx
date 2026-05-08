import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 주식 차트 분석 | 차트 이미지 무료 분석",
  description:
    "주식 차트 이미지를 업로드하면 AI가 지지선, 저항선, 패턴, 추세, 매매 후보 구간을 분석합니다.",
  keywords: [
    "AI 차트 분석",
    "주식 차트 분석",
    "차트 이미지 분석",
    "기술적 분석",
    "지지선 저항선",
    "주식 AI 분석",
  ],
  openGraph: {
    title: "AI 주식 차트 분석",
    description: "차트 이미지를 업로드하면 AI가 기술적 분석을 제공합니다.",
    url: "https://chart-umber.vercel.app/",
    siteName: "AI 주식 차트 분석",
    type: "website",
  },
  verification: {
    google: "NmkXlZGD_Zt8v2oYontUUxErWP2ru-fAtk3i_DHfekg",
    other: {
      "naver-site-verification": "4d2870f7dd55548f78db396d5af2d7295a211ae7",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
