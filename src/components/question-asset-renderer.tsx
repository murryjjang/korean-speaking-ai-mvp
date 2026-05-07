'use client'

import { useState, useRef, useCallback } from 'react'
import type { StudentVisibleAsset } from '@/src/content/assessment-assets'
import { useTTS } from '@/src/hooks/use-tts'

// --- Inline chart data (student-visible only, teacher-only fields never stored here) ---
const INLINE_CHART_DATA: Record<
  string,
  { rows: { label: string; value: number; unit: string }[]; maxValue: number }
> = {
  'intermediate-q2-material-description': {
    rows: [
      { label: '대면 수업', value: 50, unit: '%' },
      { label: '온라인 수업', value: 30, unit: '%' },
      { label: '혼합형 수업', value: 20, unit: '%' },
    ],
    maxValue: 100,
  },
  'advanced-q2-material-description': {
    rows: [
      { label: '2024', value: 120, unit: '명' },
      { label: '2025', value: 180, unit: '명' },
      { label: '2026', value: 260, unit: '명' },
    ],
    maxValue: 300,
  },
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

// --- Sub-renderers ---

function ImageAssetCard({ asset }: { asset: StudentVisibleAsset }) {
  // imgFailed tracks whether the image file returned a load error (e.g. 404).
  // When true, fall through to placeholder even when asset.src is non-empty.
  const [imgFailed, setImgFailed] = useState(false)

  if (asset.src && !imgFailed) {
    return (
      <div
        className="mt-4 rounded-md border border-border overflow-hidden"
        data-testid="image-asset-container"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.src}
          alt={asset.alt ?? asset.displayTitle}
          className="w-full object-cover"
          style={{ maxHeight: '280px' }}
          onError={() => setImgFailed(true)}
        />
        <p className="px-3 py-1.5 text-xs text-text-secondary text-center border-t border-border bg-surface">
          {asset.displayTitle}
        </p>
      </div>
    )
  }
  // 실제 사진이 없을 때 — placeholder 카드 (파일럿 전 교체 예정 안내 포함)
  return (
    <div
      className="mt-4 flex flex-col items-center justify-center gap-2.5 rounded-md border-2 border-dashed border-border bg-surface py-8 px-4"
      data-testid="image-asset-placeholder"
    >
      <span className="text-4xl" aria-hidden="true">🏪</span>
      <p className="text-sm font-semibold text-text-primary">{asset.displayTitle}</p>
      <p className="text-xs text-text-secondary text-center max-w-xs leading-relaxed">
        {asset.studentVisibleDescription}
      </p>
      {asset.status === 'placeholder' && (
        <p
          className="text-[10px] text-text-muted italic mt-1"
          data-testid="image-placeholder-notice"
        >
          임시 이미지 · 실제 사진 교체 예정
        </p>
      )}
    </div>
  )
}

function ChartAsset({
  questionId,
  title,
}: {
  questionId: string
  title: string
}) {
  const chart = INLINE_CHART_DATA[questionId]
  if (!chart) return null

  return (
    <div
      className="mt-4 rounded-md border border-border bg-surface p-4"
      data-testid="chart-asset"
    >
      <p className="text-xs font-semibold text-text-primary mb-3">{title}</p>

      {/* Visual bar chart */}
      <div className="space-y-2.5 mb-3">
        {chart.rows.map((row, i) => {
          const pct = Math.round((row.value / chart.maxValue) * 100)
          return (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-20 text-xs text-text-secondary text-right shrink-0">
                {row.label}
              </span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
              </div>
              <span
                className="w-16 text-xs font-semibold text-text-primary shrink-0"
                data-testid={`chart-value-${row.label}`}
              >
                {row.value}
                {row.unit}
              </span>
            </div>
          )
        })}
      </div>

      {/* Accessible table (visually hidden but in DOM for smoke tests) */}
      <table className="w-full text-xs border-collapse border-t border-border">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 pr-3 font-medium text-text-secondary">항목</th>
            <th className="text-right py-1 font-medium text-text-secondary">수치</th>
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <td className="py-1 pr-3 text-text-primary">{row.label}</td>
              <td className="py-1 text-right font-medium text-text-primary">
                {row.value}
                {row.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AudioAssetCard({
  asset,
  listenLimit,
}: {
  asset: StudentVisibleAsset
  listenLimit: number
}) {
  const [listenCount, setListenCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tts = useTTS()

  const hasAudio = Boolean(asset.src)
  const hasTTSScript = Boolean(asset.ttsScript)
  const limitReached = listenCount >= listenLimit

  const handlePlay = useCallback(() => {
    if (!hasAudio || limitReached) return
    setListenCount((c) => c + 1)
    audioRef.current?.play().catch(() => {})
  }, [hasAudio, limitReached])

  const handleTTSPlay = useCallback(() => {
    if (!hasTTSScript || limitReached) return
    setListenCount((c) => c + 1)
    tts.play(asset.ttsScript!, asset.questionId, 'listening-tts')
  }, [hasTTSScript, limitReached, tts, asset.ttsScript, asset.questionId])

  const isTTSActive = tts.state === 'loading' || tts.state === 'playing'

  const buttonLabel = limitReached
    ? '듣기 완료'
    : hasAudio
      ? '문제 듣기'
      : hasTTSScript
        ? isTTSActive ? '재생 중...' : '듣기 재생'
        : '음원 준비 중'

  const buttonEnabled = !limitReached && (hasAudio || (hasTTSScript && !isTTSActive))

  const handleButtonClick = hasAudio ? handlePlay : handleTTSPlay

  return (
    <div
      className="mt-4 rounded-md border border-border bg-surface p-4"
      data-testid="listening-asset-card"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base" aria-hidden="true">🔈</span>
        <p className="text-xs font-semibold text-text-primary">{asset.displayTitle}</p>
      </div>

      {hasAudio && <audio ref={audioRef} src={asset.src} preload="metadata" />}

      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={!buttonEnabled}
          data-testid="listen-button"
          className={[
            'text-xs px-3 py-1.5 rounded border transition-colors',
            buttonEnabled
              ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
              : 'border-border bg-surface text-text-muted cursor-not-allowed opacity-60',
          ].join(' ')}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
        <span
          className="text-xs text-text-muted"
          data-testid="listen-count"
        >
          들은 횟수: {listenCount} / {listenLimit}
        </span>
      </div>

      {!hasAudio && hasTTSScript && (
        <p className="text-xs text-blue-600" data-testid="audio-tts-fallback-notice">
          현재 음원은 임시 TTS 음성입니다. 파일럿 전 실제 녹음본으로 교체 예정입니다.
        </p>
      )}
      {!hasAudio && !hasTTSScript && (
        <p className="text-xs text-blue-600" data-testid="audio-not-ready">
          듣기 음원은 파일럿 전 등록 예정입니다.
        </p>
      )}
    </div>
  )
}

// --- Main export ---

export function QuestionAssetRenderer({
  questionId,
  assetMeta,
  listenLimit,
}: {
  questionId: string
  assetMeta: StudentVisibleAsset | undefined
  listenLimit?: number
}) {
  if (!assetMeta || assetMeta.assetType === 'none') return null

  switch (assetMeta.assetType) {
    case 'image':
      return <ImageAssetCard asset={assetMeta} />
    case 'chart':
      return <ChartAsset questionId={questionId} title={assetMeta.displayTitle} />
    case 'audio':
      return (
        <AudioAssetCard
          asset={assetMeta}
          listenLimit={listenLimit ?? 2}
        />
      )
    case 'dialogue_profile':
      // dialogue_profile 렌더링은 SpeakingClient의 dialogue_mission 카드에서 처리
      return null
    default:
      return null
  }
}
