import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";

const navItems: NavItem[] = [
  { label: "시스템 현황", href: "/admin" },
  { label: "반 관리", href: "/admin/classes", disabled: true },
  { label: "학생 관리", href: "/admin/students", disabled: true },
  { label: "콘텐츠 관리", href: "/admin/content", disabled: true },
  { label: "분석 리포트", href: "/admin/reports", disabled: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="admin" navItems={navItems}>
      {children}
    </AppShell>
  );
}
