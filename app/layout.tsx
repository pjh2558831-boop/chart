import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI 주식 차트 이미지 분석",
  description: "차트 이미지를 업로드하면 AI가 이미지에서 보이는 추세와 패턴 후보를 분석합니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
