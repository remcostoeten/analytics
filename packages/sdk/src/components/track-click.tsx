import { cloneElement, isValidElement, type MouseEvent, type ReactElement } from "react";
import { trackClick } from "../api/track";
import { useAnalyticsOptions } from "./provider";
import { resolveAnalyticsOptions } from "../utilities/options";
import { type TrackClickProps } from "../types";

export function TrackClick({
	name,
	meta,
	children,
	projectId,
	ingestUrl,
	debug,
}: TrackClickProps) {
	const contextOptions = useAnalyticsOptions();
	const options = resolveAnalyticsOptions(contextOptions, { projectId, ingestUrl, debug });

	if (!isValidElement(children)) return children;

	const child = children as ReactElement<{ onClick?: (event: MouseEvent) => void }>;

	function handleClick(event: MouseEvent): void {
		trackClick(name, meta, options);
		child.props.onClick?.(event);
	}

	return cloneElement(child, { onClick: handleClick });
}
