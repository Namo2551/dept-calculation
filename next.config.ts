import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A full Next.js app (no static export): sign-in, protected pages and server actions need a server.
  // Netlify runs it with its Next.js adapter; public pages are still prerendered as static HTML.
  images: { unoptimized: true },
  trailingSlash: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
