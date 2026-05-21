'use client'

// 단어장 퀴즈 — 주관식 recall + 0-5 자가채점(Anki식, D-012b).
// 흐름: 어휘(앞면) → 떠올림 → 정답 확인(gloss·예문·발음 TTS) → 0-5 자가채점 → SM-2 갱신 → 다음.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardBody, CardHeader, Badge } from '@/src/components/ui'
import { useTTS } from '@/src/hooks/use-tts'

type QuizCard = { id: string; term_id: string; term: string; cefr_level: string }
type Gloss = { gloss: string | null; example_ko?: string; example_translated?: string }

const RATINGS = [
  { q: 0, label: '모름', cls: 'bg-danger-50 text-danger-700 border-danger-100' },
  { q: 1, label: '거의 모름', cls: 'bg-danger-50 text-danger-700 border-danger-100' },
  { q: 2, label: '어렴풋이', cls: 'bg-warning-50 text-warning-700 border-warning-100' },
  { q: 3, label: '겨우 기억', cls: 'bg-warning-50 text-warning-700 border-warning-100' },
  { q: 4, label: '기억함', cls: 'bg-success-50 text-success-700 border-success-100' },
  { q: 5, label: '완벽', cls: 'bg-success-50 text-success-700 border-success-100' },
]

export function VocabQuizClient({ lang = 'en' }: { lang?: string }) {
  const [cards, setCards] = useState<QuizCard[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [gloss, setGloss] = useState<Gloss | null>(null)
  const [glossLoading, setGlossLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { play, state: ttsState } = useTTS()

  useEffect(() => {
    let alive = true
    fetch('/api/vocab/due')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setCards(d.cards ?? []))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'load_failed'))
    return () => {
      alive = false
    }
  }, [])

  const current = cards && idx < cards.length ? cards[idx] : null

  const reveal = useCallback(async () => {
    if (!current) return
    setRevealed(true)
    setGlossLoading(true)
    try {
      const r = await fetch('/api/vocab/gloss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term_id: current.term_id, lang }),
      })
      setGloss(await r.json())
    } catch {
      setGloss({ gloss: null })
    } finally {
      setGlossLoading(false)
    }
  }, [current, lang])

  const rate = useCallback(
    async (quality: number) => {
      if (!current || reviewing) return
      setReviewing(true)
      try {
        await fetch('/api/vocab/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_id: current.id, quality }),
        })
      } catch {
        /* best-effort — 다음 카드로 진행 */
      }
      setReviewed((n) => n + 1)
      setIdx((i) => i + 1)
      setRevealed(false)
      setGloss(null)
      setReviewing(false)
    },
    [current, reviewing],
  )

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-text-muted">단어장을 불러오지 못했어요 ({error}). 로그인 상태를 확인해 주세요.</p>
        </CardBody>
      </Card>
    )
  }
  if (cards === null) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-text-muted">불러오는 중…</p>
        </CardBody>
      </Card>
    )
  }
  if (cards.length === 0 || !current) {
    return (
      <Card>
        <CardHeader title="복습 완료" description={`오늘 ${reviewed}개를 복습했어요. 수고했어요!`} />
        <CardBody>
          <Link
            href="/student/vocab"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors px-4 py-2 text-sm rounded bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
          >
            단어장으로
          </Link>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title={`복습 ${idx + 1} / ${cards.length}`} description="뜻을 떠올린 뒤 ‘정답 확인’을 누르세요." />
      <CardBody>
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-text-primary">{current.term}</span>
            {current.cefr_level && <Badge variant="info">{current.cefr_level}</Badge>}
            <button
              type="button"
              onClick={() => play(current.term)}
              aria-label="발음 듣기"
              className="px-2 py-1 text-sm rounded border border-border-strong bg-surface hover:bg-surface-raised"
            >
              {ttsState === 'playing' ? '🔊…' : '🔊'}
            </button>
          </div>

          {!revealed ? (
            <button
              type="button"
              onClick={reveal}
              className="px-4 py-2 text-sm rounded bg-primary-700 text-white hover:bg-primary-800 border border-primary-700"
            >
              정답 확인
            </button>
          ) : (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full max-w-md text-center">
                {glossLoading ? (
                  <p className="text-sm text-text-muted">뜻 불러오는 중…</p>
                ) : gloss?.gloss ? (
                  <>
                    <p className="text-base font-medium text-text-primary">{gloss.gloss}</p>
                    {gloss.example_ko && <p className="mt-2 text-sm text-text-primary">{gloss.example_ko}</p>}
                    {gloss.example_translated && (
                      <p className="text-xs text-text-muted">{gloss.example_translated}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-text-muted">뜻 정보를 준비 중입니다.</p>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
                {RATINGS.map((r) => (
                  <button
                    key={r.q}
                    type="button"
                    disabled={reviewing}
                    onClick={() => rate(r.q)}
                    className={`px-2 py-2 text-xs rounded border disabled:opacity-50 ${r.cls}`}
                  >
                    <span className="block font-semibold">{r.q}</span>
                    <span className="block">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
