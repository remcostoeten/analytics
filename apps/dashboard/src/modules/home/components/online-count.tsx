"use client";

import type { Nullable } from "@spoar/shared/semantic";
import { useQuery } from "@tanstack/react-query";

import { formatMetric } from "@/modules/analytics/format";
import { browserClient } from "@/shared/api/browser-client";

type Props = { initial: Nullable<number> };

const liveIntervalMs = 30_000;

export function OnlineCount({ initial }: Props) {
  const api = browserClient();
  const read = useQuery({
    queryKey: api.key("realtime"),
    queryFn: () => api.realtime(),
    refetchInterval: liveIntervalMs,
    staleTime: liveIntervalMs,
  });
  const count = read.data?.ok ? read.data.value.data.visitors : initial;
  return <span className="home-figure">{count === null ? "–" : formatMetric(count, "count")}</span>;
}
