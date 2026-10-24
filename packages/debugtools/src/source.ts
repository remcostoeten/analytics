import { createClient } from "@spoar/client";
import type { Client, ClientResult } from "@spoar/client";
import type { LogList, QueryHistory, QueryResult, QuerySchema } from "@spoar/contract";
import { readConsoleGrant, saveConsoleGrant } from "@spoar/shared/console";
import type { Milliseconds, Nullable, ProjectID } from "@spoar/shared/semantic";

import { requestGrant } from "./loader/start";
import type { DebugtoolsOptions, WidgetGrant } from "./options";

export type TimeRange = "15m" | "1h" | "24h" | "7d" | "30d";

export type ConsoleSource = {
  project: ProjectID;
  schema: () => ClientResult<QuerySchema>;
  run: (sql: string, range: TimeRange) => ClientResult<QueryResult>;
  history: () => ClientResult<QueryHistory>;
  logs: (q: string) => ClientResult<LogList>;
};

export const timeRanges: { value: TimeRange; label: string; span: Milliseconds }[] = [
  { value: "15m", label: "Last 15 minutes", span: 15 * 60_000 },
  { value: "1h", label: "Last hour", span: 60 * 60_000 },
  { value: "24h", label: "Last 24 hours", span: 24 * 60 * 60_000 },
  { value: "7d", label: "Last 7 days", span: 7 * 24 * 60 * 60_000 },
  { value: "30d", label: "Last 30 days", span: 30 * 24 * 60 * 60_000 },
];

const refreshBefore: Milliseconds = 60_000;

function spanOf(range: TimeRange): Milliseconds {
  return timeRanges.find((item) => item.value === range)?.span ?? 60 * 60_000;
}

/**
 * @name clientSource
 * @description The console's data source over `@spoar/client` for one project: the view schema,
 * runs of SQL with the time range bound as `:from` and `:to` and the project as `:project`, the
 * caller's run history and the project's engine log lines that contain a text. With a widget grant it sends the `wt_` token and, a minute before it
 * expires, switches to a newer grant this tab holds or fetches a new one; without one it sends the
 * browser's session cookie, as in the dashboard.
 *
 * @example
 * const source = clientSource({ endpoint: "https://api.example.com", project: "site" }, grant);
 * const result = await source.run("select count(*) from events where ts >= :from", "24h");
 */
export function clientSource(
  options: DebugtoolsOptions,
  grant: Nullable<WidgetGrant>,
  now: () => Date = () => new Date(),
): ConsoleSource {
  let current = grant;
  let cached: Nullable<{ token: Nullable<string>; client: Client<string> }> = null;

  function build(token: Nullable<string>): Client<string> {
    if (cached && cached.token === token) return cached.client;
    const client = token
      ? createClient({ endpoint: options.endpoint, token, fetch: options.fetch })
      : createClient({ endpoint: options.endpoint, credentials: "include", fetch: options.fetch });
    cached = { token, client };
    return client;
  }

  async function refresh(grant: WidgetGrant): Promise<WidgetGrant> {
    const stored = readConsoleGrant(now());
    const newer = stored && Date.parse(stored.expiresAt) > Date.parse(grant.expiresAt);
    if (stored?.project === options.project && newer) return stored;
    const fresh = await requestGrant(options);
    if (!fresh) return grant;
    saveConsoleGrant(fresh);
    return fresh;
  }

  async function client(): Promise<Client<string>> {
    if (!current) return build(null);
    if (Date.parse(current.expiresAt) - now().getTime() < refreshBefore) {
      current = await refresh(current);
    }
    return build(current.token);
  }

  return {
    project: options.project,
    schema: async () => (await client()).sql.schema(),
    history: async () => (await client()).sql.history(),
    logs: async (q) => (await client()).project(options.project).logs({ q }),
    run: async (sql, range) => {
      const to = now();
      const from = new Date(to.getTime() - spanOf(range));
      return (await client())
        .project(options.project)
        .query(sql, { from: from.toISOString(), to: to.toISOString(), project: options.project });
    },
  };
}
