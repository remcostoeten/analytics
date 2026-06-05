import {
	track,
	trackPageView,
	trackEvent,
	trackClick,
	trackError,
	trackTransaction,
	trackSearch,
	identifyUser,
	setExperiment,
} from "./track";
import { mergeAnalyticsOptions } from "../utilities/options";
import { type AnalyticsOptions, type TrackHelpers } from "../types";

export function createTrackHelpers(defaultOptions: AnalyticsOptions): TrackHelpers {
	function withOptions(override?: AnalyticsOptions): AnalyticsOptions {
		return mergeAnalyticsOptions(defaultOptions, override);
	}

	return {
		track(type, meta, options) {
			track(type, meta, withOptions(options));
		},
		trackPageView(meta, options) {
			trackPageView(meta, withOptions(options));
		},
		trackEvent(eventName, meta, options) {
			trackEvent(eventName, meta, withOptions(options));
		},
		trackClick(elementName, meta, options) {
			trackClick(elementName, meta, withOptions(options));
		},
		trackError(error, meta, options) {
			trackError(error, meta, withOptions(options));
		},
		trackTransaction(revenue, currency, orderId, items, options) {
			trackTransaction(revenue, currency, orderId, items, withOptions(options));
		},
		trackSearch(query, resultCount, options) {
			trackSearch(query, resultCount, withOptions(options));
		},
		identifyUser(userProperties, options) {
			identifyUser(userProperties, withOptions(options));
		},
		setExperiment(experimentId, variantId, options) {
			setExperiment(experimentId, variantId, withOptions(options));
		},
	};
}
