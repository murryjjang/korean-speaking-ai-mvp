const STEPS = [
  { num: 1 as const, label: '제출물 확인' },
  { num: 2 as const, label: '점수 조정' },
  { num: 3 as const, label: '최종 확정' },
]

interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3
  isFinalized: boolean
}

export function WizardStepIndicator({ currentStep, isFinalized }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center mb-6">
      {STEPS.map((step, idx) => {
        const isDone = isFinalized || step.num < currentStep
        const isActive = !isFinalized && step.num === currentStep
        return (
          <div key={step.num} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0',
                  isDone
                    ? 'bg-success-500 text-white'
                    : isActive
                      ? 'bg-primary-700 text-white'
                      : 'bg-slate-200 text-slate-500',
                ].join(' ')}
              >
                {isDone ? '✓' : step.num}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap hidden sm:inline',
                  isActive
                    ? 'text-primary-700'
                    : isDone
                      ? 'text-success-700'
                      : 'text-text-muted',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'h-px flex-1 mx-2 sm:mx-3 min-w-4',
                  step.num < currentStep || isFinalized ? 'bg-success-500' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
