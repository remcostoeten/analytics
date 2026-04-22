"use client";

/**
 * @remcostoeten/analytics
 * Privacy-focused analytics SDK for tracking page views and custom events.
 */

export { Analytics } from "./components/analytics";
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
export * from "./types";
