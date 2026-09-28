import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createApp } from "../src/app";
import { clientIp } from "../src/client-ip";
import { openCityDatabase } from "../src/geo";

const fixture = join(import.meta.dir, "fixtures", "GeoIP2-City-Test.mmdb");
const envelope = readFileSync(
  join(
    import.meta.dir,
    "../../../packages/contract/fixtures/IngestEnvelope/valid/browser-batch.json",
  ),
  "utf8",
);
const app = createApp(openCityDatabase([fixture]));

function postEvents(body: string, headers: { [name: string]: string }) {
  return app.handle(
    new Request("http://localhost/v2/events", {
      method: "POST",
      headers: { "content-type": "text/plain;charset=UTF-8", ...headers },
      body,
    }),
  );
}

describe("GET /v2/health", () => {
  test("reports the runtime, cold start and geo database", async () => {
    const first = await (await app.handle(new Request("http://localhost/v2/health"))).json();
    const second = await (await app.handle(new Request("http://localhost/v2/health"))).json();
    expect(first.ok).toBe(true);
    expect(first.runtime).toStartWith("bun ");
    expect(first.coldStart).toBe(true);
    expect(second.coldStart).toBe(false);
    expect(first.geo).toMatchObject({ loaded: true, path: fixture });
  });
});

describe("GET /v2/openapi/json", () => {
  test("documents both routes", async () => {
    const document = await (
      await app.handle(new Request("http://localhost/v2/openapi/json"))
    ).json();
    expect(Object.keys(document.paths).sort()).toEqual(["/v2/events", "/v2/health"]);
  });
});

describe("POST /v2/events", () => {
  test("accepts a text/plain batch and looks up the caller", async () => {
    const response = await postEvents(envelope, { "x-forwarded-for": "81.2.69.160, 10.0.0.1" });
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.accepted).toBe(2);
    expect(body.ipHeader).toBe("x-forwarded-for");
    expect(body.geo).toMatchObject({ country: "GB", city: "London", timezone: "Europe/London" });
  });

  test("rejects an invalid envelope through the contract schema", async () => {
    const response = await postEvents(JSON.stringify({ v: 2, sentAt: "now", events: [] }), {});
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.property).toBe("/v");
  });
});

describe("clientIp", () => {
  const cases: {
    name: string;
    headers: [string, string][];
    expected: ReturnType<typeof clientIp>;
  }[] = [
    {
      name: "prefers cf-connecting-ip",
      headers: [
        ["cf-connecting-ip", "1.1.1.1"],
        ["x-real-ip", "2.2.2.2"],
      ],
      expected: { ip: "1.1.1.1", header: "cf-connecting-ip" },
    },
    {
      name: "then x-real-ip",
      headers: [["x-real-ip", "2.2.2.2"]],
      expected: { ip: "2.2.2.2", header: "x-real-ip" },
    },
    {
      name: "then the first x-forwarded-for entry",
      headers: [["x-forwarded-for", "3.3.3.3, 10.0.0.1"]],
      expected: { ip: "3.3.3.3", header: "x-forwarded-for" },
    },
    { name: "none", headers: [], expected: { ip: null, header: null } },
  ];
  for (const { name, headers, expected } of cases) {
    test(name, () => {
      expect(clientIp(new Headers(headers))).toEqual(expected);
    });
  }
});
