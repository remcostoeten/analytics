import { isRuntime } from "./runtime";

/**
 * Checks if a specific web storage type is available and accessible.
 * @param {'local' | 'session'} type - The type of storage to check.
 * @returns {boolean} True if the requested storage is usable.
 */
export function isStorageAvailable(type: "local" | "session"): boolean {
	if (isRuntime("server")) {
		return false;
	}

	try {
		const storage = type === "local" ? localStorage : sessionStorage;

		if (typeof storage === "undefined" || storage === null) {
			return false;
		}

		const testKey = "__remco_analytics_test__";
		storage.setItem(testKey, testKey);
		storage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
}
