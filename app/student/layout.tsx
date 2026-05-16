import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const navItems: NavItem[] = [
  { label: "내 학습 현황", href: "/student" },
  { label: "말하기 평가", href: "/student/speaking" },
  { label: "읽기연습", href: "/student/reading-practice" },
  { label: "발표연습", href: "/student/presentation-practice" },
  { label: "생성형 대화", href: "/student/conversation-practice" },
];

export default async function StudentLayout({ children }: { children: ReactNode }) {
  let userName: string | undefined;
  // 단계 18 [D6]: 학습자 모국어를 헤더 토글 motherTongueHint로 전달해 첫 진입 시
  // KO/EN/VI/AR로 자동 적용. 사용자가 한 번이라도 명시 선택하면 이후로는 무시된다.
  let motherTongueHint: string | undefined;

  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name, student_id")
          .eq("user_id", user.id)
          .single<{ display_name: string | null; student_id: string | null }>();
        userName = profile?.display_name ?? user.email ?? undefined;
        // students.native_language → 헤더 토글 자동 적용 힌트.
        if (profile?.student_id) {
          const { data: student } = await supabase
            .from("students")
            .select("native_language, ui_support_language")
            .eq("id", profile.student_id)
            .single<{ native_language: string | null; ui_support_language: string | null }>();
          motherTongueHint =
            student?.ui_support_language ?? student?.native_language ?? undefined;
        }
      }
    }
  } catch {
    // Silently ignore — no user info shown
  }

  return (
    <AppShell
      role="student"
      navItems={navItems}
      userName={userName}
      motherTongueHint={motherTongueHint}
    >
      {children}
    </AppShell>
  );
}
