import { uuid, isStorageAvailable } from "../utilities";

export const VISITOR_ID_KEY = "__analytics_visitor_id";

export function getVisitorId(): string {
	if (!isStorageAvailable("local")) return uuid();

	try {
		const existing = localStorage.getItem(VISITOR_ID_KEY);
		if (existing) return existing;

		const id = uuid();
		localStorage.setItem(VISITOR_ID_KEY, id);
		return id;
	} catch {
		return uuid();
	}
}

export function resetVisitorId(): string {
	if (!isStorageAvailable("local")) return uuid();

	try {
		const id = uuid();
		localStorage.setItem(VISITOR_ID_KEY, id);
		return id;
	} catch {
		return uuid();
	}
}
