import { getSupabaseClient } from './client'

export const STORAGE_BUCKET = 'recordings'

export type StorageUploadResult = {
  storagePath: string
  publicUrl: string
}

// Strips non-safe path segment characters
function safeSeg(s: string): string {
  return s.replace(/[^a-zA-Z0-9\-_]/g, '_')
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

/**
 * Uploads an audio blob to Supabase Storage.
 * File path: speaking/{questionId}/{timestamp}.{ext}
 *
 * Returns StorageUploadResult on success, null on failure.
 * Never throws — all errors are logged with [provider_events] prefix
 * so Phase 8-E can pick them up and persist to DB.
 *
 * Requires bucket=recordings to exist in Supabase Dashboard with:
 *   - Public: true  (for getPublicUrl to work without signed URLs)
 *   - INSERT allowed for anon role  (Storage > Policies)
 */
export async function uploadAudioToStorage(
  audioBlob: Blob,
  questionId: string,
): Promise<StorageUploadResult | null> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('[provider_events] storage.skip reason=no_supabase_client')
    return null
  }

  const mimeType = audioBlob.type || 'audio/webm'
  const ext = extFromMime(mimeType)
  const storagePath = `speaking/${safeSeg(questionId)}/${Date.now()}.${ext}`

  try {
    const arrayBuffer = await audioBlob.arrayBuffer()

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      console.error('[provider_events] storage.error message=%s path=%s', error.message, storagePath)
      return null
    }

    // getPublicUrl is synchronous; always returns { data: { publicUrl } }
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    console.info(
      '[provider_events] storage.success path=%s bucket=%s',
      storagePath,
      STORAGE_BUCKET,
    )

    return { storagePath, publicUrl: urlData.publicUrl }
  } catch (err) {
    console.error('[provider_events] storage.error', err)
    return null
  }
}
