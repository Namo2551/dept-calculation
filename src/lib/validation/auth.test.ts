import { describe, expect, test } from "vitest";
import { isPrivatePath, safeNext } from "@/lib/supabase/routes";
import { fieldErrors, newPasswordSchema, signInSchema, signUpSchema } from "./auth";

describe("sign-up rules", () => {
  test("needs a real email, an 8+ character password and the privacy consent", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "12345678", consent: "on" }).success).toBe(true);
    const bad = signUpSchema.safeParse({ email: "nope", password: "short", consent: undefined });
    expect(bad.success).toBe(false);
    expect(Object.keys(fieldErrors(bad))).toEqual(expect.arrayContaining(["email", "password", "consent"]));
  });
  test("trims and lower-cases the email, keeps an optional name to 80 characters", () => {
    const ok = signUpSchema.parse({ email: "  A@B.CO ", password: "12345678", consent: "on", displayName: " Nam " });
    expect(ok.email).toBe("a@b.co");
    expect(ok.displayName).toBe("Nam");
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "12345678", consent: "on", displayName: "x".repeat(81) }).success).toBe(false);
  });
  test("rejects passwords over 72 characters (the bcrypt limit)", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "x".repeat(73), consent: "on" }).success).toBe(false);
  });
});

describe("sign-in and new password", () => {
  test("sign-in needs an email and a password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
  test("new password must match its confirmation", () => {
    expect(newPasswordSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(true);
    const r = newPasswordSchema.safeParse({ password: "12345678", confirm: "87654321" });
    expect(fieldErrors(r).confirm).toBeTruthy();
  });
});

describe("routes", () => {
  test("private pages", () => {
    expect(isPrivatePath("/dashboard")).toBe(true);
    expect(isPrivatePath("/debts/123/payments")).toBe(true);
    expect(isPrivatePath("/calculator")).toBe(false);
    expect(isPrivatePath("/plansx")).toBe(false);
    expect(isPrivatePath("/s/token")).toBe(false);
  });
  test("safeNext only allows same-site paths", () => {
    expect(safeNext("/plans?x=1")).toBe("/plans?x=1");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard"); // browsers read "/\" like "//"
    expect(safeNext(null)).toBe("/dashboard");
  });
});
