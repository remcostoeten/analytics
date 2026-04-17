import { now, generateUUID, isSessionStorageAvailable } from "./utils";
import { noop } from "./noop";


const SESSION_ID_KEY = "remco_analytics_session_id";
const SESSION_TIMEOUT_KEY = "remco_analytics_session_timeout";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function isSessionExpired(): boolean {
  if (!isSessionStorageAvailable()) {
    return true;
  }

  try {
    const timeoutStr = sessionStorage.getItem(SESSION_TIMEOUT_KEY);
    if (!timeoutStr) {
      return true;
    }

    const timeout = parseInt(timeoutStr, 10);
    return now() > timeout;
  } catch {
    return true;
  }
}

function updateSessionTimeout(): void {
  if (!isSessionStorageAvailable()) {
    return;
  }

  try {
    const timeout = now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem(SESSION_TIMEOUT_KEY, timeout.toString());
  } catch {
    noop();
  }
}

export function getSessionId(): string {
  if (!isSessionStorageAvailable()) {
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

export function resetSessionId(): string {
  if (!isSessionStorageAvailable()) {
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

export function extendSession(): void {
  updateSessionTimeout();
}
