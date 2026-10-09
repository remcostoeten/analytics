"use client";

import { createClient } from "@spoar/client";
import type { Issue } from "@spoar/contract";
import { useAnalytics } from "@spoar/sdk/react";
import { useEffect, useMemo, useState } from "react";

import { Logo } from "@/components/logo";
import { tracked } from "@/lib/analytics";

import { CheckIcon, ShieldIcon } from "./icons";
import { Scene, Sticker } from "./scene";

type Props = {
  endpoint: string;
  project: string;
};

type Stage = "idle" | "thrown" | "sent" | "dropped" | "grouped";

type Fresh = { issue: Issue; since: number };

const card =
  "rounded-xl border border-[var(--glass-edge)] bg-surface/90 shadow-[0_14px_30px_-16px_rgb(var(--shade)/0.45)] backdrop-blur-sm";

const message = "Cannot read properties of undefined (reading 'total')";
const repollMs = 3000;
const repolls = 8;

const steps: { stage: Stage; label: string }[] = [
  { stage: "thrown", label: "Thrown in this tab, caught on window error" },
  { stage: "sent", label: "Captured by errors(), sent to POST /v2/events" },
  { stage: "grouped", label: "Grouped into an issue by type, message and frame" },
];

const order: Stage[] = ["idle", "thrown", "sent", "grouped"];

function reached(current: Stage, stage: Stage) {
  return order.indexOf(current) >= order.indexOf(stage);
}

function seenSince(issue: Issue, since: number) {
  return new Date(issue.lastSeen).getTime() >= since;
}

function useIssues(endpoint: string, project: string, since: number | null) {
  const read = useMemo(() => {
    const scope = createClient({ endpoint }).project(project);
    return () => scope.issues({ status: "open", limit: 50 });
  }, [endpoint, project]);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [readable, setReadable] = useState(true);
  const [fresh, setFresh] = useState<Fresh | null>(null);

  useEffect(() => {
    let active = true;
    void read().then((list) => {
      if (!active) return;
      if (list.ok) setIssues(list.value.data);
      else setReadable(false);
    });
    return () => {
      active = false;
    };
  }, [read]);

  useEffect(() => {
    if (since === null) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void read().then((list) => {
        if (!list.ok) {
          setReadable(false);
          window.clearInterval(timer);
          return;
        }
        setIssues(list.value.data);
        const match = list.value.data.find((issue) => seenSince(issue, since));
        if (match) {
          setFresh({ issue: match, since });
          window.clearInterval(timer);
        } else if (attempts >= repolls) {
          window.clearInterval(timer);
        }
      });
    }, repollMs);
    return () => window.clearInterval(timer);
  }, [read, since]);

  return { issues, readable, fresh: fresh?.since === since ? fresh.issue : null };
}

function Status({
  stage,
  issue,
  readable,
  reason,
}: {
  stage: Stage;
  issue: Issue | null;
  readable: boolean;
  reason: string | null;
}) {
  if (stage === "dropped") return <>dropped: {reason}</>;
  if (!tracked && stage !== "idle") return <>no project in this build, nothing sent</>;
  if (stage === "grouped" && issue) return <>{issue.culprit ?? issue.title}</>;
  if (stage === "sent" && !readable) return <>issues are not public for this project</>;
  return <>uncaught, on purpose</>;
}

export function ErrorsScene({ endpoint, project }: Props) {
  const analytics = useAnalytics();
  const [stage, setStage] = useState<Stage>("idle");
  const [since, setSince] = useState<number | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const { issues, readable, fresh } = useIssues(endpoint, project, stage === "sent" ? since : null);
  const shown: Stage = fresh ? "grouped" : stage;

  useEffect(
    () =>
      analytics.on("send", (envelope) => {
        if (!envelope.events.some((event) => event.name === "error")) return;
        setStage((current) => (current === "thrown" ? "sent" : current));
      }),
    [analytics],
  );

  useEffect(
    () =>
      analytics.on("drop", (event, why) => {
        if (event.name !== "error") return;
        setReason(why);
        setStage((current) => (current === "thrown" ? "dropped" : current));
      }),
    [analytics],
  );

  useEffect(
    () =>
      analytics.on("error", (code) => {
        setReason(code);
        setStage((current) => (current === "thrown" ? "dropped" : current));
      }),
    [analytics],
  );

  function throwOne() {
    setSince(Date.now());
    setReason(null);
    setStage("thrown");
    window.setTimeout(() => {
      throw new TypeError(message);
    });
  }

  const events = issues?.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <Scene backdrop="glow" className="flex h-[420px] items-center justify-center px-4">
      <div className="sticker-hover w-full max-w-[330px]">
        <div className="mx-auto w-full overflow-hidden rounded-xl border border-white/10 bg-[#2b2624] text-[#f3ece8] shadow-[0_16px_36px_-20px_rgb(var(--shade)/0.6)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <span className="flex items-center gap-2 text-[0.72rem]">
              <span
                className={`size-1.5 rounded-full ${shown === "idle" ? "bg-white/30" : "bg-err"}`}
              />
              TypeError
            </span>
            <span className="font-mono text-[0.6rem] text-white/50">
              {fresh ? `${fresh.id} · ${fresh.count} events` : "not thrown yet"}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-[0.68rem] leading-relaxed">{message}</p>
            <ol className="mt-3 flex flex-col gap-1">
              {steps.map((step) => {
                const done = reached(shown, step.stage);
                const active = shown === step.stage;
                return (
                  <li
                    key={step.stage}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[0.6rem] transition-colors ${done ? "bg-white/6 text-[#f3ece8]" : "text-white/40"}`}
                  >
                    <span className="flex size-3.5 shrink-0 items-center justify-center">
                      {done && !active ? (
                        <CheckIcon className="size-3 text-ok" />
                      ) : (
                        <span
                          className={`size-1.5 rounded-full ${active ? "animate-live bg-[#ffb59a]" : "bg-white/20"}`}
                        />
                      )}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5">
            <button
              type="button"
              onClick={() => throwOne()}
              disabled={shown === "thrown" || shown === "sent"}
              className="shrink-0 rounded-full bg-[#ffb59a] px-3 py-1 text-[0.62rem] font-medium text-[#2b2624] transition-transform active:scale-95 disabled:opacity-60"
            >
              {shown === "idle" ? "Throw a TypeError" : "Throw another"}
            </button>
            <span className="truncate font-mono text-[0.58rem] text-white/50">
              <Status stage={shown} issue={fresh} readable={readable} reason={reason} />
            </span>
          </div>
        </div>
      </div>
      {issues ? (
        <Sticker className="top-6 left-[6%]" tilt={-5} delay={0.7}>
          <div
            className={`${card} flex items-center gap-1.5 px-2.5 py-1.5 text-[0.62rem] font-medium text-fg`}
          >
            <Logo className="size-3.5" />
            <span key={`${issues.length}-${events}`} className="tick-in">
              {issues.length} open {issues.length === 1 ? "issue" : "issues"}, {events} events
            </span>
          </div>
        </Sticker>
      ) : null}
      <Sticker className="right-[6%] bottom-7" tilt={4} delay={1.5}>
        <div className={`${card} flex items-center gap-1.5 px-2.5 py-1.5 text-[0.62rem] text-fg`}>
          <ShieldIcon className="size-3.5 text-[var(--violet-ink)]" />
          Bot traffic opens no issues
        </div>
      </Sticker>
      <Sticker className="bottom-9 left-[7%]" tilt={-3} delay={2.2}>
        <div className="rounded-full bg-[#ffe6a8] px-2.5 py-1 font-mono text-[0.58rem] text-[#7a5310] shadow-[0_10px_20px_-12px_rgb(120_80_20/0.6)]">
          one fingerprint across deploys
        </div>
      </Sticker>
    </Scene>
  );
}
