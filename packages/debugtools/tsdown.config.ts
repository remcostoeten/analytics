import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

const shared: UserConfig = {
  format: "esm",
  tsconfig: "tsconfig.build.json",
  dts: { eager: true },
  sourcemap: true,
  minify: true,
  deps: { alwaysBundle: [/^@spoar\/shared/] },
};

const client: UserConfig = { ...shared, banner: { js: '"use client";' } };

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    deps: {
      alwaysBundle: [/^@spoar\/shared/, /^react($|\/)/, /^react-dom($|\/)/, /^scheduler/],
    },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    clean: true,
  },
  {
    ...client,
    entry: {
      react: "src/react/index.ts",
      next: "src/next/index.tsx",
      console: "src/console-entry.ts",
    },
    clean: false,
  },
  { ...shared, entry: { fixtures: "src/fixtures/index.ts" }, clean: false },
]);
