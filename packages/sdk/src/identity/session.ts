import { time, generateUUID, isStorageAvailable } from "../utilities";
import { noop } from "../utilities/noop";

const SESSION_ID_KEY = "remco_analytics_session_id";
const SESSION_TIMEOUT_KEY = "remco_analytics_session_timeout";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isSessionExpired(): boolean {
	if (!isStorageAvailable("session")) {
		return true;
	}

	try {
		const timeoutStr = sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		if (!timeoutStr) {
			return true;
		}

		const timeout = parseInt(timeoutStr, 10);
		return time() > timeout;
	} catch {
		return true;
	}
}

function updateSessionTimeout(): void {
	if (!isStorageAvailable("session")) {
		return;
	}

	try {
		const timeout = time() + SESSION_TIMEOUT_MS;
		sessionStorage.setItem(SESSION_TIMEOUT_KEY, timeout.toString());
	} catch {
		noop();
	}
}

/**
 * Retrieves the current session ID from session storage.
 * If the session has expired or doesn't exist, a new one is created.
 * @returns {string} The session ID.
 */
export function getSessionId(): string {
	if (!isStorageAvailable("session")) {
		return generateUUID();
	}

	try {
		const existing = sessionStorage.getItem(SESSION_ID_KEY);
		const expired = isSessionExpired();

		if (existing && !expired) {
			updateSessionTimeout();
			return existing;
		}

		const newId = generateUUID();
		sessionStorage.setItem(SESSION_ID_KEY, newId);
		updateSessionTimeout();
		return newId;
	} catch {
		return generateUUID();
	}
}

/**
 * Forcefully resets the current session ID.
 * @returns {string} The new session ID.
 */
export function resetSessionId(): string {
	if (!isStorageAvailable("session")) {
		return generateUUID();
	}

	try {
		const newId = generateUUID();
		sessionStorage.setItem(SESSION_ID_KEY, newId);
		updateSessionTimeout();
		return newId;
	} catch {
		return generateUUID();
	}
}

/**
 * Extends the current session timeout.
 */
export function extendSession(): void {
	updateSessionTimeout();
}
