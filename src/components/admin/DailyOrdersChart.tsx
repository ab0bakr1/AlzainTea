"use client";

import { useId, useRef, useState } from "react";

type Point = { date: string; orders: number };

const W = 600;
const H = 200;
const LOCALE = "ar-u-nu-latn";

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));

/** مخطط مساحي خفيف بدون مكتبات خارجية (SVG). المحور الزمني دائماً من اليسار لليمين. */
export default function DailyOrdersChart({ data }: { data: Point[] }) {
  const gradId = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = data.length;
  const peak = Math.max(0, ...data.map((d) => d.orders));
  const max = Math.max(4, Math.ceil(peak / 4) * 4);
  const ticks = [4, 3, 2, 1, 0].map((t) => (max * t) / 4);
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / max) * H;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.orders)}`).join(" ");
  const area = `${line} L${x(n - 1)},${H} L${x(0)},${H} Z`;

  const onMove = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
  };

  const active = hover !== null ? data[hover] : null;
  const leftPct = hover !== null ? (x(hover) / W) * 100 : 0;
  const topPct = active ? (y(active.orders) / H) * 100 : 0;
  const mid = data[Math.floor((n - 1) / 2)];

  return (
    <div dir="ltr" className="flex gap-3">
      <div className="flex h-48 flex-col justify-between text-[11px] tabular-nums text-[var(--color-text-secondary)]">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          ref={ref}
          className="relative h-48 touch-pan-y"
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`الطلبات المدفوعة يومياً خلال ${n} يوماً، الذروة ${peak} طلب`}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--color-primary)", stopOpacity: 0.28 }} />
                <stop offset="100%" style={{ stopColor: "var(--color-primary)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <line
                key={t}
                x1={0}
                x2={W}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-text-secondary)"
                strokeOpacity={0.18}
                strokeDasharray={t === 0 ? undefined : "3 4"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradId})`} />
            <path
              d={line}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={0}
                y2={H}
                stroke="var(--color-primary)"
                strokeOpacity={0.4}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {active && (
            <>
              <span
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-primary)] shadow"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              />
              <div
                dir="rtl"
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[var(--color-text-primary)] px-2.5 py-1.5 text-xs text-[var(--color-bg)] shadow-lg"
                style={{ left: `${Math.min(92, Math.max(8, leftPct))}%`, top: `calc(${topPct}% - 12px)` }}
              >
                <span className="font-semibold">{active.orders} طلب</span> · {fmtDay(active.date)}
              </div>
            </>
          )}
        </div>

        {n > 0 && (
          <div className="mt-2 flex justify-between text-[11px] text-[var(--color-text-secondary)]">
            <span>{fmtDay(data[0].date)}</span>
            {n > 4 && <span>{fmtDay(mid.date)}</span>}
            <span>{fmtDay(data[n - 1].date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}