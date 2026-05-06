export type AudioStats = {
  avgRms: number
  maxRms: number
  voicedMs: number
  speechRatio: number
  sampledFrames: number
}

export type AudioValidationReason =
  | 'audio_too_short'
  | 'audio_too_small'
  | 'audio_too_quiet'
  | 'no_voice_detected'

export type AudioValidationResult =
  | { valid: true }
  | { valid: false; reason: AudioValidationReason }

// Mirror the same constants used in speaking-client.tsx and dialogue-mission-panel.tsx
const MIN_DURATION_SEC = 2
const MIN_BLOB_SIZE = 3000

// RMS thresholds — tuned to block complete silence without being too aggressive.
// maxRms < 0.003 means essentially no audio energy at all.
const SILENCE_MAX_RMS = 0.003
// voicedMs < 400 with enough samples indicates no actual voice activity.
const MIN_VOICED_MS = 400
// speechRatio < 0.05 means < 5% of frames had any voice — almost certainly silent.
const MIN_SPEECH_RATIO = 0.05

export function validateRecordedAudio({
  durationSec,
  blobSize,
  audioStats,
}: {
  durationSec: number
  blobSize: number | null
  audioStats?: AudioStats | null
}): AudioValidationResult {
  if (durationSec < MIN_DURATION_SEC) {
    return { valid: false, reason: 'audio_too_short' }
  }
  if (blobSize !== null && blobSize < MIN_BLOB_SIZE) {
    return { valid: false, reason: 'audio_too_small' }
  }
  if (audioStats) {
    const silenceResult = checkSilence(audioStats)
    if (silenceResult !== null) return silenceResult
  }
  return { valid: true }
}

function checkSilence(stats: AudioStats): { valid: false; reason: AudioValidationReason } | null {
  // Complete silence: max energy is essentially zero
  if (stats.maxRms < SILENCE_MAX_RMS) {
    return { valid: false, reason: 'audio_too_quiet' }
  }
  // Not enough voiced frames detected — requires at least 5 samples to avoid false positives
  if (stats.sampledFrames >= 5 && stats.voicedMs < MIN_VOICED_MS) {
    return { valid: false, reason: 'no_voice_detected' }
  }
  // Very low speech ratio — requires enough samples to be meaningful
  if (stats.sampledFrames >= 10 && stats.speechRatio < MIN_SPEECH_RATIO) {
    return { valid: false, reason: 'no_voice_detected' }
  }
  return null
}

export function isLikelySilentAudio(audioStats: AudioStats): boolean {
  return checkSilence(audioStats) !== null
}

export function getAudioValidationMessage(reason: AudioValidationReason): string {
  switch (reason) {
    case 'audio_too_short':
      return '녹음 시간이 너무 짧습니다. 다시 녹음해 주세요.'
    case 'audio_too_small':
      return '녹음 파일이 너무 작습니다. 다시 녹음해 주세요.'
    case 'audio_too_quiet':
      return '녹음이 너무 작거나 조용합니다. 마이크에 가까이 대고 다시 말해 주세요.'
    case 'no_voice_detected':
      return '음성이 감지되지 않았습니다. 다시 녹음해 주세요.'
  }
}
