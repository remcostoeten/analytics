import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { parseArguments } from "../setup";

const script = join(import.meta.dir, "../setup.ts");
const port = 55000 + Math.floor(Math.random() * 1000);
const database = new PGlite();
const server = new PGLiteSocketServer({ db: database, port });
const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;

async function setup(args: string[], env: { DATABASE_URL?: string }) {
  const child = Bun.spawn(["bun", script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, code };
}

beforeAll(async () => {
  await database.waitReady;
  await server.start();
});

afterAll(async () => {
  // The database stays open: pglite-socket handles a late client close by querying it.
  await server.stop();
});

describe("parseArguments", () => {
  test("reads the owner and the first project", () => {
    expect(parseArguments(["--owner", "remcostoeten"])).toEqual({
      ok: true,
      value: { owner: "remcostoeten", project: null },
    });
    expect(
      parseArguments(["--owner", "remcostoeten", "--project", "blog", "--domain", "blog.nl"]),
    ).toEqual({
      ok: true,
      value: {
        owner: "remcostoeten",
        project: { id: "blog", name: "blog.nl", domain: "blog.nl" },
      },
    });
  });

  test("rejects a missing owner, a bad project id and a project without a domain", () => {
    expect(parseArguments([]).ok).toBe(false);
    expect(parseArguments(["--owner", "-bad-"]).ok).toBe(false);
    expect(parseArguments(["--owner", "remco", "--project", "Blog", "--domain", "b.nl"]).ok).toBe(
      false,
    );
    expect(parseArguments(["--owner", "remco", "--project", "blog"]).ok).toBe(false);
  });
});

describe("scripts/setup.ts against a Postgres server", () => {
  test("fails without DATABASE_URL", async () => {
    const result = await setup(["--owner", "remcostoeten"], {});
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL is not set");
  });

  test("migrates, allows the owner and creates the project with its keys", async () => {
    const result = await setup(
      ["--owner", "remcostoeten", "--project", "blog", "--domain", "blog.nl", "--name", "Blog"],
      { DATABASE_URL: url },
    );
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Allowed remcostoeten to sign in");
    expect(result.stdout).toMatch(/Public key: pk_live_[0-9a-f]{16}/);
    expect(result.stdout).toMatch(/Secret key: sk_live_[0-9a-f]{32}/);

    const users = await database.query("SELECT github_login FROM dashboard_users");
    expect(users.rows).toEqual([{ github_login: "remcostoeten" }]);
    const projects = await database.query<{ id: string; name: string; org_id: string | null }>(
      "SELECT id, name, org_id FROM projects",
    );
    expect(projects.rows).toEqual([{ id: "blog", name: "Blog", org_id: null }]);
  });

  test("a second run changes nothing", async () => {
    const result = await setup(
      ["--owner", "remcostoeten", "--project", "blog", "--domain", "blog.nl"],
      { DATABASE_URL: url },
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("0 to apply");
    expect(result.stdout).toContain("remcostoeten was already allowed");
    expect(result.stdout).toContain("Project blog already exists");
  });
});
