import { getPersonasByMode } from '@/src/lib/personas'

export default function ConversationPracticePage() {
  const practicePersonas = getPersonasByMode('practice')

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">생성형 대화연습</h1>
        <p className="text-sm text-text-secondary mt-1">
          AI 페르소나와 자유롭게 한국어 대화를 연습합니다. 문법, 표현, 어휘 질문을 자유롭게 할 수 있습니다.
        </p>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
        <p className="text-sm font-semibold text-blue-700 mb-1">연습 모드 안내</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>문법·표현·어휘·발음 질문 자유롭게 가능</li>
          <li>AI가 코치처럼 예문과 설명을 제공합니다</li>
          <li>역할극과 질의응답을 자연스럽게 오갈 수 있습니다</li>
          <li>평가 없음 — 학습 피드백 중심</li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">페르소나 선택</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {practicePersonas.map((persona) => (
            <div
              key={persona.personaId}
              className="rounded-lg border border-border bg-surface-raised p-4 opacity-60 cursor-not-allowed"
              title="준비 중"
              data-testid={`persona-card-${persona.personaId}`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-text-primary">{persona.nameKo}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                  준비 중
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{persona.role}</p>
              <p className="text-xs text-text-muted">{persona.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {persona.scenarioExamples.slice(0, 2).map((ex) => (
                  <span
                    key={ex}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-text-muted"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
        <p className="text-xs text-amber-700">
          생성형 대화연습은 현재 구현 준비 중입니다. 페르소나 선택 후 자유 대화를 시작하는 기능은 다음 단계에서 제공됩니다.
        </p>
      </div>
    </div>
  )
}
