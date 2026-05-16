// v1.1 단계 19 [G]: PDF 생성 e2e smoke 페이지.
//
// 단계 18에서 단위 테스트는 통과했지만 실제 브라우저에서 모든 PDF가 실패한
// 회귀가 있었다. 이 페이지는 운영 데이터 없이도 PdfDownloadButton + dom-to-pdf
// 경로를 실제 브라우저에서 검증하기 위한 dev/smoke 전용 페이지. Playwright는
// 다운로드 이벤트를 가로채 PDF 매직 바이트와 페이지 수를 확인한다.
//
// 운영 노출 차단: NODE_ENV === 'production'이면 404.

import { notFound } from 'next/navigation'

import { PdfDownloadButton } from '@/src/components/pdf-download-button'

export const dynamic = 'force-dynamic'

export default function PdfSmokePage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">PDF Smoke</h1>
          <PdfDownloadButton
            targetId="pdf-smoke-target"
            fileName="pdf-smoke.pdf"
            label="PDF 다운로드"
          />
        </header>

        <section
          id="pdf-smoke-target"
          data-testid="pdf-smoke-target"
          className="bg-surface-raised rounded-lg p-6 space-y-4 border border-border"
        >
          <h2 className="text-xl font-semibold text-text-primary">한국어·English·Tiếng Việt·العربية</h2>
          <p className="text-text-secondary">
            Tailwind v4 oklch 팔레트 사용. 색상이 잘 캡처되는지 검증한다.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary-100 text-primary-700 p-3 rounded">primary</div>
            <div className="bg-success-100 text-success-700 p-3 rounded">success</div>
            <div className="bg-warning-100 text-warning-700 p-3 rounded">warning</div>
            <div className="bg-danger-100 text-danger-700 p-3 rounded">danger</div>
            <div className="bg-slate-100 text-slate-700 p-3 rounded">slate (oklch)</div>
            <div className="bg-red-100 text-red-700 p-3 rounded">red (oklch)</div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-text-secondary border-b border-border">
              <tr>
                <th className="text-left py-2">항목</th>
                <th className="text-right py-2">점수</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-2 text-text-primary">정확도</td>
                <td className="py-2 text-right font-semibold">82</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2 text-text-primary">유창성</td>
                <td className="py-2 text-right font-semibold">75</td>
              </tr>
              <tr>
                <td className="py-2 text-text-primary">완성도</td>
                <td className="py-2 text-right font-semibold">88</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
