import { createContext, useContext, useMemo } from "react";
import { createTrackHelpers } from "../api/track-helpers";
import { type AnalyticsOptions, type AnalyticsProviderProps, type TrackHelpers } from "../types";

const emptyOptions: AnalyticsOptions = {};

const AnalyticsContext = createContext<AnalyticsOptions>(emptyOptions);

export function AnalyticsProvider({
	projectId,
	ingestUrl,
	debug,
	children,
}: AnalyticsProviderProps) {
	const value = useMemo(
		function () {
			return { projectId, ingestUrl, debug };
		},
		[projectId, ingestUrl, debug],
	);

	return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsOptions(): AnalyticsOptions {
	return useContext(AnalyticsContext);
}

export function useTrack(): TrackHelpers {
	const options = useAnalyticsOptions();
	return useMemo(
		function () {
			return createTrackHelpers(options);
		},
		[options.projectId, options.ingestUrl, options.debug],
	);
}

export { createTrackHelpers } from "../api/track-helpers";
