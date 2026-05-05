import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const navItems: NavItem[] = [
  { label: "채점 관리", href: "/teacher" },
  { label: "학생 관리", href: "/teacher/students", disabled: true },
  { label: "제출 내역", href: "/teacher/submissions" },
  { label: "루브릭 설정", href: "/teacher/rubrics", disabled: true },
];

export default async function TeacherLayout({ children }: { children: ReactNode }) {
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
    <AppShell role="teacher" navItems={navItems} userName={userName}>
      {children}
    </AppShell>
  );
}
