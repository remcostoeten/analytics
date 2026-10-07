import { describe, expect, test } from "bun:test";

import { engineError } from "@spoar/engine";
import type { Membership, NewProject, ProjectPatch, ProjectRecord, Role } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import { Elysia } from "elysia";

import type { AccessDeps, SignedIn } from "../src/access/types";
import { setupModule } from "../src/modules/setup/route";

const docsBase = "https://api.example.test/v2/openapi";
const now = new Date("2026-10-07T12:00:00.000Z");

const users: { [cookie: string]: SignedIn } = {
  owner: { userId: "u_owner", name: "Remco", login: "remcostoeten", image: null, expiresAt: now },
  admin: { userId: "u_admin", name: "Ada", login: "ada", image: null, expiresAt: now },
  viewer: { userId: "u_viewer", name: "Vic", login: "vic", image: null, expiresAt: now },
  stranger: { userId: "u_stranger", name: "Sam", login: "sam", image: null, expiresAt: now },
};

const roles: { [userId: string]: Membership } = {
  u_owner: { userId: "u_owner", orgId: "org_main", role: "owner", projectIds: null },
  u_admin: { userId: "u_admin", orgId: "org_main", role: "admin", projectIds: ["docs"] },
  u_viewer: { userId: "u_viewer", orgId: "org_main", role: "viewer", projectIds: null },
};

function project(overrides: Partial<ProjectRecord> & { id: string }): ProjectRecord {
  return {
    name: overrides.id,
    domain: `${overrides.id}.example`,
    visibility: "public",
    publicVisitorData: false,
    sqlEnabled: true,
    widgetReports: false,
    allowedOrigins: [`https://${overrides.id}.example`],
    retentionDays: 90,
    publicKey: `pk_test_${overrides.id}`,
    orgId: "org_main",
    createdAt: new Date("2026-10-01T09:30:00.000Z"),
    updatedAt: now,
    ...overrides,
  };
}

function memoryDeps(projects: ProjectRecord[], failing = false): AccessDeps {
  const stored = [...projects];
  return {
    projects: {
      find: async (id) => ok(stored.find((item) => item.id === id) ?? null),
      list: async (visibility) =>
        failing
          ? err(engineError("INTERNAL", "database down"))
          : ok(stored.filter((item) => !visibility || item.visibility === visibility)),
      create: async (input: NewProject) => ok(project({ ...input, orgId: input.orgId })),
      update: async (id, patch: ProjectPatch) => {
        const found = stored.find((item) => item.id === id);
        return ok(found ? { ...found, ...patch } : null);
      },
      rotate: async () => ok(now),
    },
    tokens: {
      byHash: async () => ok(null),
      list: async () => ok([]),
      create: async () => err(engineError("INTERNAL", "not in this test")),
      revoke: async () => ok(false),
      touch: async () => ok(undefined),
    },
    members: {
      allowedLogin: async () => ok(true),
      loginOf: async () => ok(null),
      membership: async (userId) => ok(roles[userId] ?? null),
      join: async (userId) =>
        ok({ userId, orgId: "org_main", role: "viewer" as Role, projectIds: [] }),
    },
    sessions: async (headers) => {
      const match = /ra\.session_token=(\w+)/.exec(headers.get("cookie") ?? "");
      return match?.[1] ? (users[match[1]] ?? null) : null;
    },
    hasher: { sha256: async (value) => `hash:${value}` },
    clock: () => now,
    cronSecret: null,
  };
}

function app(projects: ProjectRecord[] = [], failing = false) {
  return new Elysia({ prefix: "/v2" }).use(setupModule(memoryDeps(projects, failing), docsBase));
}

async function page(projects: ProjectRecord[], cookie?: string, failing = false) {
  const response = await app(projects, failing).handle(
    new Request("https://api.example.test/v2/setup", {
      headers: {
        accept: "text/html",
        ...(cookie ? { cookie: `__Secure-ra.session_token=${cookie}` } : {}),
      },
    }),
  );
  return { response, html: await response.text() };
}

describe("GET /v2/setup", () => {
  test("signed out: the GitHub sign-in button and the allowlist note, never cached", async () => {
    const { response, html } = await page([]);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(html).toContain("<title>Spoar setup</title>");
    expect(html).toContain("data-sign-in>Sign in with GitHub</button>");
    expect(html).toContain("<code>dashboard_users</code> allowlist");
    expect(html).toContain("the first one to sign in becomes the owner");
    expect(html).toContain('callbackURL: "/v2/setup"');
    expect(html).not.toContain('<form class="form" data-create');
    expect(html).not.toContain("data-sign-out>Sign out</button>");
  });

  test("the inline script and styles are allowed only by the per-request nonce", async () => {
    const first = await page([]);
    const second = await page([]);
    const policy = first.response.headers.get("content-security-policy") ?? "";
    const nonce = /script-src 'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce).toBeDefined();
    expect(policy).toContain(`style-src 'nonce-${nonce}' https://fonts.googleapis.com`);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(first.html).toContain(`<script nonce="${nonce}">`);
    expect(first.html).toContain(`<style nonce="${nonce}">`);
    expect(first.html).not.toContain("onclick=");
    expect(second.response.headers.get("content-security-policy")).not.toBe(policy);
  });

  test("a member without admin rights sees the login and role and nothing else", async () => {
    const { html } = await page([project({ id: "docs" })], "viewer");
    expect(html).toContain("Signed in as <b>vic</b> with the role <code>viewer</code>");
    expect(html).toContain("An owner must grant that access");
    expect(html).toContain("data-sign-out>Sign out</button>");
    expect(html).not.toContain("data-sign-in>Sign in with GitHub</button>");
    expect(html).not.toContain('<form class="form" data-create');
    expect(html).not.toContain("pk_test_docs");
  });

  test("a signed-in user outside the organization is treated as signed out", async () => {
    const { html } = await page([], "stranger");
    expect(html).toContain("data-sign-in>Sign in with GitHub</button>");
    expect(html).not.toContain("data-sign-out>Sign out</button>");
  });

  test("the owner without projects gets the empty state and the create form", async () => {
    const { html } = await page([], "owner");
    expect(html).toContain("remcostoeten · owner");
    expect(html).toContain("No projects yet");
    expect(html).toContain("0 projects");
    expect(html).toContain('<form class="form" data-create');
    expect(html).toContain('name="allowedOrigins"');
    expect(html).toContain("An empty list accepts events from any origin.");
    expect(html).toContain("RA_ENDPOINT=https://api.example.test");
    expect(html).toContain("export const POST = createProxy({");
    expect(html).toContain("&lt;Analytics /&gt;");
    expect(html).toContain('<section id="keys" hidden>');
  });

  test("the owner with projects sees each one with its settings and the rotate step", async () => {
    const { html } = await page(
      [
        project({
          id: "docs",
          name: "Docs",
          domain: "docs.example",
          allowedOrigins: ["https://docs.example", "https://www.docs.example"],
        }),
        project({ id: "notes", visibility: "private", allowedOrigins: [] }),
      ],
      "owner",
    );
    expect(html).toContain("2 projects");
    expect(html).toContain('data-project="docs" data-public-key="pk_test_docs"');
    expect(html).toContain("<b>Docs</b><code>docs</code>");
    expect(html).toContain('<span class="tag caps public">public</span>');
    expect(html).toContain('<span class="tag caps private">private</span>');
    expect(html).toContain("created 1 Oct 2026");
    expect(html).toContain("https://docs.example\nhttps://www.docs.example</textarea>");
    expect(html).toContain('placeholder="Every origin is accepted"></textarea>');
    expect(html).toContain("The old secret stops working at once");
    expect(html).toContain("data-rotate-confirm>Rotate now</button>");
    expect(html).not.toContain("sk_");
  });

  test("an admin whose role lists projects sees only those and may not create", async () => {
    const { html } = await page([project({ id: "docs" }), project({ id: "notes" })], "admin");
    expect(html).toContain('data-project="docs"');
    expect(html).not.toContain('data-project="notes"');
    expect(html).not.toContain('<form class="form" data-create');
    expect(html).toContain("Creating a project needs an owner");
  });

  test("project data is escaped", async () => {
    const { html } = await page([project({ id: "x", name: `<img src=x onerror="1">` })], "owner");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;1&quot;&gt;");
  });

  test("a failing store answers the error envelope", async () => {
    const { response, html } = await page([], "owner", true);
    expect(response.status).toBe(500);
    expect(JSON.parse(html).error.code).toBe("INTERNAL");
  });
});
