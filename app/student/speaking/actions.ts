'use server'

import { getSTTProvider } from '@/src/providers/stt'
import { getLLMEvalProvider } from '@/src/providers/llm-eval'
import { getPronunciationProvider } from '@/src/providers/pronunciation'
import { saveSpeakingEval } from '@/src/lib/mock/speaking-store'

export async function submitSpeaking(
  questionId: string,
  questionSetId: string,
): Promise<{ submissionId: string }> {
  const sttProvider = getSTTProvider()
  const llmProvider = getLLMEvalProvider()
  const pronunciationProvider = getPronunciationProvider()

  const mockBlob = new Blob([], { type: 'audio/webm' })
  const mockTranscript = '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.'

  const [sttResult, pronunciationResult, llmEvalResult] = await Promise.all([
    sttProvider.transcribe(mockBlob),
    pronunciationProvider.evaluate(mockBlob, mockTranscript),
    llmProvider.evaluate(mockTranscript, 'rubric-speaking-01'),
  ])

  const submissionId = `mock-${questionId}-${Date.now()}`

  saveSpeakingEval({
    submissionId,
    questionId,
    questionSetId,
    submittedAt: new Date().toISOString(),
    sttResult,
    llmEvalResult,
    pronunciationResult,
  })

  return { submissionId }
}
