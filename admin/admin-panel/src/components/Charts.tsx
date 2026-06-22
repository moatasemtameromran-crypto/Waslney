import { useEffect, useState } from "react";

/* Build a smooth (Catmull-Rom → bezier) path through points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]},${pts[0][1]}` : "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ── Smooth gradient area chart ────────────────────────────────────────── */
export function AreaChart({
  data, height = 200, color = "#fbbf24", label = "", valuePrefix = "",
}: {
  data: { date: string; value: number }[];
  height?: number; color?: string; label?: string; valuePrefix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [grow, setGrow] = useState(0);
  useEffect(() => { const t = setTimeout(() => setGrow(1), 50); return () => clearTimeout(t); }, []);

  const W = 600, H = height, padX = 8, padY = 16;
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - padY - (Number(v || 0) / max) * (H - padY * 2);
  const pts: [number, number][] = data.map((d, i) => [padX + i * stepX, y(d.value)]);

  const id = label.replace(/\W/g, "") || "area";
  const line = smoothPath(pts);
  const area = line ? `${line} L ${pts[pts.length - 1][0]},${H} L ${pts[0][0]},${H} Z` : "";

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        ))}
        {area && <path d={area} fill={`url(#grad-${id})`} style={{ opacity: grow, transition: "opacity .8s ease" }} />}
        {line && (
          <path
            d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000 * (1 - grow), transition: "stroke-dashoffset 1.1s ease" }}
          />
        )}
        {pts.map((p, i) => (
          <g key={i}>
            <rect x={p[0] - stepX / 2} y={0} width={stepX || W} height={H} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
            {hover === i && (
              <>
                <line x1={p[0]} x2={p[0]} y1={0} y2={H} stroke={color} strokeOpacity="0.3" strokeWidth="1" />
                <circle cx={p[0]} cy={p[1]} r="5" fill={color} stroke="#0a0a0a" strokeWidth="2" />
              </>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="absolute -translate-x-1/2 -top-2 bg-popover border border-border rounded-lg px-3 py-1.5 text-xs whitespace-nowrap pointer-events-none shadow-lg z-10"
          style={{ left: `${(pts[hover][0] / W) * 100}%` }}
        >
          <div className="font-semibold text-foreground">{valuePrefix}{Number(data[hover].value || 0).toLocaleString()}</div>
          <div className="text-muted-foreground">{new Date(data[hover].date).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
        </div>
      )}
    </div>
  );
}

/* ── Animated donut chart ──────────────────────────────────────────────── */
export function DonutChart({
  segments, size = 180,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const [grow, setGrow] = useState(0);
  useEffect(() => { const t = setTimeout(() => setGrow(1), 100); return () => clearTimeout(t); }, []);

  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 16;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="16" />
          {segments.map((s, i) => {
            const frac = (s.value / total) * grow;
            const dash = frac * C;
            const el = (
              <circle
                key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="16"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} strokeLinecap="round"
                style={{ transition: "stroke-dasharray .9s ease, stroke-dashoffset .9s ease" }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground capitalize">{s.label}</span>
            <span className="font-semibold text-foreground ml-1">{s.value}</span>
            <span className="text-xs text-muted-foreground">({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal bar list (top routes) ──────────────────────────────────── */
export function BarList({
  items, color = "#60a5fa", valuePrefix = "",
}: {
  items: { label: string; value: number; sub?: string }[];
  color?: string; valuePrefix?: string;
}) {
  const [grow, setGrow] = useState(0);
  useEffect(() => { const t = setTimeout(() => setGrow(1), 80); return () => clearTimeout(t); }, []);
  const max = Math.max(...items.map((i) => i.value), 1);

  if (!items.length) return <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground truncate max-w-[70%]">{it.label}</span>
            <span className="text-muted-foreground">{valuePrefix}{Number(it.value || 0).toLocaleString()}{it.sub ? ` · ${it.sub}` : ""}</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(it.value / max) * 100 * grow}%`,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                transition: "width .9s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
