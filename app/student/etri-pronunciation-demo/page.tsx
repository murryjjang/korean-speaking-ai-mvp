import Link from 'next/link'
import { PageHeader, Card, CardHeader, CardBody, Badge } from '@/src/components/ui'
import { computeEtriWordDiff } from '@/src/lib/etri-word-diff'

const DEMO_SCRIPT =
  '안녕하세요. 저는 오늘 오후에 병원에 갑니다. 병원에 가기 전에 약국에 들를 예정입니다.'

interface DemoSample {
  id: string
  label: string
  rawScore: number
  normalizedScore: number
  recognized: string
  correctionPoints: string[]
  retryLine: string | null
}

const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'good',
    label: '좋은 발음 샘플',
    rawScore: 4.6,
    normalizedScore: 92,
    recognized:
      '안녕하세요 저는 오늘 오후에 병원에 갑니다 병원에 가기 전에 약국에 들를 예정입니다',
    correctionPoints: [],
    retryLine: null,
  },
  {
    id: 'correction',
    label: '교정이 필요한 발음 샘플',
    rawScore: 2.3,
    normalizedScore: 46,
    recognized:
      '안녕하세요 저는 오늘 오후에 병원에 갑니다 병원에 가기 전에 약구게 들 예정입니다',
    correctionPoints: [
      '"약국에"의 받침 ㄱ과 조사 "에"의 연음이 약하게 들렸습니다.',
      '"들를"에서 받침 ㄹ의 연음 발음을 더 명확히 해보세요.',
    ],
    retryLine: '약국에 들를 예정입니다.',
  },
]

function scoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

function DiffDisplay({
  reference,
  recognized,
  sampleId,
}: {
  reference: string
  recognized: string
  sampleId: string
}) {
  const { refTokens, recTokens, mismatchedRefWords } = computeEtriWordDiff(reference, recognized)
  const hasMismatch = mismatchedRefWords.length > 0

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
          제시문
        </p>
        <p className="text-sm leading-relaxed font-mono bg-surface border border-border rounded px-3 py-2">
          {refTokens.map((tok, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span
                className={tok.matched ? 'text-text-primary' : 'text-danger-600 font-semibold underline decoration-wavy decoration-danger-400'}
                data-testid={!tok.matched ? `ref-mismatch-${sampleId}` : undefined}
              >
                {tok.text}
              </span>
            </span>
          ))}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
          ETRI 인식 결과
        </p>
        <p className="text-sm leading-relaxed font-mono bg-surface border border-border rounded px-3 py-2">
          {recTokens.map((tok, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span
                className={tok.matched ? 'text-text-primary' : 'text-danger-600 font-semibold underline decoration-wavy decoration-danger-400'}
                data-testid={!tok.matched ? `rec-mismatch-${sampleId}` : undefined}
              >
                {tok.text}
              </span>
            </span>
          ))}
        </p>
      </div>

      {hasMismatch ? (
        <p
          className="text-xs text-danger-600"
          data-testid={`mismatch-summary-${sampleId}`}
        >
          제시문과 다른 부분: {mismatchedRefWords.map((w) => `"${w}"`).join(', ')}
        </p>
      ) : (
        <p
          className="text-xs text-success-600"
          data-testid={`mismatch-summary-${sampleId}`}
        >
          제시문과 다른 부분: 없음
        </p>
      )}
    </div>
  )
}

function DemoCard({ sample }: { sample: DemoSample }) {
  const isGood = sample.correctionPoints.length === 0

  return (
    <Card data-testid={`demo-card-${sample.id}`}>
      <CardHeader
        title={sample.label}
        action={
          <Badge variant="warning" size="sm">
            시연용 샘플
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        {/* ETRI 점수 */}
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-[11px] text-text-muted block mb-0.5">ETRI 원점수</span>
            <span
              className="text-2xl font-bold text-text-primary tabular-nums"
              data-testid={`raw-score-${sample.id}`}
            >
              {sample.rawScore.toFixed(1)}
            </span>
            <span className="text-sm text-text-muted ml-0.5">/ 5</span>
          </div>
          <div>
            <span className="text-[11px] text-text-muted block mb-0.5">환산점수</span>
            <span
              className="text-2xl font-bold tabular-nums"
              data-testid={`normalized-score-${sample.id}`}
            >
              <Badge variant={scoreVariant(sample.normalizedScore)} size="md">
                {sample.normalizedScore}
              </Badge>
            </span>
            <span className="text-sm text-text-muted ml-1">/ 100</span>
          </div>
        </div>

        {/* 제시문 / 인식 결과 / 다른 부분 */}
        <DiffDisplay
          reference={DEMO_SCRIPT}
          recognized={sample.recognized}
          sampleId={sample.id}
        />

        {/* 교정 포인트 */}
        {isGood ? (
          <div
            className="p-3 bg-success-50 border border-success-200 rounded-md"
            data-testid="correction-points-good"
          >
            <p className="text-xs text-success-700 font-semibold mb-0.5">교정 포인트 없음</p>
            <p className="text-xs text-success-600">
              ETRI 점수와 인식 결과 기반 추정: 제시문과 인식 결과가 일치합니다.
            </p>
          </div>
        ) : (
          <div
            className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2"
            data-testid={`correction-points-${sample.id}`}
          >
            <p
              className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide"
              data-testid="etri-estimation-notice"
            >
              ETRI 점수와 인식 결과 기반 추정 교정 포인트
            </p>
            <ul className="space-y-1.5">
              {sample.correctionPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="shrink-0 text-amber-500 font-bold mt-0.5">•</span>
                  <span className="text-xs text-amber-800">{pt}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-amber-700 italic">
              ※ ETRI가 음절별 오류를 직접 반환한 것이 아니라, ETRI 점수와 인식 결과를 바탕으로
              앱이 추정한 교정 포인트입니다.
            </p>
          </div>
        )}

        {/* 다시 말해보기 */}
        {sample.retryLine && (
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
              다시 말해보기
            </p>
            <p
              className="text-sm font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded px-3 py-2"
              data-testid={`retry-line-${sample.id}`}
            >
              {sample.retryLine}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default function EtriPronunciationDemoPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/student/speaking"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← 말하기 평가
        </Link>
      </div>

      <PageHeader
        title="ETRI 발음교정 데모"
        description="ETRI 연동 방식 비교 및 후속 검토용 · 현재 q1 공식 낭독 평가는 Azure 발음평가 중심으로 전환되었습니다."
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Azure 전환 안내 */}
        <Card>
          <CardBody>
            <div
              className="flex items-start gap-3"
              data-testid="azure-transition-notice"
            >
              <Badge variant="info">Azure 전환 완료</Badge>
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">
                  현재 q1 공식 낭독 평가는 Azure 발음평가 중심으로 전환되었습니다.
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  이 화면은 ETRI 발음교정 연동 방식 비교 및 후속 검토용으로 유지됩니다.
                  실제 q1 평가 결과는 말하기 평가 결과 화면에서 확인하세요.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 상단 안내 */}
        <Card>
          <CardBody>
            <div
              className="flex items-start gap-3"
              data-testid="demo-notice-banner"
            >
              <Badge variant="warning">시연용 데모</Badge>
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">
                  이 화면은 ETRI 발음평가 연동 방식과 발음 교정 흐름을 보여주는 시연용 데모입니다.
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  실제 평가 점수에는 반영되지 않습니다. 아래 샘플은 데모 데이터입니다.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ETRI 연결 상태 안내 */}
        <Card>
          <CardBody>
            <p
              className="text-xs text-text-muted leading-relaxed"
              data-testid="etri-live-status-note"
            >
              실시간 ETRI 호출은 현재 연결 확인 중입니다. 아래는 시연용 샘플 결과입니다.
              실시간 ETRI 호출이 성공한 경우에도 동일한 형식으로 원점수·환산점수·인식 결과·교정
              포인트가 표시됩니다.
            </p>
          </CardBody>
        </Card>

        {/* 제시문 */}
        <Card>
          <CardHeader title="평가 제시문" />
          <CardBody>
            <p
              className="text-sm text-text-primary leading-relaxed font-mono bg-surface border border-border rounded px-3 py-2"
              data-testid="demo-reference-script"
            >
              {DEMO_SCRIPT}
            </p>
          </CardBody>
        </Card>

        {/* 데모 카드 2개 */}
        {DEMO_SAMPLES.map((sample) => (
          <DemoCard key={sample.id} sample={sample} />
        ))}

        {/* 하단 안내 */}
        <Card>
          <CardBody>
            <p className="text-xs text-text-muted leading-relaxed">
              <strong>참고:</strong> 발음 오류 위치는 ETRI score와 인식 결과(recognized)를 바탕으로
              앱에서 추정합니다. 정밀 음소 단위 발음 교정은 후속 단계에서 검토 예정입니다.
            </p>
          </CardBody>
        </Card>

        <div className="pb-4">
          <Link
            href="/student/speaking"
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors text-sm px-4 min-h-[44px] rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300"
          >
            말하기 평가로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
