import { isRuntime, isStorageAvailable, noop } from "../utilities";
import { VISITOR_ID_KEY } from "../identity/visitor";
import { SESSION_ID_KEY, SESSION_TIMEOUT_KEY } from "../identity/session";

const OPT_OUT_KEY = "__analytics_opt_out";

export type StorageKeyInfo = {
	key: string;
	storage: "localStorage" | "sessionStorage";
	purpose: string;
};

export const PRIVACY_DISCLOSURE =
	"The @remcostoeten/analytics SDK uses localStorage and sessionStorage only. No HTTP cookies. " +
	"Stored keys: visitor ID (localStorage, persistent identifier), session ID and session timeout " +
	"(sessionStorage, 30-minute session), opt-out flag (localStorage). " +
	"Events are sent to your configured ingestion URL. IP addresses are hashed server-side; raw IPs are not stored by the SDK.";

export function getStoredKeys(): StorageKeyInfo[] {
	return [
		{
			key: VISITOR_ID_KEY,
			storage: "localStorage",
			purpose: "Persistent visitor identifier across sessions",
		},
		{
			key: OPT_OUT_KEY,
			storage: "localStorage",
			purpose: "User opt-out preference",
		},
		{
			key: SESSION_ID_KEY,
			storage: "sessionStorage",
			purpose: "Current analytics session identifier",
		},
		{
			key: SESSION_TIMEOUT_KEY,
			storage: "sessionStorage",
			purpose: "Session inactivity expiry timestamp",
		},
	];
}

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
