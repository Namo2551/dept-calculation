// 0..1 -> "37.5" (rounded down so 99.96% never reads as 100).
export function percentText(value: number): string {
  return String(Math.floor(Math.min(1, Math.max(0, value)) * 1000) / 10);
}

// A labelled progress bar: text percentage beside the bar, exposed to assistive tech as role="progressbar".
export function ProgressBar({ value, label, text }: { value: number; label: string; text: string }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className="grid gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 1000) / 10}
        aria-valuetext={text}
        className="h-4 w-full border border-field bg-bg"
      >
        <div className="h-full bg-series-b" style={{ width: `${v * 100}%` }} />
      </div>
      <p className="text-sm num">{text}</p>
    </div>
  );
}

export type Tone = "good" | "bad" | "neutral" | "accent";

const tones: Record<Tone, string> = {
  good: "border-good text-good",
  bad: "border-bad text-bad",
  accent: "border-accent text-accent",
  neutral: "border-field text-muted",
};

// A small bordered label for statuses (text, not color alone, carries the meaning).
export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center border px-2 py-0.5 text-sm font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}
