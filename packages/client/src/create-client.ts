import { annotationsAdmin } from "./admin/annotations";
import type { AnnotationsAdmin } from "./admin/annotations";
import { projectsAdmin } from "./admin/projects";
import type { ProjectsAdmin } from "./admin/projects";
import { sqlAdmin } from "./admin/sql";
import type { SqlAdmin } from "./admin/sql";
import { systemAdmin } from "./admin/system";
import type { SystemAdmin } from "./admin/system";
import { alertsAdmin } from "./admin/targets";
import type { AlertsAdmin } from "./admin/targets";
import { tokensAdmin } from "./admin/tokens";
import type { TokensAdmin } from "./admin/tokens";
import { allScope, projectScope } from "./reads/index";
import type { AllScope, ProjectScope } from "./reads/index";
import { createSend } from "./send";
import type { ClientOptions } from "./types";

export type ClientBase<Projects extends string> = AllScope & {
  project: (project: Projects) => ProjectScope;
  projects: ProjectsAdmin<Projects>;
  tokens: TokensAdmin;
  alerts: AlertsAdmin<Projects>;
  annotations: AnnotationsAdmin<Projects>;
  sql: SqlAdmin;
  system: SystemAdmin;
};

type ProjectProperties<Projects extends string> = string extends Projects
  ? Record<never, never>
  : { [Project in Exclude<Projects, keyof ClientBase<Projects>>]: ProjectScope };

export type Client<Projects extends string> = ClientBase<Projects> & ProjectProperties<Projects>;

/**
 * @name createClient
 * @description The typed client for the v2 API. The client itself is the combined scope over
 * every project the caller may read, `project(id)` is the scope over one project, and each
 * project named in `projects` is also a property, so `client.skriuw.stats()` works. Scopes chain
 * (`period`, `between`, `traffic`, `human`, `environment`, `where`, `exclude`) and end in one
 * read route. `projects`, `tokens`, `alerts`, `annotations`, `sql` and `system` hold the admin
 * routes. Every call resolves to `{ ok: true, value }` or `{ ok: false, error }` and never throws;
 * `error.code` is a code from the contract's error catalog or `NETWORK`, `TIMEOUT`, `ABORTED`,
 * `BAD_URL` or `BAD_RESPONSE`. Pass `token` for an `at_` API token, or `credentials: "include"`
 * from a browser signed in to the dashboard; a public project needs neither.
 *
 * @example
 * const api = createClient({ endpoint: "https://api.analytics.remcostoeten.nl", token, projects: ["skriuw", "dora"] });
 * const pages = await api.skriuw.period("7d").where({ country: "NL" }).breakdown("page", { metrics: ["visitors", "bounce_rate"] });
 * if (pages.ok) console.table(pages.value.data);
 */
export function createClient<const Projects extends string = string>(
  options: ClientOptions<Projects>,
): Client<Projects> {
  const send = createSend(options);

  function project(id: Projects): ProjectScope {
    return projectScope(send, id);
  }

  const base: ClientBase<Projects> = {
    ...allScope(send),
    project,
    projects: projectsAdmin<Projects>(send),
    tokens: tokensAdmin(send),
    alerts: alertsAdmin<Projects>(send),
    annotations: annotationsAdmin<Projects>(send),
    sql: sqlAdmin(send),
    system: systemAdmin(send),
  };

  const named: { [project: string]: ProjectScope } = {};
  for (const id of options.projects ?? []) {
    if (!(id in base)) named[id] = project(id);
  }

  // `named` holds one ProjectScope per name in `projects`, which is what ProjectProperties declares.
  return { ...named, ...base } as Client<Projects>;
}
