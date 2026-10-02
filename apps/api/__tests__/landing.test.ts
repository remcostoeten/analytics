import { describe, expect, test } from "bun:test";

import { Elysia } from "elysia";

import { landingModule } from "../src/modules/landing/route";
import { routeGroups } from "../src/modules/landing/service";

const tags = [
  { name: "Reads", description: "Aggregate reads" },
  { name: "System", description: "Health and documentation" },
];

function app() {
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
        clock: () => new Date("2026-10-02T12:00:00.000Z"),
        tags,
        routes: () => api.routes,
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
      expect(html).toContain("<title>Analytics API</title>");
      expect(html).toContain('/projects/<span class="param">:project</span>/stats');
      expect(html).toContain("Headline <code>numbers</code>");
      expect(html).toContain("https://api.example.test/v2/openapi");
      expect(html).not.toContain("/secret</span>");
      expect(html).not.toContain("/untagged</span>");
    }
  });

  test("serves JSON to API clients", async () => {
    const response = await app().handle(new Request("https://api.example.test/v2"));
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("vary")).toBe("Accept");
    const body = (await response.json()) as {
      version: string;
      status: string;
      links: { health: string };
      groups: { name: string; routes: { path: string }[] }[];
    };
    expect(body.version).toBe("2.0.0-test");
    expect(body.status).toBe("ok");
    expect(body.links.health).toBe("https://api.example.test/v2/health");
    expect(body.groups.map((group) => group.name)).toEqual(["Reads", "System"]);
  });
});
