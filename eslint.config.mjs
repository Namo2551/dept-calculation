import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Original single-file site, kept until the rebuild reaches parity, and its copy used by the parity test.
    "core.js",
    "test.js",
    "index.html",
    "tests/fixtures/**",
  ]),
]);

export default eslintConfig;
