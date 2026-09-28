import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: true,
  sourcemap: true,
  minify: true,
  clean: true,
  noExternal: [/^@remcostoeten\/analytics-shared/],
});
