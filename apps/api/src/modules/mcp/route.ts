import { engineError } from "@spoar/engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { setupPrompt } from "./prompts";
import { handleRpc, parseRpc, protocolVersion } from "./protocol";
import type { Server } from "./protocol";
import { mayUse, tools } from "./tools";
import type { Forward, Tool } from "./tools";

const tags = ["MCP"];

const instructions =
  "Spoar web analytics. Read tools answer questions about a project's traffic, speed and errors; admin tools create projects, rotate keys and check that a site is connected. Project ids come from list_projects. The setup prompt walks through connecting a site.";

const reply = t.Object(
  {
    jsonrpc: t.Literal("2.0"),
    id: t.Union([t.String(), t.Number(), t.Null()]),
    result: t.Optional(t.Record(t.String(), t.Unknown())),
    error: t.Optional(t.Object({ code: t.Integer(), message: t.String() })),
  },
  {
    description:
      "The JSON-RPC answer, with `error` for a malformed message, an unknown method or bad arguments. A notification gets an empty 202.",
  },
);

function json(payload: unknown, status: number, headers: { [name: string]: string } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function toQuery(query: { [name: string]: unknown } | undefined) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query ?? {})) {
    if (name === "filter" && typeof value === "object" && value !== null) {
      for (const [dimension, filter] of Object.entries(value)) {
        if (typeof filter === "string") params.set(`filter[${dimension}]`, filter);
      }
      continue;
    }
    if (typeof value === "string") params.set(name, value);
    if (typeof value === "number" || typeof value === "boolean") params.set(name, `${value}`);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

function forwardWith(headers: Headers, dispatch: (request: Request) => Promise<Response>): Forward {
  return (input) => {
    const init: RequestInit = { method: input.method, headers: new Headers() };
    const sent = init.headers as Headers;
    const authorization = headers.get("authorization");
    const cookie = headers.get("cookie");
    if (authorization) sent.set("authorization", authorization);
    if (cookie) sent.set("cookie", cookie);
    sent.set("accept", "application/json");
    if (input.body) {
      sent.set("content-type", "application/json");
      init.body = JSON.stringify(input.body);
    }
    const url = `http://spoar.internal${input.path}${toQuery(input.query)}`;
    return dispatch(new Request(url, init));
  };
}

/**
 * @name mcpModule
 * @description `POST /v2/mcp`: a stateless Model Context Protocol server over Streamable HTTP,
 * for Claude Code, Cursor and other MCP clients. The caller's API token or session decides
 * which tools are listed, and every tool call is forwarded to the matching REST route with the
 * same credentials, so access is judged exactly as it is for the API. `GET` is refused since the
 * server streams nothing.
 *
 * @example
 * app.use(mcpModule(deps, (request) => api.handle(request), docsBase, "2.0.0"));
 */
export function mcpModule(
  deps: AccessDeps,
  dispatch: (request: Request) => Promise<Response>,
  docsBase: string,
  version: string,
) {
  const server: Server = { name: "spoar", version, instructions, tools, prompts: [setupPrompt] };
  return new Elysia({ name: "mcp", prefix: "/v2" })
    .use(access(deps, docsBase))
    .post(
      "/mcp",
      async ({ body, caller, request, set }) => {
        if (caller.kind === "anonymous" || caller.kind === "cron") {
          const failed = failure(
            engineError("UNAUTHORIZED", "Send an API token as Authorization: Bearer"),
            set.headers,
            docsBase,
          );
          return json(failed.body, failed.status);
        }
        const parsed = parseRpc(body);
        if (!parsed) {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32600,
                message: "Expected one JSON-RPC 2.0 request; batches are not accepted",
              },
            },
            400,
          );
        }
        const context = {
          caller,
          forward: forwardWith(request.headers, dispatch),
          allowed: (tool: Tool) => mayUse(caller, tool),
        };
        const answer = await handleRpc(server, parsed, context);
        const headers = { "mcp-protocol-version": protocolVersion };
        if (!answer) return new Response(null, { status: 202, headers });
        return json(answer, 200, headers);
      },
      {
        access: "public",
        body: t.Unknown({ description: "One JSON-RPC 2.0 message; batches are not accepted." }),
        response: { 200: reply, 202: t.Void(), ...errorResponses, 400: reply },
        detail: {
          summary: "Model Context Protocol",
          description:
            "One JSON-RPC message per request over Streamable HTTP, stateless. Tools call the routes above with the same token; which tools are listed follows the token's scope. Point an MCP client at this URL with the token as a bearer.",
          tags,
        },
      },
    )
    .get(
      "/mcp",
      () =>
        json(
          {
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: "The MCP server does not stream; send POST",
            },
          },
          405,
          { allow: "POST" },
        ),
      { detail: { hide: true } },
    );
}
