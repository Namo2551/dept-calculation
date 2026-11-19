"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDict } from "@/i18n";
import type { Lang } from "@/i18n/types";
import { computeMulti, computeSingle, multiIsValid, singleIsValid, type MultiCalc, type SingleCalc } from "@/lib/calc";
import { requiredPayment } from "@/lib/debt";
import { formatBahtShort } from "@/lib/format";
import {
  EXAMPLES,
  STORAGE_KEY,
  defaultState,
  loadState,
  newCard,
  saveState,
  shareUrl,
  validate,
  type AppState,
  type CardRaw,
  type RuleKey,
  type SingleRaw,
} from "@/lib/state";
import { prefersReducedMotion } from "./useReducedMotion";

export type ExampleId = "ex1" | "ex2" | "ex400" | "exMulti";

// raw = what the inputs show; okSingle/okMulti = the last fully valid inputs, so results never go blank mid-typing.
type Store = { raw: AppState; okSingle: SingleRaw; okMulti: AppState["multi"] };

function settle(prev: Store | null, raw: AppState): Store {
  const fallback = prev ?? { okSingle: defaultState("th").single, okMulti: defaultState("th").multi };
  return {
    raw,
    okSingle: singleIsValid(raw.single) ? raw.single : fallback.okSingle,
    okMulti: multiIsValid(raw.multi) ? raw.multi : fallback.okMulti,
  };
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function scrollToId(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }));
}

const SINGLE_RULES: Record<keyof SingleRaw, RuleKey> = { bal: "bal", apr: "apr", m: "m", floor: "floor", p: "p", n: "n" };

export function useCalculator(lang: Lang) {
  const t = getDict(lang);
  const [store, setStore] = useState<Store>(() => settle(null, defaultState(lang)));
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [extra, setExtra] = useState(0);
  const [shareFallback, setShareFallback] = useState<string | null>(null);

  // Load once on the client: URL hash, then localStorage, then defaults. Until then the UI shows a skeleton.
  useEffect(() => {
    const { state, source } = loadState({ hash: window.location.hash, storage: storage(), lang });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser-only sources
    setStore((prev) => settle(prev, state));
    if (source === "link") setMessage(t.msg.fromLink);
    setReady(true);
  }, [lang, t.msg.fromLink]);

  useEffect(() => {
    if (ready) saveState(storage(), store.raw);
  }, [ready, store.raw]);

  const update = useCallback((fn: (s: AppState) => AppState) => setStore((prev) => settle(prev, fn(prev.raw))), []);

  const state = store.raw;
  const single: SingleCalc = useMemo(() => computeSingle(store.okSingle), [store.okSingle]);
  const multi: MultiCalc = useMemo(() => computeMulti(store.okMulti, t.multi.unnamed), [store.okMulti, t.multi.unnamed]);

  // Field-level validity for inline errors (keys: "bal", "card.0.apr", "budget").
  const errors = useMemo(() => {
    const e: Record<string, boolean> = {};
    (Object.keys(SINGLE_RULES) as (keyof SingleRaw)[]).forEach((k) => {
      if (validate(SINGLE_RULES[k], state.single[k]) === null) e[k] = true;
    });
    state.multi.cards.forEach((c, i) =>
      (["balance", "apr", "m", "floor"] as const).forEach((k) => {
        if (validate(k, c[k]) === null) e[`card.${i}.${k}`] = true;
      }),
    );
    if (validate("budget", state.multi.budget) === null) e.budget = true;
    return e;
  }, [state]);

  const setSingle = useCallback((field: keyof SingleRaw, value: string) => update((s) => ({ ...s, single: { ...s.single, [field]: value } })), [update]);
  const setBudget = useCallback((value: string) => update((s) => ({ ...s, multi: { ...s.multi, budget: value } })), [update]);
  const setCard = useCallback(
    (i: number, field: keyof CardRaw, value: string) =>
      update((s) => ({ ...s, multi: { ...s.multi, cards: s.multi.cards.map((c, j) => (j === i ? { ...c, [field]: value } : c)) } })),
    [update],
  );
  const addCard = useCallback(
    () => update((s) => (s.multi.cards.length >= 5 ? s : { ...s, multi: { ...s.multi, cards: [...s.multi.cards, newCard(s.multi.cards.length, lang)] } })),
    [update, lang],
  );
  const removeCard = useCallback(
    (i: number) => update((s) => (s.multi.cards.length <= 2 ? s : { ...s, multi: { ...s.multi, cards: s.multi.cards.filter((_, j) => j !== i) } })),
    [update],
  );

  const runExample = useCallback(
    (id: ExampleId) => {
      if (id === "exMulti") {
        update((s) => ({ ...s, multi: defaultState(lang).multi }));
        scrollToId("multiRes");
        return;
      }
      update((s) => ({ ...s, single: { ...s.single, ...EXAMPLES[id] } }));
      setExtra(0);
      scrollToId("results-sec");
    },
    [update, lang],
  );

  // "Use as method B": the rounded-up payment for N months becomes the fixed payment.
  const applyRequiredPayment = useCallback(() => {
    const { bal, apr, n } = single.v;
    setSingle("p", formatBahtShort(requiredPayment(bal, apr, n).roundedUp));
    setExtra(0);
  }, [single.v, setSingle]);

  const reset = useCallback(() => {
    try {
      storage()?.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable: nothing to clear
    }
    try {
      history.replaceState(null, "", window.location.href.split("#")[0]);
    } catch {
      // history API blocked: the hash simply stays
    }
    setStore(settle(null, defaultState(lang)));
    setExtra(0);
    setShareFallback(null);
    setMessage(t.msg.resetDone);
  }, [lang, t.msg.resetDone]);

  const share = useCallback(async (): Promise<"copied" | "fallback"> => {
    const url = shareUrl(window.location.href, store.raw);
    const fallback = () => {
      setShareFallback(url);
      setMessage(t.msg.copyFailed);
      return "fallback" as const;
    };
    try {
      const timeout = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 1500)); // a stuck clipboard prompt
      const res = await Promise.race([navigator.clipboard.writeText(url).then(() => "ok" as const), timeout]);
      if (res !== "ok") return fallback();
      setShareFallback(null);
      setMessage(t.msg.copied);
      return "copied";
    } catch {
      return fallback();
    }
  }, [store.raw, t.msg.copied, t.msg.copyFailed]);

  return {
    lang,
    t,
    ready,
    state,
    errors,
    single,
    multi,
    message,
    extra,
    setExtra,
    shareFallback,
    setSingle,
    setBudget,
    setCard,
    addCard,
    removeCard,
    runExample,
    applyRequiredPayment,
    reset,
    share,
  };
}

export type Calc = ReturnType<typeof useCalculator>;
