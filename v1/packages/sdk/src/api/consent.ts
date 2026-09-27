import { clearAnalyticsStorage } from "./privacy";

let consentRequired = false;
let consentGranted = false;

function clearOnRevocation(wasGranted: boolean, granted: boolean): void {
	if (!wasGranted || granted) return;
	clearAnalyticsStorage();
}

export function setConsentRequired(required: boolean): void {
	const wasGranted = hasConsent();
	consentRequired = required;
	clearOnRevocation(wasGranted, hasConsent());
}

export function setConsentGranted(granted: boolean): void {
	const wasGranted = hasConsent();
	consentGranted = granted;
	clearOnRevocation(wasGranted, hasConsent());
}

export function isConsentRequired(): boolean {
	return consentRequired;
}

export function hasConsent(): boolean {
	if (!consentRequired) return true;
	return consentGranted;
}

export function canTrack(): boolean {
	return hasConsent();
}

export function canPersist(): boolean {
	return hasConsent();
}
