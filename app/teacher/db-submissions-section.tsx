import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type DbSubmissionRow = {
  id: string;
  questionId: string;
  audioUrlExists: boolean;
  submittedAt: string;
  status: string;
  transcript: string | null;
  scoresJson: string | null;
  pronunciationJson: string | null;
  reviewFinalized: boolean | null;
};

async function fetchLiveSubmissions(): Promise<DbSubmissionRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: submissions, error } = await supabase
    .from("speaking_submissions")
    .select(
      `id, question_id, audio_url, submitted_at, status,
       ai_evaluations!inner(transcript, scores, pronunciation_result),
       teacher_reviews(is_finalized)`
    )
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (error || !submissions) return [];

  return submissions.map((row: Record<string, unknown>) => {
    const evals = Array.isArray(row.ai_evaluations)
      ? (row.ai_evaluations as Record<string, unknown>[])[0]
      : (row.ai_evaluations as Record<string, unknown> | null);

    const reviews = Array.isArray(row.teacher_reviews)
      ? (row.teacher_reviews as Record<string, unknown>[])[0]
      : (row.teacher_reviews as Record<string, unknown> | null);

    const scores = evals?.scores;
    const pronunciation = evals?.pronunciation_result;

    return {
      id: row.id as string,
      questionId: row.question_id as string,
      audioUrlExists: Boolean(row.audio_url),
      submittedAt: new Date(row.submitted_at as string).toLocaleString("ko-KR"),
      status: row.status as string,
      transcript: evals ? (evals.transcript as string | null) : null,
      scoresJson: scores ? JSON.stringify(scores).slice(0, 80) : null,
      pronunciationJson: pronunciation
        ? JSON.stringify(pronunciation).slice(0, 60)
        : null,
      reviewFinalized: reviews
        ? (reviews.is_finalized as boolean | null)
        : null,
    };
  });
}

const statusLabel: Record<string, string> = {
  pending: "대기",
  ai_evaluated: "AI 완료",
  teacher_reviewed: "교수자 검토",
  finalized: "확정",
};

export async function DbSubmissionsSection() {
  let rows: DbSubmissionRow[] = [];
  let dbError = false;

  try {
    rows = await fetchLiveSubmissions();
  } catch {
    dbError = true;
  }

  if (dbError) return null;
  if (rows.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-text-primary mb-3">
        최근 제출 현황 (DB 실시간)
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-surface-raised border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">문항</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">오디오</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">전사</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">점수 요약</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">발음 요약</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">상태</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">교수자 확정</th>
              <th className="text-left px-3 py-2 text-text-secondary font-medium">제출 시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-raised transition-colors">
                <td className="px-3 py-2 font-mono text-text-primary">{row.questionId}</td>
                <td className="px-3 py-2">{row.audioUrlExists ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-text-secondary max-w-[160px] truncate">
                  {row.transcript ?? "—"}
                </td>
                <td className="px-3 py-2 text-text-muted max-w-[180px] truncate font-mono">
                  {row.scoresJson ?? "—"}
                </td>
                <td className="px-3 py-2 text-text-muted max-w-[140px] truncate font-mono">
                  {row.pronunciationJson ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {statusLabel[row.status] ?? row.status}
                </td>
                <td className="px-3 py-2">
                  {row.reviewFinalized === null
                    ? "—"
                    : row.reviewFinalized
                      ? "확정"
                      : "미확정"}
                </td>
                <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                  {row.submittedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
