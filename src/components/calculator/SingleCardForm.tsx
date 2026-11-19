"use client";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import type { SingleRaw } from "@/lib/state";
import { useCalc } from "./CalcContext";

export function SingleCardForm() {
  const { t, state, errors, setSingle, runExample, share, reset, message, shareFallback } = useCalc();
  const field = (k: keyof SingleRaw, label: string, hint?: string) => (
    <NumberField label={label} hint={hint} value={state.single[k]} onChange={(v) => setSingle(k, v)} error={errors[k] ? t.errors[k] : null} errorPrefix={t.errors.prefix} />
  );

  return (
    <Panel id="tool" testId="tool-panel">
      <PanelTitle>{t.form.heading}</PanelTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("bal", t.form.bal)}
        {field("apr", t.form.apr)}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <fieldset className="pressed rounded-well p-5 grid gap-4 min-w-0">
          <legend className="font-semibold float-left w-full mb-1">
            <svg width="34" height="10" aria-hidden="true" className="inline mr-2 align-middle">
              <line x1="0" x2="34" y1="5" y2="5" stroke="var(--series-a)" strokeWidth="3" />
            </svg>
            {t.form.legendA}
          </legend>
          {field("m", t.form.m)}
          {field("floor", t.form.floor, t.form.floorHint)}
        </fieldset>
        <fieldset className="pressed rounded-well p-5 grid gap-4 content-start min-w-0">
          <legend className="font-semibold float-left w-full mb-1">
            <svg width="34" height="10" aria-hidden="true" className="inline mr-2 align-middle">
              <line x1="0" x2="34" y1="5" y2="5" stroke="var(--series-b)" strokeWidth="3" strokeDasharray="9 6" />
            </svg>
            {t.form.legendB}
          </legend>
          {field("p", t.form.p)}
        </fieldset>
      </div>

      <div className="mt-7 no-print">
        <p className="text-sm text-muted mb-3">{t.form.examples}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => runExample("ex1")}>{t.form.ex1}</Button>
          <Button onClick={() => runExample("ex2")}>{t.form.ex2}</Button>
          <Button onClick={() => runExample("ex400")}>{t.form.ex400}</Button>
          <Button onClick={() => runExample("exMulti")}>{t.form.exMulti}</Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 no-print">
        <Button onClick={() => void share()}>{t.form.share}</Button>
        <Button onClick={() => window.print()}>{t.form.print}</Button>
        <Button onClick={reset}>{t.form.reset}</Button>
        <span role="status" className="text-good font-semibold ml-1">
          {message}
        </span>
      </div>
      {shareFallback && (
        <div className="mt-4 no-print">
          <label htmlFor="shareText" className="block font-medium mb-2">
            {t.form.shareBox}
          </label>
          <input id="shareText" readOnly value={shareFallback} onFocus={(e) => e.target.select()} autoFocus className="pressed w-full min-h-12 rounded-well px-4 text-sm" />
        </div>
      )}
    </Panel>
  );
}
