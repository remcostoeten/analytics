import { describe, expect, test } from "bun:test";

import { Elysia } from "elysia";

import { landingModule } from "../src/modules/landing/route";
import { fetchHistory, routeGroups } from "../src/modules/landing/service";

const tags = [
  { name: "Reads", description: "Aggregate reads" },
  { name: "System", description: "Health and documentation" },
];

const activity = [
  { days: [0, 1, 0, 0, 2, 0, 0], total: 3, week: 1_758_412_800 },
  { days: [0, 0, 0, 0, 0, 0, 0], total: 0, week: 1_759_017_600 },
];

function github(status: number, body: unknown): typeof fetch {
  let calls = 0;
  async function send() {
    calls += 1;
    return Response.json(body, { status });
  }
  return Object.assign(send, { count: () => calls }) as unknown as typeof fetch;
}

function app(options: { send?: typeof fetch; clock?: () => Date } = {}) {
  const api = new Elysia({ prefix: "/v2" })
    .get("/health", () => ({ ok: true }), { detail: { summary: "Liveness", tags: ["System"] } })
    .get("/projects/:project/stats", () => ({}), {
      detail: { summary: "Headline `numbers`", tags: ["Reads"] },
    })
    .post("/projects/:project/stats", () => ({}), { detail: { tags: ["Reads"] } })
    .get("/secret", () => ({}), { detail: { hide: true, tags: ["System"] } })
    .get("/untagged", () => ({}));
  return new Elysia()
    .use(
      landingModule({
        version: "2.0.0-test",
        clock: options.clock ?? (() => new Date("2026-10-02T12:00:00.000Z")),
        tags,
        routes: () => api.routes,
        geo: { city: "GeoIP2-City-Test", asn: null, loadMs: 3 },
        history: options.send ? { repo: "example/repo", send: options.send } : null,
      }),
    )
    .use(api);
}

describe("landing", () => {
  test("groups documented routes by tag in tag order, leaving out hidden and untagged ones", () => {
    const groups = routeGroups(
      [
        { method: "POST", path: "/v2/b", hooks: { detail: { tags: ["Reads"] } } },
        { method: "GET", path: "/v2/b", hooks: { detail: { summary: "B", tags: ["Reads"] } } },
        { method: "GET", path: "/v2/a", hooks: { detail: { tags: ["System"] } } },
        { method: "GET", path: "/v2/h", hooks: { detail: { hide: true, tags: ["System"] } } },
        { method: "OPTIONS", path: "/v2/a", hooks: { detail: { tags: ["System"] } } },
        { method: "GET", path: "/v2/x", hooks: {} },
      ],
      tags,
    );
    expect(groups.map((group) => group.name)).toEqual(["Reads", "System"]);
    expect(groups[0]?.routes).toEqual([
      { method: "GET", path: "/v2/b", summary: "B" },
      { method: "POST", path: "/v2/b", summary: "" },
    ]);
    expect(groups[1]?.routes).toEqual([{ method: "GET", path: "/v2/a", summary: "" }]);
  });

  test("serves HTML to browsers at / and /v2", async () => {
    for (const path of ["/", "/v2", "/v2/"]) {
      const response = await app().handle(
        new Request(`https://api.example.test${path}`, { headers: { accept: "text/html" } }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("<title>Spoar API</title>");
      expect(html).toContain("GeoIP2-City-Test");
      expect(html).toContain('/projects/<span class="param">:project</span>/stats');
      expect(html).toContain("Headline <code>numbers</code>");
      expect(html).toContain("https://api.example.test/v2/openapi");
      expect(html).toContain("Commit history is not available");
      expect(html).not.toContain("/secret</span>");
      expect(html).not.toContain("/untagged</span>");
    }
  });

  test("serves JSON to API clients", async () => {
    const response = await app().handle(new Request("https://api.example.test/v2"));
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("vary")).toBe("Accept");
    const body = (await response.json()) as {
      name: string;
      health: { ok: boolean; version: string; geo: { city: string } };
      links: { health: string };
      groups: { name: string }[];
      history: unknown;
    };
    expect(body.name).toBe("Spoar API");
    expect(body.health.ok).toBe(true);
    expect(body.health.version).toBe("2.0.0-test");
    expect(body.health.geo.city).toBe("GeoIP2-City-Test");
    expect(body.links.health).toBe("https://api.example.test/v2/health");
    expect(body.groups.map((group) => group.name)).toEqual(["Reads", "System"]);
    expect(body.history).toBeNull();
  });

  test("reads commit activity from GitHub and gives null while it computes", async () => {
    expect(await fetchHistory({ repo: "example/repo", send: github(200, activity) })).toEqual({
      repo: "example/repo",
      weeks: [
        { week: "2025-09-21T00:00:00.000Z", total: 3 },
        { week: "2025-09-28T00:00:00.000Z", total: 0 },
      ],
      total: 3,
    });
    expect(await fetchHistory({ repo: "example/repo", send: github(202, {}) })).toBeNull();
    expect(
      await fetchHistory({ repo: "example/repo", send: github(200, [{ nope: 1 }]) }),
    ).toBeNull();
  });

  test("renders the chart and caches the history for an hour", async () => {
    let now = Date.parse("2026-10-02T12:00:00.000Z");
    const send = github(200, activity);
    const served = app({ send, clock: () => new Date(now) });
    const first = await served.handle(
      new Request("https://api.example.test/", { headers: { accept: "text/html" } }),
    );
    expect(await first.text()).toContain("3 commits, 2 weeks");
    now += 30 * 60 * 1000;
    await served.handle(new Request("https://api.example.test/"));
    expect((send as unknown as { count: () => number }).count()).toBe(1);
    now += 31 * 60 * 1000;
    await served.handle(new Request("https://api.example.test/"));
    expect((send as unknown as { count: () => number }).count()).toBe(2);
  });
});
