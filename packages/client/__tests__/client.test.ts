import { describe, expect, test } from "bun:test";

import { createClient, mail } from "../src/index";
import type { ClientOptions } from "../src/index";

type Call = {
  method: string;
  url: URL;
  authorization: string | null;
  accept: string | null;
  credentials: RequestCredentials | undefined;
  body: string;
};
type Reply = { status: number; body?: object; text?: string };

function fakeApi(reply: (call: Call) => Reply) {
  const calls: Call[] = [];
  async function fetcher(url: string, init: RequestInit) {
    const headers = new Headers(init.headers);
    const call = {
      method: init.method ?? "GET",
      url: new URL(url),
      authorization: headers.get("authorization"),
      accept: headers.get("accept"),
      credentials: init.credentials,
      body: typeof init.body === "string" ? init.body : "",
    };
    calls.push(call);
    const answer = reply(call);
    if (answer.text !== undefined) return new Response(answer.text, { status: answer.status });
    if (answer.body === undefined) return new Response(null, { status: answer.status });
    return Response.json(answer.body, { status: answer.status });
  }
  return {
    calls,
    fetcher,
    paths: () => calls.map((call) => decodeURIComponent(`${call.url.pathname}${call.url.search}`)),
  };
}

function client(
  fetcher: ClientOptions["fetch"],
  extra: Omit<Partial<ClientOptions>, "projects"> = {},
) {
  return createClient({
    endpoint: "https://api.example.test/",
    token: "at_read",
    fetch: fetcher,
    projects: ["skriuw", "dora"],
    ...extra,
  });
}

function empty() {
  return { status: 200, body: { data: [] } };
}

describe("scope chain", () => {
  test("links build the query and leave the previous scope untouched", async () => {
    const api = fakeApi(empty);
    const nl = client(api.fetcher).skriuw.period("7d").human().where({ country: "NL" });
    await nl.stats();
    await nl.exclude({ page: "/admin" }).environment("all").stats();
    await nl.where({ country: "BE" }).stats();
    await nl.between("2026-09-01T00:00:00.000Z", new Date("2026-10-01T00:00:00.000Z")).stats();
    await nl.stats();
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/stats?period=7d&traffic=human&filter[country]=NL",
      "/v2/projects/skriuw/stats?period=7d&traffic=human&environment=all&filter[country]=NL&filter[page]=!/admin",
      "/v2/projects/skriuw/stats?period=7d&traffic=human&filter[country]=BE",
      "/v2/projects/skriuw/stats?from=2026-09-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z&traffic=human&filter[country]=NL",
      "/v2/projects/skriuw/stats?period=7d&traffic=human&filter[country]=NL",
    ]);
  });

  test("apply merges a plain options object and toQuery shows the result", () => {
    const api = fakeApi(empty);
    const scope = client(api.fetcher)
      .project("dora")
      .apply({ period: "30d", traffic: "all", filter: { device: "mobile" } })
      .where({ browser: "Chrome" });
    expect(scope.toQuery()).toEqual({
      period: "30d",
      traffic: "all",
      "filter[device]": "mobile",
      "filter[browser]": "Chrome",
    });
  });

  test("the client itself is the combined scope and project is a dimension there", async () => {
    const api = fakeApi(empty);
    const api2 = client(api.fetcher).period("24h").where({ project: "skriuw" });
    await api2.stats();
    await api2.projectBreakdown({ metrics: ["visitors", "sum:prop.revenue"], limit: 10 });
    await api2.people({ limit: 5 });
    await api2.person("user_1");
    expect(api.paths()).toEqual([
      "/v2/stats?period=24h&filter[project]=skriuw",
      "/v2/breakdown/project?period=24h&filter[project]=skriuw&metrics=visitors,sum:prop.revenue&limit=10",
      "/v2/people?limit=5",
      "/v2/people/user_1",
    ]);
  });
});

describe("read terminals", () => {
  test("every aggregate and explore route gets the scope query plus its own options", async () => {
    const api = fakeApi(empty);
    const reads = client(api.fetcher).skriuw.period("7d");
    await reads.timeseries("avg:prop.duration", { interval: "day", compare: "previous" });
    await reads.breakdown("prop:plan", { metrics: ["visitors", "conversion_rate"], cursor: "20" });
    await reads.realtime({ include: "visitors", limit: 10 });
    await reads.realtimeEvents({ limit: 50, after: "48213" });
    await reads.paths("/pricing", { direction: "previous", limit: 5 });
    await reads.retention({ interval: "month" });
    await reads.lifecycle({ interval: "week" });
    await reads.stickiness();
    await reads.heatmap({ metric: "pageviews", timezone: "Europe/Amsterdam" });
    await reads.map({ level: "city", limit: 100 });
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/timeseries?period=7d&metric=avg:prop.duration&interval=day&compare=previous",
      "/v2/projects/skriuw/breakdown/prop:plan?period=7d&metrics=visitors,conversion_rate&cursor=20",
      "/v2/projects/skriuw/realtime?include=visitors&limit=10",
      "/v2/projects/skriuw/realtime/events?period=7d&limit=50&after=48213",
      "/v2/projects/skriuw/paths?period=7d&page=/pricing&direction=previous&limit=5",
      "/v2/projects/skriuw/retention?period=7d&interval=month",
      "/v2/projects/skriuw/lifecycle?period=7d&interval=week",
      "/v2/projects/skriuw/stickiness?period=7d",
      "/v2/projects/skriuw/heatmap?period=7d&metric=pageviews&timezone=Europe/Amsterdam",
      "/v2/projects/skriuw/map?period=7d&level=city&limit=100",
    ]);
    expect(api.calls.every((call) => call.method === "GET")).toBe(true);
    expect(api.calls.every((call) => call.authorization === "Bearer at_read")).toBe(true);
  });

  test("speed routes drop traffic and take their own options", async () => {
    const api = fakeApi(empty);
    const reads = client(api.fetcher).skriuw.period("7d").traffic("all").where({ route: "/" });
    await reads.speed({ device: "mobile", percentile: 75 });
    await reads.speedTimeseries({ metric: "lcp", interval: "hour" });
    await reads.speedRoutes({ group: "path", minShare: 0, limit: 20 });
    await reads.speedElements({ cursor: "5" });
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/speed?period=7d&filter[route]=/&device=mobile&percentile=75",
      "/v2/projects/skriuw/speed/timeseries?period=7d&filter[route]=/&interval=hour&metric=lcp",
      "/v2/projects/skriuw/speed/routes?period=7d&filter[route]=/&group=path&minShare=0&limit=20",
      "/v2/projects/skriuw/speed/elements?period=7d&filter[route]=/&cursor=5",
    ]);
  });

  test("issue and visitor-level routes", async () => {
    const api = fakeApi((call) => (call.method === "DELETE" ? { status: 204 } : empty()));
    const reads = client(api.fetcher).dora.period("24h");
    await reads.issues({ status: "open", limit: 10 });
    await reads.issue("iss_1");
    await reads.issueEvents("iss_1", { cursor: "3" });
    await reads.updateIssue("iss_1", { status: "resolved" });
    await reads.errorRules();
    await reads.createErrorRule({ kind: "ignore", field: "message", pattern: "ResizeObserver" });
    await reads.removeErrorRule("rule_1");
    await reads.events({ name: "signup", limit: 100 });
    await reads.visitors({ cursor: "40" });
    await reads.visitor("v_1");
    await reads.visitorVisits("v_1", { limit: 3 });
    await reads.updateVisitor("v_1", { isInternal: true });
    await reads.sessions();
    await reads.sessionEvents("s_1");
    expect(api.paths()).toEqual([
      "/v2/projects/dora/issues?status=open&limit=10",
      "/v2/projects/dora/issues/iss_1",
      "/v2/projects/dora/issues/iss_1/events?cursor=3",
      "/v2/projects/dora/issues/iss_1",
      "/v2/projects/dora/error-rules",
      "/v2/projects/dora/error-rules",
      "/v2/projects/dora/error-rules/rule_1",
      "/v2/projects/dora/events?period=24h&name=signup&limit=100",
      "/v2/projects/dora/visitors?period=24h&cursor=40",
      "/v2/projects/dora/visitors/v_1",
      "/v2/projects/dora/visitors/v_1/visits?limit=3",
      "/v2/projects/dora/visitors/v_1",
      "/v2/projects/dora/sessions?period=24h",
      "/v2/projects/dora/sessions/s_1/events",
    ]);
    expect(api.calls.map((call) => call.method)).toEqual([
      "GET",
      "GET",
      "GET",
      "PATCH",
      "GET",
      "POST",
      "DELETE",
      "GET",
      "GET",
      "GET",
      "GET",
      "PATCH",
      "GET",
      "GET",
    ]);
    expect(JSON.parse(api.calls[3]?.body ?? "")).toEqual({ status: "resolved" });
    expect(JSON.parse(api.calls[11]?.body ?? "")).toEqual({ isInternal: true });
  });

  test("project-only routes and SQL", async () => {
    const api = fakeApi(() => ({ status: 200, body: { columns: [], rows: [] } }));
    const reads = client(api.fetcher).skriuw.period("90d");
    await reads.realtimeVisitors({ limit: 20 });
    await reads.realtimeSessions();
    await reads.overview();
    await reads.annotations({ limit: 50 });
    await reads.query("select 1", { project: "skriuw" });
    await client(api.fetcher).query("select 2");
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/realtime/visitors?limit=20",
      "/v2/projects/skriuw/realtime/sessions",
      "/v2/projects/skriuw/overview",
      "/v2/projects/skriuw/annotations?period=90d&limit=50",
      "/v2/projects/skriuw/query",
      "/v2/query",
    ]);
    expect(JSON.parse(api.calls[4]?.body ?? "")).toEqual({
      sql: "select 1",
      params: { project: "skriuw" },
    });
    expect(JSON.parse(api.calls[5]?.body ?? "")).toEqual({ sql: "select 2" });
  });

  test("downloads ask for a file and return its text", async () => {
    const api = fakeApi(() => ({ status: 200, text: "value,visitors\n/,702\n" }));
    const files = client(api.fetcher).skriuw.period("30d").download;
    const csv = await files.breakdown("page", {
      format: "csv",
      metrics: ["visitors"],
      limit: 1000,
    });
    await files.events({ format: "sql", name: "pageview" });
    await files.sessionEvents("s_1", { format: "csv" });
    expect(csv).toEqual({ ok: true, value: "value,visitors\n/,702\n" });
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/breakdown/page?period=30d&metrics=visitors&format=csv&limit=1000",
      "/v2/projects/skriuw/events?period=30d&name=pageview&format=sql",
      "/v2/projects/skriuw/sessions/s_1/events?format=csv",
    ]);
    expect(api.calls[0]?.accept).toContain("text/csv");
  });

  test("liveEvents follows the cursor and stops on abort", async () => {
    const pages = [
      { data: [{ id: "1" }, { id: "2" }], nextCursor: "2" },
      { data: [{ id: "3" }], nextCursor: "3" },
    ];
    const controller = new AbortController();
    const api = fakeApi(() => {
      const page = pages.shift() ?? { data: [], nextCursor: "3" };
      if (pages.length === 0) controller.abort();
      return { status: 200, body: page };
    });
    const seen: string[] = [];
    for await (const event of client(api.fetcher).skriuw.liveEvents({
      signal: controller.signal,
    })) {
      if (event.ok) seen.push(event.value.id);
    }
    expect(seen).toEqual(["1", "2", "3"]);
    expect(api.paths()).toEqual([
      "/v2/projects/skriuw/realtime/events",
      "/v2/projects/skriuw/realtime/events?after=2",
    ]);
  });

  test("liveVisitors polls the rows every interval and stops on abort or a failure", async () => {
    const controller = new AbortController();
    let polls = 0;
    const api = fakeApi(() => {
      polls += 1;
      if (polls === 3) return { status: 500, body: { error: { code: "INTERNAL", message: "x" } } };
      return { status: 200, body: { data: [{ visitor: `v${polls}` }], window: {} } };
    });
    const seen: string[] = [];
    for await (const rows of client(api.fetcher).skriuw.liveVisitors({
      everyMs: 1,
      limit: 5,
      signal: controller.signal,
    })) {
      seen.push(rows.ok ? rows.value.data.map((row) => row.visitor).join() : rows.error.code);
    }
    expect(seen).toEqual(["v1", "v2", "INTERNAL"]);
    expect(api.paths()).toEqual(Array(3).fill("/v2/projects/skriuw/realtime/visitors?limit=5"));
    controller.abort();
    for await (const rows of client(api.fetcher).skriuw.liveVisitors({ signal: controller.signal }))
      seen.push(rows.ok ? "again" : rows.error.code);
    expect(seen).toHaveLength(3);
  });
});

describe("admin namespaces", () => {
  test("projects, tokens, system and sql call their routes", async () => {
    const api = fakeApi((call) => (call.method === "DELETE" ? { status: 204 } : empty()));
    const api2 = client(api.fetcher);
    await api2.projects.list({ visibility: "private" });
    await api2.projects.get("skriuw");
    await api2.projects.create({ id: "new", name: "New", domain: "new.example" });
    await api2.projects.update("skriuw", { visibility: "private" });
    await api2.projects.rotateKey("skriuw", "secret");
    await api2.projects.remove("dora");
    await api2.tokens.list();
    await api2.tokens.create({ name: "CI", scope: "read", projectIds: ["skriuw"] });
    await api2.tokens.revoke("tok_1");
    await api2.system.health();
    await api2.system.session();
    await api2.system.metrics();
    await api2.system.runJob("rollup", { days: 7 });
    await api2.sql.explain("select 1");
    await api2.sql.schema();
    await api2.sql.history();
    await api2.sql.saved();
    await api2.sql.save({ name: "Top", sql: "select 1" });
    await api2.sql.get("sq_1");
    await api2.sql.update("sq_1", { name: "Top routes" });
    await api2.sql.remove("sq_1");
    await api2.alerts.sync("skriuw", [mail({ to: ["remco@example.com"] })]);
    await api2.annotations.create("skriuw", { title: "Release", date: "2026-10-01" });
    expect(api.paths()).toEqual([
      "/v2/projects?visibility=private",
      "/v2/projects/skriuw",
      "/v2/projects",
      "/v2/projects/skriuw",
      "/v2/projects/skriuw/keys",
      "/v2/projects/dora",
      "/v2/tokens",
      "/v2/tokens",
      "/v2/tokens/tok_1",
      "/v2/health",
      "/v2/auth/session",
      "/v2/admin/metrics",
      "/v2/admin/jobs/rollup?days=7",
      "/v2/query/explain",
      "/v2/query/schema",
      "/v2/queries/history",
      "/v2/queries",
      "/v2/queries",
      "/v2/queries/sq_1",
      "/v2/queries/sq_1",
      "/v2/queries/sq_1",
      "/v2/projects/skriuw/alerts/targets",
      "/v2/projects/skriuw/annotations",
    ]);
    expect(JSON.parse(api.calls[4]?.body ?? "")).toEqual({ kind: "secret" });
    expect(api.calls[5]?.method).toBe("DELETE");
  });
});

describe("errors and auth", () => {
  test("an API envelope becomes its code, message and details", async () => {
    const envelope = {
      error: {
        code: "VALIDATION_FAILED",
        message: "metric is required",
        details: { path: "/metric" },
        requestId: "req_1",
      },
    };
    const api = fakeApi(() => ({ status: 400, body: envelope }));
    const series = await client(api.fetcher).skriuw.timeseries("visitors");
    expect(series).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "metric is required",
        status: 400,
        details: { path: "/metric" },
        requestId: "req_1",
      },
    });
  });

  test("a download error also reads the envelope", async () => {
    const api = fakeApi(() => ({
      status: 403,
      body: { error: { code: "FORBIDDEN", message: "no" } },
    }));
    const csv = await client(api.fetcher).skriuw.download.visitors({ format: "csv" });
    expect(csv).toMatchObject({ ok: false, error: { code: "FORBIDDEN", status: 403 } });
  });

  test("a status without an envelope maps to the catalog code", async () => {
    const api = fakeApi(() => ({ status: 404 }));
    const stats = await client(api.fetcher).skriuw.stats();
    expect(stats).toMatchObject({ ok: false, error: { code: "NOT_FOUND", status: 404 } });
  });

  test("an unreachable API is NETWORK and never throws", async () => {
    async function unreachable(): Promise<Response> {
      throw new TypeError("connection refused");
    }
    const stats = await client(unreachable).stats();
    const csv = await client(unreachable).download.sessions({ format: "csv" });
    expect(stats).toMatchObject({ ok: false, error: { code: "NETWORK", status: null } });
    expect(csv).toMatchObject({ ok: false, error: { code: "NETWORK", status: null } });
  });

  test("no token sends anonymously, an empty token answers NO_TOKEN without a request", async () => {
    const api = fakeApi(empty);
    await client(api.fetcher, { token: undefined }).skriuw.stats();
    expect(api.calls[0]?.authorization).toBeNull();
    const refused = await client(api.fetcher, { token: "" }).skriuw.stats();
    expect(refused).toMatchObject({ ok: false, error: { code: "NO_TOKEN" } });
    expect(api.calls).toHaveLength(1);
  });

  test("credentials are forwarded to fetch for browser sessions", async () => {
    const api = fakeApi(empty);
    await client(api.fetcher, { token: undefined, credentials: "include" }).projects.list();
    expect(api.calls[0]?.credentials).toBe("include");
  });

  test("a project named like a client method stays reachable through project()", async () => {
    const api = fakeApi(empty);
    const odd = createClient({
      endpoint: "https://api.example.test",
      fetch: api.fetcher,
      projects: ["stats", "skriuw"],
    });
    await odd.project("stats").stats();
    await odd.stats();
    expect(api.paths()).toEqual(["/v2/projects/stats/stats", "/v2/stats"]);
  });
});
