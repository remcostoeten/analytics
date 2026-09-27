export function isRuntime(type: "browser" | "server"): boolean {
	const isBrowser = typeof window !== "undefined";
	return type === "browser" ? isBrowser : !isBrowser;
}
