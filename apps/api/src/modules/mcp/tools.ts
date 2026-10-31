import { Type } from "@sinclair/typebox";
import type { TObject } from "@sinclair/typebox";
import {
  CheckKeys,
  CreateProject,
  CreateToken,
  Environment,
  FilterQuery,
  IssuesQuery,
  Period,
  ProjectsQuery,
  QueryRequest,
  RangeQuery,
  RotateKey,
  SpeedQuery,
  TimeseriesQuery,
  TrafficFilter,
  UpdateProject,
} from "@spoar/contract";
import { defaultOrigins } from "@spoar/engine";
import type { Json } from "@spoar/shared/http";

import type { Caller } from "../../access/types";
import type { JsonObject } from "./protocol";

export type ToolResult = { text: string; structured?: JsonObject; isError?: boolean };

export type Forward = (input: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: { [name: string]: unknown };
  body?: JsonObject;
}) => Promise<Response>;

export type ToolContext = {
  caller: Caller;
  forward: Forward;
  allowed: (tool: Tool) => boolean;
};

export type Tool = {
  name: string;
  title: string;
  description: string;
  level: "read" | "sql" | "admin";
  readOnly: boolean;
  destructive?: boolean;
  inputSchema: TObject;
  call: (input: JsonObject, context: ToolContext) => Promise<ToolResult>;
};

const Project = Type.String({ minLength: 1, maxLength: 64, description: "The project id." });

const Scope = Type.Object({
  project: Project,
  from: Type.Optional(Type.String({ format: "date-time", description: "Start, inclusive." })),
  to: Type.Optional(Type.String({ format: "date-time", description: "End, exclusive." })),
  period: Type.Optional(Period),
  traffic: Type.Optional(TrafficFilter),
  environment: Type.Optional(Environment),
  filter: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description: 'Dimension to value, or `!value` to exclude, such as `{ "country": "NL" }`.',
    }),
  ),
});

const Limit = Type.Optional(Type.Integer({ minimum: 1, maximum: 100, description: "Rows." }));

function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @name text
 * @description A JSON value as a string: strings as they are, anything else serialized.
 *
 * @example
 * text("docs"); // "docs"
 */
export function text(value: Json | undefined): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

function errorMessage(payload: Json, status: number) {
  if (isObject(payload) && isObject(payload.error) && typeof payload.error.message === "string") {
    return `${text(payload.error.code)}: ${payload.error.message}`;
  }
  return `The API answered ${status}`;
}

async function fromResponse(response: Response, note?: string): Promise<ToolResult> {
  const text = await response.text();
  const payload: Json = text ? JSON.parse(text) : null;
  if (!response.ok) return { text: errorMessage(payload, response.status), isError: true };
  const data = isObject(payload) && "data" in payload ? payload.data : (payload ?? { ok: true });
  const structured: JsonObject = {
    ...(isObject(data) ? data : { data }),
    ...(isObject(payload) && "nextCursor" in payload ? { nextCursor: payload.nextCursor } : {}),
    ...(note ? { note } : {}),
  };
  return { text: JSON.stringify(structured, null, 2), structured };
}

function split<Value extends JsonObject>(input: Value, keys: string[]) {
  const picked: JsonObject = {};
  const rest: JsonObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (keys.includes(key)) picked[key] = value;
    else rest[key] = value;
  }
  return { picked, rest };
}

function projectPath(input: JsonObject) {
  return `/v2/projects/${encodeURIComponent(text(input.project))}`;
}

function readTool(
  name: string,
  title: string,
  description: string,
  inputSchema: TObject,
  path: (input: JsonObject) => string,
  bodyKeys: string[] = [],
): Tool {
  return {
    name,
    title,
    description,
    level: "read",
    readOnly: true,
    inputSchema,
    call: async (input, context) => {
      const { picked, rest } = split(input, ["project", ...bodyKeys]);
      return fromResponse(
        await context.forward({ method: "GET", path: path(picked), query: rest }),
      );
    },
  };
}

function withProject(schema: TObject) {
  return Type.Object({ project: Project, ...schema.properties });
}

const devPorts = [3000, 4321, 5173];

function localOrigins(port: number) {
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
}

const CreateProjectInput = Type.Object({
  ...CreateProject.properties,
  devPort: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 65535,
      description:
        "The local dev server port, added to `allowedOrigins` as `http://localhost:<port>` so the first local run is not rejected. Without it, 3000, 4321 and 5173 are added.",
    }),
  ),
});

const listProjects = readTool(
  "list_projects",
  "List projects",
  "Every project the token may read, with its domain, visibility and public key.",
  ProjectsQuery,
  () => "/v2/projects",
);

const getProject = readTool(
  "get_project",
  "Get a project",
  "One project with its settings and public key. The secret key is never readable; rotate it when it is lost.",
  Type.Object({ project: Project }),
  projectPath,
);

const stats = readTool(
  "stats",
  "Headline numbers",
  "Visitors, pageviews, sessions, bounce rate and time on page for a period, compared to the previous one.",
  Scope,
  (input) => `${projectPath(input)}/stats`,
);

const timeseries = readTool(
  "timeseries",
  "One metric over time",
  "A metric per hour, day, week or month over the period, optionally with the previous period beside it; for questions such as whether traffic dropped last week.",
  Type.Object({ ...Scope.properties, ...TimeseriesQuery.properties }),
  (input) => `${projectPath(input)}/timeseries`,
);

const breakdown = readTool(
  "breakdown",
  "Break down by a dimension",
  "Top values of one dimension: page, entry_page, exit_page, referrer, referrer_domain, channel, utm_source, utm_medium, utm_campaign, country, region, city, device, browser, os, screen, language, event, route, release, visitor_type or host.",
  Type.Object({
    ...Scope.properties,
    dimension: Type.String({ minLength: 1, description: "The dimension name." }),
    metrics: Type.Optional(
      Type.String({ description: "Comma-separated metrics; default `visitors,pageviews`." }),
    ),
    limit: Limit,
  }),
  (input) => `${projectPath(input)}/breakdown/${encodeURIComponent(text(input.dimension))}`,
  ["dimension"],
);

const speed = readTool(
  "speed",
  "Core Web Vitals",
  "The Real Experience Score and each vital at a percentile, with the routes that score worst.",
  Type.Object({
    project: Project,
    ...RangeQuery.properties,
    filter: FilterQuery.properties.filter,
    ...SpeedQuery.properties,
  }),
  (input) => `${projectPath(input)}/speed`,
);

const issues = readTool(
  "issues",
  "Error issues",
  "Grouped JavaScript errors with counts, affected visitors and first and last seen.",
  Type.Object({ project: Project, ...IssuesQuery.properties, limit: Limit }),
  (input) => `${projectPath(input)}/issues`,
);

const realtime = readTool(
  "realtime",
  "Visitors right now",
  "Active visitors in the last five minutes and the pages they are on.",
  Type.Object({ project: Project }),
  (input) => `${projectPath(input)}/realtime`,
);

const keyStatus = readTool(
  "key_status",
  "Key status",
  "When the public and secret keys were generated and the last key check. `waiting` means no pageview has arrived since the public key was generated; `rejected` means events arrived from an origin outside `allowedOrigins`.",
  Type.Object({ project: Project }),
  (input) => `${projectPath(input)}/keys`,
);

const sql: Tool = {
  name: "sql",
  title: "Run SQL",
  description:
    "One read-only SELECT or WITH statement against the documented views, limited to the project, or across every project you may query when `project` is left out. Needs a token with the `sql` scope.",
  level: "sql",
  readOnly: true,
  inputSchema: Type.Object({ project: Type.Optional(Project), ...QueryRequest.properties }),
  call: async (input, context) => {
    const { picked, rest } = split(input, ["project"]);
    const path = picked.project ? `${projectPath(picked)}/query` : "/v2/query";
    return fromResponse(await context.forward({ method: "POST", path, body: rest }));
  },
};

const createProject: Tool = {
  name: "create_project",
  title: "Create a project",
  description:
    "Creates a project and answers with its public key and, this once, its secret key. Localhost origins are added to `allowedOrigins` so local development is accepted; `https://<domain>` and `https://www.<domain>` are added when no origins are given.",
  level: "admin",
  readOnly: false,
  inputSchema: CreateProjectInput,
  call: async (input, context) => {
    const { picked, rest } = split(input, ["devPort"]);
    const given = Array.isArray(rest.allowedOrigins) ? rest.allowedOrigins.map(text) : null;
    const ports = typeof picked.devPort === "number" ? [picked.devPort] : devPorts;
    const local = ports.flatMap(localOrigins);
    const origins = [...(given ?? defaultOrigins(text(rest.domain))), ...local];
    const response = await context.forward({
      method: "POST",
      path: "/v2/projects",
      body: { ...rest, allowedOrigins: [...new Set(origins)] },
    });
    return fromResponse(
      response,
      `Allowed origins include ${local.join(", ")} for local development; remove them with update_project before going live if you prefer a strict list. The secret key is shown only in this answer: write it to the env file and do not repeat it.`,
    );
  },
};

const updateProject: Tool = {
  name: "update_project",
  title: "Change project settings",
  description:
    "Changes name, visibility, allowed origins, retention or the SQL and widget switches. Only the fields sent change.",
  level: "admin",
  readOnly: false,
  inputSchema: withProject(UpdateProject),
  call: async (input, context) => {
    const { picked, rest } = split(input, ["project"]);
    return fromResponse(
      await context.forward({ method: "PATCH", path: projectPath(picked), body: rest }),
    );
  },
};

const rotateKey: Tool = {
  name: "rotate_key",
  title: "Rotate a key",
  description:
    "Replaces the public (`pk_live_`) or secret (`sk_live_`) key. The old key stops working at once, so sites keep failing until their env or build carries the new one.",
  level: "admin",
  readOnly: false,
  destructive: true,
  inputSchema: withProject(RotateKey),
  call: async (input, context) => {
    const { picked, rest } = split(input, ["project"]);
    const response = await context.forward({
      method: "POST",
      path: `${projectPath(picked)}/keys`,
      body: rest,
    });
    const kind =
      rest.kind === "public"
        ? "public key is in the browser config"
        : "secret key is in SPOAR_SECRET";
    return fromResponse(
      response,
      `The old key stopped working now. Every site using it drops events until it is updated: the ${kind}, which lives in the deployed env (for example \`vercel env add\`) and, for build-time values, needs a new build. Write the new key locally, then redeploy.`,
    );
  },
};

const checkKeys: Tool = {
  name: "check_keys",
  title: "Check the keys",
  description:
    "Verifies the keys and stores the result. Pass `secretKey` to confirm an `sk_live_` value by hash; it is never stored. The public key is `connected` once a real pageview arrived, `waiting` until then.",
  level: "admin",
  readOnly: false,
  inputSchema: withProject(CheckKeys),
  call: async (input, context) => {
    const { picked, rest } = split(input, ["project"]);
    const response = await context.forward({
      method: "POST",
      path: `${projectPath(picked)}/keys/check`,
      body: rest,
    });
    return fromResponse(
      response,
      "`waiting` means no pageview has arrived yet: open the site, then check again. `rejected` means events came from an origin outside allowedOrigins. `not-tested` means no secretKey was passed.",
    );
  },
};

const keyUsage: Tool = {
  name: "key_usage",
  title: "Key usage",
  description:
    "When and from which origin the public and the secret key last authorized an ingest batch. The quickest way to see that a new site is sending: the public key shows the browser's origin after the first page load, the secret key the proxy's.",
  level: "admin",
  readOnly: true,
  inputSchema: Type.Object({ project: Project }),
  call: async (input, context) =>
    fromResponse(
      await context.forward({ method: "GET", path: `${projectPath(input)}/key-usage` }),
      "A null lastUsedAt means that key has not authorized a batch yet. An unexpected lastUsedOrigin usually means the origin is missing from allowedOrigins; add it with add_origins.",
    ),
};

const addOrigins: Tool = {
  name: "add_origins",
  title: "Add allowed origins",
  description:
    "Adds origins to a project's `allowedOrigins` without touching the ones already there. Use this rather than update_project to allow one more origin, such as a preview host.",
  level: "admin",
  readOnly: false,
  inputSchema: Type.Object({
    project: Project,
    origins: Type.Array(Type.String({ format: "uri" }), {
      minItems: 1,
      description: "Exact origins, such as `https://preview.example.com`.",
    }),
  }),
  call: async (input, context) => {
    const current = await context.forward({ method: "GET", path: projectPath(input) });
    if (!current.ok) return fromResponse(current);
    const project: Json = await current.json();
    const data = isObject(project) && isObject(project.data) ? project.data : {};
    const existing = Array.isArray(data.allowedOrigins) ? data.allowedOrigins.map(text) : [];
    const added = Array.isArray(input.origins) ? input.origins.map(text) : [];
    const merged = [...new Set([...existing, ...added])];
    const response = await context.forward({
      method: "PATCH",
      path: projectPath(input),
      body: { allowedOrigins: merged },
    });
    return fromResponse(
      response,
      existing.length === 0
        ? "The project allowed every origin before; it now allows only the listed ones."
        : undefined,
    );
  },
};

const listTokens: Tool = {
  name: "list_tokens",
  title: "List API tokens",
  description:
    "Every API token with its scope, projects, last use and expiry. Values are never shown.",
  level: "admin",
  readOnly: true,
  inputSchema: Type.Object({}),
  call: async (_input, context) =>
    fromResponse(await context.forward({ method: "GET", path: "/v2/tokens" })),
};

const revokeToken: Tool = {
  name: "revoke_token",
  title: "Revoke an API token",
  description: "Stops a token at once, by its `tok_` id from list_tokens.",
  level: "admin",
  readOnly: false,
  destructive: true,
  inputSchema: Type.Object({
    token: Type.String({ minLength: 1, description: "The token id (`tok_...`), not its value." }),
  }),
  call: async (input, context) =>
    fromResponse(
      await context.forward({
        method: "DELETE",
        path: `/v2/tokens/${encodeURIComponent(text(input.token))}`,
      }),
      "The token stopped working now; anything that used it needs a new one from create_token.",
    ),
};

const createToken: Tool = {
  name: "create_token",
  title: "Create an API token",
  description:
    "A `read`, `sql` or `admin` token for scripts, CI or another MCP client, limited to `projectIds` or every project. The value is in this answer only.",
  level: "admin",
  readOnly: false,
  inputSchema: CreateToken,
  call: async (input, context) =>
    fromResponse(await context.forward({ method: "POST", path: "/v2/tokens", body: input })),
};

/**
 * @name tools
 * @description The MCP tools, each a call to one existing route with the caller's own token:
 * the reads any token may make, `sql` for the `sql` scope, and for the `admin` scope the
 * project, origin, key and token writes plus key usage. There is no project deletion; that
 * stays with the owner in the dashboard.
 *
 * @example
 * tools.find((tool) => tool.name === "stats");
 */
export const tools: Tool[] = [
  listProjects,
  getProject,
  stats,
  timeseries,
  breakdown,
  speed,
  issues,
  realtime,
  keyStatus,
  sql,
  createProject,
  updateProject,
  addOrigins,
  rotateKey,
  checkKeys,
  keyUsage,
  listTokens,
  revokeToken,
  createToken,
];

/**
 * @name mayUse
 * @description Whether a caller may see and call a tool: every signed-in member and token gets
 * the reads; `sql` needs the `sql` token scope or a member above viewer; admin tools need the
 * `admin` scope or an owner or admin member. The routes decide again per project.
 *
 * @example
 * mayUse({ kind: "token", scope: "read", ... }, rotateKey); // false
 */
export function mayUse(caller: Caller, tool: Tool): boolean {
  if (caller.kind === "anonymous" || caller.kind === "cron") return false;
  if (tool.level === "read") return true;
  if (caller.kind === "token") {
    return tool.level === "sql" ? caller.scope === "sql" : caller.scope === "admin";
  }
  if (caller.role === "owner") return true;
  return tool.level === "sql" ? caller.role !== "viewer" : caller.role === "admin";
}
