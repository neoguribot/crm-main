import { Skeleton } from "@/components/ui/skeleton";

/** 라우트 로딩 중 표시하는 공통 스켈레톤. */
export function PageLoading({
  title = "불러오는 중…",
  rows = 4,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-10">
      <p className="sr-only" role="status">
        {title}
      </p>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </main>
  );
}
