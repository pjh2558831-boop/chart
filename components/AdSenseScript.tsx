"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const ADSENSE_CLIENT_ID = "ca-pub-5178506221455818";

function isAdsenseAllowedPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/" || pathname === "/guide" || pathname === "/privacy" || pathname === "/terms" || pathname === "/disclaimer";
}

export default function AdSenseScript() {
  const pathname = usePathname();

  if (!isAdsenseAllowedPath(pathname)) return null;

  return (
    <Script
      id="adsense-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
