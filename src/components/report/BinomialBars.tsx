import { copy } from "@/copy";

export const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

// Bar chart of P(0), P(1), P(2), P(3), P(4+) missed months; bars scale to the tallest one.
export function BinomialBars({ buckets }: { buckets: number[] }) {
  const R = copy.risk;
  const W = 500, H = 190, top = 26, base = 160, gap = 24;
  const bw = (W - gap * (buckets.length + 1)) / buckets.length;
  const max = Math.max(...buckets, 1e-9);
  const labels = buckets.map(pct1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={R.barsAria(labels)}>
      <line x1="0" x2={W} y1={base} y2={base} stroke="var(--hair)" />
      {buckets.map((b, i) => {
        const h = (b / max) * (base - top);
        const x = gap + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={base - h} width={bw} height={h} fill="var(--series-a)" />
            <text x={x + bw / 2} y={base - h - 8} textAnchor="middle" fontSize="15" fill="var(--ink)" className="num">
              {labels[i]}
            </text>
            <text x={x + bw / 2} y={base + 22} textAnchor="middle" fontSize="15" fill="var(--muted)">
              {R.barLabels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
