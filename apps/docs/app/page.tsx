import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

import { Badge } from "@/components/landing/badge";
import { CodeWindow, Cm, Fn, Kw, Str } from "@/components/landing/code-window";
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
import { Pipeline } from "@/components/landing/pipeline";
import { StatusPill } from "@/components/landing/status-pill";
import { baseOptions } from "@/lib/layout-options";

const features = [
  {
    icon: ShieldIcon,
    title: "No cookies, no raw IPs",
    text: "Visitors are counted with a daily salted hash. The only cookie on the whole system is the admin session.",
  },
  {
    icon: BoxIcon,
    title: "One typed SDK",
    text: "A browser core under 5 KB gzipped, plugins under 0.6 KB each, and React, Next, server and proxy entries.",
  },
  {
    icon: RouteIcon,
    title: "Same-origin proxy",
    text: "Mount /_ra in your own app so events travel on your domain and survive most blockers.",
  },
  {
    icon: GaugeIcon,
    title: "Core Web Vitals",
    text: "LCP, INP, CLS, TTFB and FCP per route, credited to the page that was measured.",
  },
  {
    icon: BugIcon,
    title: "Error tracking",
    text: "Stack frames, stable fingerprints across deploys, and no issues opened by bots.",
  },
  {
    icon: TerminalIcon,
    title: "Read-only SQL console",
    text: "Run SELECT against console views with an API token, from the dashboard or this site.",
  },
];

const stacks = [
  { name: "Next.js", href: "/docs/frameworks/nextjs" },
  { name: "React", href: "/docs/frameworks/react" },
  { name: "Vue", href: "/docs/frameworks/vue" },
  { name: "Svelte", href: "/docs/frameworks/svelte" },
  { name: "Astro", href: "/docs/frameworks/astro" },
  { name: "Vanilla", href: "/docs/frameworks/vanilla" },
  { name: "Node, Bun, Deno", href: "/docs/frameworks/server" },
  { name: "Any language", href: "/docs/frameworks/server#other-languages" },
];

const starts = [
  {
    title: "Quick start",
    text: "From an empty project to the first stored event.",
    href: "/docs/getting-started/quick-start",
    tag: "Tutorial",
  },
  {
    title: "SDK reference",
    text: "Every entry, option, plugin and size budget.",
    href: "/docs/sdk/install",
    tag: "Reference",
  },
  {
    title: "API reference",
    text: "Every route, generated from the OpenAPI document.",
    href: "/docs/reference",
    tag: "Reference",
  },
  {
    title: "Self-host",
    text: "Neon, Vercel, the migrations and the cron jobs.",
    href: "/docs/guides/self-host",
    tag: "Guide",
  },
];

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="dot-grid flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
            <span className="animate-live size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" />
            <span className="caps text-[0.62rem] text-fg">SDK 2.0 on the next tag</span>
          </span>
          <div className="flex items-center gap-2">
            <StatusPill state="ok">api up</StatusPill>
            <StatusPill state="running">ingesting</StatusPill>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="caps text-muted">Self-hosted web analytics</span>
            <h1 className="text-[2.6rem] leading-[1.05] font-medium tracking-[-0.02em] text-fg sm:text-[3.2rem]">
              Web analytics
              <br />
              <span className="text-muted">on your own Postgres.</span>
            </h1>
            <p className="max-w-lg text-[0.95rem] leading-relaxed text-muted">
              Pageviews, custom events, errors and Core Web Vitals from a typed SDK, through one
              API, into a database you run. No cookies for visitors. Raw IP addresses are never
              stored.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/docs/getting-started/quick-start" className="btn-primary">
                Get started
                <ArrowIcon className="size-3" />
              </Link>
              <InstallCommand command="npm install @remcostoeten/analytics" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <CodeWindow title="lib/analytics.ts">
              <Kw>import</Kw> {"{ "}
              <Fn>createAnalytics</Fn>
              {" } "}
              <Kw>from</Kw> <Str>"@remcostoeten/analytics"</Str>;{"\n"}
              <Kw>import</Kw> {"{ "}
              <Fn>errors</Fn>, <Fn>speedInsights</Fn>
              {" } "}
              <Kw>from</Kw> <Str>"@remcostoeten/analytics/plugins"</Str>;{"\n\n"}
              <Kw>export const</Kw> analytics = <Fn>createAnalytics</Fn>({"{"}
              {"\n"}
              {"  "}project: <Str>"example.com"</Str>,{"\n"}
              {"  "}key: <Str>"pk_..."</Str>,{"\n"}
              {"  "}endpoint: <Str>"/_ra"</Str>,{"\n"}
              {"  "}plugins: [<Fn>speedInsights</Fn>(), <Fn>errors</Fn>()],{"\n"}
              {"}"});{"\n\n"}
              analytics.<Fn>track</Fn>(<Str>"signup"</Str>, {"{ plan: "}
              <Str>"pro"</Str>
              {" }"});
              {"  "}
              <Cm>{"// batched, sent on your domain"}</Cm>
            </CodeWindow>
            <div className="grid grid-cols-3 gap-3">
              <Stat value="< 5 KB" label="core, gzipped" />
              <Stat value="0" label="visitor cookies" />
              <Stat value="1" label="API for everything" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="01 / How data flows"
            title="From the browser to a row, in four steps"
            text="The SDK never contains database logic. Every read goes through the API, with access decided per project and per caller."
            href="/docs/getting-started/how-it-works"
            linkText="How it works"
          />
          <Pipeline />
        </section>

        <section className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="02 / What it records"
            title="Pageviews, events, errors, vitals and SQL"
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="card-wash flex flex-col gap-4 rounded-[10px] border border-line bg-surface p-4"
              >
                <feature.icon className="size-3.5 text-muted" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[0.9rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
                    {feature.title}
                  </h3>
                  <p className="text-[0.8rem] leading-relaxed text-muted">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="03 / Runs on"
            title="Anything that bundles ES modules"
            text="The browser core has no framework dependency. The framework entries add route templates and providers on top."
            href="/docs/frameworks"
            linkText="All frameworks"
          />
          <ul className="flex flex-wrap gap-2">
            {stacks.map((stack) => (
              <li key={stack.name}>
                <Link href={stack.href} className={`${outlineButton} text-[0.75rem] font-medium`}>
                  {stack.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-6">
          <SectionHeading eyebrow="04 / Where to start" title="Pick a page" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {starts.map((start) => (
              <li key={start.title}>
                <Link
                  href={start.href}
                  className="card-wash group flex h-full flex-col justify-between gap-6 rounded-[10px] border border-line bg-surface p-4"
                >
                  <div className="flex flex-col gap-2">
                    <Badge tone="muted">{start.tag}</Badge>
                    <h3 className="text-[0.9rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
                      {start.title}
                    </h3>
                    <p className="text-[0.8rem] leading-relaxed text-muted">{start.text}</p>
                  </div>
                  <ArrowIcon className="size-3.5 text-muted transition-colors group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="dot-grid flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted">
          <span>Analytics. Self-hosted, privacy-first. Built by Remco Stoeten.</span>
          <div className="flex gap-4">
            <Link href="/docs" className="link-line">
              Docs
            </Link>
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

type StatProps = {
  value: string;
  label: string;
};

function Stat({ value, label }: StatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-dashed border-line px-4 py-3">
      <span className="font-mono text-lg font-medium text-fg tabular-nums">{value}</span>
      <span className="caps text-[0.6rem] text-muted">{label}</span>
    </div>
  );
}

type HeadingProps = {
  eyebrow: string;
  title: string;
  text?: string;
  href?: string;
  linkText?: string;
};

function SectionHeading({ eyebrow, title, text, href, linkText }: HeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <span className="caps text-muted">{eyebrow}</span>
      <h2 className="text-[1.3rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
        {title}
      </h2>
      {text ? <p className="text-[0.9rem] leading-relaxed text-muted">{text}</p> : null}
      {href && linkText ? (
        <Link
          href={href}
          className="link-line inline-flex w-fit items-center gap-1.5 text-sm text-fg"
        >
          {linkText}
          <ArrowIcon className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
