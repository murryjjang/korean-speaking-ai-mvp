import Link from "next/link";

type RoleCard = {
  role: "student" | "teacher" | "admin";
  href: string;
  title: string;
  description: string;
  detail: string;
};

const roleCards: RoleCard[] = [
  {
    role: "student",
    href: "/student",
    title: "학습자",
    description: "말하기 평가 및 미션 대화 참여",
    detail: "진단평가·연습·미션 대화를 통해 한국어 말하기를 훈련하고 AI 피드백을 받습니다.",
  },
  {
    role: "teacher",
    href: "/teacher",
    title: "교수자",
    description: "AI 평가 검토 및 채점 확정",
    detail: "학생별 제출 현황을 확인하고, AI 평가를 검토하여 최종 점수를 확정합니다.",
  },
  {
    role: "admin",
    href: "/admin",
    title: "관리자",
    description: "시스템 현황 및 데이터 분석",
    detail: "반별·어권별 학습 현황을 분석하고 콘텐츠와 루브릭을 관리합니다.",
  },
];

const roleColors = {
  student: {
    border: "border-primary-200 hover:border-primary-400",
    badge: "bg-primary-50 text-primary-700 border-primary-200",
    icon: "bg-primary-100 text-primary-700",
  },
  teacher: {
    border: "border-border hover:border-slate-400",
    badge: "bg-surface text-text-primary border-border",
    icon: "bg-surface text-text-primary",
  },
  admin: {
    border: "border-border hover:border-slate-500",
    badge: "bg-slate-800 text-slate-100 border-slate-700",
    icon: "bg-slate-200 text-slate-800",
  },
};

const roleIcons = {
  student: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  teacher: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  admin: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 bg-surface">
      <header className="border-b border-border bg-surface-raised">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-primary-700 font-bold text-lg tracking-tight">
            한국어 AI
          </span>
          <span className="text-border-strong text-sm" aria-hidden="true">|</span>
          <span className="text-sm text-text-secondary font-medium">
            말하기 훈련·평가 플랫폼
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              역할을 선택하세요
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              해당 역할로 로그인하여 플랫폼을 이용합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {roleCards.map((card) => {
              const colors = roleColors[card.role];
              return (
                <Link
                  key={card.role}
                  href={card.href}
                  className={[
                    "group flex flex-col bg-surface-raised rounded-xl border-2 p-6 gap-4",
                    "transition-all duration-200 hover:shadow-md",
                    colors.border,
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colors.icon}`}>
                      {roleIcons[card.role]}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}
                    >
                      {card.title}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {card.description}
                    </p>
                    <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                      {card.detail}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-primary-700 mt-auto group-hover:gap-2 transition-all">
                    <span>입장하기</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-8 text-center text-xs text-text-muted">
            MVP 데모 버전 — 실제 인증 없이 역할별 페이지를 탐색할 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
