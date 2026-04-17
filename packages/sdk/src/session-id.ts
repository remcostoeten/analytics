import { isServer, now } from "./utils";
import { noop } from "./noop";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isSessionStorageAvailable(): boolean {
  if (isServer() || typeof sessionStorage === "undefined") {
    return false;
  }
  try {
    const test = "__storage_test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

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
