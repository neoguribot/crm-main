"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type PasswordState } from "@/lib/users/actions";

const INITIAL: PasswordState = { status: "idle", error: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current_password">현재 비밀번호</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new_password">새 비밀번호</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">8자 이상.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm_password">새 비밀번호 확인</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p className="text-sm text-primary">
          비밀번호가 변경되었습니다.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
