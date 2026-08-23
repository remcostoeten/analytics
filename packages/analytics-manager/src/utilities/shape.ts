export function hasMethods(target: unknown, names: string[]): boolean {
	if (!target || typeof target !== "object") return false;
	const candidate = target as Record<string, unknown>;

	return names.every((name) => {
		return typeof candidate[name] === "function";
	});
}
