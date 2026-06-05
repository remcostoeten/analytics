let consentRequired = false;
let consentGranted = false;

export function setConsentRequired(required: boolean): void {
	consentRequired = required;
}

export function setConsentGranted(granted: boolean): void {
	consentGranted = granted;
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
