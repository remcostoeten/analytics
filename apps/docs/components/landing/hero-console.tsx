import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { apiEndpoint } from "@/lib/api-endpoint";
import { readShowcase } from "@/lib/showcase";

import { HeroTail } from "./hero-tail";
import {
  ChevronIcon,
  ClockIcon,
  CodeIcon,
  DotsIcon,
  GridIcon,
  ListIcon,
  PinTopIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  StackIcon,
  TrendIcon,
  UserIcon,
  BoxIcon,
} from "./icons";

type Token = { text: string; kind?: "keyword" | "string" | "call" };

type ToolButtonProps = { children: ReactNode; active?: boolean };

type PaneSearchProps = { label: string };

const tabs = ["Query", "Realtime", "Dashboard", "Errors", "Projects"];

const views = [
  "events",
  "pageviews",
  "sessions",
  "visitors",
  "people",
  "web_vitals",
  "issues",
  "daily",
  "daily_vitals",
];

const fields: [type: string, name: string][] = [
  ["s", "event_id"],
  ["s", "name"],
  ["t", "ts"],
  ["s", "visitor_id"],
  ["s", "session_id"],
  ["s", "path"],
  ["s", "referrer_domain"],
  ["s", "channel"],
  ["s", "country"],
  ["s", "device"],
];

const query: Token[][] = [
  [
    { text: "SELECT", kind: "keyword" },
    { text: " path, " },
    { text: "count", kind: "call" },
    { text: "(" },
    { text: "DISTINCT", kind: "keyword" },
    { text: " visitor_id) " },
    { text: "AS", kind: "keyword" },
    { text: " visitors" },
  ],
  [{ text: "FROM", kind: "keyword" }, { text: " events" }],
  [
    { text: "WHERE", kind: "keyword" },
    { text: " name = " },
    { text: "'pageview'", kind: "string" },
    { text: " " },
    { text: "AND", kind: "keyword" },
    { text: " is_human" },
  ],
  [
    { text: "GROUP BY", kind: "keyword" },
    { text: " path " },
    { text: "ORDER BY", kind: "keyword" },
    { text: " visitors " },
    { text: "DESC", kind: "keyword" },
  ],
];

const tokenClass = {
  keyword: "text-[var(--console-keyword)]",
  string: "text-[var(--console-string)]",
  call: "text-[var(--console-fg)]",
};

function fade(index: number, solid: number) {
  return { opacity: Math.max(0.12, 1 - Math.max(0, index - solid) * 0.16) };
}

function ToolButton({ children, active }: ToolButtonProps) {
  return (
    <span
      className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 ${active ? "border-[var(--console-line)] bg-white/[0.06] text-[var(--console-fg)]" : "border-[var(--console-line)] text-[var(--console-muted)]"}`}
    >
      {children}
    </span>
  );
}

function PaneSearch({ label }: PaneSearchProps) {
  return (
    <p className="flex items-center gap-2.5 border-b border-[var(--console-line)] px-4 py-2.5 text-[var(--console-muted)]">
      <SearchIcon className="size-3.5" />
      {label}
    </p>
  );
}

export async function HeroConsole() {
  const showcase = await readShowcase();
  return (
    <div className="hero-console panel-rise relative flex h-full w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 text-left font-sans text-[0.72rem] sm:text-[0.78rem]">
      <nav className="flex items-center gap-1 border-b border-[var(--console-line)] px-3 sm:px-4">
        <Logo className="mr-2 size-5 shrink-0" />
        {tabs.map((tab, index) => (
          <span
            key={tab}
            className={`relative px-2.5 py-3 sm:px-3 ${index === 0 ? "text-[var(--console-fg)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/60" : "text-[var(--console-muted)]"} ${index > 2 ? "max-sm:hidden" : ""}`}
          >
            {tab}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-b border-[var(--console-line)] px-3 py-2 sm:px-4">
        <span className="flex items-center gap-0.5 rounded-lg border border-[var(--console-line)] p-0.5 max-sm:hidden">
          <span className="flex items-center gap-1.5 px-2 py-1 text-[var(--console-muted)]">
            <BoxIcon className="size-3.5" />
            Builder
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-2 py-1 text-[var(--console-fg)]">
            <CodeIcon className="size-3.5" />
            Editor
          </span>
        </span>
        <span className="mx-1 h-4 w-px bg-[var(--console-line)] max-sm:hidden" />
        <ToolButton active>
          <ClockIcon className="size-3.5" />
          Last 30 days
          <ChevronIcon className="size-3" />
        </ToolButton>
        <Link
          href="/query"
          className="flex h-7 items-center gap-1.5 rounded-md bg-[#f2f0ed] px-2.5 font-medium text-[#141312] transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <PlayIcon className="size-3" />
          Run
        </Link>
        <span className="flex items-center gap-2 max-md:hidden">
          <ToolButton>Cancel</ToolButton>
          <span className="mx-1 h-4 w-px bg-[var(--console-line)]" />
          <ToolButton>Clear</ToolButton>
          <ToolButton>Save</ToolButton>
          <ToolButton>
            <DotsIcon className="size-3.5" />
          </ToolButton>
        </span>
      </div>

      <div className="relative h-[118px] shrink-0 overflow-hidden py-3 font-mono sm:h-[150px] sm:py-4">
        <pre className="flex flex-col gap-1 sm:gap-1.5">
          {query.map((tokens, row) => (
            <code key={row} className="flex items-center whitespace-pre text-[var(--console-dim)]">
              <span className="mr-4 w-8 shrink-0 text-right text-[var(--console-muted)] tabular-nums sm:w-10">
                {row + 1}
              </span>
              {tokens.map((token, index) => (
                <span key={index} className={token.kind ? tokenClass[token.kind] : undefined}>
                  {token.text}
                </span>
              ))}
              {row === query.length - 1 ? (
                <span className="console-caret ml-px h-[1.1em] w-px bg-[var(--console-fg)]" />
              ) : null}
            </code>
          ))}
        </pre>
        <span className="absolute top-3 right-2 h-12 w-1 rounded-full bg-white/15" />
      </div>

      <div className="flex items-stretch border-y border-[var(--console-line)]">
        <span className="flex items-center border-r border-[var(--console-line)] px-3 text-[var(--console-muted)]">
          <GridIcon className="size-4" />
        </span>
        <span className="border-r border-[var(--console-line)] px-5 py-2.5 font-mono text-[var(--console-muted)]">
          Results
        </span>
        <PinTopIcon className="mr-3 ml-auto size-4 self-center text-[var(--console-muted)]" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[1fr_1fr_1.15fr]">
        <section className="flex min-h-0 flex-col border-[var(--console-line)] sm:border-r">
          <header className="flex items-center justify-between border-b border-[var(--console-line)] px-4 py-2.5 text-[var(--console-fg)]">
            Views
            <PlusIcon className="size-4 text-[var(--console-muted)]" />
          </header>
          <PaneSearch label="Search views" />
          <ul className="flex flex-col gap-0.5 p-1.5 font-mono">
            <li className="px-2.5 py-1 text-[var(--console-muted)]">All</li>
            {views.map((view, index) => (
              <li
                key={view}
                style={fade(index, 2)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 ${index === 0 ? "bg-white/[0.06] text-[var(--console-fg)]" : "text-[var(--console-dim)]"}`}
              >
                <StackIcon className="size-3.5 text-[var(--console-muted)]" />
                {view}
                {index === 0 ? <ChevronIcon className="ml-auto size-3 -rotate-90" /> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col border-[var(--console-line)] max-sm:hidden sm:border-r">
          <PaneSearch label="Search events" />
          <ul className="flex flex-col gap-0.5 p-1.5 font-mono">
            <li className="px-2.5 py-1 text-[var(--console-muted)]">Quick queries</li>
            <li className="flex items-center gap-2.5 rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[var(--console-fg)]">
              <ListIcon className="size-3.5 text-[var(--console-muted)]" />
              Top pages
              <PlayIcon className="ml-auto size-3 text-[var(--console-muted)]" />
            </li>
            <li className="flex items-center gap-2.5 px-2.5 py-1.5 text-[var(--console-dim)]">
              <TrendIcon className="size-3.5 text-[var(--console-muted)]" />
              Visitors over time
            </li>
            <li className="mt-1.5 px-2.5 py-1 text-[var(--console-muted)]">Fields</li>
            {fields.map(([type, name], index) => (
              <li
                key={name}
                style={fade(index, 1)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 text-[var(--console-dim)]"
              >
                <span className="flex size-4 items-center justify-center rounded bg-white/[0.06] text-[0.6rem] text-[var(--console-muted)]">
                  {type}
                </span>
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col max-sm:hidden">
          <header className="flex items-center gap-1.5 border-b border-[var(--console-line)] px-4 py-2.5 text-[var(--console-fg)]">
            Recent queries
            <ChevronIcon className="size-3 text-[var(--console-muted)]" />
            <span className="ml-auto flex items-center gap-3 text-[var(--console-muted)]">
              <ListIcon className="size-3.5" />
              <BoxIcon className="size-3.5" />
              <CodeIcon className="size-3.5" />
              <UserIcon className="size-3.5" />
            </span>
          </header>
          <PaneSearch label="Search queries" />
          <ul className="flex flex-col opacity-40">
            {[0, 1, 2].map((item) => (
              <li
                key={item}
                className="flex h-24 items-start gap-2 border-b border-[var(--console-line)] px-4 pt-3 text-[var(--console-muted)]"
              >
                <CodeIcon className="size-3.5" />
                <DotsIcon className="ml-auto size-3.5" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="console-tail absolute right-3 bottom-0 left-3 flex h-[52%] flex-col overflow-hidden rounded-t-xl border border-b-0 font-mono sm:right-[3.5%] sm:left-auto sm:w-[42%]">
        <p className="flex items-center gap-1.5 border-b border-[var(--console-line)] px-3 py-2 text-[var(--console-muted)]">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="ml-2">› spoar-tail</span>
        </p>
        <HeroTail endpoint={apiEndpoint()} project={showcase.project} top={showcase.pages[0]} />
      </div>
    </div>
  );
}
