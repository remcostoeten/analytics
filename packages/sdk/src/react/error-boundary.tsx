import { Component } from "react";
import type { ReactNode } from "react";

import type { Analytics, Props as EventProps } from "../core/types";
import { AnalyticsContext } from "./context";

type Fallback = ReactNode | ((error: unknown, reset: () => void) => ReactNode);

type Props = {
  fallback: Fallback;
  tags?: EventProps;
  children: ReactNode;
};

type State = { failed: boolean; error: unknown };

/**
 * @name ErrorBoundary
 * @description Catches render errors below it, records them with `captureError` and the given
 * tags, and renders `fallback`, which may be a function of the error and a reset. A class because
 * React has no hook for error boundaries.
 *
 * @example
 * <ErrorBoundary fallback={<CrashScreen />} tags={{ area: "dashboard" }}><Dashboard /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  static override contextType = AnalyticsContext;
  declare context: Analytics | null;
  override state: State = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, error };
  }

  override componentDidCatch(error: unknown) {
    this.context?.captureError(error, this.props.tags ? { tags: this.props.tags } : {});
  }

  reset = () => {
    this.setState({ failed: false, error: null });
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback(this.state.error, this.reset) : fallback;
  }
}
