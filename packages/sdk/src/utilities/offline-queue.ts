import { isStorageAvailable } from "./storage";
import { noop } from "./noop";
import { type EventPayload } from "../types";

const QUEUE_KEY = "__analytics_queue__";
const MAX_SIZE = 50;

type QueueEntry = {
	baseUrl: string;
	payload: EventPayload;
};

function read(): QueueEntry[] {
	if (!isStorageAvailable("local")) return [];
	try {
		const raw = localStorage.getItem(QUEUE_KEY);
		return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
	} catch {
		return [];
	}
}

function write(entries: QueueEntry[]): void {
	if (!isStorageAvailable("local")) return;
	try {
		localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
	} catch {
		noop();
	}
}

export function enqueueOffline(baseUrl: string, payload: EventPayload): void {
	const queue = read();
	if (queue.length >= MAX_SIZE) return;
	queue.push({ baseUrl, payload });
	write(queue);
}

export function flushOfflineQueue(): void {
	if (typeof fetch === "undefined") return;
	const queue = read();
	if (queue.length === 0) return;
	write([]);

	const groups = new Map<string, EventPayload[]>();
	for (const { baseUrl, payload } of queue) {
		const list = groups.get(baseUrl) ?? [];
		list.push(payload);
		groups.set(baseUrl, list);
	}

	for (const [baseUrl, events] of groups) {
		fetch(`${baseUrl}/e/batch`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ events }),
			keepalive: true,
		}).catch(() => {
			for (const payload of events) enqueueOffline(baseUrl, payload);
		});
	}
}

let registered = false;

export function initOfflineFlush(): void {
	if (registered || typeof window === "undefined") return;
	if (typeof window.addEventListener !== "function") return;
	registered = true;
	window.addEventListener("online", flushOfflineQueue);
}
