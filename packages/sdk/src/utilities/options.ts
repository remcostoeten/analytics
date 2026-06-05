import { type AnalyticsOptions } from "../types";

export function mergeAnalyticsOptions(
	base: AnalyticsOptions,
	override?: AnalyticsOptions,
): AnalyticsOptions {
	return {
		projectId: override?.projectId ?? base.projectId,
		ingestUrl: override?.ingestUrl ?? base.ingestUrl,
		debug: override?.debug ?? base.debug,
	};
}

export function resolveAnalyticsOptions(
	context: AnalyticsOptions,
	props: AnalyticsOptions,
): AnalyticsOptions {
	return mergeAnalyticsOptions(context, props);
}
