import { cloneElement } from "react";
import type { MouseEvent, ReactElement } from "react";

import type { Props as EventProps } from "../core/types";
import { useAnalytics } from "./use-analytics";

type Clickable = { onClick?: (event: MouseEvent<Element>) => void };

type Props = {
  name: string;
  props?: EventProps;
  children: ReactElement<Clickable>;
};

/**
 * @name TrackClick
 * @description Sends an event when its only child is clicked, after the child's own `onClick`.
 * It renders no element of its own.
 *
 * @example
 * <TrackClick name="signup" props={{ plan: "pro" }}><button>Upgrade</button></TrackClick>
 */
export function TrackClick({ name, props, children }: Props) {
  const analytics = useAnalytics();
  return cloneElement(children, {
    onClick: (event: MouseEvent<Element>) => {
      children.props.onClick?.(event);
      analytics.track(name, props);
    },
  });
}
