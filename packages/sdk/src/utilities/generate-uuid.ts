/**
 * Generates a RFC4122 compliant UUID v4.
 * Uses the Web Crypto API if available, otherwise falls back to Math.random.
 * @returns {string} The generated UUID.
 */
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
