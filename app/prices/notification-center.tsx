"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isoTimestampToSeoulDateTime } from "@/lib/date";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import type { AppNotification } from "@/lib/notifications/types";

export function NotificationCenter({
  initial,
}: {
  initial: AppNotification[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  const unread = items.filter((n) => n.read_at === null).length;

  function readOne(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function readAll() {
    setItems((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() },
      ),
    );
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          알림
          {unread > 0 ? (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {unread}
            </span>
          ) : null}
        </CardTitle>
        {unread > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={readAll}
          >
            모두 읽음
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            알림이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                className={
                  "flex flex-col gap-1 py-3 text-sm " +
                  (n.read_at ? "opacity-60" : "")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    {n.read_at ? null : (
                      <span
                        aria-hidden
                        className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle"
                      />
                    )}
                    🔔 {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {isoTimestampToSeoulDateTime(n.created_at)}
                  </span>
                </div>
                {n.body ? (
                  <p className="text-muted-foreground">{n.body}</p>
                ) : null}
                <div className="mt-1 flex gap-3 text-xs">
                  {n.customer_id ? (
                    <Link
                      href={`/customers/${n.customer_id}`}
                      className="text-primary underline"
                    >
                      고객 상세
                    </Link>
                  ) : null}
                  {n.read_at ? null : (
                    <button
                      type="button"
                      className="text-muted-foreground underline"
                      onClick={() => readOne(n.id)}
                    >
                      읽음 처리
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
