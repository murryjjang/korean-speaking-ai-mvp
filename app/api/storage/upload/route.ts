import { uploadAudioToStorage } from '@/src/lib/supabase/storage'

export async function POST(request: Request) {
  let audioBlob: Blob
  let questionId: string

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    const qid = formData.get('questionId')

    if (audio === null || typeof audio === 'string') {
      return Response.json({ error: 'missing_audio' }, { status: 400 })
    }
    if (typeof qid !== 'string' || !qid) {
      return Response.json({ error: 'missing_question_id' }, { status: 400 })
    }

    const bytes = await (audio as Blob).arrayBuffer()
    audioBlob = new Blob([bytes], { type: (audio as Blob).type || 'audio/webm' })
    questionId = qid
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const result = await uploadAudioToStorage(audioBlob, questionId)

  if (!result) {
    // Upload failed (bucket missing, policy denied, etc.)
    // Client treats this as non-blocking — submit still proceeds without audio_url.
    return Response.json({ error: 'upload_failed' }, { status: 500 })
  }

  return Response.json({
    storagePath: result.storagePath,
    publicUrl: result.publicUrl,
  })
}
