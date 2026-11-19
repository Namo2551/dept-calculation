import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: the site needs no server and can be hosted on Vercel as static files.
  output: "export",
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
