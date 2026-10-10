"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { browserClient } from "@/shared/api/browser-client";

import { formatMetric } from "../format";

type Props = { project: string; href: string };

const liveIntervalMs = 30_000;

export function LiveBadge({ project, href }: Props) {
  const scope = browserClient().project(project);
  const read = useQuery({
    queryKey: scope.key("realtime"),
    queryFn: () => scope.realtime(),
    refetchInterval: liveIntervalMs,
    staleTime: liveIntervalMs,
  });
  const count = read.data?.ok ? read.data.value.data.visitors : null;
  if (count === null) return null;
  return (
    <Link href={href} className="live-badge" prefetch={false}>
      <span className="live-dot" aria-hidden="true" />
      {formatMetric(count, "count")} online now
    </Link>
  );
}
