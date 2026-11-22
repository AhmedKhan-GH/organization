import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    // Published as it is: the opening script (gate.js, kept byte for byte) and the generated releases.
    "public/**",
    "packages/**",
    "reference/**",
    "next-env.d.ts",
  ]),
]);
