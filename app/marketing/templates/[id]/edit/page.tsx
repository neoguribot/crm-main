import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { getMessageTemplate } from "@/lib/messaging/templates";
import { updateTemplate } from "@/app/marketing/templates/actions";
import { TemplateForm } from "@/app/marketing/templates/template-form";

export const metadata: Metadata = { title: "메시지 템플릿 수정" };
export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const result = await getMessageTemplate(id);
  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!result.data) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">메시지 템플릿 수정</h1>
      <Card>
        <CardContent className="py-6">
          <TemplateForm
            action={updateTemplate.bind(null, id)}
            submitLabel="수정 저장"
            defaults={result.data}
          />
        </CardContent>
      </Card>
    </main>
  );
}
