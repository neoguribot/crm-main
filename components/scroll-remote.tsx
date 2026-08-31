"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronsDownIcon, ChevronsUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 스크롤바 옆에 붙어 스크롤을 따라다니는 "리모콘" — 맨 위 / 맨 아래로 즉시 이동.
 * 페이지가 스크롤 가능한 높이일 때만 나타난다.
 */
export function ScrollRemote() {
  const [visible, setVisible] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  const sync = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    setVisible(scrollable > 120);
    setAtTop(window.scrollY <= 16);
    setAtBottom(window.scrollY >= scrollable - 16);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    // 콘텐츠 높이 변화 감지 — body 를 관찰해야 문서가 길어지는 걸 잡는다
    // (documentElement 의 border-box 는 뷰포트 크기로 고정이라 안 잡힘).
    const ro = new ResizeObserver(sync);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [sync]);

  /**
   * 직접 rAF 트윈. `window.scrollTo({behavior:"smooth"})` 는 이 레이아웃
   * (html height:100%)에서 위로 스크롤이 무시되는 경우가 있어 쓰지 않는다.
   */
  const scrollTo = (rawY: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.max(0, Math.min(rawY, max));
    const startY = window.scrollY;
    const dist = targetY - startY;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(dist) < 4) {
      window.scrollTo(0, targetY);
      return;
    }
    const duration = 280;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      window.scrollTo(0, startY + dist * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!visible) return null;

  const btn =
    "grid size-9 place-items-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div
      className="fixed top-1/2 right-3 z-40 flex -translate-y-1/2 flex-col divide-y overflow-hidden rounded-full border bg-card/90 shadow-md backdrop-blur"
      role="group"
      aria-label="페이지 이동"
    >
      <button
        type="button"
        className={cn(btn, "rounded-t-full")}
        aria-label="맨 위로"
        disabled={atTop}
        onClick={() => scrollTo(0)}
      >
        <ChevronsUpIcon className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={cn(btn, "rounded-b-full")}
        aria-label="맨 아래로"
        disabled={atBottom}
        onClick={() => scrollTo(document.documentElement.scrollHeight)}
      >
        <ChevronsDownIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
