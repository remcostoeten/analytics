import { useEffect, useMemo } from "react";

import { createTracking } from "./analytics";
import { createProject } from "./api";
import { StatsTiles } from "./components/stats-tiles";
import { TimeseriesChart } from "./components/timeseries-chart";
import { settings } from "./settings";

export function App() {
  const project = useMemo(() => createProject(settings), []);
  const analytics = useMemo(() => createTracking(settings), []);
  const scope = useMemo(() => project.period("7d").traffic("human"), [project]);
  const scopeKey = "7d|human";

  useEffect(() => () => void analytics.shutdown(), [analytics]);

  return (
    <div className="shell">
      <main className="main">
        {settings.project === "" ? (
          <p className="note warn">
            Set <code>BUN_PUBLIC_DASHBOARD_PROJECT</code> in <code>.env.local</code> to your project
            id.
          </p>
        ) : (
          <>
            <StatsTiles scope={scope} scopeKey={scopeKey} />
            <TimeseriesChart scope={scope} scopeKey={scopeKey} />
          </>
        )}
      </main>
    </div>
  );
}
