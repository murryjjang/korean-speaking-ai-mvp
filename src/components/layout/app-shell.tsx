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
}

export function AppShell({ role, navItems, children, userName }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-surface">
      <Topbar role={role} userName={userName} />
      <div className="flex flex-1 min-h-0">
        <Sidebar navItems={navItems} role={role} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6">{children}</main>
      </div>
    </div>
  );
}
