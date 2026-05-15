// v1.1 단계 10-3: 동의 거부 안내 화면.

export default function ConsentDeclinedPage() {
  return (
    <main className="max-w-md mx-auto px-4 py-10 text-center" data-testid="consent-declined-page">
      <h1 className="text-xl font-bold text-text-primary">시험운영 참여를 종료합니다</h1>
      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
        동의하지 않으시면 시험운영에 참여할 수 없습니다. 마음이 바뀌었다면 운영자에게 문의해 주세요.
      </p>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">
        If you do not consent, you cannot participate in this pilot study. Please contact the operator if you change your mind.
      </p>
      <p className="mt-6 text-xs">
        <a href="/research/login" className="text-primary-600 hover:underline">← 처음 화면으로</a>
      </p>
    </main>
  )
}
