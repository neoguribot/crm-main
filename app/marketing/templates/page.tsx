import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MESSAGE_CHANNEL_LABELS } from "@/lib/labels";
import { requireUser } from "@/lib/supabase/require-user";
import { listMessageTemplates } from "@/lib/messaging/templates";
import { DeleteTemplateButton } from "@/app/marketing/templates/delete-template-button";

export const metadata: Metadata = { title: "메시지 템플릿" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireUser();
  const result = await listMessageTemplates();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">메시지 템플릿</h1>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" render={<Link href="/marketing" />}>
            마케팅 홈
          </Button>
          <Button render={<Link href="/marketing/templates/new" />}>
            새 템플릿
          </Button>
        </div>
      </div>

      {!result.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              아직 템플릿이 없습니다.
            </p>
            <Button render={<Link href="/marketing/templates/new" />}>
              첫 템플릿 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.map((t) => (
            <li key={t.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant="outline" className="font-normal">
                      {MESSAGE_CHANNEL_LABELS[t.channel]}
                    </Badge>
                    {!t.is_active ? (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        미사용
                      </Badge>
                    ) : null}
                    <div className="ml-auto flex gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        render={
                          <Link href={`/marketing/templates/${t.id}/edit`} />
                        }
                      >
                        수정
                      </Button>
                      <DeleteTemplateButton
                        templateId={t.id}
                        templateName={t.name}
                      />
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {t.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
