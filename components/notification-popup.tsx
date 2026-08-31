"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  dismissNotification,
  fetchActiveNotifications,
} from "@/lib/notifications/actions";
import type { AppNotification } from "@/lib/notifications/types";

const HIDDEN_PREFIXES = ["/login", "/logout"];
const POLL_MS = 120_000;
const MAX_VISIBLE = 3;

/**
 * 오른쪽 하단 알림 팝업. 닫지 않은 알림을 주기적으로 가져와 토스트로 띄운다.
 * "닫기" 는 서버에서 dismissed_at 을 채워 다시 뜨지 않게 한다.
 */
export function NotificationPopup() {
  const pathname = usePathname();
  const hidden =
    pathname === "/" || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  const [items, setItems] = useState<AppNotification[]>([]);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (busyRef.current || hidden) return;
    busyRef.current = true;
    try {
      const next = await fetchActiveNotifications();
      setItems(next);
    } catch {
      // 무시 (다음 폴링에서 재시도)
    } finally {
      busyRef.current = false;
    }
  }, [hidden]);

  // 알림 서버를 폴링하는 구독. load() 는 비동기이며 setState 는 응답 콜백에서만 일어난다.
  useEffect(() => {
    if (hidden) return;
    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    // 최초 1회 즉시 조회
    const kickoff = setTimeout(() => void load(), 0);
    return () => {
      clearInterval(timer);
      clearTimeout(kickoff);
      window.removeEventListener("focus", onFocus);
    };
  }, [hidden, load]);

  if (hidden) return null;

  const visible = items
    .filter((n) => !closedIds.has(n.id))
    .slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  function close(id: string) {
    setClosedIds((prev) => new Set(prev).add(id));
    void dismissNotification(id);
  }

  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-label="알림"
    >
      {visible.map((n) => (
        <div
          key={n.id}
          role="alert"
          className="rounded-lg border bg-card p-3 text-sm shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">🔔 {n.title}</p>
            <button
              type="button"
              aria-label="알림 닫기"
              className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => close(n.id)}
            >
              ✕
            </button>
          </div>
          {n.body ? (
            <p className="mt-1 text-muted-foreground">{n.body}</p>
          ) : null}
          <div className="mt-2 flex gap-3 text-xs">
            {n.customer_id ? (
              <Link
                href={`/customers/${n.customer_id}`}
                className="text-primary underline"
                onClick={() => close(n.id)}
              >
                고객 상세 보기
              </Link>
            ) : null}
            <Link href="/home" className="text-muted-foreground underline">
              전체 알림
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
