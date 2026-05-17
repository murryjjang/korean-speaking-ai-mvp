'use client'

// v1.1 16-1·16-2: 신규 참여자 발급 폼 — 입력란 흰색 배경 + 중복 클릭 가드.
//
// useTransition으로 server action 진행 상태를 추적하고, 진행 중에는 발급 버튼을
// disabled 처리해 동일 코드가 16번 생성되는 검증 1 발견을 차단한다.

import { useRef, useTransition } from 'react'

import { createParticipantAction } from './actions'

export function CreateParticipantForm() {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const form = e.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      await createParticipantAction(data)
      form.reset()
    })
  }

  // 모든 입력란 공통 클래스 — 흰색 배경 + 명확한 대비를 우선.
  const inputClass =
    'mt-1 block w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-testid="form-create-participant"
    >
      <label className="block sm:col-span-2">
        <span className="text-xs text-text-muted">참여자 코드 (비우면 자동 발급, 예: P001)</span>
        <input
          name="participantCode"
          type="text"
          placeholder="자동 발급"
          className={inputClass}
          data-testid="input-new-code"
          disabled={pending}
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-muted">이름 (선택)</span>
        <input name="name" type="text" className={inputClass} data-testid="input-new-name" disabled={pending} />
      </label>
      <label className="block">
        <span className="text-xs text-text-muted">국적 (선택)</span>
        <input name="nationality" type="text" className={inputClass} data-testid="input-new-nationality" disabled={pending} />
      </label>
      <label className="block">
        <span className="text-xs text-text-muted">한국어 수준 (선택, 예: TOPIK 2)</span>
        <input name="koreanLevel" type="text" className={inputClass} data-testid="input-new-level" disabled={pending} />
      </label>
      <label className="block">
        <span className="text-xs text-text-muted">모국어 (선택)</span>
        {/* v1.1 16-10-7: 셀렉트로 변경 — 학습자 로그인 시 표시 언어 자동 적용에 사용. */}
        <select
          name="motherTongue"
          className={inputClass}
          data-testid="input-new-mother-tongue"
          disabled={pending}
          defaultValue=""
        >
          <option value="">선택 안 함</option>
          <option value="ko">한국어 (ko)</option>
          <option value="en">English (en)</option>
          <option value="vi">Tiếng Việt (vi)</option>
          <option value="ar">العربية (ar)</option>
          {/* v1.1 단계 19.9: 7개 언어 확장 — 태국·말레이·크메르 추가. */}
          <option value="th">ภาษาไทย (th, Thai)</option>
          <option value="ms">Bahasa Melayu (ms, Malay)</option>
          <option value="km">ភាសាខ្មែរ (km, Khmer/Cambodian)</option>
          <option value="other">기타 (other)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-text-muted">PIN (선택, 4자리)</span>
        <input
          name="pin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="없으면 비워두기"
          className={inputClass}
          data-testid="input-new-pin"
          disabled={pending}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs text-text-muted">메모 (선택)</span>
        <textarea
          name="notes"
          rows={2}
          className={`${inputClass} resize-none`}
          data-testid="input-new-notes"
          disabled={pending}
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded-md bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="btn-create-participant"
        >
          {pending ? '발급 중…' : '발급'}
        </button>
      </div>
    </form>
  )
}
