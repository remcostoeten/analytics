import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from "react";
import type { AdapterMap, Analytics, EventMap, Properties } from "../types";

type AnyAnalytics = Analytics<EventMap, AdapterMap>;

const AnalyticsContext = createContext<AnyAnalytics | null>(null);

type ProviderProps = {
	analytics: object;
	children?: ReactNode;
};

export function AnalyticsProvider(props: ProviderProps) {
	return createElement(
		AnalyticsContext.Provider,
		{ value: props.analytics as unknown as AnyAnalytics },
		props.children,
	);
}

export function useAnalytics<
	TEvents extends EventMap = EventMap,
	TAdapters extends AdapterMap = AdapterMap,
>(): Analytics<TEvents, TAdapters> {
	const analytics = useContext(AnalyticsContext);
	if (!analytics) {
		throw new Error("[analytics-manager] useAnalytics must be used inside <AnalyticsProvider>");
	}
	return analytics as unknown as Analytics<TEvents, TAdapters>;
}

export function usePageview(path: string | null | undefined, properties?: Properties): void {
	const analytics = useAnalytics();
	const latest = useRef({ analytics, properties });
	latest.current = { analytics, properties };
	const sent = useRef<string | null>(null);

	useEffect(() => {
		if (path === null || path === undefined) return;
		if (sent.current === path) return;
		sent.current = path;
		latest.current.analytics.page({ path, ...latest.current.properties });
	}, [path]);
}
