import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

export function observeErrors(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	function handleError(event: ErrorEvent): void {
		track(
			"error",
			{
				message: event.message,
				source: event.filename || undefined,
				line: event.lineno || undefined,
				col: event.colno || undefined,
			},
			options,
		);
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent): void {
		const reason = event.reason;
		const message =
			reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection");
		const stack = reason instanceof Error ? reason.stack : undefined;

		track(
			"error",
			{
				message,
				stack,
				type: "unhandledrejection",
			},
			options,
		);
	}

	window.addEventListener("error", handleError);
	window.addEventListener("unhandledrejection", handleUnhandledRejection);

	return () => {
		window.removeEventListener("error", handleError);
		window.removeEventListener("unhandledrejection", handleUnhandledRejection);
	};
}
