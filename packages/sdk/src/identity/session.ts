import { time, uuid, isStorageAvailable, noop } from "../utilities";
import { canPersist } from "../api/consent";

export const SESSION_ID_KEY = "__analytics_session_id";
export const SESSION_TIMEOUT_KEY = "__analytics_session_timeout";
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
	if (!isStorageAvailable("session") || !canPersist()) return;

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

		if (!canPersist()) return uuid();

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
	if (!canPersist()) return uuid();

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
