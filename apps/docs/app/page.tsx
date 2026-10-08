import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";
import { Newsreader } from "next/font/google";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { CodeWindow } from "@/components/landing/code-window";
import { DashboardMock } from "@/components/landing/dashboard-mock";
import { DropTrail } from "@/components/landing/drop-trail";
import { HeroDrop } from "@/components/landing/hero-drop";
import {
  ErrorsScene,
  PipelineScene,
  PrivacyScene,
  ProxyScene,
  VitalsScene,
} from "@/components/landing/feature-scenes";
import {
  ArrowIcon,
  ArrowUpRightIcon,
  BoxIcon,
  BugIcon,
  ChevronIcon,
  ClockIcon,
  DatabaseIcon,
  EyeOffIcon,
  GaugeIcon,
  KeyIcon,
  RouteIcon,
  ShieldIcon,
  TerminalIcon,
} from "@/components/landing/icons";
import { InstallCommand } from "@/components/landing/install-command";
import { SiteNav } from "@/components/landing/site-nav";
import { InstallVisual, ProxyVisual, ReadVisual } from "@/components/landing/step-visuals";
import { Logo } from "@/components/logo";
import { listExamples } from "@/lib/examples";

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

const tiles = [
  "tile-a",
  "tile-b",
  "tile-c",
  "tile-d row-span-2",
  "tile-e",
  "tile-f row-span-2",
  "tile-g",
];

const stacks = ["Next.js", "React", "Astro", "Svelte", "Node", "Bun", "Deno", "Workers"];

const steps = [
  {
    title: "Install the SDK",
    text: "Create the client in one file. The browser core has no framework dependency; React and Next entries add a provider on top.",
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

const features: {
  title: string;
  lead: string;
  body: string[];
  note: string;
  noteIcon: Icon;
  href: string;
  linkText: string;
  visual: ReactNode;
}[] = [
  {
    title: "Ingest pipeline",
    lead: "From the browser to a row in four hops",
    body: [
      "The SDK batches events and sends them with fetch, or sendBeacon when the page hides.",
      "The API checks the key and origin, scores bots, enriches with geo, device and channel, and writes the row to Postgres.",
    ],
    note: "A batch goes out at 20 events or every 5 seconds, with retries after 1, 4 and 16 seconds.",
    noteIcon: ClockIcon,
    href: "/docs/getting-started/how-it-works",
    linkText: "How it works",
    visual: <PipelineScene />,
  },
  {
    title: "First-party proxy",
    lead: "Events travel on your domain",
    body: [
      "Filter lists block known tracker hosts and paths. A request to /_ra on your own origin matches none of them.",
      "The proxy adds the secret key and the forwarded IP, refuses bodies over 60 KB, and passes nothing else along.",
    ],
    note: "createProxy returns a fetch handler for Next, Hono, Elysia, Astro or a Worker.",
    noteIcon: RouteIcon,
    href: "/docs/guides/proxy",
    linkText: "Set up the proxy",
    visual: <ProxyScene />,
  },
  {
    title: "Privacy by default",
    lead: "Hashed today, gone tomorrow",
    body: [
      "The IP is hashed with a salt that rotates every UTC day, used for the rate limit and one bot signal, then dropped.",
      "Visitors are a random id in localStorage and sessions a random id in sessionStorage. No cookies are set.",
    ],
    note: "The only cookie on the whole system is the admin session.",
    noteIcon: EyeOffIcon,
    href: "/docs/edge-cases/sessions-and-visitors",
    linkText: "Visitors and sessions",
    visual: <PrivacyScene />,
  },
  {
    title: "Web Vitals",
    lead: "Scored per route, credited to the right page",
    body: [
      "LCP, INP, CLS, TTFB and FCP are measured per route, so a single-page app credits each value to the page that produced it.",
      "Each p75 is scored on a log-normal curve and combined into a Real Experience Score from 0 to 100.",
    ],
    note: "The speedInsights plugin adds it to the client in one line.",
    noteIcon: GaugeIcon,
    href: "/docs/plugins/speed-insights",
    linkText: "Speed insights",
    visual: <VitalsScene />,
  },
  {
    title: "Error tracking",
    lead: "Issues grouped across deploys",
    body: [
      "The errors plugin captures uncaught errors and rejections with their stack frames, query strings kept.",
      "Fingerprints stay stable across deploys, and events scored as bots never open an issue.",
    ],
    note: "The API captures its own unexpected errors with the same pipeline.",
    noteIcon: BugIcon,
    href: "/docs/plugins/errors",
    linkText: "Errors plugin",
    visual: <ErrorsScene />,
  },
];

const principles: { icon: Icon; title: string; text: string }[] = [
  {
    icon: EyeOffIcon,
    title: "No visitor cookies",
    text: "Visitors and sessions live in localStorage and sessionStorage. Nothing to put in a cookie banner.",
  },
  {
    icon: KeyIcon,
    title: "No raw IP addresses",
    text: "Hashed with a salt that rotates every UTC day, then dropped. Visitor counts never use it.",
  },
  {
    icon: DatabaseIcon,
    title: "Your database",
    text: "Events land in a Postgres you run, on Neon or your own server. Nothing is sent anywhere else.",
  },
  {
    icon: ShieldIcon,
    title: "Bot scoring",
    text: "User agent, headless and no-input signals combine into one score per event.",
  },
];

const facts = [
  { value: "< 5 KB", label: "browser core, gzipped" },
  { value: "0", label: "cookies for visitors" },
  { value: "1", label: "API for ingest and reads" },
  { value: "60 KB", label: "largest batch accepted" },
];

const questions = [
  {
    question: "What is Spoar?",
    answer:
      "Web analytics you host yourself: a typed SDK for the browser and the server, one API for ingest, reads and sign-in, and a Postgres database you run.",
  },
  {
    question: "Does it set cookies or need a consent banner?",
    answer:
      "It sets no cookies for visitors. A visitor is a random id in localStorage and a session a random id in sessionStorage. Whether you need consent depends on your jurisdiction; the SDK has consent and opt-out controls for when you do.",
  },
  {
    question: "Do ad blockers stop it?",
    answer:
      "The SDK is bundled from npm, so there is no script to block. With the proxy, events go to /_ra on your own domain, a path filter lists have no rule for.",
  },
  {
    question: "Which frameworks does it support?",
    answer:
      "Next.js, React, Astro, Svelte and plain JavaScript in the browser. The /server entry tracks from Node, Bun, Deno and Workers, and any language can post to the API over HTTP.",
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

function navLinks() {
  const links = [
    { label: "Documentation", href: "/docs" },
    { label: "SDK reference", href: "/docs/sdk/install" },
    { label: "API reference", href: "/docs/reference" },
    { label: "Query", href: "/query" },
  ];
  if (listExamples().length > 0) links.push({ label: "Examples", href: "/examples" });
  links.push({ label: "GitHub", href: github });
  return links;
}

export default async function HomePage() {
  const example = await readSnippet();
  return (
    <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
      <SiteNav links={navLinks()} />

      <header className="hero-wash relative isolate flex overflow-x-clip flex-col items-center px-4 pt-32 text-center sm:pt-40">
        <span aria-hidden="true" className="hero-blob hero-blob-a" />
        <span aria-hidden="true" className="hero-blob hero-blob-b" />
        <HeroDrop />
        <h1 className="hero-rise font-serif max-w-4xl text-[3rem] leading-[1.02] font-light tracking-[-0.02em] text-fg sm:text-[4.6rem] lg:text-[5.5rem]">
          Web analytics on your own Postgres
        </h1>
        <p className="hero-rise-late mt-6 max-w-lg font-serif text-[1.05rem] leading-relaxed text-muted">
          A typed SDK, one API for ingest and reads, and a database you run. No cookies for
          visitors, and raw IP addresses are never stored.
        </p>
        <div className="hero-rise-late mt-10 flex flex-col items-center gap-3">
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
        <ul className="hero-rise-late mt-12 flex max-w-2xl flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link href={chip.href} className="chip">
                <chip.icon className="size-3.5 text-muted" />
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mosaic grain-host relative mt-14 w-full max-w-[1120px] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-[2fr_1fr_2fr] grid-rows-[56px_1fr_1fr] gap-1.5"
          >
            {tiles.map((tile) => (
              <span key={tile} className={tile} />
            ))}
          </div>
          <div className="relative z-10 mx-auto h-[300px] max-w-[860px] px-3 pt-10 sm:h-[440px] sm:px-8 sm:pt-14">
            <DashboardMock />
          </div>
        </div>
      </header>

      <section className="px-4 py-14 sm:py-20">
        <p className="text-center font-serif text-[0.95rem] text-muted">
          Runs wherever your site runs
        </p>
        <ul className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {stacks.map((stack) => (
            <li key={stack} className="text-[1.35rem] font-semibold tracking-[-0.03em] text-fg/55">
              {stack}
            </li>
          ))}
        </ul>
      </section>

      <section className="container-land py-14 sm:py-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-md">
            <h2 className="reveal font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
              Spoar in three steps
            </h2>
            <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
              One project, two keys, one route. From an empty app to the first stored event.
            </p>
          </div>
          <Link href={quickStart} className="pill-dark w-fit px-5! py-2.5!">
            Open the quick start
          </Link>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-[auto_auto]">
          {steps.map((step) => (
            <li
              key={step.title}
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
      </section>

      <section className="container-land py-10">
        <div className="feature-shell rounded-[28px] border border-line px-5 py-14 sm:px-10 sm:py-20">
          <h2 className="reveal text-center font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[3rem]">
            What Spoar records, and how
          </h2>
          <div className="mt-16 flex flex-col gap-24 sm:mt-20 sm:gap-32">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 [&>*]:min-w-0"
              >
                <div className="reveal flex flex-col">
                  <h3 className="font-serif text-[2.1rem] leading-[1.1] font-light tracking-[-0.01em] sm:text-[2.5rem]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 font-serif text-[1.15rem] font-medium">{feature.lead}</p>
                  {feature.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-4 font-serif text-[0.95rem] leading-relaxed text-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <div className="mt-6 flex items-center gap-3 border-y border-dashed border-fg/15 py-4">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--lilac)] text-[#6b46c1]">
                      <feature.noteIcon className="size-3.5" />
                    </span>
                    <span className="font-serif text-[0.9rem] text-fg">{feature.note}</span>
                  </div>
                  <Link href={feature.href} className="pill-dark mt-6 w-fit px-4! py-2!">
                    {feature.linkText}
                  </Link>
                </div>
                <div className="reveal-scale">{feature.visual}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-land py-14 sm:py-20">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-md">
            <h2 className="reveal font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
              One file to set it up
            </h2>
            <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
              Create the client, add the plugins you want, and call track with typed props.
            </p>
          </div>
          <Link href="/docs/sdk/install" className="pill-dark w-fit px-5! py-2.5!">
            SDK reference
          </Link>
        </div>
        <div className="reveal-scale visual-frame mt-10 rounded-2xl p-3 sm:p-8">
          <CodeWindow title="lib/analytics.ts" lang="ts" code={example} mark={[11]} />
        </div>
      </section>

      <section className="container-land py-10">
        <div className="reveal-scale dark-shell grain-host relative overflow-hidden rounded-[28px] px-6 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="mx-auto max-w-lg font-serif text-[2.3rem] leading-[1.15] font-light tracking-[-0.015em] text-[#f6efe9] sm:text-[2.8rem]">
            Private <em className="dark-accent">by design</em>, not by setting
          </h2>
          <ul className="mt-14 grid gap-10 text-left sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item) => (
              <li key={item.title} className="flex flex-col gap-3">
                <item.icon className="size-5 text-[#f6efe9]/80" />
                <h3 className="font-serif text-[1.1rem] text-[#f6efe9]">{item.title}</h3>
                <p className="font-serif text-[0.9rem] leading-relaxed text-[#f6efe9]/60">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-14 border-t border-dashed border-white/15 pt-12">
            <ul className="flex flex-wrap justify-center gap-4">
              {facts.map((fact) => (
                <li key={fact.label} className="fact-coin">
                  <span className="font-mono text-[0.95rem] font-medium text-white">
                    {fact.value}
                  </span>
                  <span className="max-w-[72px] text-[0.55rem] leading-tight text-white/60">
                    {fact.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-land grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="reveal font-serif text-[2.3rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.6rem]">
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
          {questions.map((item) => (
            <details key={item.question} className="faq group border-b border-line">
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
              Own your analytics
            </h2>
            <p className="max-w-sm font-serif text-[0.95rem] text-[#f6efe9]/65">
              From an empty app to the first stored event in the quick start.
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
              {navLinks().map((link) => (
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
            fill="#f6c9d8"
            opacity="0.55"
          />
          <path
            d="M0 230 C 240 180 420 250 640 210 S 1000 160 1200 220 S 1380 240 1440 210 V320 H0Z"
            fill="#e6b9e2"
            opacity="0.6"
          />
          <path
            d="M0 280 C 260 240 520 300 760 265 S 1160 235 1440 275 V320 H0Z"
            fill="#d7aee0"
            opacity="0.7"
          />
        </svg>
      </footer>
    </div>
  );
}
