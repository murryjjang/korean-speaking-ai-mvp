export default function RoleMissingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-lg font-bold text-text-primary">역할 정보 없음</h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            계정에 역할이 지정되지 않았습니다.
            <br />
            담당 교수자 또는 관리자에게 역할 부여를 요청하세요.
          </p>
        </div>

        <form action="/api/auth/signout" method="POST" className="pt-2">
          <button
            type="submit"
            className="text-sm text-primary-700 underline hover:no-underline"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
