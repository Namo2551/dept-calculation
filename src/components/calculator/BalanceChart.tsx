"use client";
import { useEffect, useMemo, useState } from "react";
import { halo, LineChart, type Scale } from "@/components/charts/LineChart";
import { Button } from "@/components/ui/Button";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { RangeField } from "@/components/ui/RangeField";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { balanceSeries, chartLength, playStep } from "@/lib/chart";
import type { SimResult } from "@/lib/debt";
import { formatBaht, monthsToText } from "@/lib/format";
import { useCalc } from "./CalcContext";

type Range = "60" | "120" | "all";
type Speed = 1 | 2 | 4;

export function BalanceChart() {
  const { t, single } = useCalc();
  const { A, B, v } = single;
  const [range, setRange] = useState<Range>("all");
  const [speed, setSpeed] = useState<Speed>(1);
  const [k, setK] = useState(12);
  const [playK, setPlayK] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  // Any input change stops playback and shows the full lines again.
  const [seen, setSeen] = useState(single);
  if (seen !== single) {
    setSeen(single);
    setPlaying(false);
    setPlayK(null);
  }

  const len = chartLength(A, B, range);
  const full = useMemo(() => ({ a: balanceSeries(A, v.bal, len), b: balanceSeries(B, v.bal, len) }), [A, B, v.bal, len]);
  const ymax = Math.max(...full.a, ...full.b);
  const sA = playK === null ? full.a : full.a.slice(0, playK + 1);
  const sB = playK === null ? full.b : full.b.slice(0, playK + 1);
  const kk = Math.min(k, len);

  // One tick every 100 ms while playing; the last tick shows the full lines again.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      const next = Math.min(len, (playK ?? 0) + playStep(len, speed));
      setK(next);
      if (next >= len) {
        setPlaying(false);
        setPlayK(null);
      } else setPlayK(next);
    }, 100);
    return () => clearTimeout(id);
  }, [playing, playK, len, speed]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (playK === null || playK >= len) setPlayK(0);
    setPlaying(true);
  };

  const bEnd = B.months || sB.length - 1;
  const halfway = full.a.findIndex((b) => b < v.bal / 2);

  const markers = ({ x, y }: Scale) => {
    const out: React.ReactNode[] = [];
    // ◆ where each method first drops below 1% of the starting balance
    ([["A", A, sA, -14], ["B", B, sB, -34]] as [string, SimResult, number[], number][]).forEach(([key, sim, s, dy]) => {
      const mo = sim.monthsTo1pct;
      if (mo === null || mo >= s.length) return;
      const cx = x(mo), cy = y(s[mo]);
      const anchor = cx > x(len) * 0.7 ? "end" : "start";
      const color = key === "A" ? "var(--series-a)" : "var(--series-b)";
      out.push(
        <g key={"m" + key}>
          <path d={`M${cx} ${cy - 7}l7 7l-7 7l-7 -7z`} fill={color} stroke="var(--bg)" strokeWidth="1.5" />
          <text x={cx + (anchor === "end" ? -8 : 8)} y={cy + dy} textAnchor={anchor} fontSize="13" fontWeight="700" fill="var(--ink)" {...halo}>
            {t.chart.below1pct(key, mo)}
          </text>
        </g>,
      );
    });
    if (B.neverDecreases && sB.length > 1) {
      const last = sB.length - 1;
      out.push(
        <text key="never" x={x(last)} y={y(sB[last]) - 12} textAnchor="end" fontSize="15" fontWeight="800" fill="var(--bad)" {...halo}>
          {t.chart.neverDown}
        </text>,
      );
    }
    // slider position
    out.push(<line key="pos" x1={x(kk)} x2={x(kk)} y1={14} y2={y(0)} stroke="var(--ink)" strokeDasharray="2 4" />);
    if (kk < sA.length) out.push(<circle key="pa" cx={x(kk)} cy={y(sA[kk])} r={5} fill="var(--series-a)" />);
    if (kk < sB.length) out.push(<rect key="pb" x={x(kk) - 5} y={y(sB[kk]) - 5} width={10} height={10} fill="var(--series-b)" />);
    return out;
  };

  const rowText = (sim: SimResult) => {
    if (kk === 0) return t.chart.start(formatBaht(v.bal));
    if (kk > sim.rows.length) return sim.months !== null ? t.chart.paidOff(sim.months) : t.chart.notSimulated;
    const w = sim.rows[kk - 1];
    return (
      <>
        <b className="num">{t.chart.left(formatBaht(w.end))}</b>
        <br />
        <span className="num">{t.chart.pay(formatBaht(w.payment))}</span>
      </>
    );
  };

  return (
    <Panel id="chart-sec">
      <PanelTitle>{t.chart.heading}</PanelTitle>
      <div className="grid gap-4 no-print">
        <ToggleGroup<Range>
          label={t.chart.rangeLabel}
          value={range}
          onChange={(r) => {
            setRange(r);
            setPlaying(false);
            setPlayK(null);
          }}
          options={[{ value: "60", label: t.chart.r60 }, { value: "120", label: t.chart.r120 }, { value: "all", label: t.chart.rAll }]}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" onClick={togglePlay}>
            {playing ? t.chart.pause : playK !== null ? t.chart.resume : t.chart.play}
          </Button>
          <ToggleGroup<"1" | "2" | "4">
            label={t.chart.speedLabel}
            value={String(speed) as "1" | "2" | "4"}
            onChange={(s) => setSpeed(Number(s) as Speed)}
            options={[{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "4", label: "4x" }]}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.93rem] mt-5 mb-2">
        <span className="inline-flex items-center gap-2">
          <svg width="34" height="10" aria-hidden="true"><line x1="0" x2="34" y1="5" y2="5" stroke="var(--series-a)" strokeWidth="3" /></svg>
          {t.chart.legendA}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="34" height="10" aria-hidden="true"><line x1="0" x2="34" y1="5" y2="5" stroke="var(--series-b)" strokeWidth="3" strokeDasharray="9 6" /></svg>
          {t.chart.legendB}
        </span>
        <span>{t.chart.legend1pct}</span>
      </div>
      <div className="bg-bg border border-hair p-3 sm:p-4">
        <LineChart
          len={len}
          ymax={ymax}
          aria={t.chart.aria}
          series={[
            { data: sA, color: "var(--series-a)", label: "A", at: Math.max(2, halfway), dy: -10 },
            { data: sB, color: "var(--series-b)", dash: "9 6", label: "B", at: bEnd * 0.5, dy: 22 },
          ]}
          extra={markers}
        />
      </div>
      <div className="mt-5 no-print">
        <RangeField
          label={t.chart.atMonth(kk, monthsToText(kk))}
          min={0}
          max={len}
          value={kk}
          onChange={(n) => {
            setPlaying(false);
            setPlayK(null);
            setK(n);
          }}
        />
        <div className="grid grid-cols-2 gap-4 mt-3 text-[0.93rem]">
          <div>
            <b className="text-series-a">{t.chart.readA}</b>
            <br />
            {rowText(A)}
          </div>
          <div>
            <b className="text-series-b">{t.chart.readB}</b>
            <br />
            {rowText(B)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
