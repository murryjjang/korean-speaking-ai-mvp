'use client'

// 대시보드 배너 (Task 1.6) — 오늘 진도·새 단어·모범답안 알림. 일자별 디스미스(localStorage).
// 위치: today-tasks 상단(default). 기본 렌더 언어 ko(다국어 라벨은 i18n-ready).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BANNER_LABELS,
  bannerBody,
  dismissKey,
  isBannerLang,
  type BannerLang,
  type BannerType,
} from '@/src/lib/i18n/banner-labels'

type BannerItem = { type: BannerType; n?: number; href: string }

export function DashboardBanner({
  vocabDueCount = 0,
  lang = 'ko',
}: {
  vocabDueCount?: number
  lang?: string
}) {
  const bl: BannerLang = isBannerLang(lang) ? lang : 'ko'
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

  // 표시 대상: progress 항상 · vocab(due>0) · model_answer 안내.
  const items: BannerItem[] = [
    { type: 'progress', href: '/student' },
    ...(vocabDueCount > 0 ? [{ type: 'vocab' as BannerType, n: vocabDueCount, href: '/student/vocab' }] : []),
    { type: 'model_answer', href: '/student' },
  ]
  const visible = items.filter((it) => !dismissed[it.type])
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2" data-testid="dashboard-banner">
      {visible.map((it) => {
        const label = BANNER_LABELS[bl][it.type]
        return (
          <div
            key={it.type}
            className="flex items-center justify-between gap-3 rounded border border-primary-100 bg-primary-50 px-4 py-2"
          >
            <Link href={it.href} className="flex flex-col">
              <span className="text-sm font-medium text-primary-700">{label.title}</span>
              <span className="text-xs text-text-muted">{bannerBody(label, it.n)}</span>
            </Link>
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
