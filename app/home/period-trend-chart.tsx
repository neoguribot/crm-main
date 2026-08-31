import {
  formatPeriodBucket,
  type PeriodGranularity,
  type PeriodPoint,
} from "@/lib/dashboard/period";

/** yMax 를 눈금이 깔끔한 값으로 올림 (1,2,5 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

const W = 720;
const H = 170;
const PAD = { top: 14, right: 12, bottom: 22, left: 28 };

/**
 * 기간별 추이 도표. 거래 고객수는 막대, 신규 등록 고객수는 선으로 겹쳐 보여준다.
 * 순수 SVG (서버 렌더, JS 없음).
 */
export function PeriodTrendChart({
  granularity,
  trade,
  registration,
}: {
  granularity: PeriodGranularity;
  trade: PeriodPoint[];
  registration: PeriodPoint[];
}) {
  // 두 계열은 같은 RPC·같은 단위라 버킷이 동일하다. 안전하게 버킷 기준으로 합친다.
  const tradeByBucket = new Map(trade.map((p) => [p.bucket, p.count]));
  const regByBucket = new Map(registration.map((p) => [p.bucket, p.count]));
  const bucketKeys = Array.from(
    new Set([...trade.map((p) => p.bucket), ...registration.map((p) => p.bucket)]),
  ).sort();
  const n = bucketKeys.length;

  if (n === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        표시할 데이터가 없습니다.
      </p>
    );
  }

  const rows = bucketKeys.map((bucket) => ({
    bucket,
    label: formatPeriodBucket(bucket, granularity),
    trade: tradeByBucket.get(bucket) ?? 0,
    reg: regByBucket.get(bucket) ?? 0,
  }));

  const rawMax = Math.max(1, ...rows.map((r) => Math.max(r.trade, r.reg)));
  const yMax = niceCeil(rawMax);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.6, 34);

  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  // x축 라벨: 8개 이하면 전부, 아니면 균등하게 5개 안팎
  const labelStep = n <= 8 ? 1 : Math.ceil(n / 5);

  // 가로 눈금: 0 ~ yMax. yMax 가 4 이상일 때만 중간선을 넣고, 값이 겹치면 제외.
  const gridValues =
    yMax >= 4 ? [0, Math.round(yMax / 2), yMax] : [0, yMax];
  const gridLines = Array.from(new Set(gridValues)).map((v) => ({
    v,
    yy: y(v),
  }));

  const linePts = rows.map((r, i) => `${x(i)},${y(r.reg)}`).join(" ");
  const totalTrade = rows.reduce((s, r) => s + r.trade, 0);
  const totalReg = rows.reduce((s, r) => s + r.reg, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/30" />
          거래 수 <span className="text-foreground">{totalTrade.toLocaleString("ko-KR")}건</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-primary" />
          신규 등록 고객수 <span className="text-foreground">{totalReg.toLocaleString("ko-KR")}명</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[440px]"
          role="img"
          aria-label="기간별 거래 수와 신규 등록 고객수 추이"
        >
          {/* 가로 눈금선 + y 라벨 */}
          {gridLines.map((g) => (
            <g key={g.v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={g.yy}
                y2={g.yy}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={g.yy + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {g.v}
              </text>
            </g>
          ))}

          {/* 거래 = 막대 */}
          {rows.map((r, i) => {
            const bh = plotH - (y(r.trade) - PAD.top);
            return (
              <rect
                key={r.bucket}
                x={x(i) - barW / 2}
                y={y(r.trade)}
                width={barW}
                height={Math.max(0, bh)}
                rx={2}
                className="fill-primary/30"
              />
            );
          })}

          {/* 신규 등록 = 선 + 점 */}
          {n > 1 ? (
            <polyline
              points={linePts}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {rows.map((r, i) =>
            r.reg > 0 || n === 1 ? (
              <circle
                key={r.bucket}
                cx={x(i)}
                cy={y(r.reg)}
                r={3}
                className="fill-primary"
              />
            ) : null,
          )}

          {/* x 라벨 */}
          {rows.map((r, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text
                key={r.bucket}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {r.label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
