export function time(start?: number): number {
	const current = Date.now();
	return start !== undefined ? current - start : current;
}
