import { useEffect } from "react";

import { startDebugtools } from "../loader/start";
import type { DebugtoolsOptions } from "../options";

/**
 * @name Debugtools
 * @description The debug console for React hosts. It renders nothing itself: after mount it
 * checks for an admin session and only then loads the console, which renders into its own Shadow
 * DOM root. Visitors without a session download nothing past this component.
 *
 * @example
 * <Debugtools endpoint="https://api.example.com" project="site" />
 */
export function Debugtools(props: DebugtoolsOptions) {
  const { endpoint, project } = props;
  useEffect(
    () =>
      startDebugtools(props, () =>
        import("../widget/mount-widget").then((widget) => widget.mountWidget),
      ),
    [endpoint, project],
  );
  return null;
}
