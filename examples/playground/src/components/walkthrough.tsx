import { useState } from "react";
import { isRecord, list, parseJson, text } from "../json";
import type { Json } from "../json";
import { sendDirect } from "../request";
import type { Settings } from "../request";
import type { Kit } from "../sdk-catalog";

type Props = {
  settings: Settings;
  kit: () => Kit;
  log: string[];
};

type Table = { columns: string[]; rows: Json[][]; ms: number };

type Answer =
  | { state: "idle" }
  | { state: "busy"; label: string }
  | { state: "ok"; summary: string; table: Table | null }
  | { state: "error"; message: string };

const eventName = "playground_walkthrough";
const attempts = 6;

const presets = [
  {
    label: "The latest 10 events",
    sql: "select ts, name, path, country, device, browser, is_human\nfrom events\norder by ts desc\nlimit 10",
  },
  {
    label: "Events per name today",
    sql: "select name, count(*) as events, count(distinct visitor_id) as visitors\nfrom events\nwhere ts >= date_trunc('day', now())\ngroup by name\norder by events desc",
  },
  {
    label: "Top pages, last 7 days",
    sql: "select path, count(*) as views\nfrom pageviews\nwhere is_human and ts > now() - interval '7 days'\ngroup by path\norder by views desc\nlimit 10",
  },
];

const credentials: { key: keyof Settings; label: string; why: string }[] = [
  { key: "project", label: "Project", why: "The slug every event and read belongs to." },
  {
    key: "projectKey",
    label: "Project key",
    why: "Public key the browser SDK sends events with. Step 2 needs it.",
  },
  {
    key: "token",
    label: "API token",
    why: "Secret token for reads and SQL. Steps 3 and 4 need it, with SQL access.",
  },
];

function runId() {
  return Math.random().toString(36).slice(2, 10);
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const dropReasons: { [reason: string]: string } = {
  dnt: "This browser sends Do Not Track, so the SDK dropped the event before it left the page. Nothing reached the API. Turn Do Not Track off in the browser settings and send again.",
  "opt-out":
    "This browser opted out of tracking earlier, so the SDK dropped the event before it left the page. Call analytics.optIn() or clear site data for this origin, then send again.",
  consent:
    "Consent was denied in this browser, so the SDK dropped the event before it left the page. Grant consent, then send again.",
  beforeSend:
    "A beforeSend hook returned null, so the SDK dropped the event before it left the page.",
};

function sentMessage(failed: number, drops: string[], errors: string[]) {
  const reason = drops[0];
  if (reason !== undefined) {
    return dropReasons[reason] ?? `The SDK dropped the event before it left the page (${reason}).`;
  }
  if (errors.some((line) => line.includes("FORBIDDEN_ORIGIN"))) {
    return `The API refused the event: ${window.location.origin} is not in the project's allowed origins. Add it in the project settings and send again.`;
  }
  if (errors.some((line) => line.includes("UNAUTHORIZED"))) {
    return "The API refused the event: the project key is wrong or belongs to another project. Check the Project key field at the top.";
  }
  if (errors.some((line) => line.includes("NOT_FOUND"))) {
    return "The API refused the event: no project has that slug. Check the Project field at the top.";
  }
  if (errors.length > 0) return `The API refused the event: ${errors[0]}`;
  return `The API did not accept the event (${failed} failed). The client log below has the details.`;
}

function queryHint(status: number, code: string, project: string) {
  if (status === 404) {
    return ` No project has the slug "${project}". Check the Project field at the top; it must match a project in the dashboard exactly.`;
  }
  if (status === 401)
    return " The API token is missing or wrong. Check the API token field at the top.";
  if (status === 403 || code === "FORBIDDEN") {
    return " The API token is valid but has no SQL access, or belongs to another project.";
  }
  return "";
}

function errorMessage(status: number, body: Json | undefined, raw: string, project: string) {
  if (isRecord(body) && isRecord(body.error)) {
    const code = text(body.error.code);
    return `${status} ${code}: ${text(body.error.message)}.${queryHint(status, code, project)}`;
  }
  return `${status}: ${raw.slice(0, 300)}`;
}

async function runSql(settings: Settings, sql: string) {
  const started = performance.now();
  const response = await fetch(
    `${settings.base}/v2/projects/${encodeURIComponent(settings.project)}/query`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${settings.token}` },
      body: JSON.stringify({ sql }),
    },
  );
  const raw = await response.text();
  const body = parseJson(raw);
  if (!response.ok || !isRecord(body)) {
    throw new Error(errorMessage(response.status, body, raw, settings.project));
  }
  return {
    columns: list(body.columns).map((column) => text(column)),
    rows: list(body.rows).map((row) => list(row)),
    ms: Math.round(performance.now() - started),
  };
}

function cell(value: Json | undefined) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ResultTable({ table }: { table: Table }) {
  if (table.rows.length === 0) return <p className="note">The query returned no rows.</p>;
  return (
    <div className="table-wrap">
      <table className="rows">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {table.columns.map((column, at) => (
                <td key={column} className={row[at] === null ? "null" : undefined}>
                  {cell(row[at])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnswerView({ answer }: { answer: Answer }) {
  if (answer.state === "idle") return null;
  if (answer.state === "busy") return <p className="note">{answer.label}</p>;
  if (answer.state === "error") return <p className="note error">{answer.message}</p>;
  return (
    <>
      <p className="note ok">{answer.summary}</p>
      {answer.table ? <ResultTable table={answer.table} /> : null}
    </>
  );
}

export function Walkthrough({ settings, kit, log }: Props) {
  const [health, setHealth] = useState<Answer>({ state: "idle" });
  const [sent, setSent] = useState<Answer>({ state: "idle" });
  const [found, setFound] = useState<Answer>({ state: "idle" });
  const [explored, setExplored] = useState<Answer>({ state: "idle" });
  const [run, setRun] = useState("");
  const [sql, setSql] = useState(presets[0]?.sql ?? "");
  const canSend = settings.project !== "" && settings.projectKey !== "";
  const canRead = settings.project !== "" && settings.token !== "";
  const findSql = `select event_id, name, ts, received_at, props, country, device, browser, bot_score, is_human, is_localhost\nfrom events\nwhere name = '${eventName}' and props->>'run' = '${run}'`;

  async function checkHealth() {
    setHealth({ state: "busy", label: "Calling /v2/health" });
    try {
      const started = performance.now();
      const response = await fetch(`${settings.base}/v2/health`);
      const body = parseJson(await response.text());
      const ms = Math.round(performance.now() - started);
      if (!response.ok || !isRecord(body)) throw new Error(`HTTP ${response.status}`);
      setHealth({
        state: "ok",
        summary: `The API answered in ${ms} ms.`,
        table: {
          columns: ["version", "runtime", "coldStart", "time"],
          rows: [
            [body.version ?? null, body.runtime ?? null, body.coldStart ?? null, body.time ?? null],
          ],
          ms,
        },
      });
    } catch (error) {
      setHealth({ state: "error", message: `${settings.base} did not answer: ${String(error)}` });
    }
  }

  async function sendEvent() {
    const id = runId();
    setRun(id);
    setFound({ state: "idle" });
    setSent({ state: "busy", label: "Tracking and flushing one event" });
    const drops: string[] = [];
    const errors: string[] = [];
    const analytics = kit().analytics();
    const stopDrop = analytics.on("drop", (_, reason) => drops.push(reason));
    const stopError = analytics.on("error", (code, detail) => errors.push(`${code}: ${detail}`));
    try {
      analytics.track(eventName, { run: id });
      const result = await analytics.flush();
      if (result.accepted === 0 && result.duplicates === 0 && drops[0] === "dnt") {
        const direct = await sendDirect(settings, eventName, { run: id });
        setSent(
          direct.ok
            ? {
                state: "ok",
                summary: `This browser sends Do Not Track or Global Privacy Control, so the SDK dropped the event. The playground posted it straight to /v2/events instead. It carries run id ${id} so step 3 can find exactly this row.`,
                table: null,
              }
            : { state: "error", message: `${direct.status}: ${direct.raw.slice(0, 300)}` },
        );
        return;
      }
      if (result.accepted === 0 && result.duplicates === 0) {
        setSent({ state: "error", message: sentMessage(result.failed, drops, errors) });
        return;
      }
      setSent({
        state: "ok",
        summary: `Accepted. The event "${eventName}" carries run id ${id} so step 3 can find exactly this row.`,
        table: null,
      });
    } catch (error) {
      setSent({ state: "error", message: String(error) });
    } finally {
      stopDrop();
      stopError();
    }
  }

  async function findEvent() {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      setFound({
        state: "busy",
        label: `Querying the events view, attempt ${attempt} of ${attempts}`,
      });
      try {
        const table = await runSql(settings, findSql);
        if (table.rows.length > 0 || attempt === attempts) {
          setFound({
            state: "ok",
            summary:
              table.rows.length > 0
                ? `Found it in Postgres in ${table.ms} ms. This is the row the engine stored after enriching it.`
                : "No row yet. Ingest may still be writing; try again in a few seconds.",
            table,
          });
          return;
        }
      } catch (error) {
        setFound({ state: "error", message: String(error) });
        return;
      }
      await pause(1000);
    }
  }

  async function explore() {
    setExplored({ state: "busy", label: "Running your query" });
    try {
      const table = await runSql(settings, sql);
      setExplored({
        state: "ok",
        summary: `${table.rows.length} row(s) in ${table.ms} ms.`,
        table,
      });
    } catch (error) {
      setExplored({ state: "error", message: String(error) });
    }
  }

  return (
    <article className="walkthrough">
      <header className="hero">
        <p className="eyebrow">Walkthrough</p>
        <h1>From one event to a database row.</h1>
        <p className="lede">
          Four steps. You check the API is up, send one event with the browser SDK, then read the
          exact row back from Postgres with SQL. After that you can query anything in the project.
        </p>
      </header>

      <section className="step">
        <h2>
          <span className="step-number">1</span>Is the API up?
        </h2>
        <p className="hint">
          <code>GET /v2/health</code> needs no credentials. If this fails, fix the API field at the
          top before anything else.
        </p>
        <div>
          <button type="button" className="primary" onClick={checkHealth}>
            Check {settings.base.replace("https://", "")}
          </button>
        </div>
        <AnswerView answer={health} />
      </section>

      <section className="step">
        <h2>
          <span className="step-number">2</span>Send one event
        </h2>
        <p className="hint">Fill in the fields at the top. They stay in this browser only.</p>
        <ul className="checklist">
          {credentials.map((item) => (
            <li key={item.key} className={settings[item.key] ? "done" : undefined}>
              <strong>{item.label}</strong>
              <span>{settings[item.key] ? "set" : "missing"}</span>
              <p>{item.why}</p>
            </li>
          ))}
        </ul>
        <pre className="snippet">
          <code>{`analytics.track("${eventName}", { run: "${run || "<random id>"}" });\nawait analytics.flush();`}</code>
        </pre>
        <div>
          <button type="button" className="primary" onClick={sendEvent} disabled={!canSend}>
            Send event to {settings.project || "your project"}
          </button>
        </div>
        <AnswerView answer={sent} />
        {log.length > 0 ? (
          <ol className="log">
            {log.slice(0, 5).map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="step">
        <h2>
          <span className="step-number">3</span>Find that event in the database
        </h2>
        <p className="hint">
          The SQL console reads read-only views over the tables. This runs against{" "}
          <code>POST /v2/projects/{settings.project || ":project"}/query</code> with your API token.
          Events from localhost are stored but flagged <code>is_localhost</code>, so{" "}
          <code>is_human</code> is false for them and the dashboard hides them.
        </p>
        <pre className="snippet">
          <code>{run ? findSql : "Send an event in step 2 first."}</code>
        </pre>
        <div>
          <button type="button" className="primary" onClick={findEvent} disabled={!run || !canRead}>
            Run the query
          </button>
        </div>
        {run && !canRead ? <p className="note warn">Add the API token at the top.</p> : null}
        <AnswerView answer={found} />
      </section>

      <section className="step">
        <h2>
          <span className="step-number">4</span>Look around
        </h2>
        <p className="hint">
          Pick a starting query or write your own. One <code>select</code> or <code>with</code>, 10
          second timeout. Views: <code>events</code>, <code>pageviews</code>, <code>sessions</code>,{" "}
          <code>visitors</code>, <code>people</code>, <code>web_vitals</code>, <code>issues</code>,{" "}
          <code>daily</code>, <code>daily_vitals</code>.
        </p>
        <div className="presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={sql === preset.sql ? "ghost active" : "ghost"}
              onClick={() => setSql(preset.sql)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          className="body-editor"
          rows={6}
          spellCheck={false}
          value={sql}
          onChange={(event) => setSql(event.target.value)}
        />
        <div>
          <button type="button" className="primary" onClick={explore} disabled={!canRead}>
            Run
          </button>
        </div>
        <AnswerView answer={explored} />
      </section>
    </article>
  );
}
