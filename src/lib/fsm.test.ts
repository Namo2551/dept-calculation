import { describe, expect, test } from "vitest";
import { endsInDefault, parseMoves, runMachine, START, step, type AccountState } from "./fsm";

describe("account status machine (Ch 13)", () => {
  test("transition table", () => {
    const table: [AccountState, "P" | "M", AccountState][] = [
      ["current", "P", "current"],
      ["current", "M", "late"],
      ["late", "P", "current"],
      ["late", "M", "delinquent"],
      ["delinquent", "P", "current"],
      ["delinquent", "M", "default"],
      ["default", "P", "default"],
      ["default", "M", "default"],
    ];
    for (const [from, move, to] of table) expect(step(from, move)).toBe(to);
    expect(START).toBe("current");
  });

  test("runMachine returns the path including the start state", () => {
    expect(runMachine("PPMPMMM")).toEqual(["current", "current", "current", "late", "current", "late", "delinquent", "default"]);
    expect(runMachine("")).toEqual(["current"]);
  });

  test("parseMoves accepts lowercase and spaces, rejects other letters and more than 60 moves", () => {
    expect(parseMoves("pp m")).toBe("PPM");
    expect(parseMoves("PXM")).toBeNull();
    expect(parseMoves("P".repeat(61))).toBeNull();
    expect(parseMoves("P".repeat(60))).toBe("P".repeat(60));
    expect(parseMoves("")).toBe("");
  });

  test("endsInDefault is the language containing MMM", () => {
    expect(endsInDefault("PMMMP")).toBe(true);
    expect(endsInDefault("MMPMM")).toBe(false);
  });

  test("for every P/M string up to length 8, the machine ends in default exactly when it contains MMM", () => {
    let count = 0;
    for (let len = 1; len <= 8; len++) {
      for (let bits = 0; bits < 1 << len; bits++) {
        let s = "";
        for (let i = 0; i < len; i++) s += bits & (1 << i) ? "M" : "P";
        const path = runMachine(s);
        expect(path[path.length - 1] === "default").toBe(endsInDefault(s));
        count++;
      }
    }
    expect(count).toBe(510);
  });
});
