import { getSupabaseClient } from './client'

export type ProviderFeature = 'stt' | 'tts' | 'pronunciation' | 'llm-eval' | 'conversation'
export type ProviderEventStatus = 'success' | 'fallback' | 'error'

export type ProviderEventInput = {
  provider: string
  feature: ProviderFeature
  status: ProviderEventStatus
  latencyMs?: number | null
  model?: string | null
  requestId?: string | null
  relatedSubmissionId?: string | null
  questionId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Logs a provider API call to the provider_events table.
 * Never throws — all errors are demoted to console.warn so callers
 * are never blocked by logging failures.
 */
export async function logProviderEvent(input: ProviderEventInput): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return // Supabase not configured — skip silently

  try {
    // Cast to any: supabase-js v2 requires a typed Database generic for
    // full type safety. Without it, .from() is typed as returning never in
    // some compiler configurations. Runtime behaviour is unaffected.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('provider_events').insert({
      provider_type: input.feature,
      provider_name: input.provider,
      status: input.status,
      latency_ms: input.latencyMs ?? null,
      model: input.model ?? null,
      request_id: input.requestId ?? null,
      submission_id: input.relatedSubmissionId ?? null,
      question_id: input.questionId ?? null,
      is_error: input.status === 'error',
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? null,
    })

    if (error) {
      console.warn('[provider_events] insert failed:', error.message)
    }
  } catch (err) {
    console.warn(
      '[provider_events] insert error:',
      err instanceof Error ? err.message : String(err),
    )
  }
}
