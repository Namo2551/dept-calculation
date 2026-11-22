// The two public Supabase settings. They are safe in the browser because every table has Row Level Security.
// The secret key is never read here (or anywhere in the app).
export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (set them in .env.local or the Netlify UI).");
  }
  return { url, key };
}
