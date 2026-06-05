import { Component, type ErrorInfo, type ReactNode } from "react";
import { trackError } from "../api/track";
import { useAnalyticsOptions } from "./provider";
import { resolveAnalyticsOptions } from "../utilities/options";
import { type AnalyticsErrorBoundaryProps, type AnalyticsOptions } from "../types";

type AnalyticsErrorBoundaryInnerProps = {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error) => void;
	options: AnalyticsOptions;
};

type AnalyticsErrorBoundaryInnerState = {
	error: Error | null;
};

class AnalyticsErrorBoundaryInner extends Component<
	AnalyticsErrorBoundaryInnerProps,
	AnalyticsErrorBoundaryInnerState
> {
	state: AnalyticsErrorBoundaryInnerState = { error: null };

	static getDerivedStateFromError(error: Error): AnalyticsErrorBoundaryInnerState {
		return { error };
	}

	componentDidCatch(error: Error, _info: ErrorInfo): void {
		trackError(error, undefined, this.props.options);
		this.props.onError?.(error);
	}

	render(): ReactNode {
		if (this.state.error) {
			return this.props.fallback ?? null;
		}

		return this.props.children;
	}
}

export function AnalyticsErrorBoundary({
	children,
	fallback,
	onError,
	projectId,
	ingestUrl,
	debug,
}: AnalyticsErrorBoundaryProps) {
	const contextOptions = useAnalyticsOptions();
	const options = resolveAnalyticsOptions(contextOptions, { projectId, ingestUrl, debug });

	return (
		<AnalyticsErrorBoundaryInner fallback={fallback} onError={onError} options={options}>
			{children}
		</AnalyticsErrorBoundaryInner>
	);
}
