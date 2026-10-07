import { useEffect, useState } from "react";
import { isRecord, parseJson, text } from "../json";
import type { SdkMethod } from "../sdk-catalog";
import type { Spec } from "../spec";

type Props = {
  spec: Spec | null;
  methods: SdkMethod[];
  base: string;
  onSelect: (id: string) => void;
};

type Health =
  | { state: "checking" }
  | { state: "up"; ms: number; runtime: string; cold: boolean }
  | { state: "down"; reason: string };

const starts = [
  {
    id: "walkthrough",
    title: "New here? Walk through it",
    body: "Send one event and see its row in the database, step by step.",
  },
  {
    id: "POST /v2/events",
    title: "Send an event",
    body: "Post a batch straight to ingest with a project key, the way the SDK does.",
  },
  {
    id: "@spoar/sdk:track",
    title: "Track from the browser",
    body: "Run the real browser client in this page and watch its send log.",
  },
  {
    id: "GET /v2/projects/{project}/stats",
    title: "Read headline numbers",
    body: "Visitors, pageviews and bounce rate for a range, with an API token.",
  },
  {
    id: "POST /v2/projects/{project}/query",
    title: "Run SQL",
    body: "Query a project's events with read-only SQL over the documented views.",
  },
  {
    id: "@spoar/sdk/admin:timeseries",
    title: "Typed admin reads",
    body: "The same reads through createAdmin, with typed results and errors.",
  },
];

const flow = [
  { name: "@spoar/sdk", detail: "browser, server, proxy" },
  { name: "POST /v2/events", detail: "batches up to 60 KB" },
  { name: "Engine", detail: "enrich, score bots, dedupe" },
  { name: "Postgres", detail: "Neon, no raw IPs" },
  { name: "Reads, SQL, alerts", detail: "API token or session" },
];

export function Overview({ spec, methods, base, onSelect }: Props) {
  const [health, setHealth] = useState<Health>({ state: "checking" });
  const routes = spec?.groups.flatMap((group) => group.routes) ?? [];
  const runnable = methods.filter((method) => method.run !== null).length;

  useEffect(() => {
    let current = true;
    const started = performance.now();
    setHealth({ state: "checking" });
    fetch(`${base}/v2/health`)
      .then(async (response) => {
        const body = parseJson(await response.text());
        if (!current) return;
        if (!response.ok || !isRecord(body)) {
          setHealth({ state: "down", reason: `HTTP ${response.status}` });
          return;
        }
        setHealth({
          state: "up",
          ms: Math.round(performance.now() - started),
          runtime: text(body.runtime),
          cold: body.coldStart === true,
        });
      })
      .catch((error) => {
        if (current) setHealth({ state: "down", reason: String(error) });
      });
    return () => {
      current = false;
    };
  }, [base]);

  const figures = [
    { value: routes.length, label: "HTTP routes" },
    { value: spec?.groups.length ?? 0, label: "route groups" },
    { value: methods.length, label: "SDK methods" },
    { value: runnable, label: "run in this page" },
  ];

  return (
    <article className="overview">
      <header className="hero">
        <p className="eyebrow">Spoar analytics v2{spec?.version ? ` · API ${spec.version}` : ""}</p>
        <h1>Every route and SDK method, live.</h1>
        <p className="lede">
          Self-hosted, privacy-first web analytics: a typed SDK sends events to one API, which
          enriches them and stores them in Postgres without cookies for visitors or raw IP
          addresses. Pick anything on the left to call it against the real API or read a short
          implementation.
        </p>
        <div className={`health ${health.state}`}>
          <span className="pulse" aria-hidden="true" />
          {health.state === "checking" ? <span>Checking {base}</span> : null}
          {health.state === "up" ? (
            <span>
              {base.replace("https://", "")} is up · {health.ms} ms · {health.runtime}
              {health.cold ? " · cold start" : ""}
            </span>
          ) : null}
          {health.state === "down" ? (
            <span>
              {base} did not answer: {health.reason}
            </span>
          ) : null}
        </div>
      </header>

      <dl className="figures">
        {figures.map((figure) => (
          <div key={figure.label} className="figure">
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="section-heading">How an event travels</h2>
        <ol className="flow">
          {flow.map((step) => (
            <li key={step.name}>
              <strong>{step.name}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="section-heading">Start here</h2>
        <div className="starts">
          {starts.map((start) => (
            <button
              key={start.id}
              type="button"
              className="start"
              onClick={() => onSelect(start.id)}
            >
              <span className="start-id">{start.id.replace("{project}", ":project")}</span>
              <strong>{start.title}</strong>
              <span>{start.body}</span>
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}
