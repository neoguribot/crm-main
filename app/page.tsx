import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME, HOME_PATH } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(HOME_PATH);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{APP_NAME}</CardTitle>
          <CardDescription>{APP_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            로그인 후 홈·파이프라인·대시보드·고객관리·리마인드를 이용할 수 있습니다.
          </p>
          <Link href="/login" className={buttonVariants({ className: "self-start" })}>
            로그인
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
