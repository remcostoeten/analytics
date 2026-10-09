"use client";

import { createClient } from "@spoar/client";
import type { SpeedResponse, VitalMetric, VitalRating } from "@spoar/contract";
import { useEffect, useMemo, useState } from "react";

import { formatVital } from "@/lib/format";
import { showcaseReads } from "@/lib/showcase-period";

import { Scene, Sticker } from "./scene";

type Props = {
  endpoint: string;
  project: string;
};

type Reading = { value: number; rating: VitalRating };

type Yours = { [Metric in VitalMetric]?: Reading };

type Site = SpeedResponse["data"];

const card =
  "rounded-xl border border-[var(--glass-edge)] bg-surface/90 shadow-[0_14px_30px_-16px_rgb(var(--shade)/0.45)] backdrop-blur-sm";

const metrics: { metric: VitalMetric; label: string }[] = [
  { metric: "lcp", label: "LCP" },
  { metric: "inp", label: "INP" },
  { metric: "cls", label: "CLS" },
  { metric: "fcp", label: "FCP" },
  { metric: "ttfb", label: "TTFB" },
];

const ratingColor = {
  good: "bg-ok",
  "needs-improvement": "bg-warn",
  poor: "bg-err",
} satisfies Record<VitalRating, string>;

const changes = { reportAllChanges: true };

function useSiteSpeed(endpoint: string, project: string) {
  const client = useMemo(() => createClient({ endpoint }).project(project), [endpoint, project]);
  const [site, setSite] = useState<Site | null>(null);
  useEffect(() => {
    let active = true;
    void showcaseReads(client)
      .speed()
      .then((speed) => {
        if (active && speed.ok) setSite(speed.value.data);
      });
    return () => {
      active = false;
    };
  }, [client]);
  return site;
}

function useYourVitals() {
  const [yours, setYours] = useState<Yours>({});
  useEffect(() => {
    let active = true;
    void import("web-vitals").then((vitals) => {
      if (!active) return;
      function take(name: VitalMetric) {
        return (metric: { value: number; rating: VitalRating }) => {
          if (!active) return;
          setYours((previous) => ({
            ...previous,
            [name]: { value: metric.value, rating: metric.rating },
          }));
        };
      }
      vitals.onLCP(take("lcp"), changes);
      vitals.onINP(take("inp"), changes);
      vitals.onCLS(take("cls"), changes);
      vitals.onFCP(take("fcp"));
      vitals.onTTFB(take("ttfb"));
    });
    return () => {
      active = false;
    };
  }, []);
  return yours;
}

function Dot({ rating }: { rating: VitalRating | null }) {
  if (!rating) return <span className="size-1.5 rounded-full bg-fg/15" />;
  return <span className={`size-1.5 rounded-full ${ratingColor[rating]}`} />;
}

function Value({ metric, reading }: { metric: VitalMetric; reading: Reading | null }) {
  return (
    <span className="flex items-center justify-end gap-1.5 font-mono text-[0.65rem] tabular-nums">
      <Dot rating={reading?.rating ?? null} />
      <span className={reading ? "tick-in text-fg" : "text-muted"}>
        {reading ? formatVital(metric, reading.value) : "–"}
      </span>
    </span>
  );
}

function siteReading(site: Site | null, metric: VitalMetric): Reading | null {
  const summary = site?.metrics[metric];
  if (!summary || summary.value === null || summary.rating === null) return null;
  return { value: summary.value, rating: summary.rating };
}

function VitalsCard({ site, yours }: { site: Site | null; yours: Yours }) {
  const score = site?.score ?? null;
  const circumference = 2 * Math.PI * 26;
  return (
    <div className="mx-auto grid w-full max-w-[360px] gap-4 rounded-xl border border-line bg-surface p-4 shadow-[0_16px_36px_-20px_rgb(var(--shade)/0.45)]">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 64 64" className="size-14 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" strokeWidth="5" />
          {score !== null ? (
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke={score >= 90 ? "var(--ok)" : score >= 50 ? "var(--warn)" : "var(--err)"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
              className="ring-draw"
            />
          ) : null}
        </svg>
        <div>
          <div className="font-mono text-xl font-medium text-fg">{score ?? "–"}</div>
          <div className="text-[0.68rem] text-muted">
            {score === null
              ? "Real Experience Score, needs 20 samples"
              : "Real Experience Score, this site, p75"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-[0.58rem] text-muted">
        <span />
        <span className="text-right">Your visit</span>
        <span className="text-right">Everyone, p75</span>
      </div>
      <ul className="-mt-2 flex flex-col gap-2">
        {metrics.map((row) => (
          <li key={row.metric} className="grid grid-cols-[40px_1fr_1fr] items-center gap-2">
            <span className="font-mono text-[0.65rem] text-fg">{row.label}</span>
            <Value metric={row.metric} reading={yours[row.metric] ?? null} />
            <Value metric={row.metric} reading={siteReading(site, row.metric)} />
          </li>
        ))}
      </ul>
      <p className="text-[0.6rem] text-muted">
        Your column is measured in this tab by web-vitals as you read; INP waits for a click or a
        key. The other column is what the speedInsights plugin stored for every visitor in the last
        30 days.
      </p>
    </div>
  );
}

export function VitalsScene({ endpoint, project }: Props) {
  const site = useSiteSpeed(endpoint, project);
  const yours = useYourVitals();
  const measured = Object.keys(yours).length;
  return (
    <Scene backdrop="hills" className="flex h-[420px] items-center justify-center px-4">
      <div className="sticker-hover w-full max-w-[320px]">
        <VitalsCard site={site} yours={yours} />
      </div>
      <Sticker className="top-6 left-[6%]" tilt={-6} delay={0.5}>
        <div className={`${card} flex items-center gap-1.5 px-2.5 py-1.5`}>
          <span className="animate-live size-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[0.6rem] text-fg">{measured} of 5 measured</span>
        </div>
      </Sticker>
      <Sticker className="top-8 right-[6%]" tilt={5} delay={1.3}>
        <div className={`${card} px-2.5 py-1.5 font-mono text-[0.6rem] text-muted`}>
          {site ? (
            <>
              <span className="text-fg">{site.samples}</span> samples
            </>
          ) : (
            "reading /speed"
          )}
        </div>
      </Sticker>
    </Scene>
  );
}
