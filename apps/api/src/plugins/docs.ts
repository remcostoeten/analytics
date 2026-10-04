import { openapi } from "@elysiajs/openapi";
import { favicon } from "../modules/landing/page";

const theme = `
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap");
:root {
  --scalar-font: "Geist", ui-sans-serif, system-ui, sans-serif;
  --scalar-font-code: "Geist Mono", ui-monospace, "SFMono-Regular", monospace;
  --scalar-radius: 6px;
  --scalar-radius-lg: 8px;
  --scalar-radius-xl: 10px;
}
.light-mode {
  --scalar-color-1: #0a0a0a;
  --scalar-color-2: #4a4a4a;
  --scalar-color-3: #6b6b6b;
  --scalar-color-accent: #fe5101;
  --scalar-background-1: #fafafa;
  --scalar-background-2: #ffffff;
  --scalar-background-3: #f0f0f0;
  --scalar-background-accent: color-mix(in srgb, #fe5101 10%, transparent);
  --scalar-border-color: #d9d9d9;
  --scalar-color-green: #1fae78;
  --scalar-color-blue: #2f6fde;
  --scalar-color-orange: #fe5101;
  --scalar-color-yellow: #b7791f;
  --scalar-color-red: #e5484d;
  --scalar-color-purple: #7c5cd6;
}
.dark-mode {
  --scalar-color-1: #ededed;
  --scalar-color-2: #b4b4b4;
  --scalar-color-3: #8a8a8a;
  --scalar-color-accent: #fe5101;
  --scalar-background-1: #0a0a0a;
  --scalar-background-2: #111111;
  --scalar-background-3: #1a1a1a;
  --scalar-background-accent: color-mix(in srgb, #fe5101 14%, transparent);
  --scalar-border-color: #262626;
  --scalar-color-green: #54f2b3;
  --scalar-color-blue: #6ea8fe;
  --scalar-color-orange: #fe7a3a;
  --scalar-color-yellow: #f5b544;
  --scalar-color-red: #ff6b70;
  --scalar-color-purple: #b39dff;
}
.light-mode .t-doc__sidebar,
.dark-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-3);
  --scalar-sidebar-border-color: var(--scalar-border-color);
  --scalar-sidebar-item-hover-background: var(--scalar-background-3);
  --scalar-sidebar-item-hover-color: var(--scalar-color-1);
  --scalar-sidebar-item-active-background: var(--scalar-background-3);
  --scalar-sidebar-color-active: var(--scalar-color-1);
  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-color: var(--scalar-color-3);
}
`;

export const apiTags = [
  { name: "Ingest", description: "Send events from browsers and servers" },
  {
    name: "Sign-in",
    description: "GitHub sign-in through Better Auth and the current session",
  },
  { name: "Projects", description: "Projects, their visibility and keys" },
  { name: "Tokens", description: "API tokens for scripts and CI" },
  { name: "Reads", description: "Aggregate reads for one project" },
  {
    name: "Visitor-level reads",
    description: "Events, visitors and sessions at the detail level",
  },
  { name: "All projects", description: "The same reads across every readable project" },
  { name: "Speed", description: "Core Web Vitals and the Real Experience Score" },
  { name: "Issues", description: "Error tracking, issues and error rules" },
  { name: "Annotations", description: "Dated labels on a project's time series" },
  {
    name: "Dev widget",
    description: "The admin dev widget: bootstrap, live visitors and sessions, logs, overview",
  },
  { name: "Alerts", description: "Alert targets, deliveries and their status" },
  { name: "SQL", description: "The read-only SQL console and saved queries" },
  { name: "Jobs", description: "Scheduled jobs and operations metrics" },
  { name: "System", description: "Health and documentation" },
];

const securitySchemes = {
  apiToken: {
    type: "http",
    scheme: "bearer",
    description:
      "An API token from `POST /v2/tokens` (`at_live_...`), or a project's secret key (`sk_...`) for server-side ingest.",
  },
  session: {
    type: "apiKey",
    in: "cookie",
    name: "__Secure-ra.session_token",
    description:
      "The admin session cookie set by GitHub sign-in at `/v2/auth`. The browser sends it on its own.",
  },
  projectKey: {
    type: "apiKey",
    in: "header",
    name: "X-Project-Key",
    description:
      "A project's public key (`pk_...`) for browser ingest, from an allowed origin; `?key=` works too.",
  },
  cronSecret: {
    type: "http",
    scheme: "bearer",
    description: "The `CRON_SECRET` the scheduled jobs workflow sends.",
  },
} as const;

/**
 * @name docs
 * @description Serves the interactive API docs at `/v2/openapi` and the OpenAPI 3 document at
 * `/v2/openapi/json`, generated from the same schemas that validate requests. WebSocket routes
 * are left out, as OpenAPI 3 cannot describe them; the landing page and the docs site list them.
 *
 * @example
 * new Elysia({ prefix: "/v2" }).use(docs("2.0.0-next"));
 */
export function docs(version: string) {
  return openapi({
    path: "/openapi",
    scalar: {
      version: "1.72.4",
      theme: "none",
      layout: "modern",
      customCss: theme,
      withDefaultFonts: false,
      favicon: `data:image/svg+xml,${encodeURIComponent(favicon)}`,
      defaultOpenAllTags: false,
      expandAllModelSections: false,
      hideClientButton: true,
      showDeveloperTools: "never",
      documentDownloadType: "json",
      operationTitleSource: "summary",
      agent: { disabled: true },
      mcp: { disabled: true },
      telemetry: false,
    },
    documentation: {
      info: {
        title: "Analytics API",
        version,
        description:
          "The v2 API for Spoar: event ingest, reads, sign-in, projects and tokens. Every route is under `/v2`.\n\n[API status and endpoints](https://api.analytics.remcostoeten.nl) · [SDK docs](https://docs.analytics.remcostoeten.nl) · [Source](https://github.com/remcostoeten/analytics)",
      },
      servers: [{ url: "https://api.analytics.remcostoeten.nl", description: "Production" }],
      tags: apiTags,
      components: { securitySchemes },
    },
    exclude: { methods: ["WS"] },
  });
}
