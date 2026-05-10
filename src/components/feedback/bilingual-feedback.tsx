// 한국어 + 선택 언어(en/vi/ar) 단 두 가지로 피드백을 렌더링. 아랍어는 RTL.

import {
  isRTL,
  L1_LABEL_KO,
  type FeedbackLanguage,
} from '@/src/lib/feedback-language'

export interface BilingualFeedbackData {
  feedback_ko: string
  feedback_l1: string
}

interface Props {
  data: BilingualFeedbackData
  lang: FeedbackLanguage
  testId?: string
}

export function BilingualFeedback({ data, lang, testId }: Props) {
  return (
    <div className="grid gap-4" data-testid={testId}>
      <section data-testid="feedback-korean">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
          한국어
        </h4>
        <p
          className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed"
          lang="ko"
        >
          {data.feedback_ko}
        </p>
      </section>
      <section
        data-testid="feedback-native"
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
        lang={lang}
        style={isRTL(lang) ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
      >
        <h4
          className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5"
          dir="ltr"
        >
          {L1_LABEL_KO[lang]}
        </h4>
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {data.feedback_l1}
        </p>
      </section>
    </div>
  )
}
