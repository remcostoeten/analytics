import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

import { CodeWindow } from "@/components/landing/code-window";
import { outlineButton } from "@/components/landing/control";
import {
  ArrowIcon,
  BoxIcon,
  BugIcon,
  GaugeIcon,
  RouteIcon,
  ShieldIcon,
  TerminalIcon,
} from "@/components/landing/icons";
import { InstallCommand } from "@/components/landing/install-command";
import { PixelHeading } from "@/components/landing/pixel-heading";
import { baseOptions } from "@/lib/layout-options";

const features = [
  {
    icon: ShieldIcon,
    title: "No cookies, no raw IPs",
    text: "Visitors are counted with a daily salted hash. The only cookie is the admin session.",
  },
  {
    icon: BoxIcon,
    title: "One typed SDK",
    text: "A browser core under 5 KB gzipped, with React, Next, server and proxy entries.",
  },
  {
    icon: RouteIcon,
    title: "Same-origin proxy",
    text: "Mount /_ra in your app so events travel on your own domain.",
  },
  {
    icon: GaugeIcon,
    title: "Core Web Vitals",
    text: "LCP, INP, CLS, TTFB and FCP per route.",
  },
  {
    icon: BugIcon,
    title: "Error tracking",
    text: "Stack frames and stable fingerprints across deploys.",
  },
  {
    icon: TerminalIcon,
    title: "Read-only SQL",
    text: "Query the console views with an API token.",
  },
];

const starts = [
  { title: "Quick start", href: "/docs/getting-started/quick-start" },
  { title: "How it works", href: "/docs/getting-started/how-it-works" },
  { title: "SDK reference", href: "/docs/sdk/install" },
  { title: "API reference", href: "/docs/reference" },
];

export default async function HomePage() {
  const example = await readFile(join(process.cwd(), "content/snippets/analytics.ts.txt"), "utf8");
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(880px,calc(100%-32px))] flex-1">
        <section className="flex flex-col gap-6 py-16! md:py-24!">
          <span className="caps text-muted">Spoar, self-hosted web analytics</span>
          <PixelHeading lines={["Web analytics", "on your own Postgres."]} />
          <p className="max-w-xl text-[1rem] leading-relaxed text-muted">
            A typed SDK, one API for ingest and reads, and a database you run. No cookies for
            visitors. Raw IP addresses are never stored.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/docs/getting-started/quick-start" className="btn-primary">
              Get started
              <ArrowIcon className="size-3" />
            </Link>
            <Link href="/docs" className={`${outlineButton} h-auto px-4 py-2.5 caps`}>
              Read the docs
            </Link>
            <InstallCommand command="npm install @spoar/sdk" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <span className="caps text-muted">One file to add</span>
          <CodeWindow title="lib/analytics.ts" lang="ts" code={example} />
        </section>

        <section className="flex flex-col gap-6">
          <span className="caps text-muted">What it records</span>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="flex gap-3 border-b border-dashed border-line py-4 last:border-b-0 sm:nth-last-[2]:border-b-0"
              >
                <feature.icon className="mt-0.5 size-3.5 shrink-0 text-muted" />
                <div className="flex flex-col gap-1">
                  <h2 className="text-[0.9rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
                    {feature.title}
                  </h2>
                  <p className="text-[0.8rem] leading-relaxed text-muted">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <span className="caps text-muted">Where to start</span>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {starts.map((start) => (
              <li key={start.title}>
                <Link
                  href={start.href}
                  className="card-wash group flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-4 py-3 text-[0.85rem] font-medium text-fg"
                >
                  {start.title}
                  <ArrowIcon className="size-3.5 text-muted transition-colors group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="dot-grid flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted">
          <span>Spoar. Built by Remco Stoeten.</span>
          <div className="flex gap-4">
            <Link href="/query" className="link-line">
              Query
            </Link>
            <a href="https://github.com/remcostoeten/analytics" className="link-line">
              GitHub
            </a>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
