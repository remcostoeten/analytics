type Rating = "good" | "fair" | "poor";

type Vital = {
  name: string;
  value: string;
  rating: Rating;
  position: number;
};

const vitals: Vital[] = [
  { name: "LCP", value: "1.9 s", rating: "good", position: 30 },
  { name: "INP", value: "160 ms", rating: "good", position: 26 },
  { name: "CLS", value: "0.04", rating: "good", position: 18 },
  { name: "FCP", value: "1.2 s", rating: "good", position: 24 },
  { name: "TTFB", value: "920 ms", rating: "fair", position: 58 },
];

const ratingColor = {
  good: "bg-ok",
  fair: "bg-warn",
  poor: "bg-err",
} satisfies Record<Rating, string>;

export function VitalsVisual() {
  const score = 94;
  const circumference = 2 * Math.PI * 26;
  return (
    <div
      aria-hidden="true"
      className="mx-auto grid w-full max-w-[360px] gap-4 rounded-xl border border-line bg-surface p-4 shadow-[0_16px_36px_-20px_rgb(60_30_10/0.45)]"
    >
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 64 64" className="size-14 -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="var(--ok)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
          />
        </svg>
        <div>
          <div className="font-mono text-xl font-medium text-fg">{score}</div>
          <div className="text-[0.68rem] text-muted">Real Experience Score, /docs, p75</div>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {vitals.map((vital) => (
          <li key={vital.name} className="grid grid-cols-[40px_1fr_56px] items-center gap-2">
            <span className="font-mono text-[0.65rem] text-fg">{vital.name}</span>
            <span className="relative flex h-1.5 overflow-hidden rounded-full">
              <span className="w-1/2 bg-ok/25" />
              <span className="w-1/4 bg-warn/25" />
              <span className="w-1/4 bg-err/25" />
              <span
                className={`absolute top-0 size-1.5 rounded-full ${ratingColor[vital.rating]}`}
                style={{ left: `${vital.position}%` }}
              />
            </span>
            <span className="text-right font-mono text-[0.65rem] text-muted tabular-nums">
              {vital.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const frames = [
  { fn: "submitOrder", file: "app/checkout/form.tsx", line: "42:17" },
  { fn: "onClick", file: "components/button.tsx", line: "18:5" },
  { fn: "dispatchEvent", file: "react-dom", line: "", muted: true },
];

export function ErrorsVisual() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl border border-white/10 bg-[#2b2624] text-[#f3ece8] shadow-[0_16px_36px_-20px_rgb(60_30_10/0.6)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[0.72rem]">
          <span className="size-1.5 rounded-full bg-err" />
          TypeError
        </span>
        <span className="font-mono text-[0.6rem] text-white/50">fp 9c41e0 · 37 events</span>
      </div>
      <div className="px-4 py-3">
        <p className="font-mono text-[0.68rem] leading-relaxed">
          Cannot read properties of undefined (reading &apos;total&apos;)
        </p>
        <ul className="mt-3 flex flex-col gap-1">
          {frames.map((frame) => (
            <li
              key={frame.fn}
              className={`flex justify-between gap-3 rounded-md px-2 py-1.5 font-mono text-[0.6rem] ${frame.muted ? "text-white/40" : "bg-white/6"}`}
            >
              <span>
                at <span className={frame.muted ? "" : "text-[#ffb59a]"}>{frame.fn}</span>
              </span>
              <span className="truncate text-white/50">
                {frame.file}
                {frame.line ? `:${frame.line}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-1.5 border-t border-white/10 px-4 py-2.5">
        {["Chrome 141", "macOS", "/checkout?step=2", "v1.8.3"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[0.58rem] text-white/70"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
