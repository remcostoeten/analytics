import { isRuntime } from "./runtime";

/**
 * Logs a message to the console if debugging is enabled and the environment is a browser.
 * @param {boolean | undefined} enabled - Whether logging is enabled.
 * @param {string} message - The message to log.
 * @param {unknown} [data] - Optional data to log alongside the message.
 */
export function debugLog(enabled: boolean | undefined, message: string, data?: unknown): void {
	if (!enabled || isRuntime("server")) {
		return;
	}

	const prefix = "%c Analytics ";
	const style =
		"background: #111; color: #00FF00; border-radius: 3px; font-weight: bold; padding: 2px;";

	if (data !== undefined) {
		console.log(`${prefix} ${message}`, style, data);
	} else {
		console.log(`${prefix} ${message}`, style);
	}
}
