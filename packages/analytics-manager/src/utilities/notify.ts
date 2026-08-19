export function notifyError(
	environment: string | undefined,
	adapterId: string,
	error: Error,
): void {
	if (environment === "production") return;
	if (typeof console === "undefined") return;
	console.error(`[analytics-manager] adapter "${adapterId}" failed`, error);
}

export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(String(value));
}
