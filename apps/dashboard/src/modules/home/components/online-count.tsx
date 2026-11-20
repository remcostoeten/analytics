"use client";

import { useQuery } from "@tanstack/react-query";
import { formatMetric } from "@/modules/analytics/format";
import { browserClient } from "@/shared/api/browser-client";
import { livePolling } from "@/shared/query/read";

export function OnlineCount() {
  const api = browserClient();
  const read = useQuery({
    queryKey: api.key("realtime"),
    queryFn: () => api.realtime(),
    ...livePolling,
  });
  const count = read.data?.ok ? read.data.value.data.visitors : null;
  return <span className="home-figure">{count === null ? "–" : formatMetric(count, "count")}</span>;
}
