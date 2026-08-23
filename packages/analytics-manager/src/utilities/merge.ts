export function merge<TRecord extends Record<string, unknown>>(
	base: TRecord,
	extra: TRecord,
): TRecord {
	const result: Record<string, unknown> = { ...base };

	for (const key of Object.keys(extra)) {
		const value = extra[key];
		if (value === undefined) continue;
		result[key] = value;
	}

	return result as TRecord;
}
