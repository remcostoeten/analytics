export function isBrowser(): boolean {
	return typeof window !== "undefined";
}

export function isServer(): boolean {
	return typeof window === "undefined";
}

export function now(): number {
	return Date.now();
}

export function timeSince(startTime: number): number {
	return Date.now() - startTime;
}

export function generateUUID(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);

	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i++) {
			bytes[i] = (Math.random() * 256) | 0;
		}
	}

	// Set version (4) and variant (RFC4122) bits
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const h = Array.from({ length: 16 }, () => "");
	for (let i = 0; i < 16; i++) {
		h[i] = bytes[i].toString(16).padStart(2, "0");
	}

	return (
		h[0] +
		h[1] +
		h[2] +
		h[3] +
		"-" +
		h[4] +
		h[5] +
		"-" +
		h[6] +
		h[7] +
		"-" +
		h[8] +
		h[9] +
		"-" +
		h[10] +
		h[11] +
		h[12] +
		h[13] +
		h[14] +
		h[15]
	);
}

export function isLocalStorageAvailable(): boolean {
	if (isServer() || typeof localStorage === "undefined") {
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

export function isSessionStorageAvailable(): boolean {
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
