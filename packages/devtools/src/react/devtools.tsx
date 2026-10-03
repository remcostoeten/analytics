import { useEffect } from "react";

import { startDevtools } from "../loader/start";
import type { DevtoolsOptions } from "../options";

/**
 * @name Devtools
 * @description The dev widget for React hosts. It renders nothing itself: after mount it checks
 * for an admin session and only then loads the panel, which renders into its own Shadow DOM
 * root. Visitors without a session download nothing past this component.
 *
 * @example
 * <Devtools endpoint="https://api.example.com" project="site" analytics={analytics} />
 */
export function Devtools(props: DevtoolsOptions) {
  const { endpoint, project } = props;
  useEffect(
    () =>
      startDevtools(props, () => import("../panel/mount-panel").then((panel) => panel.mountPanel)),
    [endpoint, project],
  );
  return null;
}
