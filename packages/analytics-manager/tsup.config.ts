import { defineConfig } from "tsup";

const shared = {
	format: ["esm", "cjs"] as const,
	dts: true,
	minify: false,
	sourcemap: true,
	treeshake: true,
	splitting: false,
	external: [
		"@remcostoeten/analytics",
		"@remcostoeten/analytics/browser",
		"@vercel/analytics",
		"posthog-js",
		"react",
	],
	target: "es2020" as const,
	outDir: "dist",
};

export default defineConfig([
	{
		...shared,
		entry: ["src/index.ts"],
		clean: false,
	},
	{
		...shared,
		entry: { "react/index": "src/react/index.ts" },
		clean: false,
		treeshake: false,
		banner: { js: '"use client";' },
	},
]);
