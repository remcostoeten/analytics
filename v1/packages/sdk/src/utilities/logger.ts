import { isRuntime } from "./runtime";

export function debugLog(enabled: boolean | undefined, message: string, data?: unknown): void {
	if (!enabled || isRuntime("server")) return;

	const prefix = "%c Analytics ";
	const style =
		"background: #111; color: #00FF00; border-radius: 3px; font-weight: bold; padding: 2px;";

	if (data !== undefined) {
		console.log(`${prefix} ${message}`, style, data);
	} else {
		console.log(`${prefix} ${message}`, style);
	}
}
