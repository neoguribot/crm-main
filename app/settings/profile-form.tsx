"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileName, type ProfileState } from "@/lib/users/actions";

const INITIAL: ProfileState = { status: "idle", error: null };

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileName, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>이메일</Label>
        <Input value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          이메일은 앱에서 바꿀 수 없습니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={50}
          defaultValue={defaultName}
        />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p className="text-sm text-primary">저장되었습니다.</p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
