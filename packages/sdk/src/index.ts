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
export { optOut, optIn, isOptedOut, checkDoNotTrack, PRIVACY_DISCLOSURE, getStoredKeys } from "./api/privacy";
export type { StorageKeyInfo } from "./api/privacy";
export {
	setConsentGranted,
	setConsentRequired,
	hasConsent,
	isConsentRequired,
	canTrack,
	canPersist,
} from "./api/consent";
export { observePageViews } from "./observers/pageview";
export { observePerformance } from "./observers/performance";
export { observeScroll } from "./observers/scroll";
export { observeTimeOnPage } from "./observers/heartbeat";
export { observeClicks } from "./observers/click";
export { observeOutboundLinks } from "./observers/outbound";
export { observeForms } from "./observers/forms";
export { observeErrors } from "./observers/errors";
export { flushOfflineQueue } from "./utilities/offline-queue";
export * from "./types";
