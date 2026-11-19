// Absolute base for share-image and alternate-language URLs. Set NEXT_PUBLIC_SITE_URL for the production domain;
// on Vercel the production URL is used automatically when it is not set.
export const siteUrl: URL | undefined = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL("https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : undefined;
