import type { Analytics } from "@spoar/sdk";
import type { Admin } from "@spoar/sdk/admin";
import type { Json } from "./json";

export type SdkEntry =
  | "@spoar/sdk"
  | "@spoar/sdk/plugins"
  | "@spoar/sdk/react"
  | "@spoar/sdk/next"
  | "@spoar/sdk/server"
  | "@spoar/sdk/proxy"
  | "@spoar/sdk/admin"
  | "@spoar/devtools";

export type Kit = {
  analytics: () => Analytics;
  admin: () => Admin<string>;
  project: string;
};

export type SdkMethod = {
  id: string;
  entry: SdkEntry;
  name: string;
  signature: string;
  description: string;
  code: string;
  writes: boolean;
  run: ((kit: Kit) => Promise<Json>) | null;
};

export const entryNotes: { [Entry in SdkEntry]: string } = {
  "@spoar/sdk":
    "The browser client. Runs in this page against the API base URL with your project key.",
  "@spoar/sdk/plugins":
    "Opt-in behaviour for the browser client. Pass them in `plugins` or add them later with `use`.",
  "@spoar/sdk/react": "React bindings around one browser client.",
  "@spoar/sdk/next": "The Next.js App Router adapter.",
  "@spoar/sdk/server":
    "Server-side tracking with a project secret. Code only here; it belongs on a server.",
  "@spoar/sdk/proxy": "A first-party `/_ra` route that forwards browser events to the API.",
  "@spoar/sdk/admin":
    "Typed reads and settings over the HTTP API with an API token. Runs in this page.",
  "@spoar/devtools": "The admin dev widget for your own site.",
};

function toJson<Value>(value: Value): Json {
  const printed = JSON.stringify(value);
  if (printed === undefined) return null;
  const copy: Json = JSON.parse(printed);
  return copy;
}

async function flushed(kit: Kit) {
  return toJson(await kit.analytics().flush());
}

function core(
  name: string,
  signature: string,
  description: string,
  code: string,
  run: SdkMethod["run"],
): SdkMethod {
  return {
    id: `@spoar/sdk:${name}`,
    entry: "@spoar/sdk",
    name,
    signature,
    description,
    code,
    writes: false,
    run,
  };
}

function codeOnly(
  entry: SdkEntry,
  name: string,
  signature: string,
  description: string,
  code: string,
): SdkMethod {
  return {
    id: `${entry}:${name}`,
    entry,
    name,
    signature,
    description,
    code,
    writes: false,
    run: null,
  };
}

function admin(
  name: string,
  signature: string,
  description: string,
  code: string,
  writes: boolean,
  run: SdkMethod["run"],
): SdkMethod {
  return {
    id: `@spoar/sdk/admin:${name}`,
    entry: "@spoar/sdk/admin",
    name,
    signature,
    description,
    code,
    writes,
    run,
  };
}

async function adminCall<Value, Failure>(
  result: Promise<{ ok: true; value: Value } | { ok: false; error: Failure }>,
) {
  const answer = await result;
  return answer.ok ? toJson(answer.value) : toJson({ error: answer.error });
}

const setup = `import { createAnalytics } from "@spoar/sdk";

const analytics = createAnalytics({
  project: "PROJECT",
  key: "pk_live_...",
  endpoint: "https://api.analytics.remcostoeten.nl/v2/events",
});`;

const adminSetup = `import { createAdmin } from "@spoar/sdk/admin";

const admin = createAdmin({
  endpoint: "https://api.analytics.remcostoeten.nl",
  token: process.env.SPOAR_TOKEN,
});`;

function importLine(names: string, entry: string) {
  return `import { ${names} } from "${entry}";`;
}

const today = new Date().toISOString().slice(0, 10);

export const sdkMethods: SdkMethod[] = [
  core(
    "createAnalytics",
    "createAnalytics(config?: AnalyticsConfig): Analytics",
    "Creates the browser client. Without an `endpoint` in development it logs events instead of sending them.",
    setup,
    async (kit) => toJson(kit.analytics().status()),
  ),
  core(
    "track",
    "track(name, props?): void",
    "Queues a custom event. Event names and props are typed when you pass an event map to `createAnalytics`.",
    `analytics.track("signup", { plan: "pro" });\nawait analytics.flush();`,
    async (kit) => {
      kit.analytics().track("playground_track", { source: "playground" });
      return flushed(kit);
    },
  ),
  core(
    "page",
    "page(props?): void",
    "Queues a pageview for the current URL. The `pageviews` plugin does this on navigation for you.",
    `analytics.page({ section: "docs" });`,
    async (kit) => {
      kit.analytics().page({ source: "playground" });
      return flushed(kit);
    },
  ),
  core(
    "identify",
    "identify(userId: string, traits?): void",
    "Links the visitor to your own user id and stores traits on the person.",
    `analytics.identify("user_42", { plan: "pro" });`,
    async (kit) => {
      kit.analytics().identify("playground-user", { source: "playground" });
      return flushed(kit);
    },
  ),
  core(
    "register",
    "register(props): void",
    "Adds props to every event that follows.",
    `analytics.register({ release: "2026.10.04" });`,
    async (kit) => {
      kit.analytics().register({ playground: true });
      return toJson(kit.analytics().status());
    },
  ),
  core(
    "captureError",
    "captureError(error, context?): void",
    "Reports an error. It is grouped into an issue by fingerprint.",
    `try {\n  checkout();\n} catch (error) {\n  analytics.captureError(error, { tags: { step: "payment" } });\n}`,
    async (kit) => {
      kit
        .analytics()
        .captureError(new Error("Playground test error"), { tags: { source: "playground" } });
      return flushed(kit);
    },
  ),
  core(
    "captureMessage",
    "captureMessage(message, context?): void",
    "Reports a message as an issue, without a stack.",
    `analytics.captureMessage("Payment provider slow", { level: "warning" });`,
    async (kit) => {
      kit.analytics().captureMessage("Playground test message", { level: "info" });
      return flushed(kit);
    },
  ),
  core(
    "scope",
    "scope(tags): Analytics",
    "Returns a child client that adds tags to everything it sends.",
    `const checkout = analytics.scope({ area: "checkout" });\ncheckout.track("step", { n: 2 });`,
    async (kit) => {
      kit.analytics().scope({ area: "playground" }).track("playground_scoped");
      return flushed(kit);
    },
  ),
  core(
    "use",
    "use(plugin): () => void",
    "Adds a plugin after creation and returns a function that removes it.",
    `import { clicks } from "@spoar/sdk/plugins";\n\nconst remove = analytics.use(clicks());`,
    null,
  ),
  core(
    "consent",
    "consent.grant() / consent.revoke() / consent.status()",
    'Controls consent when the client runs with `consent: "required"`.',
    `analytics.consent.grant();\nanalytics.consent.status(); // "granted"`,
    async (kit) => toJson({ status: kit.analytics().consent.status() }),
  ),
  core(
    "optOut",
    "optOut() / optIn() / isOptedOut()",
    "Stops and resumes tracking for this browser.",
    `analytics.optOut();\nanalytics.isOptedOut(); // true`,
    async (kit) => toJson({ optedOut: kit.analytics().isOptedOut() }),
  ),
  core(
    "reset",
    "reset(): void",
    "Forgets the identified user and registered props, for example on sign-out.",
    `analytics.reset();`,
    async (kit) => {
      kit.analytics().reset();
      return toJson(kit.analytics().status());
    },
  ),
  core(
    "flush",
    "flush(): Promise<FlushResult>",
    "Sends the queue now and reports how many events were accepted, duplicates or failed.",
    `const { accepted, failed } = await analytics.flush();`,
    flushed,
  ),
  core(
    "shutdown",
    "shutdown(): Promise<void>",
    "Flushes and stops the client.",
    `await analytics.shutdown();`,
    null,
  ),
  core(
    "on",
    'on("send" | "error" | "drop", handler): () => void',
    "Listens to what the client does. The log below this panel is built with it.",
    `const stop = analytics.on("drop", (event, reason) => console.warn(reason, event));`,
    null,
  ),
  core(
    "status",
    "status(): Status",
    "Queue size, consent, endpoint, route and the last send or error.",
    `analytics.status();`,
    async (kit) => toJson(kit.analytics().status()),
  ),
  core(
    "route",
    "route(template: string | null): void",
    "Sets the route template, such as `/blog/[slug]`, for the events that follow.",
    `analytics.route("/blog/[slug]");`,
    async (kit) => {
      kit.analytics().route("/playground/[method]");
      return toJson(kit.analytics().status());
    },
  ),
  core(
    "definePlugin",
    "definePlugin(plugin: Plugin): Plugin",
    "Types a custom plugin.",
    `import { definePlugin } from "@spoar/sdk";\n\nexport const hello = definePlugin({\n  name: "hello",\n  setup(client) {\n    client.track("hello");\n  },\n});`,
    null,
  ),

  codeOnly(
    "@spoar/sdk/plugins",
    "pageviews",
    "pageviews()",
    "Sends a pageview on start and on every client-side navigation, including hash routes. A repeat of the same URL is skipped.",
    `createAnalytics({ plugins: [pageviews()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "clicks",
    "clicks()",
    "Sends `click` for elements marked with `data-ra-click`, with the value as `label` and each `data-ra-prop-*` attribute as a prop.",
    `createAnalytics({ plugins: [clicks()] });\n\n// <button data-ra-click="upgrade" data-ra-prop-plan="pro">Upgrade</button>`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "outboundLinks",
    "outboundLinks()",
    "Sends `outbound_click` for links to another host and `file_download` for links to files such as pdf or zip.",
    `createAnalytics({ plugins: [outboundLinks()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "engagement",
    "engagement()",
    "Sends `engagement` with the milliseconds a page was visible when it is left or hidden.",
    `createAnalytics({ plugins: [engagement()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "scrollDepth",
    "scrollDepth()",
    "Sends `scroll_depth` with the deepest point reached, as a percentage, when the page is left or hidden.",
    `createAnalytics({ plugins: [scrollDepth()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "forms",
    "forms()",
    "Sends `form_submit` with the form's id or name and its action. Field values are never read.",
    `createAnalytics({ plugins: [forms()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "errors",
    "errors()",
    "Captures uncaught errors and unhandled promise rejections with recent breadcrumbs.",
    `createAnalytics({ plugins: [errors()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "scrub",
    "scrub(text: string): string",
    "Drops query strings and replaces emails, long tokens and long numbers with `[x]`.",
    `scrub("GET /api/users?token=abc failed for ada@example.com");\n// "GET /api/users[x] failed for [x]"`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "notFound",
    "notFound()",
    'Sends `not_found` with the referrer on pages that carry `<meta name="ra-not-found">`.',
    `createAnalytics({ plugins: [notFound()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "experiments",
    "experiments(assigned)",
    "Registers each variant as an `experiment:<id>` prop and sends one `experiment_exposure` per experiment on start.",
    `createAnalytics({ plugins: [experiments({ pricing: "b" })] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "groups",
    "groups(): Groups",
    "Puts events in groups, such as a company or team.",
    `const teams = groups();\ncreateAnalytics({ plugins: [teams] });\nteams.set("company", "acme", { plan: "pro" });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "ignoreSelf",
    "ignoreSelf()",
    "Opening any tracked page with `?ra=ignore` opts this browser out; `?ra=track` opts it back in.",
    `createAnalytics({ plugins: [ignoreSelf()] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "speedInsights",
    "speedInsights(options?)",
    "Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) per route.",
    `createAnalytics({ plugins: [speedInsights({ sampleRate: 0.5 })] });`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "speedProps",
    "speedProps(metric, sampleRate, connection): Props",
    "The props a speed event carries, for custom speed reporting.",
    `const props = speedProps(metric, 1, "4g");`,
  ),
  codeOnly(
    "@spoar/sdk/plugins",
    "botSignals",
    "botSignals()",
    "Adds client bot hints, such as `navigator.webdriver` and headless signs, to every event's `signals`.",
    `createAnalytics({ plugins: [botSignals()] });`,
  ),

  codeOnly(
    "@spoar/sdk/react",
    "AnalyticsProvider",
    "<AnalyticsProvider client={analytics}>",
    "Makes a client available to hooks below it.",
    `<AnalyticsProvider client={analytics}>\n  <App />\n</AnalyticsProvider>`,
  ),
  codeOnly(
    "@spoar/sdk/react",
    "useAnalytics",
    "useAnalytics(): Analytics",
    "Returns the client from the nearest provider.",
    `const analytics = useAnalytics();\nanalytics.track("signup");`,
  ),
  codeOnly(
    "@spoar/sdk/react",
    "useRoutePageviews",
    "useRoutePageviews(path, route)",
    "Sends a pageview whenever `path` changes, for routers other than Next.",
    `useRoutePageviews(location.pathname, "/blog/[slug]");`,
  ),
  codeOnly(
    "@spoar/sdk/react",
    "TrackClick",
    "<TrackClick name props?>",
    "Sends an event when its only child is clicked, after the child's own `onClick`. Renders no element.",
    `<TrackClick name="cta" props={{ place: "hero" }}>\n  <button>Start</button>\n</TrackClick>`,
  ),
  codeOnly(
    "@spoar/sdk/react",
    "ErrorBoundary",
    "<ErrorBoundary fallback>",
    "Catches render errors below it, records them with `captureError` and renders `fallback`.",
    `<ErrorBoundary fallback={<CrashScreen />} tags={{ area: "checkout" }}>\n  <Checkout />\n</ErrorBoundary>`,
  ),
  codeOnly(
    "@spoar/sdk/react",
    "computeRoute",
    "computeRoute(pathname, params): string",
    "Turns a path and its params into a route template.",
    `computeRoute("/blog/hello", { slug: "hello" }); // "/blog/[slug]"`,
  ),

  codeOnly(
    "@spoar/sdk/next",
    "Analytics",
    "<Analytics />",
    "Sends a pageview on every App Router navigation with the route template. Create the client with `pageviews: false`.",
    `<AnalyticsProvider client={analytics}>\n  <Analytics />\n  {children}\n</AnalyticsProvider>`,
  ),

  codeOnly(
    "@spoar/sdk/server",
    "createServerAnalytics",
    "createServerAnalytics(config?): ServerAnalytics",
    "Creates a server client. Every call resolves to a `ServerResult`.",
    `import { createServerAnalytics } from "@spoar/sdk/server";\n\nconst server = createServerAnalytics({\n  project: "PROJECT",\n  secret: process.env.SPOAR_SECRET,\n});`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "track",
    "track(name, props?, context?): Promise<ServerResult>",
    "Sends an event from the server. Pass `request` to attribute it to the visitor.",
    `await server.track("invoice_paid", { amount: 49 }, { request });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "identify",
    "identify(userId, traits?, context?)",
    "Stores traits on a person.",
    `await server.identify("user_42", { plan: "pro" });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "group",
    "group(type, id, traits?, context?)",
    "Stores traits on a group.",
    `await server.group("company", "acme", { seats: 12 });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "captureError",
    "captureError(error, context?)",
    "Reports a server error.",
    `await server.captureError(error, { request });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "captureMessage",
    "captureMessage(message, context?)",
    "Reports a server message.",
    `await server.captureMessage("Webhook retried", { level: "warning" });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "scope",
    "scope(tags): ServerAnalytics",
    "Child client with extra tags.",
    `const jobs = server.scope({ area: "jobs" });`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "withErrors",
    "withErrors(handler)",
    "Wraps a route handler so thrown errors are captured.",
    `export const POST = server.withErrors(async (request) => {\n  return Response.json(await handle(request));\n});`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "flush",
    "flush() / shutdown()",
    "Sends the queue now, or flushes and stops.",
    `await server.flush();`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "visitorDetails",
    "visitorDetails(headers): VisitorDetails",
    "The visitor's IP and user agent from request headers, read in the same order the API uses, for forwarding.",
    `const details = visitorDetails(request.headers);`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "alertRoute",
    "alertRoute({ secret, on }): Handler",
    "A route that verifies signed alert webhooks and calls your handlers.",
    `export const POST = alertRoute({\n  secret: process.env.SPOAR_ALERT_SECRET,\n  on: { "issue.new": async (event) => notifyTeam(event.issue.title) },\n});`,
  ),
  codeOnly(
    "@spoar/sdk/server",
    "verifyAlert",
    "verifyAlert(request, secret)",
    "Checks an alert webhook's signature yourself and returns the parsed body.",
    `const verified = await verifyAlert(request, process.env.SPOAR_ALERT_SECRET);`,
  ),

  codeOnly(
    "@spoar/sdk/proxy",
    "createProxy",
    "createProxy(config?): Handler",
    "Serves a same-origin path such as `/_ra` and forwards events to `POST /v2/events` with the project secret.",
    `// app/_ra/route.ts\nimport { createProxy } from "@spoar/sdk/proxy";\n\nexport const POST = createProxy();`,
  ),
  codeOnly(
    "@spoar/sdk/proxy",
    "createPageCounter",
    "createPageCounter(config?)",
    "Counts HTML page requests on the server as `page_request` events, for middleware.",
    `const countPage = createPageCounter({ secret: env.RA_SECRET });\ncountPage(request, event.waitUntil);`,
  ),
  codeOnly(
    "@spoar/sdk/proxy",
    "isPageRequest",
    "isPageRequest(request): boolean",
    "True for a browser loading an HTML page that is not a prefetch.",
    `if (isPageRequest(request)) countPage(request);`,
  ),

  admin(
    "createAdmin",
    "createAdmin({ endpoint, token }): Admin",
    "Creates the admin client. Every method resolves to `{ ok, value }` or `{ ok, error }`.",
    adminSetup,
    false,
    null,
  ),
  admin(
    "stats",
    "stats(project, options?)",
    "Headline numbers for a range.",
    `const result = await admin.stats("PROJECT", { from: "2026-10-01T00:00:00.000Z" });`,
    false,
    (kit) => adminCall(kit.admin().stats(kit.project)),
  ),
  admin(
    "timeseries",
    "timeseries(project, options)",
    "One metric over time.",
    `await admin.timeseries("PROJECT", { metric: "visitors", interval: "day" });`,
    false,
    (kit) => adminCall(kit.admin().timeseries(kit.project, { metric: "visitors" })),
  ),
  admin(
    "breakdown",
    "breakdown(project, dimension, options?)",
    "Top values of a dimension such as `page`, `country` or `prop:<key>`.",
    `await admin.breakdown("PROJECT", "page", { limit: 10 });`,
    false,
    (kit) => adminCall(kit.admin().breakdown(kit.project, "page")),
  ),
  admin(
    "lifecycle",
    "lifecycle(project, options?)",
    "New, returning, resurrected and dormant visitors.",
    `await admin.lifecycle("PROJECT");`,
    false,
    (kit) => adminCall(kit.admin().lifecycle(kit.project)),
  ),
  admin(
    "issues",
    "issues(project, options?)",
    "Error issues, newest first.",
    `await admin.issues("PROJECT");`,
    false,
    (kit) => adminCall(kit.admin().issues(kit.project)),
  ),
  admin(
    "alerts.list",
    "alerts.list(project)",
    "The project's alert targets.",
    `await admin.alerts.list("PROJECT");`,
    false,
    (kit) => adminCall(kit.admin().alerts.list(kit.project)),
  ),
  admin(
    "alerts.sync",
    "alerts.sync(project, targets)",
    "Replaces all alert targets with this list.",
    `import { discord, mail } from "@spoar/sdk/admin";\n\nawait admin.alerts.sync("PROJECT", [\n  mail({ to: ["you@example.com"] }),\n  discord({ url: process.env.DISCORD_WEBHOOK }),\n]);`,
    true,
    null,
  ),
  admin(
    "alerts.set",
    "alerts.set(project, target)",
    "Adds or changes one target.",
    `await admin.alerts.set("PROJECT", webhook({ name: "ops", url: "https://example.com/hooks/spoar" }));`,
    true,
    null,
  ),
  admin(
    "alerts.remove",
    "alerts.remove(project, name)",
    "Removes a target.",
    `await admin.alerts.remove("PROJECT", "ops");`,
    true,
    null,
  ),
  admin(
    "alerts.test",
    "alerts.test(project, name)",
    "Sends a test alert to a target.",
    `await admin.alerts.test("PROJECT", "ops");`,
    true,
    null,
  ),
  admin(
    "alerts.rotate",
    "alerts.rotate(project, name)",
    "Rotates a webhook target's signing secret.",
    `const { value } = await admin.alerts.rotate("PROJECT", "ops");`,
    true,
    null,
  ),
  admin(
    "alerts.deliveries",
    "alerts.deliveries(project, query?)",
    "Recent deliveries and their outcome.",
    `await admin.alerts.deliveries("PROJECT");`,
    false,
    (kit) => adminCall(kit.admin().alerts.deliveries(kit.project)),
  ),
  admin(
    "alerts.status",
    "alerts.status()",
    "Whether alert delivery is configured and running.",
    `await admin.alerts.status();`,
    false,
    (kit) => adminCall(kit.admin().alerts.status()),
  ),
  admin(
    "annotations.list",
    "annotations.list(project, query?)",
    "Notes on the timeline, such as releases.",
    `await admin.annotations.list("PROJECT");`,
    false,
    (kit) => adminCall(kit.admin().annotations.list(kit.project)),
  ),
  admin(
    "annotations.create",
    "annotations.create(project, input)",
    "Adds a note to the timeline.",
    `await admin.annotations.create("PROJECT", {\n  title: "v2.0 released",\n  date: "${today}",\n  kind: "release",\n});`,
    true,
    (kit) =>
      adminCall(
        kit.admin().annotations.create(kit.project, { title: "Playground test", date: new Date() }),
      ),
  ),
  admin(
    "annotations.update",
    "annotations.update(project, id, changes)",
    "Changes a note.",
    `await admin.annotations.update("PROJECT", id, { note: "Rolled back at 14:00" });`,
    true,
    null,
  ),
  admin(
    "annotations.remove",
    "annotations.remove(project, id)",
    "Deletes a note.",
    `await admin.annotations.remove("PROJECT", id);`,
    true,
    null,
  ),

  codeOnly(
    "@spoar/devtools",
    "mount",
    "mount(options): () => void",
    "Mounts the dev widget in a Shadow DOM panel and returns an unmount function.",
    `${importLine("mount", "@spoar/devtools")}\n\nconst unmount = mount({\n  endpoint: "https://api.analytics.remcostoeten.nl",\n  project: "PROJECT",\n});`,
  ),
  codeOnly(
    "@spoar/devtools",
    "Devtools",
    "<Devtools endpoint project />",
    "The widget as a React component, from `@spoar/devtools/react` or `@spoar/devtools/next`.",
    `${importLine("Devtools", "@spoar/devtools/next")}\n\n<Devtools endpoint="https://api.analytics.remcostoeten.nl" project="PROJECT" />`,
  ),
];
