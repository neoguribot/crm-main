import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { getCurrentAppUser } from "@/lib/users/queries";
import { isSolapiConfigured } from "@/lib/messaging/solapi";
import { SettingsForm } from "@/app/marketing/settings/settings-form";

export const metadata: Metadata = { title: "발송 설정" };
export const dynamic = "force-dynamic";

export default async function MarketingSettingsPage() {
  await requireUser();
  const userRes = await getCurrentAppUser();
  const user = userRes.ok ? userRes.data : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">발송 설정</h1>
        <Button variant="outline" size="sm" render={<Link href="/marketing" />}>
          마케팅 홈
        </Button>
      </div>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          발송 대행사(솔라피) API 키는{" "}
          <code>SOLAPI_API_KEY</code> / <code>SOLAPI_API_SECRET</code> 환경변수로
          설정합니다. 현재 상태:{" "}
          <span className="font-medium text-foreground">
            {isSolapiConfigured() ? "연결됨" : "미설정"}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <SettingsForm
            defaults={{
              store_name: user?.store_name ?? null,
              sender_phone: user?.sender_phone ?? null,
              kakao_pf_id: user?.kakao_pf_id ?? null,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
