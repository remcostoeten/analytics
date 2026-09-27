import { createContext, useContext, useMemo } from "react";
import { createTrackHelpers } from "../api/track-helpers";
import { type AnalyticsOptions, type TrackHelpers } from "../types";
import { type AnalyticsProviderProps } from "../types/react";

const emptyOptions: AnalyticsOptions = {};

const AnalyticsContext = createContext<AnalyticsOptions>(emptyOptions);

export function AnalyticsProvider({
	projectId,
	ingestUrl,
	debug,
	path,
	referrer,
	children,
}: AnalyticsProviderProps) {
	const value = useMemo(
		function () {
			return { projectId, ingestUrl, debug, path, referrer };
		},
		[projectId, ingestUrl, debug, path, referrer],
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
		[options.projectId, options.ingestUrl, options.debug, options.path, options.referrer],
	);
}

export { createTrackHelpers } from "../api/track-helpers";
