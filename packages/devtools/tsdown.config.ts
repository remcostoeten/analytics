import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

const shared: UserConfig = {
  format: "esm",
  dts: { eager: true },
  sourcemap: true,
  minify: true,
  noExternal: [/^@remcostoeten\/analytics-shared/],
};

const client: UserConfig = { ...shared, banner: { js: '"use client";' } };

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    noExternal: [
      /^@remcostoeten\/analytics-shared/,
      /^react($|\/)/,
      /^react-dom($|\/)/,
      /^scheduler/,
    ],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    clean: true,
  },
  {
    ...client,
    entry: { react: "src/react/index.ts", next: "src/next/index.tsx" },
    clean: false,
  },
  { ...shared, entry: { fixtures: "src/fixtures/index.ts" }, clean: false },
]);
