import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/require-user";
import { getCurrentAppUser } from "@/lib/users/queries";
import { listMessageTemplates } from "@/lib/messaging/templates";
import { getMarketingSegments } from "@/lib/marketing/segments";
import { isSolapiConfigured } from "@/lib/messaging/solapi";

export const metadata: Metadata = { title: "마케팅" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  await requireUser();

  const [templatesRes, userRes, segmentsRes] = await Promise.all([
    listMessageTemplates(),
    getCurrentAppUser(),
    getMarketingSegments(),
  ]);
  const templateCount = templatesRes.ok ? templatesRes.data.length : 0;
  const user = userRes.ok ? userRes.data : null;

  const solapiReady = isSolapiConfigured();
  const settingsReady = Boolean(user?.store_name);
  const alimtalkReady = solapiReady && Boolean(user?.kakao_pf_id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">마케팅</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">메시지 템플릿</span>
            <span className="text-2xl font-semibold tabular-nums">
              {templateCount}
            </span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">발송 설정</span>
            <span className="text-sm font-medium">
              {settingsReady ? "완료" : "매장명 미입력"}
            </span>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">알림톡 연동</span>
            <span className="text-sm font-medium">
              {alimtalkReady ? "연결됨" : "미설정(수동 발송)"}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>바로 가기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button render={<Link href="/marketing/send" />}>메시지 보내기</Button>
          <Button
            variant="outline"
            render={<Link href="/marketing/templates" />}
          >
            템플릿 관리
          </Button>
          <Button variant="outline" render={<Link href="/marketing/history" />}>
            발송 이력
          </Button>
          <Button variant="outline" render={<Link href="/marketing/settings" />}>
            발송 설정
          </Button>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">프로모션 대상 세그먼트</h2>

        {!segmentsRes.ok ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-destructive">
              {segmentsRes.error}
            </CardContent>
          </Card>
        ) : (
          segmentsRes.data.map((seg) => (
            <Card key={seg.key} size="sm">
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{seg.title}</span>
                  <Badge variant="outline" className="font-normal tabular-nums">
                    {seg.count}명
                  </Badge>
                  <div className="ml-auto flex gap-1.5">
                    <Button
                      size="xs"
                      variant="outline"
                      render={
                        <Link
                          href={`/marketing/templates/new?body=${encodeURIComponent(seg.suggestion)}`}
                        />
                      }
                    >
                      템플릿 만들기
                    </Button>
                    <Button
                      size="xs"
                      disabled={seg.count === 0}
                      render={
                        <Link href={`/marketing/send?segment=${seg.key}`} />
                      }
                    >
                      메시지 보내기
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{seg.description}</p>

                {seg.customers.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {seg.customers.slice(0, 5).map((c, i) => (
                      <span key={c.id}>
                        {i > 0 ? " · " : ""}
                        {c.name}
                        <span className="text-muted-foreground/70">
                          ({seg.formatMetric(c.metric)})
                        </span>
                      </span>
                    ))}
                    {seg.customers.length > 5
                      ? ` 외 ${seg.customers.length - 5}명`
                      : ""}
                  </p>
                ) : null}

                <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  추천 문구: {seg.suggestion}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {!alimtalkReady ? (
        <Card>
          <CardContent className="py-5 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">
              알림톡을 실제로 보내려면
            </p>
            <ol className="list-decimal pl-5">
              <li>솔라피(Solapi) 가입 → API Key/Secret 을 환경변수에 설정</li>
              <li>카카오 비즈니스 채널 개설 → 솔라피에 발신 프로필 등록</li>
              <li>알림톡 템플릿 등록 후 카카오 검수 승인</li>
              <li>발송 설정에 매장명·발신번호·발신 프로필 키 입력</li>
            </ol>
            <p className="mt-2">
              설정 전에는 메시지가 &quot;수동 처리&quot;로 기록되고, 문구를
              복사하거나 CSV로 내려받아 보낼 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
