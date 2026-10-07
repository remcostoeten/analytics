import { createAnalytics } from "@spoar/sdk";
import type { Analytics } from "@spoar/sdk";
import { createAdmin } from "@spoar/sdk/admin";
import { useEffect, useRef, useState } from "react";
import { MethodPanel } from "./components/method-panel";
import { Overview } from "./components/overview";
import { RoutePanel } from "./components/route-panel";
import { SettingsBar } from "./components/settings-bar";
import { Sidebar } from "./components/sidebar";
import { Walkthrough } from "./components/walkthrough";
import type { Draft, Outcome, Settings } from "./request";
import { sdkMethods } from "./sdk-catalog";
import type { Kit } from "./sdk-catalog";
import { useSettings } from "./settings";
import { loadSpec } from "./spec";
import type { Route, Spec } from "./spec";

const logLimit = 40;

function trimBase(base: string) {
  let trimmed = base;
  while (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1);
  return trimmed;
}

function initialDraft(route: Route, settings: Settings): Draft {
  const values = Object.fromEntries(
    route.params
      .filter((param) => param.name === "project" && param.location === "path")
      .map((param) => [param.name, settings.project]),
  );
  return { values, body: route.body ?? "" };
}

function selectedFromHash() {
  return decodeURIComponent(location.hash.slice(1)) || "overview";
}

function readiness(method: string, entry: string, settings: Settings) {
  if (entry === "@spoar/sdk/admin") {
    if (!settings.token) return "Add an API token above to run admin methods.";
    if (!settings.project && method !== "alerts.status") return "Add a project above.";
    return null;
  }
  if (!settings.projectKey)
    return "Add the project's public key above to run browser client methods.";
  return null;
}

export function App() {
  const [settings, setSettings] = useSettings();
  const base = trimBase(settings.base);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [specError, setSpecError] = useState("");
  const [selected, setSelected] = useState(selectedFromHash);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<{ [id: string]: Draft }>({});
  const [outcomes, setOutcomes] = useState<{ [id: string]: Outcome }>({});
  const [log, setLog] = useState<string[]>([]);
  const client = useRef<{ key: string; analytics: Analytics } | null>(null);

  useEffect(() => {
    let current = true;
    setSpecError("");
    loadSpec(base).then(
      (loaded) => {
        if (!current) return;
        if (loaded) setSpec(loaded);
        else setSpecError(`No OpenAPI document at ${base}/v2/openapi/json.`);
      },
      (error) => {
        if (current) setSpecError(`Could not reach ${base}: ${String(error)}`);
      },
    );
    return () => {
      current = false;
    };
  }, [base]);

  useEffect(() => {
    function onHash() {
      setSelected(selectedFromHash());
    }
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  function select(id: string) {
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    setSelected(id);
    document.querySelector(".main")?.scrollTo({ top: 0 });
  }

  function append(line: string) {
    const stamp = new Date().toLocaleTimeString();
    setLog((lines) => [`${stamp}  ${line}`, ...lines].slice(0, logLimit));
  }

  function analytics() {
    const key = `${base}|${settings.project}|${settings.projectKey}`;
    if (client.current?.key === key) return client.current.analytics;
    void client.current?.analytics.shutdown();
    const created = createAnalytics({
      project: settings.project,
      key: settings.projectKey,
      endpoint: `${base}/v2/events`,
      pageviews: false,
      environment: "playground",
    });
    created.on("send", (envelope) => append(`send  ${envelope.events.length} event(s)`));
    created.on("drop", (event, reason) => append(`drop  ${event.name}: ${reason}`));
    created.on("error", (code, detail) => append(`error ${code}: ${detail}`));
    client.current = { key, analytics: created };
    return created;
  }

  function kit(): Kit {
    return {
      analytics,
      admin: () => createAdmin({ endpoint: base, token: settings.token }),
      project: settings.project,
    };
  }

  const routes = spec?.groups.flatMap((group) => group.routes) ?? [];
  const route = routes.find((candidate) => candidate.id === selected);
  const method = sdkMethods.find((candidate) => candidate.id === selected);
  const effective = { ...settings, base };

  return (
    <div className="shell">
      <SettingsBar settings={settings} version={spec?.version ?? ""} onChange={setSettings} />
      <div className="layout">
        <Sidebar
          groups={spec?.groups ?? []}
          methods={sdkMethods}
          selected={selected}
          query={query}
          onQuery={setQuery}
          onSelect={select}
        />
        <main className="main">
          {specError ? <p className="note warn">{specError}</p> : null}
          {route ? (
            <RoutePanel
              key={route.id}
              route={route}
              settings={effective}
              draft={drafts[route.id] ?? initialDraft(route, settings)}
              outcome={outcomes[route.id]}
              onDraft={(draft) => setDrafts((current) => ({ ...current, [route.id]: draft }))}
              onOutcome={(outcome) =>
                setOutcomes((current) => ({ ...current, [route.id]: outcome }))
              }
            />
          ) : null}
          {method ? (
            <MethodPanel
              key={method.id}
              method={method}
              project={settings.project}
              ready={readiness(method.name, method.entry, settings)}
              kit={kit}
              log={log}
            />
          ) : null}
          {selected === "overview" ? (
            <Overview spec={spec} methods={sdkMethods} base={base} onSelect={select} />
          ) : null}
          {selected === "walkthrough" ? (
            <Walkthrough settings={effective} kit={kit} log={log} />
          ) : null}
          {selected !== "overview" && selected !== "walkthrough" && !route && !method && spec ? (
            <p className="note">Nothing matches this link. Pick a route or method on the left.</p>
          ) : null}
          {selected !== "overview" && selected !== "walkthrough" && !spec && !specError ? (
            <p className="note">Loading the API's OpenAPI document.</p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
