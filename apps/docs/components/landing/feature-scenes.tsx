import { Logo } from "@/components/logo";

import { ErrorsVisual, VitalsVisual } from "./feature-visuals";
import {
  CheckIcon,
  CloseIcon,
  DatabaseIcon,
  KeyIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
} from "./icons";
import { Scene, Sticker } from "./scene";

const card =
  "rounded-xl border border-white/70 bg-surface/90 shadow-[0_14px_30px_-16px_rgb(90_40_40/0.45)] backdrop-blur-sm";

const feed = [
  { name: "pageview", detail: "/pricing", meta: "NL · desktop", tone: "text-fg" },
  { name: "signup", detail: "plan=pro", meta: "NL · desktop", tone: "text-accent" },
  { name: "web_vital", detail: "LCP 1.9 s", meta: "/docs", tone: "text-ok" },
  { name: "pageview", detail: "/docs/sdk", meta: "DE · mobile", tone: "text-fg" },
  { name: "error", detail: "TypeError", meta: "/checkout", tone: "text-err" },
  { name: "pageview", detail: "/", meta: "CA · desktop", tone: "text-fg" },
  { name: "click", detail: "cta_hero", meta: "PT · tablet", tone: "text-accent" },
];

type Props = {
  d: string;
  delay?: number;
};

function Connector({ d, delay = 0 }: Props) {
  return (
    <g>
      <path d={d} fill="none" stroke="#c99bd9" strokeWidth="1.2" strokeDasharray="3 4" />
      <circle r="2.6" fill="var(--accent)">
        <animateMotion dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" path={d} />
      </circle>
    </g>
  );
}

export function PipelineScene() {
  return (
    <Scene backdrop="glow" className="flex h-[420px] flex-col">
      <div className="relative flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 400 230"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <Connector d="M70 52 C 120 60 150 90 180 110" />
          <Connector d="M330 48 C 290 60 255 85 225 108" delay={0.9} />
          <Connector d="M80 190 C 120 175 150 150 182 135" delay={1.6} />
          <Connector d="M222 135 C 260 160 290 180 320 190" delay={0.4} />
        </svg>
        <div
          className={`${card} absolute top-1/2 left-1/2 w-[150px] -translate-x-1/2 -translate-y-1/2 p-2.5`}
        >
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[#f3a7a0]" />
            <span className="size-1.5 rounded-full bg-[#f6d48a]" />
            <span className="size-1.5 rounded-full bg-[#a8dcb9]" />
            <span className="ml-1.5 truncate rounded bg-bg px-1.5 font-mono text-[0.52rem] text-muted">
              example.com/pricing
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="tile-glow flex size-7 items-center justify-center rounded-lg">
              <SparkIcon className="size-3.5 text-white" />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="h-1.5 w-full rounded-full bg-fg/10" />
              <span className="h-1.5 w-2/3 rounded-full bg-fg/10" />
            </span>
          </div>
        </div>
        <Sticker className="top-6 left-[6%]" tilt={-6}>
          <div className={`${card} px-2.5 py-1.5`}>
            <div className="font-mono text-[0.58rem] text-muted">pageview</div>
            <div className="text-[0.7rem] font-medium text-fg">/pricing</div>
          </div>
        </Sticker>
        <Sticker className="top-5 right-[5%]" tilt={5} delay={1.2}>
          <div className={`${card} px-2.5 py-1.5 font-mono text-[0.6rem]`}>
            <span className="text-accent">track</span>
            <span className="text-muted">(&quot;signup&quot;, </span>
            <span className="text-fg">{"{ plan }"}</span>
            <span className="text-muted">)</span>
          </div>
        </Sticker>
        <Sticker className="bottom-5 left-[8%]" tilt={4} delay={0.6}>
          <div className="rounded-full bg-[#ffe6a8] px-2.5 py-1 text-[0.62rem] font-medium text-[#7a5310] shadow-[0_10px_20px_-12px_rgb(120_80_20/0.6)]">
            Batch of 20 or every 5 s
          </div>
        </Sticker>
        <Sticker className="right-[7%] bottom-4" tilt={-4} delay={1.8}>
          <div className={`${card} flex items-center gap-2 px-2.5 py-1.5`}>
            <DatabaseIcon className="size-4 text-[#7c5cc4]" />
            <span className="text-[0.66rem] font-medium text-fg">Your Postgres</span>
          </div>
        </Sticker>
      </div>
      <div className="mx-3 mb-3 overflow-hidden rounded-xl bg-[#2b2624] text-[#f3ece8] shadow-[0_18px_36px_-18px_rgb(40_20_10/0.7)] sm:mx-5 sm:mb-5">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="flex items-center gap-2 text-[0.65rem]">
            <span className="animate-live size-1.5 rounded-full bg-accent" />
            Incoming events
          </span>
          <span className="font-mono text-[0.58rem] text-white/45">POST /v2/events</span>
        </div>
        <div className="feed-mask h-[104px] overflow-hidden">
          <ul className="feed-scroll">
            {[...feed, ...feed].map((event, index) => (
              <li
                key={`${event.name}-${event.detail}-${index}`}
                className="grid grid-cols-[72px_1fr_auto] gap-3 px-3 py-1.5 font-mono text-[0.6rem]"
              >
                <span className={event.tone === "text-fg" ? "text-white/85" : event.tone}>
                  {event.name}
                </span>
                <span className="truncate text-white/70">{event.detail}</span>
                <span className="text-white/40">{event.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Scene>
  );
}

export function ProxyScene() {
  return (
    <Scene
      backdrop="hills"
      className="flex h-[420px] flex-col items-center justify-center gap-5 px-4"
    >
      <div className="flex items-stretch gap-3">
        <div
          className={`${card} sticker-hover flex w-[148px] flex-col items-center gap-2 p-3 sm:w-[170px] sm:p-4 text-center`}
        >
          <span className="tile-glow flex size-11 items-center justify-center rounded-full">
            <RouteIcon className="size-5 text-white" />
          </span>
          <span className="font-mono text-[0.7rem] font-medium text-fg">
            yoursite.com<span className="text-accent">/_ra</span>
          </span>
          <span className="text-[0.62rem] leading-snug text-muted">
            First-party request on your own origin
          </span>
          <span className="mt-1 flex items-center gap-1 rounded-full bg-ok/12 px-2 py-0.5 text-[0.6rem] font-medium text-ok">
            <CheckIcon className="size-3" />
            Delivered
          </span>
        </div>
        <div
          className={`${card} flex w-[148px] translate-y-3 flex-col items-center gap-2 p-3 sm:w-[170px] sm:p-4 text-center opacity-75 grayscale-[0.4]`}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-fg/8">
            <CloseIcon className="size-5 text-muted" />
          </span>
          <span className="font-mono text-[0.7rem] text-muted line-through decoration-err/60">
            tracker.io/collect
          </span>
          <span className="text-[0.62rem] leading-snug text-muted">
            Third-party host on a filter list
          </span>
          <span className="mt-1 rounded-full bg-err/10 px-2 py-0.5 text-[0.6rem] font-medium text-err">
            Blocked
          </span>
        </div>
      </div>
      <Sticker className="top-6 left-[8%]" tilt={-5} delay={0.8}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.6rem] text-muted`}>
          + secret key
        </div>
      </Sticker>
      <Sticker className="top-10 right-[8%]" tilt={6} delay={1.6}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.6rem] text-muted`}>max 60 KB</div>
      </Sticker>
      <div
        className={`${card} relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.7rem] font-medium text-[#6b46c1]`}
      >
        <ShieldIcon className="size-3.5" />
        Same origin, no CNAME to uncloak
      </div>
    </Scene>
  );
}

export function PrivacyScene() {
  return (
    <Scene backdrop="glow" className="flex h-[420px] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className={`${card} ip-fade px-3 py-2 font-mono text-[0.7rem] text-fg`}>
          <span className="text-muted">ip </span>203.0.113.42
        </div>
        <svg aria-hidden="true" viewBox="0 0 20 44" className="h-11 w-5">
          <path d="M10 0 V44" stroke="#c99bd9" strokeDasharray="3 4" />
          <circle r="2.6" cx="10" fill="var(--accent)">
            <animate attributeName="cy" from="0" to="44" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className={`${card} flex w-[230px] flex-col gap-2 p-3.5`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[0.66rem] font-medium text-fg">
              <KeyIcon className="size-3.5 text-[#7c5cc4]" />
              hash(ip + daily salt)
            </span>
            <span className="rounded-full bg-[var(--lilac)] px-1.5 py-0.5 font-mono text-[0.52rem] text-[#6b46c1]">
              sha-256
            </span>
          </div>
          <div className="rounded-md bg-bg px-2 py-1.5 font-mono text-[0.62rem] tracking-tight text-fg">
            9f2c41b7e0d3…a81e
          </div>
          <div className="flex gap-1 text-[0.55rem] whitespace-nowrap text-muted">
            <span className="rounded-full bg-fg/5 px-1.5 py-0.5">rate limit</span>
            <span className="rounded-full bg-fg/5 px-1.5 py-0.5">one bot signal</span>
            <span className="rounded-full bg-fg/5 px-1.5 py-0.5">then dropped</span>
          </div>
        </div>
      </div>
      <Sticker className="top-8 left-[7%]" tilt={-7} delay={0.4}>
        <div className={`${card} w-[72px] overflow-hidden text-center`}>
          <div className="bg-[#c4a4ef] py-0.5 text-[0.5rem] font-medium tracking-wide text-white uppercase">
            Salt
          </div>
          <div className="py-1 font-mono text-[0.95rem] font-medium text-fg">00:00</div>
          <div className="pb-1 text-[0.5rem] text-muted">rotates UTC</div>
        </div>
      </Sticker>
      <Sticker className="top-10 right-[7%]" tilt={6} delay={1.4}>
        <div className={`${card} flex items-center gap-1.5 px-2.5 py-1.5`}>
          <span className="flex size-5 items-center justify-center rounded-full bg-[#ffe6a8] text-[0.6rem]">
            0
          </span>
          <span className="text-[0.64rem] font-medium text-fg">visitor cookies</span>
        </div>
      </Sticker>
      <Sticker className="bottom-8 left-[9%]" tilt={4} delay={1}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.58rem] text-muted`}>
          visitor id · localStorage
        </div>
      </Sticker>
      <Sticker className="right-[8%] bottom-10" tilt={-5} delay={2}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.58rem] text-muted`}>
          session · 30 min idle
        </div>
      </Sticker>
    </Scene>
  );
}

export function VitalsScene() {
  return (
    <Scene backdrop="hills" className="flex h-[420px] items-center justify-center px-4">
      <div className="sticker-hover w-full max-w-[320px]">
        <VitalsVisual />
      </div>
      <Sticker className="top-6 left-[6%]" tilt={-6} delay={0.5}>
        <div className={`${card} flex items-center gap-1.5 px-2.5 py-1.5`}>
          <span className="size-1.5 rounded-full bg-ok" />
          <span className="font-mono text-[0.6rem] text-fg">INP 160 ms</span>
        </div>
      </Sticker>
      <Sticker className="top-8 right-[6%]" tilt={5} delay={1.3}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.6rem] text-muted`}>
          route <span className="text-fg">/docs/[slug]</span>
        </div>
      </Sticker>
    </Scene>
  );
}

export function ErrorsScene() {
  return (
    <Scene backdrop="glow" className="flex h-[420px] items-center justify-center px-4">
      <div className="sticker-hover w-full max-w-[330px]">
        <ErrorsVisual />
      </div>
      <Sticker className="top-6 left-[6%]" tilt={-5} delay={0.7}>
        <div
          className={`${card} flex items-center gap-1.5 px-2.5 py-1.5 text-[0.62rem] font-medium text-fg`}
        >
          <Logo className="size-3.5" />1 issue, 37 events
        </div>
      </Sticker>
      <Sticker className="right-[6%] bottom-7" tilt={4} delay={1.5}>
        <div className={`${card} flex items-center gap-1.5 px-2.5 py-1.5 text-[0.62rem] text-fg`}>
          <ShieldIcon className="size-3.5 text-[#7c5cc4]" />
          Bot traffic opens no issues
        </div>
      </Sticker>
      <Sticker className="bottom-9 left-[7%]" tilt={-3} delay={2.2}>
        <div className="rounded-full bg-[#ffe6a8] px-2.5 py-1 font-mono text-[0.58rem] text-[#7a5310] shadow-[0_10px_20px_-12px_rgb(120_80_20/0.6)]">
          same fingerprint v1.8.2 → v1.8.3
        </div>
      </Sticker>
    </Scene>
  );
}
