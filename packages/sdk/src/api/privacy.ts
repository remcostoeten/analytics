import { isRuntime, isStorageAvailable } from "../utilities";
import { noop } from "../utilities/noop";

const OPT_OUT_KEY = "remco_analytics_opt_out";
const VISITOR_ID_KEY = "remco_analytics_visitor_id";

/**
 * Opts the user out of all tracking. Sets a persistent flag and clears the visitor ID.
 */
export function optOut(): void {
	if (!isStorageAvailable("local")) {
		return;
	}

	try {
		localStorage.setItem(OPT_OUT_KEY, "true");
		localStorage.removeItem(VISITOR_ID_KEY);
	} catch {
		noop();
	}
}

/**
 * Opts the user back into tracking by removing the opt-out flag.
 */
export function optIn(): void {
	if (!isStorageAvailable("local")) {
		return;
	}

	try {
		localStorage.removeItem(OPT_OUT_KEY);
	} catch {
		noop();
	}
}

/**
 * Checks if the user has previously opted out of tracking via the persistent flag.
 * @returns {boolean} True if the user is opted out.
 */
export function isOptedOut(): boolean {
	if (!isStorageAvailable("local")) {
		return false;
	}

	try {
		return localStorage.getItem(OPT_OUT_KEY) === "true";
	} catch {
		return false;
	}
}

/**
 * Checks the browser's "Do Not Track" setting.
 * @returns {boolean} True if DNT is enabled.
 */
export function checkDoNotTrack(): boolean {
	if (isRuntime("server") || typeof navigator === "undefined") {
		return false;
	}

	const dnt = navigator.doNotTrack || (window as Window & { doNotTrack?: string }).doNotTrack;
	return dnt === "1" || dnt === "yes";
}
