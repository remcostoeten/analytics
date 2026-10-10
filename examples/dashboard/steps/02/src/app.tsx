import { useEffect, useMemo } from "react";

import { createTracking } from "./analytics";
import { settings } from "./settings";

export function App() {
  const analytics = useMemo(() => createTracking(settings), []);

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
          <h1>{settings.project}</h1>
        )}
      </main>
    </div>
  );
}
