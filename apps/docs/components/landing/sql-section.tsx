import Link from "next/link";

import { dashboardUrl } from "@/lib/dashboard-url";
import { showcaseProject } from "@/lib/showcase";
import { sqlPresets } from "@/lib/sql-presets";
import { runSqlPreset, sqlShowcaseEnabled } from "@/lib/sql-showcase";

import { CodeWindow } from "./code-window";
import { ArrowUpRightIcon, DatabaseIcon, KeyIcon, TerminalIcon } from "./icons";
import { SqlShowcase } from "./sql-showcase";
import type { SqlShowcaseTab } from "./sql-showcase";

const tools = [
  {
    icon: DatabaseIcon,
    title: "Dashboard",
    text: "Every project you may read, with filters, charts and top lists. Sign in with GitHub.",
    href: dashboardUrl(),
    linkText: "Open the dashboard",
    external: true,
  },
  {
    icon: TerminalIcon,
    title: "Query page",
    text: "The same SQL route with your own token, against any project it lists, for any date range.",
    href: "/query",
    linkText: "Bring your own token",
    external: false,
  },
  {
    icon: KeyIcon,
    title: "SQL guide",
    text: "The views, their columns, the limits and who may run SQL.",
    href: "/docs/api/sql",
    linkText: "Read the guide",
    external: false,
  },
];

export async function SqlSection() {
  if (!sqlShowcaseEnabled()) return null;
  const [first] = sqlPresets;
  const outcome = await runSqlPreset(first.id);
  const tabs: SqlShowcaseTab[] = sqlPresets.map((preset) => ({
    id: preset.id,
    title: preset.title,
    question: preset.question,
    code: <CodeWindow title={`queries/${preset.id}.sql`} lang="sql" code={preset.sql} />,
  }));

  return (
    <section id="tools" className="container-land py-14 sm:py-20">
      <div className="reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-md">
          <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
            Ask the data
          </h2>
          <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
            Six read-only queries over the last 30 days of {showcaseProject()}, run on the API as
            you switch between them. The SQL is the SQL you would send.
          </p>
        </div>
        <Link href="/query" className="pill-dark w-fit px-5! py-2.5!">
          Run your own
        </Link>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12 [&>*]:min-w-0">
        <div className="reveal-scale visual-frame rounded-2xl p-3 sm:p-6">
          <SqlShowcase tabs={tabs} initial={{ id: first.id, outcome }} />
        </div>
        <ul className="reveal flex flex-col divide-y divide-line">
          {tools.map((tool) => (
            <li key={tool.title} className="flex gap-4 py-5 first:pt-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--lilac)] text-[#6b46c1]">
                <tool.icon className="size-4" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-[1.15rem] font-normal">{tool.title}</h3>
                <p className="font-serif text-[0.92rem] leading-relaxed text-muted">{tool.text}</p>
                {tool.external ? (
                  <a
                    href={tool.href}
                    rel="noreferrer"
                    className="link-line mt-1 inline-flex w-fit items-center gap-1 font-serif text-[0.92rem] text-fg"
                  >
                    {tool.linkText}
                    <ArrowUpRightIcon className="size-3.5" />
                  </a>
                ) : (
                  <Link
                    href={tool.href}
                    className="link-line mt-1 w-fit font-serif text-[0.92rem] text-fg"
                  >
                    {tool.linkText}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
