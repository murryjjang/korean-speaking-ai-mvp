import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getCurrentParticipant } from "@/src/lib/research/session";

const navItems: NavItem[] = [
  { label: "내 학습 현황", href: "/student", labelKey: "studentProgress" },
  { label: "말하기 평가", href: "/student/speaking", labelKey: "studentSpeaking" },
  { label: "읽기연습", href: "/student/reading-practice", labelKey: "studentReading" },
  { label: "발표연습", href: "/student/presentation-practice", labelKey: "studentPresentation" },
  { label: "생성형 대화", href: "/student/conversation-practice", labelKey: "studentConversation" },
];

export default async function StudentLayout({ children }: { children: ReactNode }) {
  let userName: string | undefined;

  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single<{ display_name: string | null }>();
        userName = profile?.display_name ?? user.email ?? undefined;
      }
    }
  } catch {
    // Silently ignore — no user info shown
  }

  // v1.1 단계 19.8 [UI보조]: 학습자 모국어를 RSC에서 단독 결정해 Sidebar 보조 표기에 전달.
  // 19.7 아키텍처(보조 언어 단일 진실원)와 일관 — 헤더 토글 없음.
  const participant = await getCurrentParticipant().catch(() => null);
  const motherTongueHint = participant?.motherTongue ?? null;

  return (
    <AppShell role="student" navItems={navItems} userName={userName} motherTongueHint={motherTongueHint}>
      {children}
    </AppShell>
  );
}
