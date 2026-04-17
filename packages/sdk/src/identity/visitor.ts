import { generateUUID, isStorageAvailable } from "../utilities";

const VISITOR_ID_KEY = "remco_analytics_visitor_id";

/**
 * Retrieves the persistent visitor ID from local storage.
 * If none exists or storage is unavailable, generates a new UUID.
 *
 * @returns {string} The visitor ID.
 */
export function getVisitorId(): string {
	if (!isStorageAvailable("local")) {
		return generateUUID();
	}

	try {
		const existing = localStorage.getItem(VISITOR_ID_KEY);
		if (existing) {
			return existing;
		}

		const newId = generateUUID();
		localStorage.setItem(VISITOR_ID_KEY, newId);
		return newId;
	} catch {
		return generateUUID();
	}
}

/**
 * Resets the current visitor ID by generating a new one and updating local storage.
 * @returns {string} The new visitor ID.
 */
export function resetVisitorId(): string {
	if (!isStorageAvailable("local")) {
		return generateUUID();
	}

	try {
		const newId = generateUUID();
		localStorage.setItem(VISITOR_ID_KEY, newId);
		return newId;
	} catch {
		return generateUUID();
	}
}
