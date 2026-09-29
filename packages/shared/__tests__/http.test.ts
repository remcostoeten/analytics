import { afterAll, beforeAll, describe, expect, expectTypeOf, test } from "bun:test";

import { deleteJson, getJson, patchJson, postJson, putJson, request } from "../src/http";
import type { HttpResult, Json, Parser } from "../src/http";
import { err, ok } from "../src/result";

type Echo = {
  method: string;
  path: string;
  query: { [name: string]: string[] };
  headers: { [name: string]: string };
  body: string;
};

type Project = { id: string; visibility: "public" | "private" };

let server: ReturnType<typeof Bun.serve>;
let base = "";

function echo(request: Request, body: string): Echo {
  const url = new URL(request.url);
  const query: { [name: string]: string[] } = {};
  for (const [name, value] of url.searchParams) query[name] = [...(query[name] ?? []), value];
  return {
    method: request.method,
    path: url.pathname,
    query,
    headers: Object.fromEntries(request.headers),
    body,
  };
}

const project: Parser<Project> = (body) => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return err("not an object");
  const { id, visibility } = body;
  if (typeof id !== "string") return err("id is not a string");
  if (visibility !== "public" && visibility !== "private") return err("visibility is unknown");
  return ok({ id, visibility });
};

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(incoming) {
      const path = new URL(incoming.url).pathname;
      if (path === "/project") return Response.json({ id: "site", visibility: "public" });
      if (path === "/wrong-shape") return Response.json({ id: 7 });
      if (path === "/empty") return new Response(null, { status: 204 });
      if (path === "/html") return new Response("<html>oops</html>", { status: 200 });
      if (path === "/missing") return Response.json({ error: "no such project" }, { status: 404 });
      if (path === "/long-error") return new Response("x".repeat(2000), { status: 500 });
      if (path === "/slow") {
        await Bun.sleep(300);
        return Response.json({ late: true });
      }
      return Response.json(echo(incoming, await incoming.text()));
    },
  });
  base = `http://localhost:${server.port}`;
});

afterAll(() => {
  void server.stop(true);
});

function body(result: HttpResult<Json>) {
  if (!result.ok) throw new Error(result.error.message);
  return result.value.body;
}

describe("successful requests", () => {
  test("getJson sends accept and appends the query, skipping null and undefined", async () => {
    const answer = await getJson(`${base}/echo`, {
      query: { period: "7d", limit: 5, tag: ["a", "b"], empty: null, missing: undefined },
    });
    expect(answer.ok && answer.value.status).toBe(200);
    expect(body(answer)).toMatchObject({
      method: "GET",
      path: "/echo",
      query: { period: ["7d"], limit: ["5"], tag: ["a", "b"] },
      headers: { accept: "application/json" },
      body: "",
    });
  });

  test("postJson, putJson and patchJson send JSON with a content type, and caller headers win", async () => {
    for (const [send, method] of [
      [postJson, "POST"],
      [putJson, "PUT"],
      [patchJson, "PATCH"],
    ] as const) {
      const answer = await send(
        `${base}/echo`,
        { targets: [{ channel: "mail" }] },
        { headers: { authorization: "Bearer at_test", accept: "application/vnd.test+json" } },
      );
      expect(body(answer)).toMatchObject({
        method,
        headers: {
          "content-type": "application/json",
          authorization: "Bearer at_test",
          accept: "application/vnd.test+json",
        },
        body: '{"targets":[{"channel":"mail"}]}',
      });
    }
  });

  test("deleteJson sends no body, and an empty answer reads as null", async () => {
    const deleted = await deleteJson(`${base}/echo`);
    expect(body(deleted)).toMatchObject({ method: "DELETE", body: "" });
    expect(body(await deleteJson(`${base}/empty`))).toBe(null);
  });

  test("parse checks the answer and types the body", async () => {
    const answer = await getJson(`${base}/project`, { parse: project });
    expectTypeOf(answer).toEqualTypeOf<HttpResult<Project>>();
    expect(answer.ok && answer.value.body).toEqual({ id: "site", visibility: "public" });
  });

  test("without parse the body is Json, never a caller's claim", async () => {
    const answer = await getJson(`${base}/project`);
    expectTypeOf(answer).toEqualTypeOf<HttpResult<Json>>();
  });

  test("request takes the method and every option in one object", async () => {
    const answer = await request({ method: "POST", url: `${base}/echo`, body: [1, 2] });
    expect(body(answer)).toMatchObject({ method: "POST", body: "[1,2]" });
  });
});

describe("failures are values", () => {
  test("a non-2xx answer is a status error with the status and a body excerpt", async () => {
    const answer = await getJson(`${base}/missing?key=secret`);
    expect(answer).toEqual({
      ok: false,
      error: {
        kind: "status",
        message: `GET ${base}/missing answered 404`,
        method: "GET",
        url: `${base}/missing`,
        status: 404,
        body: '{"error":"no such project"}',
      },
    });
  });

  test("the excerpt is cut at 500 characters", async () => {
    const answer = await getJson(`${base}/long-error`);
    expect(!answer.ok && answer.error.body).toBe(`${"x".repeat(500)}...`);
  });

  test("an answer that is not JSON is a parse error", async () => {
    const answer = await getJson(`${base}/html`);
    expect(!answer.ok && [answer.error.kind, answer.error.status, answer.error.body]).toEqual([
      "parse",
      200,
      "<html>oops</html>",
    ]);
  });

  test("an answer parse rejects is a schema error with the parser's reason", async () => {
    const answer = await getJson(`${base}/wrong-shape`, { parse: project });
    expect(!answer.ok && [answer.error.kind, answer.error.message]).toEqual([
      "schema",
      `GET ${base}/wrong-shape answered an unexpected shape: id is not a string`,
    ]);
  });

  test("a request slower than timeoutMs is a timeout error", async () => {
    const answer = await getJson(`${base}/slow`, { timeoutMs: 50 });
    expect(!answer.ok && [answer.error.kind, answer.error.message]).toEqual([
      "timeout",
      `GET ${base}/slow timed out after 50 ms`,
    ]);
  });

  test("a caller's abort is an aborted error, not a timeout", async () => {
    const controller = new AbortController();
    const pending = getJson(`${base}/slow`, { signal: controller.signal });
    controller.abort();
    const answer = await pending;
    expect(!answer.ok && answer.error.kind).toBe("aborted");
  });

  test("an unreachable host is a network error", async () => {
    const answer = await getJson("http://127.0.0.1:1/nothing", { timeoutMs: 2000 });
    expect(!answer.ok && answer.error.kind).toBe("network");
  });

  test("a URL that cannot be parsed is a url error and nothing is sent", async () => {
    let calls = 0;
    const answer = await getJson("not a url", {
      fetch: async () => {
        calls += 1;
        return Response.json({});
      },
    });
    expect(!answer.ok && [answer.error.kind, answer.error.message]).toEqual([
      "url",
      "not a url is not a valid URL",
    ]);
    expect(calls).toBe(0);
  });

  test("a fetch that throws a non-Error is still a network error", async () => {
    const answer = await getJson("https://api.example.test/", {
      fetch: async () => Promise.reject("socket closed"),
    });
    expect(!answer.ok && answer.error.message).toBe(
      "GET https://api.example.test/ failed: socket closed",
    );
  });
});

describe("injected fetch", () => {
  test("receives the full URL with the query and the init", async () => {
    const seen: string[] = [];
    await postJson(
      "https://api.example.test/v2/events",
      { v: 1 },
      {
        query: { key: "pk_test" },
        fetch: async (url, init) => {
          seen.push(url, init.method ?? "", await new Request(url, init).text());
          return Response.json({ accepted: 1 });
        },
      },
    );
    expect(seen).toEqual(["https://api.example.test/v2/events?key=pk_test", "POST", '{"v":1}']);
  });
});
