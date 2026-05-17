import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { DirHtmlSync } from "@/src/components/i18n/dir-html-sync";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// v1.1 단계 19.5 [P] / 19.9 유지: 아랍어 학습자용 폰트 임베드 (next/font self-host).
// 19.5에서 html2canvas-pro 캡처 시 shaping 깨짐을 막을 목적으로 도입.
// 19.9에서 PDF는 Puppeteer 서버사이드 렌더로 전환됐으나, 화면 표시(웹·동의서)에서도
// Pretendard에 없는 아랍어 글리프를 self-host로 제공하기 위해 그대로 유지.
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 한국어 말하기 훈련·평가",
  description: "외국어로서의 한국어 말하기 훈련 및 AI 기반 평가 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <DirHtmlSync />
        {children}
      </body>
    </html>
  );
}
