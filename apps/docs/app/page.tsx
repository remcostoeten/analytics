import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";
import { Newsreader } from "next/font/google";
import Link from "next/link";
import { Fragment } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { CodeWindow } from "@/components/landing/code-window";
import { DropTrail } from "@/components/landing/drop-trail";
import { ErrorsScene } from "@/components/landing/errors-live";
import { TermTip } from "@/components/landing/term-tip";
import { WordSwap } from "@/components/landing/word-swap";
import { PrivacyScene, ProxyScene } from "@/components/landing/feature-scenes";
import {
  ArrowIcon,
  ArrowUpRightIcon,
  BoxIcon,
  BugIcon,
  ChevronIcon,
  GaugeIcon,
  TerminalIcon,
} from "@/components/landing/icons";
import { InstallCommand } from "@/components/landing/install-command";
import { LiveDashboard } from "@/components/landing/live-dashboard";
import { PipelineScene } from "@/components/landing/pipeline-scene";
import {
  HashIcon,
  NoCookieIcon,
  OwnDatabaseIcon,
  ScoreIcon,
} from "@/components/landing/principle-icons";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { RunningOn } from "@/components/landing/running-on";
import { LandingNav } from "@/components/landing/landing-nav";
import { SqlSection } from "@/components/landing/sql-section";
import { stagger } from "@/components/landing/stagger";
import { InstallVisual, ProxyVisual, ReadVisual } from "@/components/landing/step-visuals";
import { VitalsScene } from "@/components/landing/vitals-live";
import { Logo } from "@/components/logo";
import { apiEndpoint } from "@/lib/api-endpoint";
import { dashboardUrl } from "@/lib/dashboard-url";
import { listExamples } from "@/lib/examples";
import { showcaseProject, showcaseQuery } from "@/lib/showcase";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const quickStart = "/docs/getting-started/quick-start";
const github = "https://github.com/remcostoeten/analytics";

const chips: { icon: Icon; label: string; href: string }[] = [
  { icon: BoxIcon, label: "Track typed events", href: "/docs/guides/custom-events" },
  { icon: GaugeIcon, label: "Measure Web Vitals", href: "/docs/plugins/speed-insights" },
  { icon: BugIcon, label: "Group errors", href: "/docs/plugins/errors" },
  { icon: TerminalIcon, label: "Query with SQL", href: "/query" },
];

const headline: { key: string; node: ReactNode }[] = [
  { key: "monitor", node: "Monitor" },
  { key: "swap", node: <WordSwap words={["analytics", "incidents", "latencies"]} /> },
  ...["without", "relying", "on", "a", "third", "party"].map((word) => ({ key: word, node: word })),
];

const tiles = [
  "tile-a",
  "tile-b",
  "tile-c",
  "tile-d row-span-2",
  "tile-e",
  "tile-f row-span-2",
  "tile-g",
];

const steps = [
  {
    title: "Install the SDK",
    text: (
      <>
        Initialize the{" "}
        <TermTip tip="@spoar/sdk is a small browser package that sends pageviews and events to your ingestion API. It contains no database logic.">
          SDK
        </TermTip>{" "}
        in your project root. This will signal events to the ingestion server which allows you to
        get insights through your database
      </>
    ),
    badge: "npm install @spoar/sdk",
    tone: "tone-lilac",
    visual: <InstallVisual />,
  },
  {
    title: "Mount the proxy",
    text: "One route on your own domain adds the secret key and forwards the batch, so the browser never talks to a third party.",
    badge: "One route",
    tone: "tone-butter",
    visual: <ProxyVisual />,
  },
  {
    title: "Read your data",
    text: "Typed reads through @spoar/client, the dashboard, or one read-only SELECT with an API token.",
    badge: "Client, API or SQL",
    tone: "tone-rose",
    visual: <ReadVisual />,
  },
];

const specs: { value: string; label: string }[] = [
  { value: "5 KB", label: "SDK core, gzipped" },
  { value: "1.5 KB", label: "React entry" },
  { value: "0.6 KB", label: "Each plugin" },
  { value: "20 / 5 s", label: "Events or seconds per batch" },
  { value: "60 KB", label: "Body limit at the proxy and API" },
];

const stops: { title: string; text: string; href: string; linkText: string; visual: ReactNode }[] =
  [
    {
      title: "On your domain",
      text: "A request to /_ra on your own origin matches no filter list. The proxy adds the secret key and the forwarded IP, refuses bodies over 60 KB, and passes nothing else along.",
      href: "/docs/guides/proxy",
      linkText: "Set up the proxy",
      visual: <ProxyScene />,
    },
    {
      title: "Hashed, then dropped",
      text: "The IP is hashed with a salt that rotates every UTC day, used for the rate limit and one bot signal, then dropped. It is never stored.",
      href: "/docs/edge-cases/sessions-and-visitors",
      linkText: "Visitors and sessions",
      visual: <PrivacyScene />,
    },
  ];

const live: {
  title: string;
  lead: string;
  text: string;
  href: string;
  linkText: string;
  visual: ReactNode;
}[] = [
  {
    title: "Web Vitals",
    lead: "Scored per route, credited to the right page",
    text: "LCP, INP, CLS, TTFB and FCP are measured per route, so a single-page app credits each value to the page that produced it. Each p75 is scored on a log-normal curve into one score from 0 to 100.",
    href: "/docs/plugins/speed-insights",
    linkText: "Speed insights",
    visual: <VitalsScene endpoint={apiEndpoint()} project={showcaseProject()} />,
  },
  {
    title: "Errors",
    lead: "Issues grouped across deploys",
    text: "The errors plugin captures uncaught errors and rejections with their stack frames. Fingerprints stay stable across deploys, and events scored as bots never open an issue.",
    href: "/docs/plugins/errors",
    linkText: "Errors plugin",
    visual: <ErrorsScene endpoint={apiEndpoint()} project={showcaseProject()} />,
  },
];

const principles: { icon: Icon; title: string; text: string }[] = [
  {
    icon: NoCookieIcon,
    title: "No visitor cookies",
    text: "Visitor ids live in localStorage, not cookies.",
  },
  {
    icon: HashIcon,
    title: "No raw IP addresses",
    text: "Hashed with a daily salt, then dropped.",
  },
  {
    icon: OwnDatabaseIcon,
    title: "Your database",
    text: "Events stay in a Postgres you run.",
  },
  {
    icon: ScoreIcon,
    title: "Bot scoring",
    text: "Every event gets one score from several signals.",
  },
];

const questions = [
  {
    question: "What is Spoar?",
    answer:
      "Web analytics you host yourself: a typed SDK for the browser and the server, one API for ingest, reads and sign-in, and a Postgres database you run.",
  },
  {
    question: "Do I need a consent banner?",
    answer:
      "That depends on your jurisdiction. With consent set to required, the SDK holds events until consent.grant() and replays them. It also honours opt-out, Do Not Track and Global Privacy Control.",
  },
  {
    question: "Which frameworks does it support?",
    answer:
      "Next.js, React, Vue, Svelte, Astro and plain TypeScript in the browser. The /server entry tracks from Node, Bun, Deno and Workers, and any language can post to the API over HTTP.",
  },
  {
    question: "How do I keep my own visits out of the reports?",
    answer:
      "Events sent through the proxy while you are signed in to the dashboard are stored as internal and left out of reports. Opening a page with ?ra=ignore stops that browser from sending, and events from localhost and preview deployments are marked too.",
  },
  {
    question: "Can I query the raw data?",
    answer:
      "Yes. The SQL route runs one read-only SELECT against the console views with an API token, from the dashboard, the query page on this site or your own code.",
  },
  {
    question: "How do I host it?",
    answer:
      "Run the setup script against an empty Postgres database such as Neon to migrate, add your GitHub login and create the first project. Then deploy the API to any host that runs Bun 1.3 or later.",
  },
];

async function readSnippet() {
  "use cache";
  cacheLife("max");
  return readFile(join(process.cwd(), "content/snippets/analytics.ts.txt"), "utf8");
}

function footerLinks() {
  const links = [
    { label: "Documentation", href: "/docs" },
    { label: "SDK reference", href: "/docs/sdk/install" },
    { label: "API reference", href: "/docs/reference" },
    { label: "Query", href: "/query" },
    { label: "Changelog", href: "/changelog" },
  ];
  if (listExamples().length > 0) links.push({ label: "Examples", href: "/examples" });
  links.push({ label: "Dashboard", href: dashboardUrl() }, { label: "GitHub", href: github });
  return links;
}

export default async function HomePage() {
  const example = await readSnippet();
  return (
    <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
      <RevealObserver />
      <LandingNav loginHref={dashboardUrl("/sign-in")} />

      <header className="hero-wash relative isolate flex overflow-x-clip flex-col items-center px-4 pt-32 text-center sm:pt-40">
        <span aria-hidden="true" className="hero-blob hero-blob-a" />
        <span aria-hidden="true" className="hero-blob hero-blob-b" />
        <h1 className="font-serif max-w-5xl text-[2.6rem] leading-[1.04] font-light tracking-[-0.02em] text-balance text-fg sm:text-[3.6rem] lg:text-[4.4rem]">
          {headline.map((word, index) => (
            <Fragment key={word.key}>
              <span style={stagger(index)} className="hero-word">
                {word.node}
              </span>{" "}
            </Fragment>
          ))}
        </h1>
        <p
          style={stagger(1)}
          className="hero-rise mt-6 max-w-lg font-serif text-[1.05rem] leading-relaxed text-muted"
        >
          A typed SDK, one API for ingest and reads, and a database you run. No cookies for
          visitors, and raw IP addresses are never stored.
        </p>
        <div style={stagger(2)} className="hero-rise mt-10 flex flex-col items-center gap-3">
          <Link href={quickStart} className="cta-glow group">
            <span className="pl-5 font-serif text-[1.02rem]">Start with the quick start</span>
            <span className="cta-arrow flex size-10 items-center justify-center rounded-full bg-surface text-fg">
              <ArrowUpRightIcon className="size-4" />
            </span>
          </Link>
          <span className="font-serif text-[0.9rem] text-muted">
            or <InstallCommand command="npm install @spoar/sdk" />
          </span>
        </div>
        <ul className="mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
          {chips.map((chip, index) => (
            <li key={chip.label} style={stagger(3 + index)} className="hero-rise">
              <Link href={chip.href} className="chip">
                <chip.icon className="size-3.5 text-muted" />
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mosaic grain-host relative mt-14 w-full max-w-[1040px] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-[2fr_1fr_2fr] grid-rows-[56px_1fr_1fr] gap-1.5"
          >
            {tiles.map((tile, index) => (
              <span key={tile} style={stagger(index)} className={tile} />
            ))}
          </div>
          <div className="relative z-10 mx-auto h-[300px] max-w-[860px] px-3 pt-10 sm:h-[440px] sm:px-8 sm:pt-14">
            <LiveDashboard />
          </div>
        </div>
        <p
          style={stagger(8)}
          className="hero-rise mt-6 max-w-lg font-serif text-[0.9rem] text-muted"
        >
          These are this site&apos;s own numbers, read from the public API with @spoar/client.{" "}
          <a
            href={`${apiEndpoint()}/v2/projects/${encodeURIComponent(showcaseProject())}/stats?${await showcaseQuery()}`}
            rel="noreferrer"
            className="link-line text-fg"
          >
            The same stats as JSON
          </a>
          , or{" "}
          <a
            href={dashboardUrl(`/projects/${encodeURIComponent(showcaseProject())}`)}
            rel="noreferrer"
            className="link-line text-fg"
          >
            the project in the dashboard
          </a>
        </p>
      </header>

      <RunningOn />

      <section className="container-land py-14 sm:py-20">
        <div className="reveal max-w-md">
          <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
            Spoar in <em className="accent-text">three steps</em>
          </h2>
          <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
            One project, two keys, one route. From an empty app to the first stored event.
          </p>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-[auto_auto]">
          {steps.map((step, index) => (
            <li
              key={step.title}
              style={stagger(index)}
              className="reveal flex flex-col gap-4 md:row-span-2 md:grid md:grid-rows-subgrid"
            >
              <div className="px-1">
                <h3 className="font-serif text-[1.3rem] font-normal">{step.title}</h3>
                <p className="mt-2 font-serif text-[0.92rem] leading-relaxed text-muted">
                  {step.text}
                </p>
              </div>
              <div
                className={`step-card ${step.tone} group/step relative flex h-60 items-center justify-center rounded-2xl p-6`}
              >
                <span className="absolute top-3 left-3 rounded-full bg-surface/70 px-2.5 py-1 font-mono text-[0.62rem] text-fg">
                  {step.badge}
                </span>
                {step.visual}
              </div>
            </li>
          ))}
        </ol>
        <div className="reveal mt-16 flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-baseline">
          <p className="font-mono text-[0.72rem] tracking-wide text-muted uppercase">
            Step one in full
          </p>
          <p className="font-serif text-[0.95rem] text-muted">
            Create the client, add the plugins you want, and call track with typed props.{" "}
            <Link href="/docs/sdk/install" className="link-line text-fg">
              SDK reference
            </Link>
          </p>
        </div>
        <div className="reveal-scale visual-frame mt-4 rounded-2xl p-3 sm:p-8">
          <CodeWindow title="lib/analytics.ts" lang="ts" code={example} mark={[11]} />
        </div>
        <dl className="reveal mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-dashed border-fg/15 py-8 sm:grid-cols-5">
          {specs.map((spec, index) => (
            <div key={spec.label} style={stagger(index)} className="flex flex-col gap-1">
              <dd className="font-serif text-[1.7rem] leading-none font-light tracking-[-0.01em] text-fg">
                {spec.value}
              </dd>
              <dt className="font-serif text-[0.85rem] text-muted">{spec.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-land py-10">
        <div className="feature-shell rounded-[28px] border border-line px-5 py-14 sm:px-10 sm:py-20">
          <div className="reveal mx-auto max-w-xl text-center">
            <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[3rem]">
              The path of an event
            </h2>
            <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
              From the browser to a row in four hops, on your own domain, with the IP gone before
              the row is written.
            </p>
          </div>
          <article className="mt-16 grid grid-cols-1 items-center gap-10 sm:mt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14 [&>*]:min-w-0">
            <div className="reveal flex flex-col">
              <h3 className="font-serif text-[2.1rem] leading-[1.1] font-light tracking-[-0.01em] sm:text-[2.5rem]">
                Four hops
              </h3>
              <p className="mt-4 font-serif text-[0.95rem] leading-relaxed text-muted">
                The SDK batches events and sends them with fetch, or sendBeacon when the page hides.
                A batch goes out at 20 events or every 5 seconds, with retries after 1, 4 and 16
                seconds.
              </p>
              <p className="mt-4 font-serif text-[0.95rem] leading-relaxed text-muted">
                The API checks the key and origin, scores bots, enriches with geo, device and
                channel, and writes the row to Postgres.
              </p>
              <Link
                href="/docs/getting-started/how-it-works"
                className="link-line mt-6 w-fit font-serif text-[0.95rem] text-fg"
              >
                How it works
              </Link>
            </div>
            <div className="reveal-scale">
              <PipelineScene />
            </div>
          </article>
          <div className="mt-20 grid gap-10 sm:mt-24 lg:grid-cols-2 lg:gap-12 [&>*]:min-w-0">
            {stops.map((stop, index) => (
              <article
                key={stop.title}
                style={stagger(index)}
                className="reveal-scale flex flex-col"
              >
                {stop.visual}
                <h3 className="mt-6 font-serif text-[1.4rem] font-normal">{stop.title}</h3>
                <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-muted">
                  {stop.text}
                </p>
                <Link
                  href={stop.href}
                  className="link-line mt-4 w-fit font-serif text-[0.95rem] text-fg"
                >
                  {stop.linkText}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-land py-14 sm:py-20">
        <div className="reveal flex flex-col gap-2 px-1">
          <p className="font-mono text-[0.72rem] tracking-wide text-muted uppercase">Live</p>
          <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
            Measured on this page
          </h2>
          <p className="mt-2 max-w-lg font-serif text-[1rem] leading-relaxed text-muted">
            Both plugins run on this site. The first card reads your own vitals as you scroll, the
            second throws one error in this tab when you ask and waits for the API to group it.
          </p>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12 [&>*]:min-w-0">
          {live.map((item, index) => (
            <article key={item.title} style={stagger(index)} className="reveal-scale flex flex-col">
              {item.visual}
              <h3 className="mt-6 font-serif text-[1.4rem] font-normal">{item.title}</h3>
              <p className="mt-1 font-serif text-[1rem] font-medium">{item.lead}</p>
              <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-muted">
                {item.text}
              </p>
              <Link
                href={item.href}
                className="link-line mt-4 w-fit font-serif text-[0.95rem] text-fg"
              >
                {item.linkText}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SqlSection />

      <section className="container-land py-10">
        <div className="reveal border-y border-line py-12">
          <p className="font-mono text-[0.72rem] tracking-wide text-muted uppercase">
            Private by design, not by setting
          </p>
          <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item, index) => (
              <li
                key={item.title}
                className="principle reveal flex flex-col gap-3"
                style={stagger(index)}
              >
                <item.icon className="size-6 text-fg/80" />
                <h3 className="font-serif text-[1.1rem] text-fg">{item.title}</h3>
                <p className="font-serif text-[0.9rem] leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-land grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="reveal">
          <h2 className="font-serif text-[2.3rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.6rem]">
            Frequently asked questions
          </h2>
          <p className="mt-4 font-serif text-[0.95rem] text-muted">
            Still have a question?{" "}
            <a href={`${github}/issues`} className="link-line text-fg">
              Open an issue
            </a>
          </p>
        </div>
        <div className="flex flex-col">
          {questions.map((item, index) => (
            <details
              key={item.question}
              style={stagger(index)}
              className="faq reveal group border-b border-line"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-serif text-[1rem] text-fg">
                {item.question}
                <ChevronIcon className="faq-chevron size-4 shrink-0 text-muted" />
              </summary>
              <p className="pb-5 font-serif text-[0.95rem] leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="footer-wash relative mt-auto overflow-hidden px-4 pt-16 pb-10">
        <div className="container-land relative z-10">
          <div className="dark-shell flex flex-col items-center gap-5 rounded-[24px] px-6 pt-4 pb-12 text-center">
            <DropTrail />
            <h2 className="font-serif text-[2.1rem] leading-[1.1] font-light text-[#f6efe9] sm:text-[2.5rem]">
              Own <em className="dark-accent">your analytics</em>
            </h2>
            <p className="max-w-sm font-serif text-[0.95rem] text-[#f6efe9]/65">
              A typed SDK, one API and a Postgres you run.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={quickStart} className="pill-light">
                Quick start
                <ArrowIcon className="size-3.5" />
              </Link>
              <Link href="/docs" className="pill-outline">
                Read the docs
              </Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
              <Logo className="size-7" />
              Spoar
            </Link>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-serif text-[0.9rem] text-fg/75">
              {footerLinks().map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-line">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-10 text-center font-serif text-[0.8rem] text-fg/60 md:text-left">
            Spoar is built by Remco Stoeten.
          </p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full"
        >
          <path
            d="M0 180 C 200 120 380 200 560 150 S 920 90 1100 150 S 1340 190 1440 140 V320 H0Z"
            fill="var(--wave-1)"
            className="footer-wave-1"
            opacity="0.55"
          />
          <path
            d="M0 230 C 240 180 420 250 640 210 S 1000 160 1200 220 S 1380 240 1440 210 V320 H0Z"
            fill="var(--wave-2)"
            className="footer-wave-2"
            opacity="0.6"
          />
          <path
            d="M0 280 C 260 240 520 300 760 265 S 1160 235 1440 275 V320 H0Z"
            fill="var(--wave-3)"
            className="footer-wave-3"
            opacity="0.7"
          />
        </svg>
      </footer>
    </div>
  );
}
