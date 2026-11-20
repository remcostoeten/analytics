"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@/shared/ui/link";

import { browserClient } from "@/shared/api/browser-client";
import { livePolling } from "@/shared/query/read";

import { formatMetric } from "../format";

type Props = { project: string; href: string };

export function LiveBadge({ project, href }: Props) {
  const scope = browserClient().project(project);
  const read = useQuery({
    queryKey: scope.key("realtime"),
    queryFn: () => scope.realtime(),
    ...livePolling,
  });
  const count = read.data?.ok ? read.data.value.data.visitors : null;
  if (count === null) return null;
  return (
    <Link href={href} className="live-badge">
      <span className="live-dot" aria-hidden="true" />
      {formatMetric(count, "count")} online now
    </Link>
  );
}
