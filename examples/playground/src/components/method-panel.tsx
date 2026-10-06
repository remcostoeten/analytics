import { useState } from "react";
import type { Json } from "../json";
import { entryNotes } from "../sdk-catalog";
import type { Kit, SdkMethod } from "../sdk-catalog";
import { CodeBlock } from "./code-block";
import { ResultView } from "./result-view";

type Props = {
  method: SdkMethod;
  project: string;
  ready: string | null;
  kit: () => Kit;
  log: string[];
};

type Run = {
  ok: boolean;
  ms: number;
  body: Json | string;
};

export function MethodPanel({ method, project, ready, kit, log }: Props) {
  const [run, setRun] = useState<Run | null>(null);
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const code = method.code.replaceAll("PROJECT", project || "my-project");
  const runner = method.run;
  const language =
    method.entry === "@spoar/sdk/react" || method.code.includes("<") ? "tsx" : "typescript";

  async function execute() {
    if (!runner) return;
    if (method.writes && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setPending(true);
    const started = performance.now();
    try {
      const body = await runner(kit());
      setRun({ ok: true, ms: Math.round(performance.now() - started), body });
    } catch (error) {
      setRun({ ok: false, ms: Math.round(performance.now() - started), body: String(error) });
    }
    setPending(false);
  }

  return (
    <article className="workbench">
      <div className="compose">
        <header className="panel-head">
          <p className="eyebrow">{method.entry}</p>
          <h1>{method.name}</h1>
          <p className="endpoint">
            <span className={runner ? "badge run" : "badge code-only"}>
              {runner ? "Runnable" : "Code"}
            </span>
            <code>{method.signature}</code>
          </p>
          <p className="lede">{method.description}</p>
          <p className="hint">{entryNotes[method.entry]}</p>
        </header>

        <CodeBlock snippets={[{ name: "Example", code, language }]} />

        {runner ? (
          <div className="send-bar">
            <div className="send-row">
              <button
                type="button"
                className={armed ? "primary danger" : "primary"}
                onClick={execute}
                disabled={pending || ready !== null}
              >
                {pending ? "Running" : armed ? "Confirm run" : "Run in this page"}
              </button>
              {armed ? (
                <button type="button" className="ghost" onClick={() => setArmed(false)}>
                  Cancel
                </button>
              ) : null}
            </div>
            {ready ? <p className="note">{ready}</p> : null}
            {armed ? (
              <p className="note warn">This writes to {project}. Press again to run it.</p>
            ) : null}
          </div>
        ) : (
          <p className="note">
            Shown as code only: it needs a server, a framework or a real site to run.
          </p>
        )}
      </div>

      <aside className="inspector">
        {runner ? (
          <ResultView
            tone={run ? (run.ok ? "ok" : "error") : "idle"}
            badge={run ? (run.ok ? "Done" : "Threw") : "Waiting"}
            meta={run ? [`${run.ms} ms`] : []}
            body={run ? run.body : "Run the method to see what it returns."}
          />
        ) : null}
        {method.entry === "@spoar/sdk" ? (
          <section className="log-panel">
            <div className="result-head">
              <span className="result-title">Client log</span>
            </div>
            {log.length === 0 ? (
              <p className="hint log-empty">
                Sends, drops and errors from the browser client show up here.
              </p>
            ) : (
              <ol className="log">
                {log.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </aside>
    </article>
  );
}
