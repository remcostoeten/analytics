export { Analytics } from "./components/analytics";
export { AnalyticsErrorBoundary } from "./components/error-boundary";
export { TrackClick } from "./components/track-click";
export { AnalyticsProvider, useTrack, useAnalyticsOptions } from "./components/provider";
export { createTrackHelpers } from "./api/track-helpers";
export { mergeAnalyticsOptions, resolveAnalyticsOptions } from "./utilities/options";
export {
	track,
	trackPageView,
	trackEvent,
	trackClick,
	trackError,
	trackTransaction,
	trackSearch,
	identifyUser,
	setExperiment,
	validateIngestUrl,
} from "./api/track";
export { getVisitorId, resetVisitorId } from "./identity/visitor";
export { getSessionId, resetSessionId, extendSession } from "./identity/session";
export { optOut, optIn, isOptedOut, checkDoNotTrack } from "./api/privacy";
export { observePageViews } from "./observers/pageview";
export { observePerformance } from "./observers/performance";
export { observeScroll } from "./observers/scroll";
export { observeTimeOnPage } from "./observers/heartbeat";
export { observeClicks } from "./observers/click";
export * from "./types";
