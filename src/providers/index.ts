// Provider registry — server-side only.
// Call these functions from Route Handlers, not from Client Components.
export { getSTTProvider } from './stt'
export { getTTSProvider } from './tts'
export { getPronunciationProvider } from './pronunciation'
export { getLLMEvalProvider } from './llm-eval'
