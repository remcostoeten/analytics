import type { ErrorHandler, Stage } from "../types";

export type Reporter = (adapter: string, stage: Stage, error: Error) => void;

function logFailure(adapter: string, stage: Stage, error: Error, cause?: Error): void {
	if (typeof console === "undefined") return;
	const message = `[analytics-manager] adapter "${adapter}" failed during ${stage}`;
	if (cause) {
		console.error(`${message}; the onError handler threw while reporting it`, error, cause);
		return;
	}
	console.error(message, error);
}

export function createReporter(environment: string | undefined, handler?: ErrorHandler): Reporter {
	const silent = environment === "production";

	return function report(adapter, stage, error) {
		if (!handler) {
			if (!silent) logFailure(adapter, stage, error);
			return;
		}

		try {
			handler({ adapter, stage, error });
		} catch (thrown) {
			if (!silent) logFailure(adapter, stage, error, toError(thrown));
		}
	};
}

export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(String(value));
}
