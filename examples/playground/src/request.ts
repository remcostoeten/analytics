import { parseJson } from "./json";
import type { Json } from "./json";
import type { Route } from "./spec";

export type Settings = {
  base: string;
  token: string;
  projectKey: string;
  project: string;
};

export type Values = { [name: string]: string };

export type Outcome = {
  status: number;
  ok: boolean;
  ms: number;
  requestId: string;
  body: Json | string;
};

export type Draft = {
  values: Values;
  body: string;
};

/**
 * @name buildUrl
 * @description Fills a route's path parameters and appends the non-empty query parameters.
 *
 * @example
 * buildUrl(settings, route, { project: "skriuw", from: "2026-10-01T00:00:00.000Z" });
 */
export function buildUrl(settings: Settings, route: Route, values: Values) {
  const path = route.params
    .filter((param) => param.location === "path")
    .reduce(
      (current, param) =>
        current.replace(
          `{${param.name}}`,
          encodeURIComponent(values[param.name] || `{${param.name}}`),
        ),
      route.path,
    );
  const query = new URLSearchParams(
    route.params
      .filter((param) => param.location === "query" && values[param.name])
      .map((param) => [param.name, values[param.name] ?? ""]),
  ).toString();
  return `${settings.base}${path}${query ? `?${query}` : ""}`;
}

function buildHeaders(settings: Settings, route: Route) {
  const headers: { [name: string]: string } = {};
  if (route.body !== null) headers["content-type"] = route.contentType;
  const bearer = route.auth.some((scheme) =>
    ["apiToken", "cronSecret", "session"].includes(scheme),
  );
  if (route.auth.includes("projectKey") && settings.projectKey && !settings.token) {
    headers["x-project-key"] = settings.projectKey;
  } else if (bearer && settings.token) {
    headers.authorization = `Bearer ${settings.token}`;
  }
  return headers;
}

/**
 * @name sendRequest
 * @description Calls a route and reports its status, timing, request id and parsed body.
 *
 * @example
 * const outcome = await sendRequest(settings, route, draft);
 */
export async function sendRequest(
  settings: Settings,
  route: Route,
  draft: Draft,
): Promise<Outcome> {
  const started = performance.now();
  try {
    const response = await fetch(buildUrl(settings, route, draft.values), {
      method: route.method,
      headers: buildHeaders(settings, route),
      body: route.body === null ? undefined : draft.body,
    });
    const raw = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      ms: Math.round(performance.now() - started),
      requestId: response.headers.get("x-request-id") ?? "",
      body: parseJson(raw) ?? raw,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      ms: Math.round(performance.now() - started),
      requestId: "",
      body: `The request did not reach the API: ${String(error)}. Check the base URL, and that the API allows this method from the browser.`,
    };
  }
}

function masked(headers: { [name: string]: string }) {
  return Object.entries(headers).map(([name, value]) => {
    if (name === "authorization") return [name, "Bearer $SPOAR_TOKEN"];
    if (name === "x-project-key") return [name, "$SPOAR_PROJECT_KEY"];
    return [name, value];
  });
}

/**
 * @name curlSnippet
 * @description A copyable curl command for a route, with credentials read from environment
 * variables instead of pasted in.
 *
 * @example
 * curlSnippet(settings, route, draft);
 */
export function curlSnippet(settings: Settings, route: Route, draft: Draft) {
  const lines = [`curl -X ${route.method} '${buildUrl(settings, route, draft.values)}'`];
  for (const [name, value] of masked(buildHeaders(settings, route))) {
    lines.push(`  -H "${name}: ${value}"`);
  }
  if (route.body !== null) lines.push(`  --data '${draft.body.replaceAll("'", "'\\''")}'`);
  return lines.join(" \\\n");
}

/**
 * @name fetchSnippet
 * @description The same call as `fetch` code for a browser or server runtime.
 *
 * @example
 * fetchSnippet(settings, route, draft);
 */
export function fetchSnippet(settings: Settings, route: Route, draft: Draft) {
  const headers = Object.entries(buildHeaders(settings, route))
    .map(([name, value]) => {
      if (name === "authorization")
        return `    authorization: \`Bearer \${process.env.SPOAR_TOKEN}\`,`;
      if (name === "x-project-key") return `    "x-project-key": process.env.SPOAR_PROJECT_KEY,`;
      return `    "${name}": "${value}",`;
    })
    .join("\n");
  const body =
    route.body === null ? "" : `\n  body: JSON.stringify(${draft.body.replaceAll("\n", "\n  ")}),`;
  return [
    `const response = await fetch("${buildUrl(settings, route, draft.values)}", {`,
    `  method: "${route.method}",`,
    `  headers: {\n${headers}\n  },${body}`,
    "});",
    "const data = await response.json();",
  ].join("\n");
}
