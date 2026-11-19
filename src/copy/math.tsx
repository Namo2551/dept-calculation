// Copy for the "why" (Discrete Math) section.
import type { ReactNode } from "react";

const B = (i: ReactNode) => (
  <>
    B<sub>{i}</sub>
  </>
);

export const mathEn = {
  summary: "Why does this happen? (Discrete Math)",
  intro: (b0: string, apr: string, rs: string, p: string, m: string): ReactNode => (
    <>
      This section explains how the calculator above works, using your numbers: balance {B(0)} = {b0} baht, monthly interest r = {apr}/100/12 = {rs}, fixed payment p = {p} baht, minimum m = {m}%
    </>
  ),
  tagRec: "Recurrence relations",
  tagInd: "Mathematical reasoning",
  step1: {
    title: "Step 1: write it as a recurrence",
    every: (
      <>
        Every month the same thing happens: <b>this month&apos;s balance = last month&apos;s balance + interest − payment</b>
      </>
    ),
    asFormula: "As a formula (a recurrence relation):",
    methodB: "Method B (fixed payment):",
    methodA: "Method A (pay m% of the balance, minimum in baht = 0):",
    likeCompound: (
      <>
        It is like compound interest P<sub>n</sub> = 1.11·P<sub>n−1</sub>, except that we also make payments.
      </>
    ),
    tryB: "Try method B with your numbers:",
    pattern: "Keep going and a pattern appears, which gives a closed form: a formula for month n directly, without stepping through every month.",
    walkLabel: (k: number) => `Step through month by month (method B): up to month ${k}`,
    walkNote: "This is the recurrence applied again and again: last month's result feeds the next month.",
    byWalk: (k: number): ReactNode => <>Stepping month by month ({B(k)})</>,
    byClosed: (k: number): ReactNode => <>Closed form ({B(k)})</>,
    result: "Result",
    same: "✓ Equal",
    differ: "✗ Not equal",
    walkLimit: (k: number) => `You can step up to month ${k}, because after that the payment is less than p (the debt is nearly gone), which the closed form does not cover.`,
  },
  step2: {
    title: "Step 2: prove the formula is right (induction)",
    ladderIdea: 'We prove it like "climbing stairs" (mathematical induction): the first step holds, and whenever one step holds, the next one does too.',
    meaning: "In plain words:",
    basis: "Basis step:",
    inductive: "Inductive step:",
    p1: {
      title: "Claim 1: the closed form for a fixed payment",
      meaning: 'The starting balance grows with compound interest, minus every payment made (and each payment also "saves interest" in a compounding way).',
      basisTail: "correct",
      assume: "assume the formula holds at n = k. Then",
      soTrue: "So it also holds at k+1 ✔",
      note: (
        <>
          Note: the formula comes from the geometric series p·(1 + (1+r) + … + (1+r)<sup>n−1</sup>) = p·((1+r)<sup>n</sup> − 1)/r
        </>
      ),
      check: (n: number, cf: string, table: string, diff: string): ReactNode => (
        <>
          ✓ Checked with your numbers: at month {n} the closed form gives {cf} baht and the month-by-month table gives {table} baht
          <br />
          Largest gap between the closed form and the table (every month paying the full p) = {diff} baht
        </>
      ),
    },
    ladder: {
      title: "Climb the induction stairs with your numbers",
      pick: (k: number) => `Pick step k = ${k}`,
      play: "▶ Climb automatically",
      stop: "⏸ Stop",
      box1: (k: number): ReactNode => <>① Closed form at k = {k}</>,
      box2: (k: number): ReactNode => <>② One recurrence step (1+r)·{B(k)} − p</>,
      box3: (k: number): ReactNode => <>③ Closed form at k+1 = {k + 1}</>,
      ok: (k: number) => `✓ ② equals ③, so step ${k} is reached`,
      notOk: "✗ ② does not equal ③",
      negative: "A negative value means the debt is already paid off in real life, but the formula is still mathematically true.",
      stairs: "Staircase",
      step: (i: number) => `Step ${i}`,
      base: "Basis ✓",
      up: "↑ Reached",
      passed: "✓ Holds",
      hint: "Basis (step 0 holds) + if step k holds then step k+1 holds = every step holds",
    },
    p2: {
      title: "Claim 2: paying a % of the balance never truly reaches zero",
      everyN: "for every n (when m < 100%)",
      meaning: "Paying a percentage of what is left shrinks the balance by the same fraction each month, like cutting a cake in half again and again: it never runs out exactly.",
      because: "because (1+r−m) > 0",
      check: (factor: string, positive: boolean, n: number, cf: string, table: string): ReactNode => (
        <>
          ✓ Checked with your numbers: 1+r−m = {factor}
          {positive ? " > 0" : ""}
          <br />
          Balance after {n} months: closed form {cf} baht | table {table} baht
        </>
      ),
      floorNote: "(This claim uses a minimum in baht of 0, as the formula assumes. With a minimum in baht, the debt can really be paid off.)",
    },
    p3: {
      title: <>Claim 3: if the payment is no more than the first month&apos;s interest (p ≤ r·{B(0)}), the debt never goes down</>,
      everyN: "for every n",
      meaning: "If the payment doesn't even cover the interest, nothing is left over to reduce the principal.",
      check: (rb0: string, p: string, met: boolean, left12: string): ReactNode => (
        <>
          ✓ Checked with your numbers: r·{B(0)} = {rb0} baht, p = {p} baht →{" "}
          {met ? (
            <>
              <b>condition met</b> (p ≤ r·{B(0)}), the debt never goes down: at month 12 there are still {left12} baht left
            </>
          ) : (
            <>condition not met (p &gt; r·{B(0)}), so the debt can go down</>
          )}
        </>
      ),
    },
  },
  step3: {
    title: "Step 3: put the formula to work",
    setZero: <>To be debt-free at month n, set {B("n")} = 0 in the closed form and solve for p:</>,
    usedBy: 'This is the formula behind the "debt-free in N months" card.',
    check: (n: string, rs: string, b0: string, exact: string, rounded: string, dur: string): ReactNode => (
      <>
        ✓ Your numbers (n = {n}): p = {rs} × {b0} / (1 − (1+{rs})<sup>−{n}</sup>) = {exact} baht → rounded up to {rounded} baht, paid off in {dur}
      </>
    ),
  },
  real: {
    title: "Where these formulas show up in real life",
    tryIt: "Try this example",
    items: [
      { id: "ex1", text: <>The &quot;5% minimum&quot; example that takes decades is <b>claim 2</b>: paying a % of what is left never truly reaches zero.</> },
      { id: "ex400", text: <>The &quot;fixed 400&quot; example is <b>claim 3</b>: the payment is no more than the first month&apos;s interest, so the debt never goes down.</> },
      { id: "ex2", text: <>The &quot;500 baht minimum&quot; example does get paid off, because the payment no longer shrinks with the balance, so claim 2 does not apply.</> },
      { id: "exMulti", text: <>The &quot;several cards&quot; example: each card still follows the same recurrence; only the payment to each card changes with the strategy.</> },
    ] as { id: "ex1" | "ex2" | "ex400" | "exMulti"; text: ReactNode }[],
  },
  summaryTitle: "Three takeaways",
  summaryItems: [
    "Paying a percentage of the balance means the payments keep shrinking, so the debt clears very slowly.",
    "Paying the same amount every month clears it much faster, as long as it is more than the interest.",
    "If you pay no more than the interest, the debt never goes down.",
  ],
  vocabTitle: "Vocabulary",
  vocab: [
    ["recurrence relation", " = a formula that finds the next value from the previous one"],
    ["induction", " (mathematical induction) = proving step by step like climbing stairs (you can reach the first step, and from any step you can reach the next)"],
  ],
};
