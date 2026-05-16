// v1.1 단계 18 [B+]: DB 스키마 정합성 회귀 보호.
//
// 코드가 보내는 값과 DDL이 허용하는 값이 어긋나면 cascade 실패가 다시 발생한다.
// 본 테스트는 마이그레이션 파일 텍스트와 시드 JSON, repository 코드의 핵심
// 합의(컬럼명·허용값)를 정적으로 검증한다. 실제 DB 연결 없이 통과한다.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import questionSets from '@/src/content/question-sets.json'

const repoRoot = process.cwd()
const stage18Migration = readFileSync(
  join(repoRoot, 'supabase/migrations/20260516_stage18_assessment_persistence.sql'),
  'utf-8',
)
const researchRepo = readFileSync(
  join(repoRoot, 'src/lib/research/repository.ts'),
  'utf-8',
)

describe('단계 18 [B+] DB 스키마 정합성', () => {
  it('question_sets.purpose check constraint에 시드 JSON의 모든 값이 포함된다', () => {
    const seedPurposes = new Set(
      (questionSets as Array<{ purpose: string }>).map((qs) => qs.purpose),
    )
    // 주석 라인(`-- ...`) 제거 후 검색해 실제 DDL에서만 검출.
    const ddlOnly = stage18Migration
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
    const checkMatch = ddlOnly.match(/check\s*\(\s*purpose\s+in\s*\(([^)]+)\)/i)
    expect(checkMatch, 'purpose check DDL 정의를 찾지 못함').toBeTruthy()
    const allowed = new Set(
      checkMatch![1]
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter(Boolean),
    )
    for (const p of seedPurposes) {
      expect(allowed.has(p), `시드 purpose='${p}'가 check에 없음`).toBe(true)
    }
  })

  it('마이그레이션은 research_assessments.feedback_text를 idempotent하게 보장한다', () => {
    expect(stage18Migration).toMatch(
      /add column if not exists feedback_text\s+text/i,
    )
  })

  it('마이그레이션은 research_assessments에 provider/model 컬럼을 추가한다', () => {
    expect(stage18Migration).toMatch(
      /add column if not exists provider\s+text/i,
    )
    expect(stage18Migration).toMatch(
      /add column if not exists model\s+text/i,
    )
  })

  it('repository는 createAssessment에서 provider/model을 insert 페이로드에 포함한다', () => {
    expect(researchRepo).toContain('provider: input.provider')
    expect(researchRepo).toContain('model: input.model')
  })

  it('마이그레이션은 PostgREST 스키마 캐시 reload를 트리거한다', () => {
    expect(stage18Migration).toMatch(/notify pgrst,\s*'reload schema'/i)
  })
})
