import { type ReactNode } from "react";
import { AppShell, type NavItem } from "@/src/components/layout/app-shell";

const navItems: NavItem[] = [
  { label: "내 학습 현황", href: "/student" },
  { label: "말하기 평가", href: "/student/speaking" },
  { label: "미션 대화", href: "/student/mission", disabled: true },
  { label: "말하기 대회", href: "/student/contest", disabled: true },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="student" navItems={navItems}>
      {children}
    </AppShell>
  );
}
