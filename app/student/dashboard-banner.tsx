'use client'

// 대시보드 배너 (Task 1.6) — 오늘 진도·새 단어·모범답안 알림. 일자별 디스미스(localStorage).
// 위치: today-tasks 상단(default). 본문 한국어 고정 + mother_tongue 보조 병기(진척 페이지 <Localized> 패턴).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BANNER_LABELS,
  bannerBody,
  buildBannerItems,
  dismissKey,
  resolveBannerLang,
  type BannerType,
} from '@/src/lib/i18n/banner-labels'

// '#anchor' href → 같은 페이지 부드러운 스크롤. 학습 시작 영역은 모바일/데스크톱 두 인스턴스
// (progress page 단계19.13·19.14)라 id 대신 data-scroll-target 으로 표시하고, 화면에 보이는
// (offsetParent!=null) 인스턴스로 스크롤한다.
function scrollToSamePageTarget(key: string): void {
  if (typeof document === 'undefined') return
  const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-scroll-target="${key}"]`))
  const target = targets.find((el) => el.offsetParent !== null) ?? targets[0]
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function DashboardBanner({
  vocabDueCount = 0,
  lang = 'ko',
  hrefs,
}: {
  vocabDueCount?: number
  lang?: string
  // 흐름별 목적지 주입(미지정 시 정식 학생 흐름 기본값). null = 클릭 비활성.
  hrefs?: Partial<Record<BannerType, string | null>>
}) {
  const bl = resolveBannerLang(lang)
  // 병기: 본문 ko 고정 + bl≠ko 일 때만 모국어 보조(진척 페이지 <Localized> 와 동일 규칙).
  const showSupplement = bl !== 'ko'
  const rtl = bl === 'ar'
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})

  // 클라이언트에서 오늘 디스미스 상태 로드.
  // React 19 set-state-in-effect 룰 회피: queueMicrotask로 미뤄 cascading render 방지
  // (free-conversation-client 등 기존 관례와 동일).
  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const t of ['progress', 'vocab', 'model_answer'] as BannerType[]) {
      try {
        if (localStorage.getItem(dismissKey(t)) === '1') next[t] = true
      } catch {
        /* localStorage 불가 환경 무시 */
      }
    }
    if (Object.keys(next).length > 0) queueMicrotask(() => setDismissed(next))
  }, [])

  const dismiss = (t: BannerType) => {
    try {
      localStorage.setItem(dismissKey(t), '1')
    } catch {
      /* 무시 */
    }
    setDismissed((d) => ({ ...d, [t]: true }))
  }

  // 표시 대상: progress 항상 · vocab(due>0) · model_answer 안내. (목적지는 hrefs 로 주입)
  const items = buildBannerItems(vocabDueCount, hrefs)
  const visible = items.filter((it) => !dismissed[it.type])
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2" data-testid="dashboard-banner">
      {visible.map((it) => {
        const koLabel = BANNER_LABELS.ko[it.type]
        const supLabel = showSupplement ? BANNER_LABELS[bl][it.type] : null
        const inner = (
          <>
            <span className="text-sm font-medium text-primary-700" lang="ko">
              {koLabel.title}
            </span>
            <span className="text-xs text-text-muted" lang="ko">
              {bannerBody(koLabel, it.n)}
            </span>
            {/* mother_tongue 보조 병기 — 작고 muted (진척 페이지 보조 영역과 동일 톤). ar 은 RTL 격리. */}
            {supLabel && (
              <span
                className="block mt-0.5 text-xs text-text-muted opacity-80 leading-snug"
                dir={rtl ? 'rtl' : undefined}
                lang={bl}
                style={rtl ? { unicodeBidi: 'isolate', textAlign: 'start' } : { unicodeBidi: 'isolate' }}
                data-bilingual-supplement={bl}
              >
                {supLabel.title} · {bannerBody(supLabel, it.n)}
              </span>
            )}
          </>
        )
        const href = it.href
        const anchorKey = href && href.startsWith('#') ? href.slice(1) : null
        return (
          <div
            key={it.type}
            className="flex items-center justify-between gap-3 rounded border border-primary-100 bg-primary-50 px-4 py-2"
          >
            {/* href: null=클릭 비활성 / '#…'=같은 페이지 앵커(smooth scroll) / 그 외=라우트 이동. */}
            {href == null ? (
              <div className="flex flex-col">{inner}</div>
            ) : anchorKey ? (
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSamePageTarget(anchorKey)
                }}
                className="flex flex-col"
              >
                {inner}
              </a>
            ) : (
              <Link href={href} className="flex flex-col">
                {inner}
              </Link>
            )}
            <button
              type="button"
              onClick={() => dismiss(it.type)}
              aria-label="배너 닫기"
              className="text-text-muted hover:text-text-primary text-sm px-1"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
