import { isStorageAvailable, noop } from "../utilities";
import { canPersist } from "../api/consent";
import { type TrackMeta } from "../types";

export const USER_PROPERTIES_KEY = "__analytics_user_props";
export const EXPERIMENTS_KEY = "__analytics_experiments";

type StoredRecord = Record<string, string | number | boolean>;

function readRecord(key: string): StoredRecord {
	if (!isStorageAvailable("local")) return {};

	try {
		const raw = localStorage.getItem(key);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? (parsed as StoredRecord) : {};
	} catch {
		return {};
	}
}

function mergeRecord(key: string, updates: StoredRecord): void {
	if (!isStorageAvailable("local") || !canPersist()) return;

	try {
		localStorage.setItem(key, JSON.stringify({ ...readRecord(key), ...updates }));
	} catch {
		noop();
	}
}

export function persistUserProperties(userProperties: StoredRecord): void {
	mergeRecord(USER_PROPERTIES_KEY, userProperties);
}

export function persistExperiment(experimentId: string, variantId: string): void {
	mergeRecord(EXPERIMENTS_KEY, { [experimentId]: variantId });
}

export function getStoredTraits(): TrackMeta {
	const traits: TrackMeta = {};
	const userProperties = readRecord(USER_PROPERTIES_KEY);
	const experiments = readRecord(EXPERIMENTS_KEY);

	if (Object.keys(userProperties).length > 0) traits.userProperties = userProperties;
	if (Object.keys(experiments).length > 0) traits.experiments = experiments;

	return traits;
}

export function clearStoredTraits(): void {
	if (!isStorageAvailable("local")) return;

	try {
		localStorage.removeItem(USER_PROPERTIES_KEY);
		localStorage.removeItem(EXPERIMENTS_KEY);
	} catch {
		noop();
	}
}
