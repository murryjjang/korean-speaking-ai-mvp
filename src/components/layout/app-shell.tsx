import { type ReactNode } from "react";
import type { SIDEBAR_LABELS } from "@/src/lib/i18n/dashboard-labels";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";

export type UserRole = "student" | "teacher" | "admin";

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
  /** v1.1 단계 19.8: mother_tongue 보조 표기용 i18n 키. 없으면 보조 미표시. */
  labelKey?: keyof typeof SIDEBAR_LABELS;
};

interface AppShellProps {
  role: UserRole;
  navItems: NavItem[];
  children: ReactNode;
  userName?: string;
  /** v1.1 단계 19.8 [UI보조]: 학습자 모국어 — Sidebar 보조 표기 결정 단독 진실원. */
  motherTongueHint?: string | null;
}

export function AppShell({ role, navItems, children, userName, motherTongueHint }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-surface">
      <Topbar role={role} userName={userName} />
      <div className="flex flex-1 min-h-0">
        <Sidebar navItems={navItems} role={role} motherTongueHint={motherTongueHint} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6">{children}</main>
      </div>
    </div>
  );
}
