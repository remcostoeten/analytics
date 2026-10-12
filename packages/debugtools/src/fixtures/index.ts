import type { ConsoleData, DatasetField } from "../types";

const baseFields: DatasetField[] = [
  { name: "_time", kind: "time" },
  { name: "type", kind: "string" },
  { name: "path", kind: "string" },
  { name: "referrer", kind: "string" },
  { name: "session.id", kind: "string" },
  { name: "visitor.hash", kind: "string" },
  { name: "geo.country", kind: "string" },
  { name: "device.type", kind: "string" },
  { name: "browser.name", kind: "string" },
  { name: "bot.score", kind: "number" },
  { name: "is_bot", kind: "boolean" },
];

function dataset(name: string, extra: DatasetField[]) {
  return { name, fields: [...extra, ...baseFields] };
}

export const consoleFixture: ConsoleData = {
  tabs: ["Query", "Stream", "Dashboards", "Monitors", "Datasets"],
  timeRange: "Last 30 mins",
  query: [
    "['events']",
    "| where ['type'] == \"error\" and ['path'] startswith \"/checkout\"",
    "| summarize count() by ['error.message']",
  ],
  keywords: [
    "where",
    "summarize",
    "by",
    "and",
    "or",
    "not",
    "startswith",
    "project",
    "extend",
    "sort",
    "order",
    "take",
    "top",
    "limit",
    "asc",
    "desc",
  ],
  datasets: [
    dataset("events", [{ name: "error.message", kind: "string" }]),
    dataset("sessions", [
      { name: "duration_ms", kind: "number" },
      { name: "pageviews", kind: "number" },
      { name: "bounced", kind: "boolean" },
    ]),
    dataset("web-vitals", [
      { name: "lcp_ms", kind: "number" },
      { name: "inp_ms", kind: "number" },
      { name: "cls", kind: "number" },
    ]),
    dataset("errors", [
      { name: "error.message", kind: "string" },
      { name: "error.stack", kind: "string" },
    ]),
    dataset("bot-signals", [{ name: "signal", kind: "string" }]),
    dataset("clicks", [{ name: "selector", kind: "string" }]),
    dataset("forms", [{ name: "form.id", kind: "string" }]),
    dataset("experiments", [
      { name: "experiment", kind: "string" },
      { name: "variant", kind: "string" },
    ]),
    dataset("engagement", [{ name: "active_ms", kind: "number" }]),
    dataset("not-found", []),
    dataset("outbound-links", [{ name: "href", kind: "string" }]),
    dataset("api-requests", [
      { name: "status", kind: "number" },
      { name: "latency_ms", kind: "number" },
    ]),
  ],
  quickQueries: [
    { label: "Recent events", icon: "list" },
    { label: "Events over time", icon: "trend" },
  ],
  recentQueries: [
    [
      "['sessions']",
      "| where ['bounced'] == false",
      "| summarize avg(['duration_ms']) by bin(_time, 1h)",
    ],
    [
      "['web-vitals']",
      "| where ['path'] == \"/checkout\"",
      "| summarize percentile(['lcp_ms'], 75)",
    ],
    ["['events']", "| where ['type'] == \"pageview\"", "| top 10 by count() by ['referrer']"],
    ["['bot-signals']", "| summarize count() by ['signal']"],
  ],
  agent: {
    name: "spoar-agent",
    prompt: "Why did checkout errors spike at 14:21 UTC?",
    steps: [
      { kind: "status", text: "Let me check using the **Spoar MCP**" },
      { kind: "bullet", text: "Queried error counts and pageviews on /checkout" },
      { kind: "bullet", text: "Narrowed the window to **14:21:08** to **14:22:14 UTC**" },
      { kind: "bullet", text: "Correlated sessions, web vitals and the release annotation" },
      {
        kind: "paragraph",
        text: "Errors on /checkout rose from **0.4%** to **6.1%** while traffic stayed flat.",
      },
      {
        kind: "paragraph",
        text: "**92%** of them came from **Safari 18** on iOS, all on the new payment form.",
      },
      {
        kind: "paragraph",
        text: "**Likely cause:** the 14:19 deploy shipped a payment script that throws on iOS Safari.",
      },
    ],
    followUp: "Which sessions hit the error twice?",
    footer: "spoar-mcp connected • remcostoeten.nl",
  },
};
