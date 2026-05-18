// v1.1 단계 19.11 [#3]: RTL/LTR 혼합 괄호 줄바뀜 회귀 차단.
//
// 발견 사항 #3 — 한국어 + RTL 보조 텍스트 + 한국어 괄호가 한 인라인 컨텍스트에
// 섞이면 bidi 알고리즘이 닫는 괄호 ")"를 별도 줄로 밀어내는 회귀. 두 단계 격리:
//  1) Localized 보조 영역에 unicode-bidi: isolate (RTL/LTR 무관 항상)
//  2) 진척 페이지 "(완료/진행 중)" 외부 괄호 컨테이너 dir="ltr" + isolate

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const localizedSrc = readFileSync(
  join(root, 'src/components/ui/localized.tsx'),
  'utf-8',
)
const progressPageSrc = readFileSync(
  join(root, 'app/research/student/progress/page.tsx'),
  'utf-8',
)

describe('[단계19.11-#3] Localized 보조 영역 unicode-bidi: isolate 적용', () => {
  it('Localized.tsx에 unicodeBidi: \'isolate\' 스타일이 명시되어 있다', () => {
    expect(localizedSrc).toMatch(/unicodeBidi:\s*'isolate'/)
  })

  it('이전의 plaintext 단독 폴백이 isolate로 격상되었다', () => {
    // 단계 19.11 이전: rtl이면 plaintext, 아니면 undefined.
    // 단계 19.11 이후: rtl이든 아니든 항상 isolate.
    // 'plaintext' 문자열이 보조 스타일에서 더 이상 사용되지 않음을 검증.
    const supplementStyleSection = localizedSrc.match(
      /style=\{rtl\s*\?\s*\{[^}]+\}\s*:\s*\{[^}]+\}\}/g,
    )
    expect(supplementStyleSection).not.toBeNull()
    for (const s of supplementStyleSection ?? []) {
      expect(s).toMatch(/isolate/)
      // plaintext는 RTL 자동 dir 결정용이었으나 dir이 명시되므로 isolate로 통일.
      expect(s).not.toMatch(/plaintext/)
    }
  })
})

describe('[단계19.11-#3] 진척 페이지 "(완료/진행 중)" 괄호 LTR 격리', () => {
  it('completed/inProgress Localized를 감싸는 span에 dir="ltr" + unicodeBidi: isolate', () => {
    // 라인 패턴: <span ... dir="ltr" style={{ unicodeBidi: 'isolate' }}>(<Localized ... [props] spec={{ ... key: 'completed' ...}} ... /></span>
    // 단계 19.12: Localized에 inline bareSupplement props 추가됐으므로 spec 앞 임의 prop 허용.
    expect(progressPageSrc).toMatch(
      /dir="ltr"[^>]*unicodeBidi:\s*'isolate'[^>]*>\(<Localized\s[^>]*spec=\{\{\s*kind:\s*'page',\s*key:\s*'completed'/,
    )
    expect(progressPageSrc).toMatch(
      /dir="ltr"[^>]*unicodeBidi:\s*'isolate'[^>]*>\(<Localized\s[^>]*spec=\{\{\s*kind:\s*'page',\s*key:\s*'inProgress'/,
    )
  })

  it('이전 회귀 패턴(괄호+Localized 무격리) 잔존 없음', () => {
    // 이전: <span className="text-emerald-600 ml-auto">(<Localized ... />)</span>
    // 회귀 차단: 컨테이너에 dir/style 없이 괄호+Localized 시퀀스가 더 이상 없어야 함.
    const unfencedPattern = /className="text-(emerald|yellow)-600\s+ml-auto">\(<Localized/g
    const matches = progressPageSrc.match(unfencedPattern)
    expect(matches).toBeNull()
  })
})

// v1.1 단계 19.12 [#3]: 단계 19.11의 dir/isolate가 bidi 재정렬은 차단했으나,
// Localized inline 미지정 시 보조 영역이 `block mt-0.5`로 렌더되어 인라인 컨텍스트의
// block 자식이 ")"를 새 줄로 밀어내는 회귀가 잔존. 진척 페이지 호출부에 inline +
// bareSupplement 부여로 보조 영역 ml-1.5 인라인 강제 + 외부 괄호 유지 보장.
describe('[단계19.12-#3] Localized bareSupplement 추가 — inline+자동괄호 비부여', () => {
  it('Localized에 bareSupplement prop 정의', () => {
    expect(localizedSrc).toMatch(/bareSupplement\s*[:=?]/)
  })

  it('inline=true && bareSupplement=true 시 자동 괄호 미부여', () => {
    // 분기: `${inline && !bareSupplement ? '(' + supplement + ')' : supplement}`
    expect(localizedSrc).toMatch(/inline\s*&&\s*!bareSupplement/)
  })

  it('진척 페이지 completed/inProgress 호출부가 inline bareSupplement 사용', () => {
    expect(progressPageSrc).toMatch(
      /<Localized\s+inline\s+bareSupplement\s+spec=\{\{\s*kind:\s*'page',\s*key:\s*'completed'/,
    )
    expect(progressPageSrc).toMatch(
      /<Localized\s+inline\s+bareSupplement\s+spec=\{\{\s*kind:\s*'page',\s*key:\s*'inProgress'/,
    )
  })
})
