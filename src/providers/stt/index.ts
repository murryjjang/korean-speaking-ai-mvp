import type { STTProvider, STTResult } from '@/src/types/providers'

class MockSTTProvider implements STTProvider {
  async transcribe(_: Blob): Promise<STTResult> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      transcript:
        '안녕하세요. 저는 한국어를 배우고 있습니다. 잘 부탁드립니다.',
      confidence: 0.92,
      wordTimings: [
        { word: '안녕하세요', startMs: 0, endMs: 600 },
        { word: '저는', startMs: 700, endMs: 1000 },
        { word: '한국어를', startMs: 1100, endMs: 1600 },
        { word: '배우고', startMs: 1700, endMs: 2100 },
        { word: '있습니다', startMs: 2200, endMs: 2800 },
      ],
      providerName: 'mock',
      providerVersion: '1.0.0',
      latencyMs: 500,
    }
  }
}

const KOREAN_DICTATION_PROMPT =
  '학습자의 한국어 발화를 정확히 그대로 받아쓰세요. 문법 교정이나 자연스럽게 다듬지 말고 발화 그대로 옮기세요. 다만 뉴스 앵커 멘트·유튜브 outro는 환각이므로 출력하지 마세요.'

// v1.1 단계 19.18: STT_VERBATIM_PROMPT_ENABLED=true일 때만 적용되는 verbatim 강화 prompt.
// 기존 기본 prompt(KOREAN_DICTATION_PROMPT)는 "정확히 그대로"라 적혀 있으나
// gpt-4o-mini-transcribe의 의도된 정규화로 "마시써요" → "맛있어요" 같은 발음 정정이
// 관찰된다. 본 prompt는 (a) 학습자가 비원어민이라는 컨텍스트, (b) 한국어 채움말
// 예시 ("음/그/어"), (c) 실제 정정 사례 ("마시써요"→X "맛있어요", "항쿡"→X "한국")를
// 명시해 정정 hook을 약화시킨다. 효과는 모델·발화별 편차가 크고 (학술 보고: prompt
// 트릭은 hit-or-miss) 한국어 검증 사례가 거의 없어 사용자 시연으로만 확정 가능하다.
const KOREAN_VERBATIM_PROMPT =
  '학습자는 한국어를 배우는 비원어민입니다. ' +
  '들리는 발음 그대로 받아 적으세요. 어색한 발음, 머뭇거림, 채움말("음", "그", "어")을 그대로 유지하세요. ' +
  '정확한 표준어로 정정하지 마세요. ' +
  '예: "마시써요"는 "맛있어요"로 바꾸지 마세요. "항쿡"은 "한국"으로 바꾸지 마세요. "음... 그..."는 제거하지 마세요. ' +
  '다만 뉴스 앵커 멘트·유튜브 outro 같은 무관한 환각 텍스트는 출력하지 마세요.'

// 환경변수로 verbatim prompt를 켤지 결정. 기본은 OFF (회귀 영향 최소).
// 시연 시 .env.local에 STT_VERBATIM_PROMPT_ENABLED=true 설정해 효과 비교.
function getActivePrompt(): string {
  const raw = process.env.STT_VERBATIM_PROMPT_ENABLED
  const enabled = typeof raw === 'string' && raw.toLowerCase() === 'true'
  return enabled ? KOREAN_VERBATIM_PROMPT : KOREAN_DICTATION_PROMPT
}

// OpenAI Whisper STT — requires OPENAI_API_KEY.
// Throws on missing key or API failure so /api/stt falls back to mock.
class WhisperSTTProvider implements STTProvider {
  async transcribe(blob: Blob): Promise<STTResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('WhisperSTTProvider: OPENAI_API_KEY not set')
    }

    const startMs = Date.now()

    // Dynamic import keeps openai out of the client bundle
    const { default: OpenAI, toFile } = await import('openai')
    const client = new OpenAI({ apiKey })

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const audioFile = await toFile(buffer, 'audio.webm', {
      type: blob.type || 'audio/webm',
    })

    // Context prompt: signals the expected domain so Whisper anchors on learner
    // speech rather than fabricating news/YouTube outros from low-energy audio.
    // temperature: 0 — Whisper의 자체 보정 의지를 최소화해 학습자 발화를 그대로 받아쓴다.
    // 단계 19.18: STT_VERBATIM_PROMPT_ENABLED=true면 발음 정정 차단 강화 prompt 사용.
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ko',
      prompt: getActivePrompt(),
      temperature: 0,
    })

    const latencyMs = Date.now() - startMs

    return {
      transcript: response.text,
      confidence: 1.0,
      providerName: 'whisper',
      providerVersion: 'whisper-1',
      latencyMs,
    }
  }
}

// v1.1 단계 19.16: 자유 대화 STT 정확도 향상용. gpt-4o-mini-transcribe는
// whisper-1보다 환각·잡음 강건성 + 한국어 인식률이 높다는 OpenAI 보고가 있어
// 더 정확한 referenceText를 pronunciation-azure에 전달하기 위함이다.
// (whisper-1은 다른 호출부 호환을 위해 그대로 둔다.)
class OpenAITranscribeSTTProvider implements STTProvider {
  readonly modelName: string

  constructor(modelName: string = 'gpt-4o-mini-transcribe') {
    this.modelName = modelName
  }

  async transcribe(blob: Blob): Promise<STTResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAITranscribeSTTProvider: OPENAI_API_KEY not set')
    }

    const startMs = Date.now()

    const { default: OpenAI, toFile } = await import('openai')
    const client = new OpenAI({ apiKey })

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const audioFile = await toFile(buffer, 'audio.webm', {
      type: blob.type || 'audio/webm',
    })

    // gpt-4o-mini-transcribe도 동일 prompt/temperature API를 지원한다.
    // 단계 19.18: STT_VERBATIM_PROMPT_ENABLED=true면 발음 정정 차단 강화 prompt 사용.
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: this.modelName,
      language: 'ko',
      prompt: getActivePrompt(),
      temperature: 0,
    })

    const latencyMs = Date.now() - startMs

    return {
      transcript: response.text,
      confidence: 1.0,
      providerName: 'openai',
      providerVersion: this.modelName,
      latencyMs,
    }
  }
}

export type STTFeature = 'free-conversation' | 'default'

/**
 * STT provider 선택.
 *
 * feature='free-conversation'이면 FREE_CONVERSATION_STT_PROVIDER 환경변수를
 * 먼저 본다 (단계 19.16). 자유 대화는 NPC 응답·발음 평가 referenceText의
 * 정확도가 핵심이라 다른 호출부와 별도로 더 정확한 모델을 선택 가능하게 한다.
 *
 * 값:
 *   - 'mock'                                       → MockSTTProvider
 *   - 'whisper' | 'openai-whisper'                 → WhisperSTTProvider (whisper-1)
 *   - 'openai' | 'openai-transcribe' |
 *     'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe' → OpenAITranscribeSTTProvider
 *
 * 호환: 기존 STT_PROVIDER='openai'는 OpenAITranscribeSTTProvider로 매핑한다
 * (whisper-1보다 신모델이 기본. 명시적으로 whisper-1을 쓰려면 'whisper').
 */
export function getSTTProvider(feature: STTFeature = 'default'): STTProvider {
  const featureOverride =
    feature === 'free-conversation' ? process.env.FREE_CONVERSATION_STT_PROVIDER : undefined
  const providerName = (featureOverride ?? process.env.STT_PROVIDER ?? 'mock').toLowerCase()

  switch (providerName) {
    case 'whisper':
    case 'openai-whisper':
      return new WhisperSTTProvider()
    case 'openai':
    case 'openai-transcribe':
    case 'gpt-4o-mini-transcribe':
      return new OpenAITranscribeSTTProvider('gpt-4o-mini-transcribe')
    case 'gpt-4o-transcribe':
      return new OpenAITranscribeSTTProvider('gpt-4o-transcribe')
    case 'mock':
    default:
      return new MockSTTProvider()
  }
}
