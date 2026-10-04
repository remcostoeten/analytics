import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

const shared: UserConfig = {
  format: "esm",
  dts: { eager: true },
  sourcemap: true,
  minify: true,
  noExternal: [/^@spoar\/shared/, /^@spoar\/contract/],
};

const client: UserConfig = { ...shared, banner: { js: '"use client";' } };

export default defineConfig([
  { ...shared, entry: { index: "src/index.ts" }, clean: true },
  { ...shared, entry: { plugins: "src/plugins/index.ts" }, clean: false },
  {
    ...client,
    entry: { react: "src/react/index.ts", next: "src/next/index.tsx" },
    clean: false,
  },
  { ...shared, entry: { server: "src/server/index.ts" }, clean: false },
  { ...shared, entry: { proxy: "src/proxy/index.ts" }, clean: false },
  { ...shared, entry: { admin: "src/admin/index.ts" }, clean: false },
]);
