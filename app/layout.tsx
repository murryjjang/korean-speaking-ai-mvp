import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { DirHtmlSync } from "@/src/components/i18n/dir-html-sync";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// v1.1 단계 19.5 [P]: 아랍어 학습자용 폰트 임베드.
// Pretendard에는 아랍어 글리프가 없어 시스템 폴백으로 떨어지면 html2canvas-pro
// 캡처 시 글자 분리·반전(shaping 깨짐)이 발생. next/font로 self-host해 모든
// 환경에서 동일한 ligature/joining이 보장되도록 한다.
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
