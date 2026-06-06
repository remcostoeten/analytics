import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

export function observeForms(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	function handleSubmit(event: Event): void {
		const form = event.target;
		if (!(form instanceof HTMLFormElement)) return;

		track(
			"event",
			{
				eventName: "form_submit",
				formId: form.id || undefined,
				formName: form.name || undefined,
				formAction: form.action || undefined,
				formMethod: (form.method || "get").toLowerCase(),
			},
			options,
		);
	}

	document.addEventListener("submit", handleSubmit);
	return () => document.removeEventListener("submit", handleSubmit);
}
