// Parity: the TypeScript core must return exactly what the original core.js returned.
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import * as next from "./debt";
import type { Card, MultiStrategy, SingleOptions } from "./debt";

const legacy = createRequire(import.meta.url)("../../tests/fixtures/legacy-core.cjs");

const balances = [1, 999.99, 30000, 1e9];
const aprs = [0, 16, 24, 100];

const singleCases: SingleOptions[] = [];
for (const balance of balances)
  for (const apr of aprs) {
    for (const m of [0.001, 0.05, 1]) for (const floor of [0, 500]) singleCases.push({ balance, apr, strategy: "pct", m, floor });
    for (const p of [0, 400, 1500, 1e9]) singleCases.push({ balance, apr, strategy: "fixed", p });
  }

describe("parity with legacy core.js", () => {
  test.each(singleCases.map((o) => [JSON.stringify(o), o] as const))("simulate + splitByYear %s", (_, o) => {
    const got = next.simulate(o);
    expect(got).toEqual(legacy.simulate(o));
    expect(next.splitByYear(got.rows)).toEqual(legacy.splitByYear(got.rows));
  });

  test("requiredPayment", () => {
    for (const balance of balances) for (const apr of aprs) for (const n of [1, 24, 1200])
      expect(next.requiredPayment(balance, apr, n)).toEqual(legacy.requiredPayment(balance, apr, n));
  });

  const cards: Card[] = [
    { name: "บัตร A", balance: 20000, apr: 24, m: 0.05, floor: 200 },
    { name: "บัตร B", balance: 8000, apr: 18, m: 0.05, floor: 200 },
    { name: "บัตร C", balance: 3000, apr: 12, m: 0.05, floor: 200 },
  ];
  const strategies: MultiStrategy[] = ["avalanche", "snowball", "minonly"];
  test.each([0, 1000, 3000])("simulateMulti budget %i", (budget) => {
    for (const strategy of strategies)
      expect(next.simulateMulti({ cards, budget, strategy })).toEqual(legacy.simulateMulti({ cards, budget, strategy }));
  });
});
