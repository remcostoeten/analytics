import { useEffect } from "react";
import { observePageViews } from "../observers/pageview";
import { observePerformance } from "../observers/performance";
import { observeScroll } from "../observers/scroll";
import { observeTimeOnPage } from "../observers/heartbeat";
import { observeClicks } from "../observers/click";
import { observeOutboundLinks } from "../observers/outbound";
import { observeForms } from "../observers/forms";
import { observeErrors } from "../observers/errors";
import { setConsentGranted, setConsentRequired } from "../api/consent";
import { useAnalyticsOptions } from "./provider";
import { resolveAnalyticsOptions } from "../utilities/options";
import { type AnalyticsProps } from "../types";
import { debugLog } from "../utilities";

export function Analytics({
	projectId,
	ingestUrl,
	disabled = false,
	debug = false,
	trackClicks = false,
	trackOutbound = false,
	trackForms = false,
	trackErrors = false,
	consentRequired = false,
	consentGranted = false,
}: AnalyticsProps) {
	const contextOptions = useAnalyticsOptions();
	const resolved = resolveAnalyticsOptions(contextOptions, { projectId, ingestUrl, debug });

	useEffect(() => {
		setConsentRequired(consentRequired);
		setConsentGranted(consentGranted);
	}, [consentRequired, consentGranted]);

	useEffect(() => {
		if (disabled) {
			debugLog(resolved.debug, "Tracking disabled");
			return;
		}

		if (consentRequired && !consentGranted) {
			debugLog(resolved.debug, "Consent required, tracking idle");
			return;
		}

		const cleanups = [
			observePageViews(resolved),
			observePerformance(resolved),
			observeScroll(resolved),
			observeTimeOnPage(resolved),
		];

		if (trackClicks) cleanups.push(observeClicks(resolved));
		if (trackOutbound) cleanups.push(observeOutboundLinks(resolved));
		if (trackForms) cleanups.push(observeForms(resolved));
		if (trackErrors) cleanups.push(observeErrors(resolved));

		return () => cleanups.forEach((c) => c());
	}, [
		resolved.projectId,
		resolved.ingestUrl,
		resolved.debug,
		disabled,
		trackClicks,
		trackOutbound,
		trackForms,
		trackErrors,
		consentRequired,
		consentGranted,
	]);

	return null;
}
