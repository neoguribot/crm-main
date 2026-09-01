import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { createTemplate } from "@/app/marketing/templates/actions";
import { TemplateForm } from "@/app/marketing/templates/template-form";

export const metadata: Metadata = { title: "새 메시지 템플릿" };
export const dynamic = "force-dynamic";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ body?: string | string[] }>;
}) {
  await requireUser();
  const { body } = await searchParams;
  const initialBody = typeof body === "string" ? body : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">새 메시지 템플릿</h1>
      <Card>
        <CardContent className="py-6">
          <TemplateForm
            action={createTemplate}
            submitLabel="등록"
            initialBody={initialBody}
          />
        </CardContent>
      </Card>
    </main>
  );
}
