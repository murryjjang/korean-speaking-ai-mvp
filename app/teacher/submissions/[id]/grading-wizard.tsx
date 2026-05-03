'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/src/components/ui'
import type { GradingWizardData, TeacherEvalDraft } from '@/src/types/grading'
import { WizardStepIndicator } from './wizard-step-indicator'
import { StepSubmissionView } from './step-submission-view'
import { StepRubricAdjust } from './step-rubric-adjust'
import { StepFinalFeedback } from './step-final-feedback'
import { finalizeTeacherEvaluation } from './actions'

function buildInitialDraft(data: GradingWizardData): TeacherEvalDraft {
  const { existingTeacherEval, aiEval, rubricItems } = data

  if (existingTeacherEval) {
    return {
      scores: { ...existingTeacherEval.scores },
      adjustmentReasons: [...existingTeacherEval.adjustmentReasons],
      privateNote: existingTeacherEval.privateNote,
      publicComment: existingTeacherEval.publicComment,
      strengths: existingTeacherEval.strengths ?? '',
      improvements: existingTeacherEval.improvements ?? '',
      nextActivity: existingTeacherEval.nextActivity ?? '',
    }
  }

  if (aiEval) {
    return {
      scores: { ...aiEval.scores },
      adjustmentReasons: [],
      privateNote: '',
      publicComment: '',
      strengths: '',
      improvements: '',
      nextActivity: '',
    }
  }

  const scores: Record<string, number> = {}
  for (const item of rubricItems) {
    scores[item.id] = 0
  }
  return {
    scores,
    adjustmentReasons: [],
    privateNote: '',
    publicComment: '',
    strengths: '',
    improvements: '',
    nextActivity: '',
  }
}

interface GradingWizardProps {
  data: GradingWizardData
}

export function GradingWizard({ data }: GradingWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [draft, setDraft] = useState<TeacherEvalDraft>(() => buildInitialDraft(data))
  const [isFinalized, setIsFinalized] = useState(data.isAlreadyFinalized)

  function handleFinalize() {
    if (!data.aiEval) return
    startTransition(async () => {
      await finalizeTeacherEvaluation(data.submission.id, data.aiEval!.id, draft)
      setIsFinalized(true)
    })
  }

  function handleBackToList() {
    router.push('/teacher/submissions')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {isFinalized && (
        <div className="p-3 bg-warning-50 border border-warning-100 rounded-lg flex items-center gap-2">
          <span className="text-warning-700 font-bold shrink-0">🔒</span>
          <p className="text-sm text-warning-700">
            이미 확정된 평가입니다. 수정하려면 확정 해제 권한이 필요합니다.
          </p>
        </div>
      )}
      <WizardStepIndicator currentStep={currentStep} isFinalized={isFinalized} />

      {currentStep === 1 && (
        <StepSubmissionView data={data} onNext={() => setCurrentStep(2)} />
      )}

      {currentStep === 2 && (
        <StepRubricAdjust
          data={data}
          draft={draft}
          onDraftChange={setDraft}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
          isFinalized={isFinalized}
        />
      )}

      {currentStep === 3 && (
        <StepFinalFeedback
          data={data}
          draft={draft}
          onDraftChange={setDraft}
          onBack={() => setCurrentStep(2)}
          onFinalize={handleFinalize}
          isPending={isPending}
          isFinalized={isFinalized}
        />
      )}

      {isFinalized && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={handleBackToList}>
            ← 목록으로 돌아가기
          </Button>
        </div>
      )}
    </div>
  )
}
