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
          .single();
        userName = (profile?.display_name as string | null) ?? user.email ?? undefined;
      }
    }
  } catch {
    // Silently ignore — no user info shown
  }

  return (
    <AppShell role="student" navItems={navItems} userName={userName}>
      {children}
    </AppShell>
  );
}
