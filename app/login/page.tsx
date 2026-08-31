import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <h1 className="font-heading text-lg leading-snug font-medium">
            {APP_NAME}
          </h1>
          <CardDescription>로그인 후 이용할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
