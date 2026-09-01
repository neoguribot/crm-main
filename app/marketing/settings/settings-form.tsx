"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateMarketingSettings,
  type MarketingSettingsState,
} from "@/lib/users/actions";

const INITIAL: MarketingSettingsState = { status: "idle", error: null };

export function SettingsForm({
  defaults,
}: {
  defaults: {
    store_name: string | null;
    sender_phone: string | null;
    kakao_pf_id: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateMarketingSettings,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store_name">매장 이름</Label>
        <Input
          id="store_name"
          name="store_name"
          defaultValue={defaults.store_name ?? ""}
          placeholder="예: 제일금거래소 일루이 대전관저점"
        />
        <p className="text-xs text-muted-foreground">
          메시지 본문의 <code>{"{매장명}"}</code> 자리에 들어갑니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sender_phone">발신번호</Label>
        <Input
          id="sender_phone"
          name="sender_phone"
          defaultValue={defaults.sender_phone ?? ""}
          placeholder="예: 042-000-0000"
        />
        <p className="text-xs text-muted-foreground">
          문자(SMS) 발송에 사용됩니다. 발신대행사에 사전 등록된 번호여야 합니다.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kakao_pf_id">알림톡 발신 프로필 키 (pfId)</Label>
        <Input
          id="kakao_pf_id"
          name="kakao_pf_id"
          defaultValue={defaults.kakao_pf_id ?? ""}
          placeholder="솔라피에 등록한 카카오 채널 발신 프로필"
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
