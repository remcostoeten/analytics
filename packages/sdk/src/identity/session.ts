import { time, uuid, isStorageAvailable, noop } from "../utilities";

const SESSION_ID_KEY = "__analytics_session_id";
const SESSION_TIMEOUT_KEY = "__analytics_session_timeout";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isSessionExpired(): boolean {
	if (!isStorageAvailable("session")) return true;

	try {
		const timeoutStr = sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		if (!timeoutStr) return true;

		const timeout = parseInt(timeoutStr, 10);
		return time() > timeout;
	} catch {
		return true;
	}
}

function updateSessionTimeout(): void {
	if (!isStorageAvailable("session")) return;

	try {
		const timeout = time() + SESSION_TIMEOUT_MS;
		sessionStorage.setItem(SESSION_TIMEOUT_KEY, timeout.toString());
	} catch {
		noop();
	}
}

export function getSessionId(): string {
	if (!isStorageAvailable("session")) return uuid();

	try {
		const existing = sessionStorage.getItem(SESSION_ID_KEY);
		const expired = isSessionExpired();

		if (existing && !expired) {
			updateSessionTimeout();
			return existing;
		}

		const id = uuid();
		sessionStorage.setItem(SESSION_ID_KEY, id);
		updateSessionTimeout();
		return id;
	} catch {
		return uuid();
	}
}

export function resetSessionId(): string {
	if (!isStorageAvailable("session")) return uuid();

	try {
		const id = uuid();
		sessionStorage.setItem(SESSION_ID_KEY, id);
		updateSessionTimeout();
		return id;
	} catch {
		return uuid();
	}
}

export function extendSession(): void {
	updateSessionTimeout();
}
