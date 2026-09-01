"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FontSizeControl } from "@/components/font-size-control";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { APP_NAME, HOME_PATH, NAV_ITEMS } from "@/lib/constants";

/** 네비게이션을 숨기는 경로 (홈·로그인 등). */
const HIDDEN_PREFIXES = ["/login", "/logout"];

export function AppNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();

  if (pathname === "/" || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <header className="border-b bg-card">
      <nav
        aria-label="주 메뉴"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3"
      >
        <Link
          href={HOME_PATH}
          aria-current={pathname === HOME_PATH ? "page" : undefined}
          className="mr-2 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {APP_NAME}
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <FontSizeControl />

          {/* 계정 메뉴: 이름에 마우스를 올리면 설정·로그아웃이 뜬다. */}
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="menu"
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                settingsActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {userName ?? "계정"}
            </button>

            <div className="invisible absolute right-0 top-full z-20 pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="flex min-w-32 flex-col rounded-md border bg-card p-1 shadow-md">
                <Link
                  href="/settings"
                  className="rounded px-2.5 py-1.5 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted"
                >
                  설정
                </Link>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="w-full rounded px-2.5 py-1.5 text-left text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
