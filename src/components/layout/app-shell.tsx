import { type ReactNode } from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";

export type UserRole = "student" | "teacher" | "admin";

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

interface AppShellProps {
  role: UserRole;
  navItems: NavItem[];
  children: ReactNode;
  userName?: string;
  /** 단계 18 [D6]: 헤더 4언어 토글 자동 적용 힌트. */
  motherTongueHint?: string;
}

export function AppShell({ role, navItems, children, userName, motherTongueHint }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-surface">
      <Topbar role={role} userName={userName} motherTongueHint={motherTongueHint} />
      <div className="flex flex-1 min-h-0">
        <Sidebar navItems={navItems} role={role} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6">{children}</main>
      </div>
    </div>
  );
}
