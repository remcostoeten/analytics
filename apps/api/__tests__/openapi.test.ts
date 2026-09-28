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
  });

  test("holds the error envelope once, as a component", () => {
    const document = JSON.parse(readFileSync(join(root, "openapi.json"), "utf8")) as {
      components: { schemas: { [name: string]: unknown } };
    };
    expect(Object.keys(document.components.schemas)).toContain("ApiError");
  });
});
