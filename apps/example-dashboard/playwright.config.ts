import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30000,
	use: {
		baseURL: "http://localhost:3100",
	},
	webServer: {
		command: "bun run dev -- --port 3100",
		url: "http://localhost:3100",
		reuseExistingServer: false,
		timeout: 120000,
	},
});
