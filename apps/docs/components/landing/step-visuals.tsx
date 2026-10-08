import { Logo } from "@/components/logo";

import { SparkIcon } from "./icons";

export function InstallVisual() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-3">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(60_30_10/0.35)]">
        <span className="flex size-9 items-center justify-center rounded-full bg-fg font-sans text-[1.1rem] font-semibold text-bg">
          N
        </span>
      </span>
      <span className="flex size-16 items-center justify-center rounded-2xl border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(60_30_10/0.35)]">
        <svg
          viewBox="0 0 24 24"
          className="size-9 text-[#149eca]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="font-mono text-muted">&harr;</span>
      <span className="tile-glow flex size-16 items-center justify-center rounded-2xl">
        <Logo className="size-8" />
      </span>
    </div>
  );
}

export function ProxyVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[270px]">
      <div className="absolute -top-3 left-4 z-10 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[0.62rem] text-fg shadow-sm">
        yoursite.com<span className="text-accent">/_ra</span>
      </div>
      <div className="rounded-xl border border-line bg-surface p-3 pt-5 font-mono text-[0.62rem] leading-[1.7] shadow-[0_12px_28px_-16px_rgb(60_30_10/0.4)]">
        <div className="text-muted">app/_ra/route.ts</div>
        <div className="mt-1.5">
          <span className="text-muted">export const</span> <span className="text-fg">POST</span>{" "}
          <span className="text-muted">=</span>
        </div>
        <div className="pl-3">
          <span className="text-accent">createProxy</span>
          <span className="text-muted">{"({"}</span>
        </div>
        <div className="pl-6 text-fg">secret, endpoint</div>
        <div className="pl-3 text-muted">{"});"}</div>
      </div>
    </div>
  );
}

const rows = [
  { path: "/", views: "1,904" },
  { path: "/docs", views: "1,211" },
  { path: "/pricing", views: "802" },
];

export function ReadVisual() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[270px] rounded-xl border border-line bg-surface p-3 shadow-[0_12px_28px_-16px_rgb(60_30_10/0.4)]"
    >
      <div className="flex items-center justify-between text-[0.62rem] text-muted">
        <span>Query</span>
        <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
          <SparkIcon className="size-2.5" />
          read only
        </span>
      </div>
      <div className="mt-2 rounded-md bg-bg px-2 py-1.5 font-mono text-[0.6rem] leading-[1.6] text-fg">
        <span className="text-muted">SELECT</span> path, count(*){" "}
        <span className="text-muted">AS</span> views
        <br />
        <span className="text-muted">FROM</span> events <span className="text-muted">GROUP BY</span>{" "}
        path
      </div>
      <ul className="mt-2 flex flex-col">
        {rows.map((row) => (
          <li
            key={row.path}
            className="flex justify-between border-b border-dashed border-line py-1 font-mono text-[0.62rem] last:border-0"
          >
            <span className="text-fg">{row.path}</span>
            <span className="text-muted tabular-nums">{row.views}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
