import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const navItems: NavItem[] = [
  { label: "시스템 현황", href: "/admin" },
  { label: "데이터 분석", href: "/admin/analytics" },
  { label: "반 관리", href: "/admin/classes", disabled: true },
  { label: "학생 관리", href: "/admin/students", disabled: true },
  { label: "콘텐츠 관리", href: "/admin/content", disabled: true },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
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
    <AppShell role="admin" navItems={navItems} userName={userName}>
      {children}
    </AppShell>
  );
}
