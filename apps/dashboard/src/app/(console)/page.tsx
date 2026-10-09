import type { Metadata } from "next";
import Link from "next/link";

import { listProjects } from "@/modules/analytics/reads";
import { formatMetric } from "@/modules/analytics/format";
import { readSession } from "@/modules/session/session";
import { serverClient } from "@/shared/api/server-client";
import { siteUrl } from "@/shared/config/site";
import { ExternalIcon } from "@/shared/ui/icons";

export const metadata: Metadata = { title: "Home" };

const created = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function createdAgo(timestamp: string) {
  const days = Math.round((Date.parse(timestamp) - Date.now()) / 86_400_000);
  if (days > -31) return created.format(days, "day");
  if (days > -365) return created.format(Math.round(days / 30), "month");
  return created.format(Math.round(days / 365), "year");
}

export default async function Page() {
  const api = await serverClient();
  const [projects, session, traffic] = await Promise.all([
    listProjects(),
    readSession(),
    api.period("24h").projectBreakdown({ metrics: ["pageviews", "visitors"], limit: 100 }),
  ]);
  const rows = new Map(traffic.ok ? traffic.value.data.map((row) => [row.value, row]) : []);

  return (
    <div className="mx-auto grid max-w-[1040px] gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="grid gap-1">
          <h1 className="text-2xl font-normal tracking-tight">Web analytics</h1>
          <p className="text-sm text-muted">
            Every project you can read, with its traffic over the last 24 hours.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${siteUrl()}/docs`} className="ghost-button">
            Documentation
          </a>
          {session.isAdmin ? (
            <Link href="/admin/projects/new" className="solid-button">
              Add a project
            </Link>
          ) : null}
        </div>
      </header>

      {!projects.ok ? (
        <p className="text-sm text-err">Could not list projects: {projects.error}</p>
      ) : projects.value.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {session.user ? "No projects yet." : "No public projects. Sign in to see private ones."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {projects.value.map((project) => {
            const row = rows.get(project.id);
            const href = `/projects/${encodeURIComponent(project.id)}`;
            return (
              <li key={project.id} className="site-row">
                <div className="grid min-w-0 gap-1">
                  <span className="flex items-center gap-2">
                    <Link href={href} className="truncate text-base font-semibold hover:underline">
                      {project.name}
                    </Link>
                    <a
                      href={`https://${project.domain}`}
                      aria-label={`Open ${project.domain}`}
                      className="text-link"
                    >
                      <ExternalIcon className="size-3.5" />
                    </a>
                  </span>
                  <span className="text-xs text-muted">
                    {project.domain} · created {createdAgo(project.createdAt)}
                  </span>
                  <span className="flex flex-wrap gap-3 text-xs">
                    <Link href={href} className="text-link underline">
                      View analytics
                    </Link>
                    {session.isAdmin ? (
                      <Link href={`/admin${href}`} className="text-link underline">
                        Manage project
                      </Link>
                    ) : null}
                    <span className="text-muted">{project.visibility}</span>
                  </span>
                </div>
                <dl className="contents">
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted">Page views (last 24 hours)</dt>
                    <dd className="text-xl tabular-nums">
                      {formatMetric(row?.pageviews ?? 0, "count")}
                    </dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted">Visitors (last 24 hours)</dt>
                    <dd className="text-xl tabular-nums">
                      {formatMetric(row?.visitors ?? 0, "count")}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
