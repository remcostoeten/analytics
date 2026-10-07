import { useState } from "react";
import { buildUrl, curlSnippet, fetchSnippet, sendRequest } from "../request";
import type { Draft, Outcome, Settings } from "../request";
import type { Route } from "../spec";
import { CodeBlock } from "./code-block";
import { ResultView } from "./result-view";

type Props = {
  route: Route;
  settings: Settings;
  draft: Draft;
  outcome: Outcome | undefined;
  onDraft: (draft: Draft) => void;
  onOutcome: (outcome: Outcome) => void;
};

const authLabels: { [scheme: string]: string } = {
  apiToken: "API token",
  session: "Admin session",
  projectKey: "Project key",
  cronSecret: "Cron secret",
};

export function RoutePanel({ route, settings, draft, outcome, onDraft, onOutcome }: Props) {
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const writes = route.method !== "GET";
  const missing = route.params.filter((param) => param.required && !draft.values[param.name]);

  async function send() {
    if (writes && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setPending(true);
    onOutcome(await sendRequest(settings, route, draft));
    setPending(false);
  }

  function setValue(name: string, value: string) {
    onDraft({ ...draft, values: { ...draft.values, [name]: value } });
  }

  return (
    <article className="workbench">
      <div className="compose">
        <header className="panel-head">
          <p className="eyebrow">{route.tag}</p>
          <h1>{route.summary}</h1>
          <p className="endpoint">
            <span className={`badge ${route.method.toLowerCase()}`}>{route.method}</span>
            <code>{route.path}</code>
          </p>
          <div className="chips">
            {route.auth.length === 0 ? <span className="chip">No auth</span> : null}
            {route.auth.map((scheme) => (
              <span key={scheme} className="chip">
                {authLabels[scheme] ?? scheme}
              </span>
            ))}
          </div>
          {route.description ? <p className="lede">{route.description}</p> : null}
          {route.auth.length === 1 && route.auth[0] === "session" ? (
            <p className="note">
              This route needs the admin session cookie, which this page cannot send across origins.
              Sign in on the API in this browser and open the URL directly.
            </p>
          ) : null}
        </header>

        {route.params.length > 0 ? (
          <section className="block">
            <h2>Parameters</h2>
            <div className="fields">
              {route.params.map((param) => (
                <label
                  key={`${param.location}:${param.name}`}
                  className="field"
                  htmlFor={`param-${param.name}`}
                >
                  <span className="field-name">
                    {param.name}
                    <em>{param.location}</em>
                    {param.required ? <em className="required">required</em> : null}
                  </span>
                  {param.options.length > 0 ? (
                    <select
                      id={`param-${param.name}`}
                      value={draft.values[param.name] ?? ""}
                      onChange={(event) => setValue(param.name, event.target.value)}
                    >
                      <option value="">Not set</option>
                      {param.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`param-${param.name}`}
                      value={draft.values[param.name] ?? ""}
                      onChange={(event) => setValue(param.name, event.target.value)}
                      spellCheck={false}
                    />
                  )}
                  {param.description ? <span className="hint">{param.description}</span> : null}
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {route.body !== null ? (
          <section className="block">
            <h2>Body</h2>
            <textarea
              id={`body-${route.id}`}
              className="body-editor"
              value={draft.body}
              onChange={(event) => onDraft({ ...draft, body: event.target.value })}
              spellCheck={false}
              rows={Math.min(20, Math.max(6, draft.body.split("\n").length + 1))}
            />
          </section>
        ) : null}

        <div className="send-bar">
          <div className="send-row">
            <button
              type="button"
              className={armed ? "primary danger" : "primary"}
              onClick={send}
              disabled={pending || missing.length > 0}
            >
              {pending ? "Sending" : armed ? `Confirm ${route.method}` : "Send request"}
            </button>
            {armed ? (
              <button type="button" className="ghost" onClick={() => setArmed(false)}>
                Cancel
              </button>
            ) : null}
            <code className="url">{buildUrl(settings, route, draft.values)}</code>
          </div>
          {armed ? (
            <p className="note warn">
              This request changes data on {settings.base}. Press again to send it.
            </p>
          ) : null}
          {missing.length > 0 ? (
            <p className="note">Fill in {missing.map((param) => param.name).join(", ")} to send.</p>
          ) : null}
        </div>
      </div>

      <aside className="inspector">
        {outcome ? (
          <ResultView
            tone={outcome.ok ? "ok" : "error"}
            badge={outcome.status === 0 ? "Failed" : String(outcome.status)}
            meta={[`${outcome.ms} ms`, outcome.requestId]}
            body={outcome.body}
          />
        ) : (
          <ResultView
            tone="idle"
            badge="Waiting"
            meta={[]}
            body="Send the request to see the live response here."
          />
        )}
        <CodeBlock
          snippets={[
            { name: "curl", code: curlSnippet(settings, route, draft), language: "shellscript" },
            { name: "fetch", code: fetchSnippet(settings, route, draft), language: "typescript" },
          ]}
        />
      </aside>
    </article>
  );
}
