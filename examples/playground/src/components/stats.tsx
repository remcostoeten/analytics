import { useEffect, useState } from "react";
import { isRecord, list, parseJson, text } from "../json";
import type { Json } from "../json";
import { sendDirect } from "../request";
import type { Settings } from "../request";

type Props = {
  settings: Settings;
  onAdvanced: () => void;
};

type Row = { label: string; value: string };

type Summary = {
  online: number;
  visitors: number;
  pageviews: number;
  bounceRate: number;
  avgSessionSeconds: number;
  topPages: Row[];
  referrers: Row[];
  countries: Row[];
};

type Recent = { when: string; name: string; path: string; where: string; device: string };

type Load<T> =
  | { state: "idle" | "busy" }
  | { state: "ok"; data: T }
  | { state: "error"; message: string };

const recentSql =
  "select ts, name, path, country, device, browser from events order by ts desc limit 10";

function num(value: Json | undefined) {
  return typeof value === "number" ? value : 0;
}

function percent(share: Json | undefined) {
  return `${Math.round(num(share) * 100)}%`;
}

function duration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function timestamp(value: string) {
  // Postgres sends "2026-10-07 12:09:42.299+00"; Safari only parses the ISO form.
  const date = new Date(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function headers(settings: Settings): { [name: string]: string } {
  return settings.token ? { authorization: `Bearer ${settings.token}` } : {};
}

function projectUrl(settings: Settings, path: string) {
  return `${settings.base}/v2/projects/${encodeURIComponent(settings.project)}${path}`;
}

async function readJson(response: Response) {
  const body = parseJson(await response.text());
  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? text(body.error.message) : "";
    throw new Error(`${response.status} ${error || response.statusText}`);
  }
  if (!isRecord(body)) throw new Error("The API sent something that is not JSON.");
  return body;
}

async function loadSummary(settings: Settings): Promise<Summary> {
  const body = await readJson(
    await fetch(projectUrl(settings, "/overview"), { headers: headers(settings) }),
  );
  const today = isRecord(body.today) ? body.today : {};
  return {
    online: num(body.online),
    visitors: num(today.visitors),
    pageviews: num(today.pageviews),
    bounceRate: num(today.bounceRate),
    avgSessionSeconds: num(today.avgSessionSeconds),
    topPages: list(body.topPages)
      .filter(isRecord)
      .map((page) => ({ label: text(page.path), value: String(num(page.views)) })),
    referrers: list(body.referrers)
      .filter(isRecord)
      .map((item) => ({ label: text(item.name), value: percent(item.share) })),
    countries: list(body.countries)
      .filter(isRecord)
      .map((item) => ({ label: text(item.code), value: percent(item.share) })),
  };
}

async function loadRecent(settings: Settings): Promise<Recent[]> {
  const body = await readJson(
    await fetch(projectUrl(settings, "/query"), {
      method: "POST",
      headers: { ...headers(settings), "content-type": "application/json" },
      body: JSON.stringify({ sql: recentSql }),
    }),
  );
  const columns = list(body.columns).map((column) => text(column));
  return list(body.rows).map((raw) => {
    const row = list(raw);
    function at(name: string) {
      return row[columns.indexOf(name)];
    }
    return {
      when: timestamp(text(at("ts"))),
      name: text(at("name")),
      path: text(at("path")),
      where: text(at("country")) || "unknown",
      device: [text(at("device")), text(at("browser"))].filter(Boolean).join(", "),
    };
  });
}

function List({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <section className="stats-card">
      <h2 className="section-heading">{title}</h2>
      {rows.length === 0 ? (
        <p className="note">{empty}</p>
      ) : (
        <ol className="stats-list">
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label || "(none)"}</span>
              <strong>{row.value}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * @name Stats
 * @description The playground's home page: today's numbers for the project in plain language,
 * the latest events, and a button that sends a test pageview.
 *
 * @example
 * <Stats settings={settings} onAdvanced={() => select("overview")} />
 */
export function Stats({ settings, onAdvanced }: Props) {
  const [summary, setSummary] = useState<Load<Summary>>({ state: "idle" });
  const [recent, setRecent] = useState<Load<Recent[]>>({ state: "idle" });
  const [sent, setSent] = useState("");
  const ready = settings.project !== "";

  async function refresh() {
    if (!ready) return;
    setSummary({ state: "busy" });
    setRecent({ state: "busy" });
    loadSummary(settings).then(
      (data) => setSummary({ state: "ok", data }),
      (error) => setSummary({ state: "error", message: String(error) }),
    );
    if (!settings.token) {
      setRecent({ state: "error", message: "Add an API token in the bar above to see events." });
      return;
    }
    loadRecent(settings).then(
      (data) => setRecent({ state: "ok", data }),
      (error) => setRecent({ state: "error", message: String(error) }),
    );
  }

  async function sendTest() {
    setSent("Sending");
    try {
      const result = await sendDirect(settings, "pageview", {});
      setSent(
        result.ok
          ? "Sent one pageview. The numbers below now include it."
          : `The API did not accept the pageview (${result.status}): ${result.raw.slice(0, 200)}`,
      );
      await refresh();
    } catch (error) {
      setSent(String(error));
    }
  }

  useEffect(() => {
    void refresh();
  }, [settings.base, settings.project, settings.token]);

  const data = summary.state === "ok" ? summary.data : null;
  const figures = [
    { label: "Online now", value: data ? String(data.online) : "-" },
    { label: "Visitors today", value: data ? String(data.visitors) : "-" },
    { label: "Pageviews today", value: data ? String(data.pageviews) : "-" },
    { label: "Left after one page", value: data ? percent(data.bounceRate) : "-" },
    { label: "Average visit", value: data ? duration(data.avgSessionSeconds) : "-" },
  ];

  return (
    <article className="walkthrough">
      <header className="hero">
        <p className="eyebrow">Stats</p>
        <h1>{settings.project || "No project yet"}</h1>
        <p className="lede">
          What the project recorded today. Send a test pageview to watch the numbers move. The raw
          API routes and SDK methods are under{" "}
          <button type="button" className="link" onClick={onAdvanced}>
            Advanced
          </button>
          .
        </p>
        {ready ? (
          <div className="presets">
            <button type="button" className="primary" onClick={sendTest}>
              Send a test pageview
            </button>
            <button type="button" className="ghost" onClick={refresh}>
              Refresh
            </button>
          </div>
        ) : (
          <p className="note warn">Fill in the Project field in the bar above.</p>
        )}
        {sent ? <p className="note">{sent}</p> : null}
      </header>

      {summary.state === "error" ? <p className="note error">{summary.message}</p> : null}

      <dl className="figures stats-figures">
        {figures.map((figure) => (
          <div key={figure.label} className="figure">
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>

      <div className="stats-grid">
        <List title="Top pages today" rows={data?.topPages ?? []} empty="No pageviews yet." />
        <List
          title="Where visitors came from"
          rows={data?.referrers ?? []}
          empty="No referrers yet."
        />
        <List title="Countries" rows={data?.countries ?? []} empty="No visitors yet." />
      </div>

      <section className="stats-card">
        <h2 className="section-heading">Latest events</h2>
        {recent.state === "busy" ? <p className="note">Loading</p> : null}
        {recent.state === "error" ? <p className="note warn">{recent.message}</p> : null}
        {recent.state === "ok" && recent.data.length === 0 ? (
          <p className="note">Nothing recorded yet.</p>
        ) : null}
        {recent.state === "ok" && recent.data.length > 0 ? (
          <div className="table-wrap">
            <table className="rows">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Page</th>
                  <th>Country</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.map((event, index) => (
                  <tr key={`${index}-${event.when}`}>
                    <td>{event.when}</td>
                    <td>{event.name}</td>
                    <td>{event.path}</td>
                    <td>{event.where}</td>
                    <td>{event.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </article>
  );
}
