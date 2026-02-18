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

const OPT_OUT_KEY = "remco_analytics_opt_out";
const VISITOR_ID_KEY = "remco_analytics_visitor_id";

export function optOut(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(OPT_OUT_KEY, "true");
    localStorage.removeItem(VISITOR_ID_KEY);
  } catch {
    // Silent fail
  }
}

export function optIn(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // Silent fail
  }
}

export function isOptedOut(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(OPT_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

export function checkDoNotTrack(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const dnt = navigator.doNotTrack || (window as any).doNotTrack;
  return dnt === "1" || dnt === "yes";
}
