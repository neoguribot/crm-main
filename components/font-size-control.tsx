"use client";

import { useCallback, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** localStorage 키 — 레이아웃의 무플래시 스크립트와 반드시 동일하게. */
export const FONT_SCALE_STORAGE_KEY = "crm:font-scale";
/** 같은 탭 내 변경 알림용 커스텀 이벤트. */
const CHANGE_EVENT = "crm:font-scale-change";

/** 글자 크기 3단계. 값은 문서 루트 font-size 배율(rem 기반이라 전체 화면에 적용). */
const LEVELS = [
  { key: "sm", label: "작게", scale: 1.0 },
  { key: "md", label: "중간", scale: 1.15 },
  { key: "lg", label: "크게", scale: 1.3 },
] as const;

const DEFAULT_SCALE = LEVELS[0].scale;

type Level = (typeof LEVELS)[number];

/** 저장된 배율과 가장 가까운 단계를 고른다(과거 임의 배율 값도 흡수). */
function scaleToLevel(scale: number): Level {
  let best: Level = LEVELS[0];
  for (const lvl of LEVELS) {
    if (Math.abs(lvl.scale - scale) < Math.abs(best.scale - scale)) best = lvl;
  }
  return best;
}

function readStoredScale(): number {
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (!raw) return DEFAULT_SCALE;
    const n = Number(raw);
    return Number.isFinite(n) ? scaleToLevel(n).scale : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

function applyScale(scale: number): void {
  document.documentElement.style.fontSize =
    scale === DEFAULT_SCALE ? "" : `${Math.round(scale * 100)}%`;
}

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    applyScale(readStoredScale());
    onChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

/**
 * 글자 크기(작게/중간/크게) 선택. 값은 localStorage 에 저장되어 새로고침·다른
 * 페이지·다른 탭에서도 유지된다(초기 적용은 app/layout.tsx 의 무플래시 스크립트).
 */
export function FontSizeControl() {
  const scale = useSyncExternalStore(subscribe, readStoredScale, () => DEFAULT_SCALE);
  const activeKey = scaleToLevel(scale).key;

  const change = useCallback((next: number) => {
    applyScale(next);
    try {
      if (next === DEFAULT_SCALE) localStorage.removeItem(FONT_SCALE_STORAGE_KEY);
      else localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next));
    } catch {
      // 저장 실패해도 이번 세션 적용은 유지된다.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <div
      role="group"
      aria-label="글자 크기"
      className="flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {LEVELS.map((lvl) => (
        <button
          key={lvl.key}
          type="button"
          aria-pressed={lvl.key === activeKey}
          onClick={() => change(lvl.scale)}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            lvl.key === activeKey
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  );
}
