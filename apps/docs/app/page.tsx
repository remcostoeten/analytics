import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { HomeLayout } from "fumadocs-ui/layouts/home";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { ReactNode } from "react";

import { CodeWindow } from "@/components/landing/code-window";
import { outlineButton } from "@/components/landing/control";
import { PipelineDiagram, PrivacyDiagram, ProxyDiagram } from "@/components/landing/diagrams";
import { HeroPanel } from "@/components/landing/hero-panel";
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

const stats = [
  { value: "< 5 KB", label: "browser core, gzipped" },
  { value: "0", label: "cookies for visitors" },
  { value: "1", label: "API for ingest, reads and sign-in" },
  { value: "60 KB", label: "largest batch the API accepts" },
];

const capabilities = [
  {
    icon: BoxIcon,
    title: "Typed events",
    text: "Declare your event map once and get typed track() calls, with props kept inside the limits.",
    href: "/docs/guides/custom-events",
  },
  {
    icon: GaugeIcon,
    title: "Core Web Vitals",
    text: "LCP, INP, CLS, TTFB and FCP per route, credited to the page that was measured.",
    href: "/docs/plugins/speed-insights",
  },
  {
    icon: BugIcon,
    title: "Error tracking",
    text: "Stack frames with query strings kept, stable fingerprints across deploys, no issues from bots.",
    href: "/docs/plugins/errors",
  },
  {
    icon: ShieldIcon,
    title: "Bot scoring",
    text: "User agent, headless and no-input signals combined into one score per event.",
    href: "/docs/edge-cases/bots",
  },
  {
    icon: TerminalIcon,
    title: "Read-only SQL",
    text: "One SELECT against the console views with an API token, from the dashboard or this site.",
    href: "/docs/api/sql",
  },
  {
    icon: RouteIcon,
    title: "Server-side tracking",
    text: "The /server entry sends from route handlers, actions and workers with the secret key.",
    href: "/docs/guides/server-side-tracking",
  },
];

const stacks = [
  { name: "Next.js", href: "/docs/frameworks/nextjs" },
  { name: "React", href: "/docs/frameworks/react" },
  { name: "Vanilla", href: "/docs/frameworks/vanilla" },
  { name: "Node, Bun, Deno", href: "/docs/frameworks/server" },
  { name: "Workers", href: "/docs/frameworks/server" },
  { name: "Any language", href: "/docs/frameworks/server#other-languages" },
];

async function readSnippet() {
  "use cache";
  cacheLife("max");
  return readFile(join(process.cwd(), "content/snippets/analytics.ts.txt"), "utf8");
}

export default async function HomePage() {
  const example = await readSnippet();
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <section className="grid gap-10 py-14! lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20!">
          <div className="flex flex-col gap-6">
            <span className="hero-rise caps text-muted">Spoar, self-hosted web analytics</span>
            <PixelHeading lines={["Web analytics", "on your own Postgres."]} />
            <p className="hero-rise-late max-w-xl text-[1rem] leading-relaxed text-muted">
              A typed SDK, one API for ingest and reads, and a database you run. No cookies for
              visitors. Raw IP addresses are never stored.
            </p>
            <div className="hero-rise-late flex flex-wrap items-center gap-3">
              <Link href="/docs/getting-started/quick-start" className="btn-primary">
                Get started
                <ArrowIcon className="size-3" />
              </Link>
              <Link href="/docs" className={`${outlineButton} caps h-auto px-4 py-2.5`}>
                Read the docs
              </Link>
              <InstallCommand command="npm install @spoar/sdk" />
            </div>
          </div>
          <HeroPanel />
        </section>

        <section className="dot-grid grid grid-cols-2 gap-px bg-line p-0! md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 bg-bg px-6 py-6">
              <span className="font-mono text-2xl font-medium text-fg tabular-nums">
                {stat.value}
              </span>
              <span className="caps text-[0.6rem] text-muted">{stat.label}</span>
            </div>
          ))}
        </section>

        <Feature
          eyebrow="01 / Ingest"
          title="From the browser to a row in four hops"
          text="The SDK batches events and sends them with fetch or sendBeacon. The API checks the key and origin, scores bots, enriches with geo, device and channel, and writes the row. Reads, the dashboard and SQL answer from the same tables."
          href="/docs/getting-started/how-it-works"
          linkText="How it works"
        >
          <PipelineDiagram />
        </Feature>

        <Feature
          eyebrow="02 / Proxy"
          title="Events travel on your domain"
          text="Mount the /_ra route in your app with one line. The browser only ever talks to your origin; the proxy adds the secret key and the forwarded IP, refuses bodies over 60 KB, and passes nothing else along."
          href="/docs/guides/proxy"
          linkText="Set up the proxy"
          reverse
        >
          <ProxyDiagram />
        </Feature>

        <Feature
          eyebrow="03 / Privacy"
          title="Hashed today, gone tomorrow"
          text="The IP is hashed with a salt that rotates every UTC day, used for the rate limit and one bot signal, then dropped. Visitor counts never use it. The only cookie on the whole system is the admin session."
          href="/docs/edge-cases/sessions-and-visitors"
          linkText="Visitors and sessions"
        >
          <PrivacyDiagram />
        </Feature>

        <section className="flex flex-col gap-8">
          <SectionHeading eyebrow="04 / What it records" title="More than pageviews" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="card-wash group flex h-full flex-col gap-4 rounded-[10px] border border-line bg-surface p-5"
                >
                  <item.icon className="size-4 text-muted transition-colors group-hover:text-accent group-focus-visible:text-accent" />
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-[0.95rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
                      {item.title}
                    </h3>
                    <p className="text-[0.8rem] leading-relaxed text-muted">{item.text}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="05 / One file"
            title="Create the client, add the plugins you want"
            text="The browser core has no framework dependency. React and Next entries add a provider and route templates on top."
            href="/docs/sdk/install"
            linkText="SDK reference"
          />
          <CodeWindow title="lib/analytics.ts" lang="ts" code={example} mark={[11]} />
        </section>

        <section className="flex flex-wrap items-center justify-between gap-6">
          <span className="caps text-muted">Runs on</span>
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

        <section className="dot-grid flex flex-col items-center gap-5 py-16! text-center">
          <h2 className="font-pixel text-[2rem] leading-[1.1] text-fg sm:text-[2.6rem]">
            Own your analytics.
          </h2>
          <p className="max-w-md text-[0.9rem] text-muted">
            One project, two keys, one route. From an empty app to the first stored event in the
            quick start.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/getting-started/quick-start" className="btn-primary">
              Quick start
              <ArrowIcon className="size-3" />
            </Link>
            <InstallCommand command="npm install @spoar/sdk" />
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted">
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

type FeatureProps = {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  linkText: string;
  reverse?: boolean;
  children: ReactNode;
};

function Feature({ eyebrow, title, text, href, linkText, reverse, children }: FeatureProps) {
  return (
    <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          text={text}
          href={href}
          linkText={linkText}
        />
      </div>
      <div
        className={`rounded-[10px] border border-dashed border-line p-4 ${reverse ? "lg:order-1" : ""}`}
      >
        {children}
      </div>
    </section>
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
    <div className="flex max-w-xl flex-col gap-3">
      <span className="caps text-muted">{eyebrow}</span>
      <h2 className="text-[1.5rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
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
