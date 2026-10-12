import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { apiEndpoint } from "@/lib/api-endpoint";
import { readShowcase } from "@/lib/showcase";

import { ConsoleWorkbench } from "./console-workbench";
import { HeroTail } from "./hero-tail";
import {
  BoxIcon,
  ChevronIcon,
  ClockIcon,
  CodeIcon,
  DotsIcon,
  ListIcon,
  SearchIcon,
  UserIcon,
} from "./icons";

type ToolButtonProps = { children: ReactNode; active?: boolean };

type PaneSearchProps = { label: string };

const tabs = ["Query", "Realtime", "Dashboard", "Errors", "Projects"];

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

      <ConsoleWorkbench
        pages={showcase.pages}
        sources={showcase.sources}
        series={showcase.series}
        search={<PaneSearch label="Search views" />}
        toolbarStart={
          <>
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
          </>
        }
        toolbarEnd={
          <span className="flex items-center gap-2 max-md:hidden">
            <ToolButton>Cancel</ToolButton>
            <span className="mx-1 h-4 w-px bg-[var(--console-line)]" />
            <ToolButton>Clear</ToolButton>
            <ToolButton>Save</ToolButton>
            <ToolButton>
              <DotsIcon className="size-3.5" />
            </ToolButton>
          </span>
        }
        aside={
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
        }
      />

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
