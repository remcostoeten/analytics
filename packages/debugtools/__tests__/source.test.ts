import { describe, expect, test } from "bun:test";

import type { DebugtoolsOptions } from "../src/options";
import { clientSource } from "../src/source";

type Seen = {
  url: string;
  authorization: string | null;
  credentials: string | undefined;
  body: string;
};

const now = new Date("2026-10-11T12:00:00.000Z");
const result = { columns: ["n"], rows: [[1]], rowCount: 1, truncated: false, durationMs: 4 };

function options(seen: Seen[], grantToken = "wt_fresh"): DebugtoolsOptions {
  return {
    endpoint: "https://api.example.com",
    project: "site",
    fetch: async (input, init) => {
      const request = new Request(input, init);
      seen.push({
        url: request.url,
        authorization: request.headers.get("authorization"),
        credentials: init?.credentials,
        body: await request.text(),
      });
      if (request.url.includes("/widget/session")) {
        return Response.json({ token: grantToken, expiresAt: "2026-10-11T12:15:00.000Z" });
      }
      return Response.json(result);
    },
  };
}

describe("clientSource", () => {
  test("runs SQL on the project with the range and project bound", async () => {
    const seen: Seen[] = [];
    const source = clientSource(
      options(seen),
      { token: "wt_one", expiresAt: "2026-10-11T12:15:00.000Z" },
      () => now,
    );
    const answer = await source.run("select 1", "1h");
    expect(answer.ok && answer.value.rowCount).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe("https://api.example.com/v2/projects/site/query");
    expect(seen[0]?.authorization).toBe("Bearer wt_one");
    expect(JSON.parse(seen[0]?.body ?? "{}")).toEqual({
      sql: "select 1",
      params: { from: "2026-10-11T11:00:00.000Z", to: "2026-10-11T12:00:00.000Z", project: "site" },
    });
  });

  test("fetches a new widget token a minute before the old one expires", async () => {
    const seen: Seen[] = [];
    const source = clientSource(
      options(seen),
      { token: "wt_old", expiresAt: "2026-10-11T12:00:30.000Z" },
      () => now,
    );
    await source.schema();
    expect(seen.map((call) => call.url)).toEqual([
      "https://api.example.com/v2/widget/session?project=site",
      "https://api.example.com/v2/query/schema",
    ]);
    expect(seen[1]?.authorization).toBe("Bearer wt_fresh");
  });

  test("sends the session cookie without a grant", async () => {
    const seen: Seen[] = [];
    const source = clientSource(options(seen), null, () => now);
    await source.history();
    expect(seen[0]?.url).toBe("https://api.example.com/v2/queries/history");
    expect(seen[0]?.authorization).toBeNull();
    expect(seen[0]?.credentials).toBe("include");
  });
});
