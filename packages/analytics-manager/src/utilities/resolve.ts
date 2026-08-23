import type { Context, ContextInput } from "../types";

export function resolveContext(input: ContextInput): Context {
	if (typeof input === "function") return input();
	return input;
}
