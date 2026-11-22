import { z } from "zod";

// Server-side rules for the auth forms (the forms show the same messages, but only these decide).
const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer");

export const signUpSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .max(80, "Use 80 characters or fewer")
    .optional()
    .transform((v) => (v ? v : undefined)),
  consent: z.literal("on", { message: "Please agree to the privacy notice to create an account" }),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match", path: ["confirm"] });

export const profileSchema = z.object({
  displayName: z.string().trim().max(80, "Use 80 characters or fewer"),
  currency: z.enum(["THB"]),
});

// First message per field, for showing next to the inputs.
export function fieldErrors(result: { success: boolean; error?: z.ZodError }): Record<string, string> {
  const out: Record<string, string> = {};
  if (result.success || !result.error) return out;
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
