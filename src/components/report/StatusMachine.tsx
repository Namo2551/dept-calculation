"use client";
import { useState } from "react";
import { useCalc } from "@/components/calculator/CalcContext";
import { Button } from "@/components/ui/Button";
import { endsInDefault, MAX_MOVES, parseMoves, runMachine, step, type AccountState } from "@/lib/fsm";

const STATES: AccountState[] = ["current", "late", "delinquent", "default"];
const CX = [70, 210, 350, 490];
const CY = 104;
const R = 47;

// State diagram: Current -M-> Late -M-> Delinquent -M-> Default, P returns to Current, Default is a trap.
function Diagram({ now, label }: { now: AccountState; label: (s: AccountState) => string }) {
  const { t } = useCalc();
  const arrow = "url(#fsm-arrow)";
  return (
    <svg viewBox="0 0 560 230" className="w-full h-auto max-w-[640px]" role="img" aria-label={t.status.diagramAria(label(now))}>
      <defs>
        <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
        </marker>
      </defs>
      {/* M: one state to the right */}
      {[0, 1, 2].map((i) => (
        <g key={`m${i}`}>
          <line x1={CX[i] + R} y1={CY} x2={CX[i + 1] - R - 2} y2={CY} stroke="var(--ink)" strokeWidth="1.5" markerEnd={arrow} />
          <text x={(CX[i] + CX[i + 1]) / 2} y={CY - 8} textAnchor="middle" fontSize="15" fill="var(--ink)">M</text>
        </g>
      ))}
      {/* P: back to Current from Late and Delinquent */}
      {[1, 2].map((i) => (
        <g key={`p${i}`}>
          <path d={`M ${CX[i]} ${CY + R} C ${CX[i]} ${CY + R + 40 + i * 18}, ${CX[0]} ${CY + R + 40 + i * 18}, ${CX[0] + 6} ${CY + R + 2}`} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 4" markerEnd={arrow} />
          <text x={(CX[i] + CX[0]) / 2} y={CY + R + 30 + i * 18} textAnchor="middle" fontSize="15" fill="var(--accent)">P</text>
        </g>
      ))}
      {/* self-loops: P on Current, P,M on Default */}
      <path d={`M ${CX[0] - 16} ${CY - R + 2} C ${CX[0] - 30} ${CY - R - 44}, ${CX[0] + 30} ${CY - R - 44}, ${CX[0] + 16} ${CY - R + 2}`} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 4" markerEnd={arrow} />
      <text x={CX[0]} y={CY - R - 36} textAnchor="middle" fontSize="15" fill="var(--accent)">P</text>
      <path d={`M ${CX[3] - 16} ${CY - R + 2} C ${CX[3] - 30} ${CY - R - 44}, ${CX[3] + 30} ${CY - R - 44}, ${CX[3] + 16} ${CY - R + 2}`} fill="none" stroke="var(--ink)" strokeWidth="1.5" markerEnd={arrow} />
      <text x={CX[3]} y={CY - R - 36} textAnchor="middle" fontSize="15" fill="var(--ink)">P, M</text>
      {/* start arrow */}
      <line x1="0" y1={CY} x2={CX[0] - R - 2} y2={CY} stroke="var(--ink)" strokeWidth="1.5" markerEnd={arrow} />
      {STATES.map((s, i) => {
        const on = s === now;
        return (
          <g key={s} data-state={s} data-active={on ? "true" : "false"}>
            <circle cx={CX[i]} cy={CY} r={R} fill={on ? "var(--btn)" : "var(--surface)"} stroke="var(--ink)" strokeWidth="1.5" />
            {s === "default" && <circle cx={CX[i]} cy={CY} r={R - 6} fill="none" stroke={on ? "var(--on-btn)" : "var(--ink)"} strokeWidth="1.5" />}
            <text x={CX[i]} y={CY + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill={on ? "var(--on-btn)" : "var(--ink)"}>
              {label(s)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Section 7 (Ch 13): step a finite-state machine with Pay/Miss, or type a whole string of months.
export function StatusMachine() {
  const { t, single } = useCalc();
  const S = t.status;
  const [moves, setMoves] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const path = runMachine(moves);
  const now = path[path.length - 1];
  const label = (s: AccountState) => S.names[s];
  const add = (m: "P" | "M") => {
    setMoves((x) => (x.length < MAX_MOVES ? x + m : x));
    setError(false);
  };
  const apply = () => {
    const parsed = parseMoves(draft);
    if (parsed === null) {
      setError(true);
      return;
    }
    setError(false);
    setMoves(parsed);
  };
  const full = moves.length >= MAX_MOVES;
  const B = single.B;

  return (
    <div className="grid gap-6 min-w-0">
      <p className="text-muted max-w-[70ch]">{S.intro}</p>

      <div className="inset-card p-5 sm:p-7 min-w-0 grid gap-5">
        <Diagram now={now} label={label} />
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button size="sm" variant="primary" disabled={full} onClick={() => add("P")}>{S.pay}</Button>
          <Button size="sm" disabled={full} onClick={() => add("M")}>{S.miss}</Button>
          <Button size="sm" variant="quiet" onClick={() => { setMoves(""); setDraft(""); setError(false); }}>{S.reset}</Button>
        </div>
        <form
          className="flex flex-wrap items-end gap-2 no-print"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="grow max-w-[420px]">
            <label htmlFor="fsm-moves" className="block text-sm font-medium mb-2">{S.input}</label>
            <input
              id="fsm-moves"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={error}
              aria-describedby={error ? "fsm-error" : undefined}
              className="num w-full h-12 bg-bg border border-field px-3 uppercase"
              placeholder="PPMPMMM"
            />
          </div>
          <Button size="sm" type="submit">{S.apply}</Button>
          {error && <p id="fsm-error" className="basis-full text-bad text-sm font-semibold">{S.error}</p>}
        </form>
        <ol aria-label={S.pathLabel} className="flex flex-wrap gap-2">
          {path.map((s, k) => (
            <li key={k} className={`num text-sm px-2 py-1 border ${s === "default" ? "border-bad text-bad" : s === "current" ? "border-hair" : "border-accent text-accent"}`}>
              {S.month(k, label(s))}
            </li>
          ))}
        </ol>
        <p className="text-sm">
          {S.language} <b className={endsInDefault(moves) ? "text-bad" : "text-good"}>{endsInDefault(moves) ? S.yes : S.no}</b>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <table aria-label={S.tableLabel} className="num text-sm border border-hair w-full max-w-[480px]">
          <thead>
            <tr className="bg-surface">
              <th className="text-left px-3 py-2">{S.stateCol}</th>
              <th className="text-left px-3 py-2">{S.onP}</th>
              <th className="text-left px-3 py-2">{S.onM}</th>
            </tr>
          </thead>
          <tbody>
            {STATES.map((s) => (
              <tr key={s} className={`border-t border-hair ${s === now ? "font-semibold" : ""}`}>
                <td className="px-3 py-2">{label(s)}{s === "current" ? " (start)" : s === "default" ? " (trap)" : ""}</td>
                <td className="px-3 py-2">{label(step(s, "P"))}</td>
                <td className="px-3 py-2">{label(step(s, "M"))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm grid gap-2 content-start">
          <p>{B.months === null ? S.neverPaid : S.paidOff(B.months)}</p>
          <p className="text-muted">{S.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
