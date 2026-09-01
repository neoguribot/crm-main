import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { getCurrentAppUser } from "@/lib/users/queries";
import { ProfileForm } from "@/app/settings/profile-form";
import { PasswordForm } from "@/app/settings/password-form";

export const metadata: Metadata = { title: "설정" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const appUserRes = await getCurrentAppUser();
  const appUser = appUserRes.ok ? appUserRes.data : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>내 프로필</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultName={appUser?.name ?? ""}
            email={user.email ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
