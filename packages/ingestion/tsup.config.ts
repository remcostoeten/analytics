import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/vercel.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	minify: false,
	sourcemap: true,
	treeshake: true,
	splitting: false,
	external: [
		"hono",
		"hono/cors",
		"drizzle-orm",
		"drizzle-orm/neon-http",
		"drizzle-orm/pglite",
		"@neondatabase/serverless",
		"zod",
		"ua-parser-js",
	],
	target: "es2022",
	outDir: "dist",
});
