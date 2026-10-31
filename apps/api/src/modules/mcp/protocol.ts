import type { Json } from "@spoar/shared/http";
import type { Nullable } from "@spoar/shared/semantic";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import type { Prompt } from "./prompts";
import { text } from "./tools";
import type { Tool, ToolContext, ToolResult } from "./tools";

export type JsonObject = { [key: string]: Json };

export const protocolVersion = "2025-06-18";

export type RequestId = string | number;

export type RpcRequest = {
  jsonrpc: "2.0";
  id?: RequestId;
  method: string;
  params?: JsonObject;
};

export type RpcError = { code: number; message: string };

export type RpcResponse = {
  jsonrpc: "2.0";
  id: Nullable<RequestId>;
  result?: JsonObject;
  error?: RpcError;
};

export type Server = {
  name: string;
  version: string;
  instructions: string;
  tools: Tool[];
  prompts: Prompt[];
};

const invalidRequest = -32600;
const methodNotFound = -32601;
const invalidParams = -32602;

function reply(id: Nullable<RequestId>, result: JsonObject): RpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: Nullable<RequestId>, code: number, message: string): RpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * @name RpcEnvelope
 * @description The shape of one JSON-RPC 2.0 message as the route validates it: the 2025-06-18
 * revision of the protocol dropped batching, so arrays are refused, and a message without an id
 * is a notification.
 *
 * @example
 * Value.Check(RpcEnvelope, { jsonrpc: "2.0", id: 1, method: "ping" }); // true
 */
export const RpcEnvelope = Type.Object(
  {
    jsonrpc: Type.Literal("2.0"),
    method: Type.String(),
    id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    params: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { description: "One JSON-RPC 2.0 message; batches are not accepted." },
);

/**
 * @name parseRpc
 * @description Reads one JSON-RPC 2.0 message, or null when it is not one. The params are
 * round-tripped through JSON so they hold plain values only.
 *
 * @example
 * parseRpc({ jsonrpc: "2.0", id: 1, method: "ping" }); // { jsonrpc: "2.0", id: 1, method: "ping" }
 */
export function parseRpc(message: unknown): Nullable<RpcRequest> {
  if (!Value.Check(RpcEnvelope, message)) return null;
  const params: JsonObject | undefined = message.params
    ? JSON.parse(JSON.stringify(message.params))
    : undefined;
  return { jsonrpc: "2.0", id: message.id, method: message.method, params };
}

function toolEntry(tool: Tool): JsonObject {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: JSON.parse(JSON.stringify(tool.inputSchema)) as JsonObject,
    annotations: {
      readOnlyHint: tool.readOnly,
      destructiveHint: tool.destructive ?? false,
      idempotentHint: tool.readOnly,
      openWorldHint: false,
    },
  };
}

function promptEntry(prompt: Prompt): JsonObject {
  return {
    name: prompt.name,
    title: prompt.title,
    description: prompt.description,
    arguments: prompt.arguments,
  };
}

function resultOf(result: ToolResult): JsonObject {
  return {
    content: [{ type: "text", text: result.text }],
    ...(result.structured ? { structuredContent: result.structured } : {}),
    ...(result.isError ? { isError: true } : {}),
  };
}

async function callTool(
  server: Server,
  id: RequestId,
  params: JsonObject | undefined,
  context: ToolContext,
): Promise<RpcResponse> {
  const name = params?.name;
  const tool = server.tools.find((candidate) => candidate.name === name);
  if (!tool || !context.allowed(tool)) {
    return fail(id, invalidParams, `Unknown tool: ${text(name)}`);
  }
  const given = params?.arguments;
  const input = typeof given === "object" && given !== null && !Array.isArray(given) ? given : {};
  if (!Value.Check(tool.inputSchema, input)) {
    const [first] = Value.Errors(tool.inputSchema, input);
    const where = first?.path ? ` at ${first.path}` : "";
    return fail(id, invalidParams, `Invalid arguments for ${tool.name}${where}: ${first?.message}`);
  }
  return reply(id, resultOf(await tool.call(input, context)));
}

function getPrompt(server: Server, id: RequestId, params: JsonObject | undefined): RpcResponse {
  const name = params?.name;
  const prompt = server.prompts.find((candidate) => candidate.name === name);
  if (!prompt) return fail(id, invalidParams, `Unknown prompt: ${text(name)}`);
  const given = params?.arguments;
  const values: { [name: string]: string } = {};
  if (typeof given === "object" && given !== null && !Array.isArray(given)) {
    for (const [key, value] of Object.entries(given)) {
      if (typeof value === "string") values[key] = value;
    }
  }
  const missing = prompt.arguments.filter(
    (argument) => argument.required && !values[argument.name],
  );
  if (missing.length > 0) {
    return fail(id, invalidParams, `Missing prompt argument: ${missing[0]?.name}`);
  }
  return reply(id, {
    description: prompt.description,
    messages: [{ role: "user", content: { type: "text", text: prompt.render(values) } }],
  });
}

/**
 * @name handleRpc
 * @description Answers one Model Context Protocol message: `initialize`, `ping`, `tools/list`,
 * `tools/call`, `prompts/list` and `prompts/get`. Notifications get no answer. The tool list
 * holds only the tools the caller may use; an unlisted tool is unknown.
 *
 * @example
 * await handleRpc(server, { jsonrpc: "2.0", id: 1, method: "tools/list" }, context);
 */
export async function handleRpc(
  server: Server,
  request: RpcRequest,
  context: ToolContext,
): Promise<Nullable<RpcResponse>> {
  if (request.id === undefined) return null;
  const { id, method, params } = request;
  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: server.name, version: server.version },
        instructions: server.instructions,
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: server.tools.filter(context.allowed).map(toolEntry) });
    case "tools/call":
      return callTool(server, id, params, context);
    case "prompts/list":
      return reply(id, { prompts: server.prompts.map(promptEntry) });
    case "prompts/get":
      return getPrompt(server, id, params);
    default:
      return fail(
        id,
        method.startsWith("notifications/") ? invalidRequest : methodNotFound,
        `Unknown method: ${method}`,
      );
  }
}
