import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

let _ffmpegPath: string | null | undefined = undefined

function getFfmpegPath(): string {
  if (_ffmpegPath !== undefined) {
    if (!_ffmpegPath) throw new Error('ffmpeg-static binary not available')
    return _ffmpegPath
  }

  // 1. resolve relative to project root — reliable across Next.js dev/prod
  // 단계 19 [Issues0]: fs 호출은 요청 시점에만 일어나지만 Turbopack NFT는 정적 분석에서
  // 이를 잡지 못한다. next.config.ts의 serverExternalPackages + turbopack.ignoreIssue로 해소.
  const cwdPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')
  if (existsSync(cwdPath)) {
    _ffmpegPath = cwdPath
    return cwdPath
  }

  // 2. fall back to what the package reports (may be virtualised in Next.js dev)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reported = (require(/*turbopackIgnore: true*/ 'ffmpeg-static') as string | null) ?? null
    if (reported && existsSync(reported)) {
      _ffmpegPath = reported
      return reported
    }
  } catch {
    // package not installed
  }

  _ffmpegPath = null
  throw new Error('ffmpeg-static binary not available')
}

/** Returns true if the ffmpeg-static binary can be resolved. */
export function isAudioConversionAvailable(): boolean {
  try {
    getFfmpegPath()
    return true
  } catch {
    return false
  }
}

/**
 * Convert any audio buffer (webm/opus etc.) to 16 kHz mono 16-bit PCM WAV.
 * ETRI WiseASR_PronunciationKor requires WAV/PCM; it rejects webm/opus.
 */
export async function convertToWavForEtri(inputBuffer: Buffer): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath()

  return new Promise<Buffer>((resolve, reject) => {
    const outChunks: Buffer[] = []
    const errChunks: Buffer[] = []

    const proc = spawn(ffmpegPath, [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ])

    proc.stdout.on('data', (chunk: Buffer) => outChunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk))

    proc.on('close', (code) => {
      if (code === 0 && outChunks.length > 0) {
        resolve(Buffer.concat(outChunks))
      } else {
        const detail = Buffer.concat(errChunks).toString().slice(0, 300)
        reject(new Error(`audio_conversion_failed: ffmpeg exit ${code} — ${detail}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`audio_conversion_failed: ffmpeg spawn — ${err.message}`))
    })

    proc.stdin.write(inputBuffer)
    proc.stdin.end()
  })
}
