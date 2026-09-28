import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

const shared: UserConfig = {
  format: "esm",
  dts: true,
  sourcemap: true,
  minify: true,
  noExternal: [/^@remcostoeten\/analytics-shared/],
};

export default defineConfig([
  { ...shared, entry: { index: "src/index.ts" }, clean: true },
  { ...shared, entry: { plugins: "src/plugins/index.ts" }, clean: false },
]);
