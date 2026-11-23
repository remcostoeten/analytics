import type { ProjectScope } from "@spoar/client";
import { useState } from "react";

import type { MetricKey } from "../metrics";
import { StatsTiles } from "./stats-tiles";
import { TimeseriesChart } from "./timeseries-chart";

type Props = { scope: ProjectScope; scopeKey: string };

export function Overview({ scope, scopeKey }: Props) {
  const [metric, setMetric] = useState<MetricKey>("visitors");
  return (
    <section className="card overview">
      <StatsTiles scope={scope} scopeKey={scopeKey} selected={metric} onSelect={setMetric} />
      <TimeseriesChart scope={scope} scopeKey={scopeKey} metric={metric} />
    </section>
  );
}
