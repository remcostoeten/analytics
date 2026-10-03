import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";

import { CodeWindow, Cm, Fn, Kw, Str } from "@/components/landing/code-window";
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
  },
  {
    title: "SDK reference",
    text: "Every entry, option, plugin and size budget.",
    href: "/docs/sdk/install",
  },
  {
    title: "API reference",
    text: "Every route, generated from the OpenAPI document.",
    href: "/docs/reference",
  },
  {
    title: "Self-host",
    text: "Neon, Vercel, the migrations and the cron jobs.",
    href: "/docs/guides/self-host",
  },
];

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="relative flex-1 overflow-hidden">
        <div className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
        <div className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[720px]" />

        <section className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pt-20 pb-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-28">
          <div className="landing-rise flex flex-col gap-6">
            <Link
              href="/docs/sdk/migrating"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              <span className="landing-pulse size-1.5 rounded-full bg-fd-foreground" />
              SDK 2.0 on the next tag
              <ArrowIcon className="size-3" />
            </Link>
            <h1 className="text-5xl font-semibold tracking-[-0.04em] text-fd-foreground sm:text-6xl">
              Web analytics
              <br />
              <span className="text-fd-muted-foreground">on your own Postgres.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-fd-muted-foreground">
              Pageviews, custom events, errors and Core Web Vitals from a typed SDK, through one
              API, into a database you run. No cookies for visitors. Raw IP addresses are never
              stored.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/docs/getting-started/quick-start"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started
                <ArrowIcon className="size-4" />
              </Link>
              <InstallCommand command="npm install @remcostoeten/analytics" />
            </div>
          </div>

          <div className="landing-rise flex flex-col gap-3 [animation-delay:120ms]">
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

        <div className="landing-rule mx-auto h-px w-full max-w-6xl" />

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
          <SectionHeading
            eyebrow="How data flows"
            title="From the browser to a row, in four steps"
            text="The SDK never contains database logic. Every read goes through the API, with access decided per project and per caller."
            href="/docs/getting-started/how-it-works"
            linkText="How it works"
          />
          <Pipeline />
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
          <SectionHeading
            eyebrow="What it records"
            title="Pageviews, events, errors, vitals and SQL"
          />
          <ul className="grid gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="group flex flex-col gap-4 bg-fd-card p-6 transition-colors hover:bg-fd-muted"
              >
                <feature.icon className="size-5 text-fd-foreground" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-medium text-fd-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-fd-muted-foreground">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Runs on"
            title="Anything that bundles ES modules"
            text="The browser core has no framework dependency. The framework entries add route templates and providers on top."
            href="/docs/frameworks"
            linkText="All frameworks"
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stacks.map((stack) => (
              <li key={stack.name}>
                <Link
                  href={stack.href}
                  className="flex h-full items-center justify-between gap-2 rounded-lg border border-fd-border bg-fd-card px-4 py-3 text-sm text-fd-foreground transition-colors hover:border-fd-ring hover:bg-fd-muted"
                >
                  {stack.name}
                  <ArrowIcon className="size-3.5 text-fd-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
          <SectionHeading eyebrow="Where to start" title="Pick a page" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {starts.map((start) => (
              <li key={start.title}>
                <Link
                  href={start.href}
                  className="group flex h-full flex-col justify-between gap-6 rounded-xl border border-fd-border bg-fd-card p-5 transition-colors hover:border-fd-ring hover:bg-fd-muted"
                >
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-medium text-fd-foreground">{start.title}</h3>
                    <p className="text-sm leading-relaxed text-fd-muted-foreground">{start.text}</p>
                  </div>
                  <ArrowIcon className="size-4 text-fd-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-fd-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-fd-border">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-fd-muted-foreground">
            <span>Analytics, self-hosted and privacy-first. Built by Remco Stoeten.</span>
            <div className="flex gap-5">
              <Link href="/docs" className="transition-colors hover:text-fd-foreground">
                Docs
              </Link>
              <Link href="/query" className="transition-colors hover:text-fd-foreground">
                Query
              </Link>
              <a
                href="https://github.com/remcostoeten/analytics"
                className="transition-colors hover:text-fd-foreground"
              >
                GitHub
              </a>
            </div>
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
    <div className="flex flex-col gap-0.5 rounded-lg border border-fd-border bg-fd-card px-4 py-3">
      <span className="font-mono text-lg font-medium tracking-tight text-fd-foreground">
        {value}
      </span>
      <span className="text-xs text-fd-muted-foreground">{label}</span>
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
      <span className="font-mono text-xs tracking-[0.12em] text-fd-muted-foreground uppercase">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-fd-foreground sm:text-3xl">
        {title}
      </h2>
      {text ? <p className="text-base leading-relaxed text-fd-muted-foreground">{text}</p> : null}
      {href && linkText ? (
        <Link
          href={href}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-fd-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:decoration-fd-foreground"
        >
          {linkText}
          <ArrowIcon className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
