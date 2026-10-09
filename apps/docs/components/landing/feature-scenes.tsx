import { CheckIcon, CloseIcon, KeyIcon, RouteIcon, ShieldIcon } from "./icons";
import { Scene, Sticker } from "./scene";

const card =
  "rounded-xl border border-[var(--glass-edge)] bg-surface/90 shadow-[0_14px_30px_-16px_rgb(var(--shade)/0.45)] backdrop-blur-sm";

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
          className={`${card} flex w-[148px] blocked-card translate-y-3 flex-col items-center gap-2 p-3 sm:w-[170px] sm:p-4 text-center opacity-75 grayscale-[0.4]`}
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
        className={`${card} relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.7rem] font-medium text-[var(--violet-ink)]`}
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
          <path d="M10 0 V44" pathLength="10" strokeDasharray="0.4 0.6" className="dash-flow" />
          <circle r="2.6" cx="10" fill="var(--accent)">
            <animate attributeName="cy" from="0" to="44" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className={`${card} flex w-[230px] flex-col gap-2 p-3.5`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[0.66rem] font-medium text-fg">
              <KeyIcon className="size-3.5 text-[var(--violet-ink)]" />
              hash(ip + daily salt)
            </span>
            <span className="rounded-full bg-[var(--lilac)] px-1.5 py-0.5 font-mono text-[0.52rem] text-[var(--violet-ink)]">
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
