import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI 주식 차트 이미지 분석",
  description: "차트 이미지를 업로드하면 AI가 이미지에서 보이는 구조와 기술적 후보 구간을 분석합니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-adsense-account" content="ca-pub-5178506221455818" />
      </head>
      <body>{children}</body>
    </html>
  );
}
