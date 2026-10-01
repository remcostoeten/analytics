import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

describe("openapi.json", () => {
  test("matches the routes; run bun run --cwd apps/api openapi after changing one", async () => {
    const check = Bun.spawn(["bun", "scripts/openapi.ts", "--check"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, errors] = await Promise.all([check.exited, new Response(check.stderr).text()]);
    expect(errors).toBe("");
    expect(code).toBe(0);
  }, 20_000);

  test("lists the query parameters of the read routes", () => {
    const document = JSON.parse(readFileSync(join(root, "openapi.json"), "utf8")) as {
      paths: { [path: string]: { get?: { parameters?: { name: string; in: string }[] } } };
    };
    function query(path: string) {
      return (document.paths[path]?.get?.parameters ?? [])
        .filter((parameter) => parameter.in === "query")
        .map((parameter) => parameter.name);
    }
    const scope = ["from", "to", "period", "traffic", "filter"];
    expect(query("/v2/projects/{project}/stats")).toEqual(expect.arrayContaining(scope));
    expect(query("/v2/projects/{project}/timeseries")).toEqual(
      expect.arrayContaining([...scope, "metric", "interval", "compare"]),
    );
    expect(query("/v2/projects/{project}/breakdown/{dimension}")).toEqual(
      expect.arrayContaining([...scope, "metrics", "limit", "cursor", "format"]),
    );
    expect(query("/v2/projects/{project}/speed")).toEqual(
      expect.arrayContaining(["from", "to", "period", "filter", "device", "percentile"]),
    );
    expect(query("/v2/projects/{project}/events")).toEqual(
      expect.arrayContaining([...scope, "name", "limit", "cursor", "format"]),
    );
    expect(query("/v2/stats")).toEqual(expect.arrayContaining(scope));
  });

  test("holds the error envelope once, as a component", () => {
    const document = JSON.parse(readFileSync(join(root, "openapi.json"), "utf8")) as {
      components: { schemas: { [name: string]: unknown } };
    };
    expect(Object.keys(document.components.schemas)).toContain("ApiError");
  });
});
