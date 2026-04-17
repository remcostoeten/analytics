/**
 * Runtime environment detection utility.
 * @param {'browser' | 'server'} type - The environment to check for.
 * @returns {boolean} True if the current runtime matches the requested type.
 */
export function isRuntime(type: "browser" | "server"): boolean {
	const isBrowser = typeof window !== "undefined";
	return type === "browser" ? isBrowser : !isBrowser;
}
