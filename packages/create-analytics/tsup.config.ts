import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts"],
	format: ["cjs"],
	dts: false,
	clean: true,
	minify: false,
	sourcemap: true,
	target: "node18",
	outDir: "dist",
	banner: {
		js: "#!/usr/bin/env node",
	},
});
