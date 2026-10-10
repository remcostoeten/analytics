import type { SqlPreset } from "./sql-presets";

export type SqlVariantId = "sql" | "client" | "curl";

export type SqlVariant = {
  id: SqlVariantId;
  file: string;
  lang: string;
  source: string;
};

function day(date: Date) {
  return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
}

/**
 * @name sqlVariants
 * @description The three ways to ask a preset's question: the SQL itself, the `@spoar/client` read
 * route that answers it without SQL, and the `curl` call to the SQL route with the window bound to
 * whole days. All three need a token: `read` scope for the client, `sql` scope for the SQL route.
 *
 * @example
 * sqlVariants(preset, { project: "docs", endpoint: apiEndpoint(), window: showcaseWindow() });
 */
export function sqlVariants(
  preset: SqlPreset,
  target: { project: string; endpoint: string; window: { from: Date; to: Date } },
): SqlVariant[] {
  const project = JSON.stringify(target.project);
  const client = `import { createClient } from "@spoar/client";

const api = createClient({
  endpoint: ${JSON.stringify(target.endpoint)},
  token: process.env.RA_READ_TOKEN,
});

const ${preset.id} = await api
  .project(${project})
  .period("30d")
  .human()
  .${preset.read};`;
  const body = JSON.stringify(
    {
      sql: preset.sql.replaceAll(/\s+/g, " "),
      params: { from: day(target.window.from), to: day(target.window.to) },
    },
    null,
    2,
  );
  const curl = `curl ${target.endpoint}/v2/projects/${encodeURIComponent(target.project)}/query \\
  -H "authorization: Bearer $RA_SQL_TOKEN" \\
  -H "content-type: application/json" \\
  -d @- <<'JSON'
${body}
JSON`;

  return [
    { id: "sql", file: `queries/${preset.id}.sql`, lang: "sql", source: preset.sql },
    { id: "client", file: `queries/${preset.id}.ts`, lang: "ts", source: client },
    { id: "curl", file: `queries/${preset.id}.sh`, lang: "bash", source: curl },
  ];
}
