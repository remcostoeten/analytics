import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  tsconfig: "tsconfig.build.json",
  dts: { eager: true },
  sourcemap: true,
  minify: true,
  clean: true,
  deps: { alwaysBundle: [/^@spoar\/shared/, /^@spoar\/contract/] },
});
