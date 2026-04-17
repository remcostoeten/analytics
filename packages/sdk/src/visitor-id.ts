import { generateUUID, isStorageAvailable } from "./utilities";

const VISITOR_ID_KEY = "remco_analytics_visitor_id";

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
