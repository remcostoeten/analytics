import type { AnalyticsOptions, TrackMeta } from "./index";

export type AnalyticsProps = AnalyticsOptions & {
	disabled?: boolean;
	trackClicks?: boolean;
	trackOutbound?: boolean;
	trackForms?: boolean;
	trackErrors?: boolean;
	consentRequired?: boolean;
	consentGranted?: boolean;
};

export type TrackClickProps = AnalyticsOptions & {
	name: string;
	meta?: TrackMeta;
	children: import("react").ReactElement<{
		onClick?: (event: import("react").MouseEvent) => void;
	}>;
};

export type AnalyticsProviderProps = AnalyticsOptions & {
	children: import("react").ReactNode;
};

export type AnalyticsErrorBoundaryProps = AnalyticsOptions & {
	children: import("react").ReactNode;
	fallback?: import("react").ReactNode;
	onError?: (error: Error) => void;
};
