"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, UserRole } from "./app-shell";
import { SIDEBAR_LABELS } from "@/src/lib/i18n/dashboard-labels";
import {
  inferDisplayLanguageFromMotherTongue,
  isRTLDisplay,
} from "@/src/lib/i18n/display-language";

interface SidebarProps {
  navItems: NavItem[];
  role: UserRole;
  /** v1.1 단계 19.8 [UI보조]: 학습자 모국어. ko/null이면 보조 표기 미생성. */
  motherTongueHint?: string | null;
}

const roleAccentClasses: Record<UserRole, string> = {
  student: "bg-primary-700 text-white",
  teacher: "bg-slate-700 text-white",
  admin: "bg-slate-900 text-white",
};

// v1.1 단계 19.8: navItem 라벨에 mother_tongue 보조 텍스트를 같이 렌더.
// 본문(한국어) 위에 작은 글씨로 mother_tongue 표기를 한 줄 추가한다. ko인 경우 미표시.
function ItemLabel({
  item,
  mt,
  compact,
}: {
  item: NavItem;
  mt: ReturnType<typeof inferDisplayLanguageFromMotherTongue>;
  compact: boolean;
}) {
  const supplement =
    item.labelKey && mt && mt !== "ko" ? SIDEBAR_LABELS[item.labelKey][mt] : "";
  const showSupplement = supplement.length > 0;
  const rtl = showSupplement && mt && isRTLDisplay(mt);

  return (
    <span
      className="flex flex-col items-start"
      data-bilingual-supplement={showSupplement ? mt : undefined}
    >
      <span lang="ko">{item.label}</span>
      {showSupplement && (
        <span
          className={
            compact
              ? "block text-[9px] leading-tight text-text-muted/80 mt-0.5"
              : "block text-[10px] leading-tight text-text-muted/80 mt-0.5"
          }
          dir={rtl ? "rtl" : undefined}
          lang={mt ?? undefined}
          style={rtl ? { unicodeBidi: "plaintext", textAlign: "start" } : undefined}
        >
          {supplement}
        </span>
      )}
    </span>
  );
}

export function Sidebar({ navItems, role, motherTongueHint }: SidebarProps) {
  const pathname = usePathname();
  const accentClass = roleAccentClasses[role];
  const mt = inferDisplayLanguageFromMotherTongue(motherTongueHint);

  return (
    <>
      {/* 데스크톱 사이드바 */}
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
                  <ItemLabel item={item} mt={mt} compact={false} />
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
                <ItemLabel item={item} mt={mt} compact={false} />
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-text-muted">v0.1.0</p>
        </div>
      </aside>

      {/* 모바일 하단 내비게이션 (md 미만에서만 표시) */}
      <nav
        aria-label="모바일 내비게이션"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 flex bg-surface-raised border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex-1 flex items-center justify-center py-2 px-1 text-[11px] leading-tight text-text-muted opacity-40 cursor-not-allowed select-none min-h-[44px] text-center"
              >
                <ItemLabel item={item} mt={mt} compact={true} />
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex-1 flex items-center justify-center py-2 px-1 text-[11px] leading-tight font-medium transition-colors min-h-[44px] text-center",
                isActive
                  ? "text-primary-700 font-semibold"
                  : "text-text-secondary",
              ].join(" ")}
            >
              <ItemLabel item={item} mt={mt} compact={true} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
