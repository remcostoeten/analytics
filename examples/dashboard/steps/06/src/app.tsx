import type { Filters, Period, TrafficFilter } from "@spoar/client";
import { useEffect, useMemo, useState } from "react";

import { createTracking } from "./analytics";
import { createProject, scoped } from "./api";
import { BreakdownTable } from "./components/breakdown-table";
import { Controls } from "./components/controls";
import { CountryTable } from "./components/country-table";
import { Realtime } from "./components/realtime";
import { StatsTiles } from "./components/stats-tiles";
import { TimeseriesChart } from "./components/timeseries-chart";
import { settings } from "./settings";
import { fromHash, toHash, withFilter, withoutFilter } from "./state";
import type { ViewState } from "./state";

const breakdowns: { dimension: keyof Filters; title: string }[] = [
  { dimension: "page", title: "Pages" },
  { dimension: "referrer_domain", title: "Referrers" },
  { dimension: "browser", title: "Browsers" },
  { dimension: "device", title: "Devices" },
];

function useViewState() {
  const [state, setState] = useState<ViewState>(() => fromHash(location.hash));
  useEffect(() => {
    const hash = `#${toHash(state)}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }, [state]);
  useEffect(() => {
    function onHash() {
      setState(fromHash(location.hash));
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [state, setState] as const;
}

export function App() {
  const [state, setState] = useViewState();
  const project = useMemo(() => createProject(settings), []);
  const analytics = useMemo(() => createTracking(settings), []);
  const scope = useMemo(() => scoped(project, state), [project, state]);
  const scopeKey = toHash(state);

  useEffect(() => () => void analytics.shutdown(), [analytics]);

  function onPeriod(period: Period) {
    analytics.track("period_changed", { period });
    setState((current) => ({ ...current, period }));
  }

  function onTraffic(traffic: TrafficFilter) {
    analytics.track("traffic_changed", { traffic });
    setState((current) => ({ ...current, traffic }));
  }

  function onPick(dimension: keyof Filters, value: string) {
    analytics.track("filter_added", { dimension });
    setState((current) => withFilter(current, dimension, value));
  }

  function onRemoveFilter(dimension: keyof Filters) {
    analytics.track("filter_removed", { dimension });
    setState((current) => withoutFilter(current, dimension));
  }

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
            <Controls
              state={state}
              onPeriod={onPeriod}
              onTraffic={onTraffic}
              onRemoveFilter={onRemoveFilter}
            />
            <StatsTiles scope={scope} scopeKey={scopeKey} />
            <TimeseriesChart scope={scope} scopeKey={scopeKey} />
            <div className="grid">
              {breakdowns.map((item) => (
                <BreakdownTable
                  key={item.dimension}
                  scope={scope}
                  scopeKey={scopeKey}
                  dimension={item.dimension}
                  title={item.title}
                  onPick={onPick}
                />
              ))}
            </div>
            <div className="grid two">
              <CountryTable scope={scope} scopeKey={scopeKey} onPick={onPick} />
              <Realtime scope={scope} scopeKey={scopeKey} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
