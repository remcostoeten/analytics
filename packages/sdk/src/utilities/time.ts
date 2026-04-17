/**
 * Flexible time utility that returns a timestamp or calculates elapsed time.
 * @param {number} [start] - Optional start time. If provided, returns the difference between now and start.
 * @returns {number} The current timestamp or elapsed time.
 */
export function time(start?: number): number {
	const current = Date.now();
	return start !== undefined ? current - start : current;
}
