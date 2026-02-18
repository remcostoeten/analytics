import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  external: ["react"],
  target: "es2020",
  outDir: "dist",
});
