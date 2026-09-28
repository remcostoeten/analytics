import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", signals: "src/signals.ts" },
  format: "esm",
  dts: true,
  sourcemap: true,
  clean: true,
});
