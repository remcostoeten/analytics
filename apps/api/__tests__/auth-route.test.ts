import { describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { memoryLogger } from "@remcostoeten/analytics-engine/adapters/memory";
import { pgliteAccess } from "@remcostoeten/analytics-engine/adapters/pglite";
import { webCryptoHasher } from "@remcostoeten/analytics-engine/adapters/system";
import { Elysia } from "elysia";

import { authModule } from "../src/modules/auth/route";
import { errorHandler } from "../src/plugins/error-handler";

const docsBase = "https://api.example.test/v2/openapi";
const forwarded: string[] = [];

const api = new Elysia({ prefix: "/v2" })
  .use(errorHandler({ docsBase, logger: () => memoryLogger() }))
  .use(
    authModule({
      deps: {
        ...pgliteAccess(new PGlite()),
        sessions: async () => null,
        hasher: webCryptoHasher(),
        clock: () => new Date("2026-09-28T12:00:00.000Z"),
        cronSecret: null,
      },
      docsBase,
      handler: async (request) => {
        forwarded.push(new URL(request.url).pathname);
        return new Response("handled");
      },
    }),
  );

describe("/v2/auth/*", () => {
  test("sign-in routes reach Better Auth; organization routes answer 404", async () => {
    const signIn = await api.handle(
      new Request("http://localhost/v2/auth/sign-in/email", { method: "POST" }),
    );
    expect(await signIn.text()).toBe("handled");
    const escalate = await api.handle(
      new Request("http://localhost/v2/auth/organization/update-member-role", { method: "POST" }),
    );
    expect(escalate.status).toBe(404);
    expect(((await escalate.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    expect(forwarded).toEqual(["/v2/auth/sign-in/email"]);
  });
});
