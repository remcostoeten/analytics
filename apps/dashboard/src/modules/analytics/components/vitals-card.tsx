import type { SpeedResponse } from "@spoar/contract";
import Link from "next/link";

import { vitalSummary, vitalViews } from "../speed";
import { ShareBar } from "./share-bar";

type Props = { data: SpeedResponse["data"] | null; href: string };

const shown = vitalViews.filter((view) => ["lcp", "inp", "cls"].includes(view.slug));

export function VitalsCard({ data, href }: Props) {
  return (
    <Link href={href} className="metric-card" prefetch={false}>
      <span className="metric-label text-sm">Core Web Vitals</span>
      <span className="grid gap-2 pt-1">
        {shown.map((view) => {
          const summary = data ? vitalSummary(data, view.slug) : null;
          return (
            <span key={view.slug} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center">
              <span className="text-xs font-medium" title={view.label}>
                {view.short}
              </span>
              {summary ? (
                <ShareBar shares={summary.shares} />
              ) : (
                <span className="share-bar" aria-hidden="true" />
              )}
            </span>
          );
        })}
      </span>
    </Link>
  );
}
