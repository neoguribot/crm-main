/** 라벨별 건수를 가로 막대로 보여주는 순수 서버 컴포넌트. 차트 라이브러리 없이 div 로만. */
export function BarList({
  rows,
  unit = "명",
}: {
  rows: { label: string; count: number }[];
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-muted-foreground">{r.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/40"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums">
              {r.count.toLocaleString("ko-KR")}{unit}
            </span>
            <span className="w-12 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
              {pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
