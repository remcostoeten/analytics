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

function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const VISITOR_ID_KEY = "remco_analytics_visitor_id";

export function getVisitorId(): string {
  if (!isLocalStorageAvailable()) {
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
  if (!isLocalStorageAvailable()) {
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
