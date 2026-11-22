// Absolute base for share-image URLs. Set NEXT_PUBLIC_SITE_URL for the production domain;
// otherwise Netlify's production URL (URL, set by Netlify at build time) or Vercel's is used when available.
const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "");

export const siteUrl: URL | undefined = fromEnv ? new URL(fromEnv) : undefined;
