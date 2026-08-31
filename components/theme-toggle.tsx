"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

/** localStorage 키 — 레이아웃의 무플래시 스크립트와 반드시 동일하게. */
export const THEME_STORAGE_KEY = "crm:theme";
const THEME_EVENT = "crm:theme-change";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];

const LABELS: Record<Theme, string> = {
  system: "시스템 테마",
  light: "밝은 테마",
  dark: "어두운 테마",
};

function readStored(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

function apply(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    apply(readStored());
    onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(THEME_EVENT, handler);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(THEME_EVENT, handler);
    mq.removeEventListener("change", handler);
  };
}

/**
 * 테마 전환 버튼. 시스템 → 밝게 → 어둡게 순환.
 * `.dark` 클래스를 <html> 에 토글하고 값은 localStorage 에 저장한다.
 * (초기 적용은 app/layout.tsx 의 무플래시 스크립트가 담당)
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    readStored,
    () => "system" as Theme,
  );

  const cycle = useCallback(() => {
    const current = readStored();
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 저장 실패해도 이번 세션 적용은 유지
    }
    apply(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const Icon =
    theme === "dark" ? MoonIcon : theme === "light" ? SunIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`테마 전환 (현재: ${LABELS[theme]})`}
      title={LABELS[theme]}
      className="grid size-8 place-items-center rounded-full border text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
