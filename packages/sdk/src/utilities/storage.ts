import { isRuntime } from "./runtime";

export function isStorageAvailable(type: "local" | "session"): boolean {
	if (isRuntime("server")) return false;

	try {
		const storage = type === "local" ? localStorage : sessionStorage;
		if (!storage) return false;

		const testKey = "__analytics_test__";
		storage.setItem(testKey, testKey);
		storage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
}
