import { isRuntime, isStorageAvailable, noop } from "../utilities";
import { VISITOR_ID_KEY } from "../identity/visitor";

const OPT_OUT_KEY = "__analytics_opt_out";

export function optOut(): void {
	if (!isStorageAvailable("local")) return;

	try {
		localStorage.setItem(OPT_OUT_KEY, "true");
		localStorage.removeItem(VISITOR_ID_KEY);
	} catch {
		noop();
	}
}

export function optIn(): void {
	if (!isStorageAvailable("local")) return;

	try {
		localStorage.removeItem(OPT_OUT_KEY);
	} catch {
		noop();
	}
}

export function isOptedOut(): boolean {
	if (!isStorageAvailable("local")) return false;

	try {
		return localStorage.getItem(OPT_OUT_KEY) === "true";
	} catch {
		return false;
	}
}

export function checkDoNotTrack(): boolean {
	if (isRuntime("server") || typeof navigator === "undefined") return false;

	const dnt = navigator.doNotTrack || (window as Window & { doNotTrack?: string }).doNotTrack;
	return dnt === "1" || dnt === "yes";
}
