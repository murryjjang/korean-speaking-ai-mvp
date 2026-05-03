import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";

const navItems: NavItem[] = [
  { label: "채점 관리", href: "/teacher" },
  { label: "학생 관리", href: "/teacher/students", disabled: true },
  { label: "제출 내역", href: "/teacher/submissions", disabled: true },
  { label: "루브릭 설정", href: "/teacher/rubrics", disabled: true },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="teacher" navItems={navItems}>
      {children}
    </AppShell>
  );
}
