"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, UserRole } from "./app-shell";

interface SidebarProps {
  navItems: NavItem[];
  role: UserRole;
}

const roleAccentClasses: Record<UserRole, string> = {
  student: "bg-primary-700 text-white",
  teacher: "bg-slate-700 text-white",
  admin: "bg-slate-900 text-white",
};

export function Sidebar({ navItems, role }: SidebarProps) {
  const pathname = usePathname();
  const accentClass = roleAccentClasses[role];

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-surface-raised border-r border-border">
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted cursor-not-allowed select-none"
                title="준비 중"
              >
                {item.label}
                <span className="ml-auto text-xs text-text-muted border border-border rounded px-1">
                  준비중
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? `${accentClass}`
                  : "text-text-secondary hover:bg-surface hover:text-text-primary",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
