import net from "node:net";
import tls from "node:tls";
import type { ConnectionOptions } from "node:tls";

import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import { engineError } from "../../errors";
import type { EngineError } from "../../errors";
import type { MailMessage, MailTransport } from "../types";

export type SmtpOptions = {
  timeoutMs?: number;
  tls?: Pick<ConnectionOptions, "ca" | "rejectUnauthorized">;
  hostname?: string;
};

type Server = {
  secure: boolean;
  host: string;
  port: number;
  user: Nullable<string>;
  password: Nullable<string>;
};

type Reply = { code: number; lines: string[] };

type Waiter = { answer: (reply: Reply) => void; fail: (error: Error) => void };

type Wire = {
  send: (line: string) => void;
  reply: () => Promise<Reply>;
  upgrade: () => Promise<void>;
  close: () => void;
};

const defaultTimeoutMs = 20_000;
const lineWidth = 76;
// A reply line: three digits, then "-" when more lines follow or a space on the last one.
const replyLine = /^(\d{3})([- ])(.*)$/;

// Printable ASCII only, which a header may carry without encoding.
const plainHeader = /^[\x20-\x7e]*$/;
function parseServer(url: string | undefined): Result<Server, string> {
  if (!url) return err("MAIL_URL is not set");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return err("MAIL_URL is not a valid URL");
  }
  if (parsed.protocol !== "smtps:" && parsed.protocol !== "smtp:") {
    return err("MAIL_URL must start with smtps:// or smtp://");
  }
  if (!parsed.hostname) return err("MAIL_URL has no host");
  const secure = parsed.protocol === "smtps:";
  return ok({
    secure,
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : secure ? 465 : 587,
    user: parsed.username ? decodeURIComponent(parsed.username) : null,
    password: parsed.password ? decodeURIComponent(parsed.password) : null,
  });
}

function openWire(server: Server, options: SmtpOptions): Promise<Wire> {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  return new Promise((resolve, reject) => {
    let buffer = "";
    let lines: string[] = [];
    let failure: Nullable<Error> = null;
    const replies: Reply[] = [];
    const waiting: Waiter[] = [];

    function onData(chunk: Buffer | string) {
      buffer += String(chunk);
      let end = buffer.indexOf("\r\n");
      while (end !== -1) {
        const match = replyLine.exec(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (match?.[1]) {
          lines.push(match[3] ?? "");
          if (match[2] === " ") {
            const reply = { code: Number(match[1]), lines };
            lines = [];
            const waiter = waiting.shift();
            if (waiter) waiter.answer(reply);
            else replies.push(reply);
          }
        }
        end = buffer.indexOf("\r\n");
      }
    }

    function onFailure(error: Error) {
      failure ??= error;
      for (const waiter of waiting.splice(0)) waiter.fail(failure);
      reject(failure);
    }

    function watch(socket: net.Socket) {
      socket.setTimeout(timeoutMs, () =>
        socket.destroy(new Error("the mail server stopped answering")),
      );
      socket.on("data", onData);
      socket.on("error", onFailure);
      socket.on("close", () => onFailure(new Error("the mail server closed the connection")));
    }

    function secureOptions(plain?: net.Socket): ConnectionOptions {
      return {
        ...options.tls,
        host: server.host,
        port: server.port,
        servername: net.isIP(server.host) ? undefined : server.host,
        socket: plain,
      };
    }

    let socket: net.Socket = server.secure
      ? tls.connect(secureOptions())
      : net.connect(server.port, server.host);
    watch(socket);
    socket.once(server.secure ? "secureConnect" : "connect", () =>
      resolve({
        send: (line) => socket.write(`${line}\r\n`),
        reply: () =>
          new Promise((answer, fail) => {
            const ready = replies.shift();
            if (ready) answer(ready);
            else if (failure) fail(failure);
            else waiting.push({ answer, fail });
          }),
        upgrade: () =>
          new Promise((done, fail) => {
            const plain = socket;
            plain.removeAllListeners("data");
            plain.removeAllListeners("close");
            plain.setTimeout(0);
            const secured = tls.connect(secureOptions(plain));
            watch(secured);
            secured.once("error", fail);
            secured.once("secureConnect", () => {
              socket = secured;
              done();
            });
          }),
        close: () => {
          socket.removeAllListeners("close");
          socket.destroy();
        },
      }),
    );
  });
}

async function expectReply(wire: Wire, step: string, codes: number[]) {
  const reply = await wire.reply();
  if (!codes.includes(reply.code)) {
    throw new Error(`${step} answered ${reply.code} ${reply.lines.join(" ")}`.trim());
  }
  return reply;
}

async function command(wire: Wire, line: string, codes: number[], step = line.split(" ")[0]) {
  wire.send(line);
  return expectReply(wire, step ?? line, codes);
}

function addressOf(value: string) {
  const start = value.lastIndexOf("<");
  const end = value.indexOf(">", start);
  return (start !== -1 && end > start ? value.slice(start + 1, end) : value).trim();
}

function base64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

function wrapped(text: string) {
  return (base64(text).match(new RegExp(`.{1,${lineWidth}}`, "g")) ?? []).join("\r\n");
}

function header(text: string) {
  return plainHeader.test(text) ? text : `=?UTF-8?B?${base64(text)}?=`;
}

function composeMessage(message: MailMessage, host: string, now: Date) {
  const boundary = `ra-${crypto.randomUUID()}`;
  const lines = [
    `From: ${header(message.from)}`,
    `To: ${message.to.join(", ")}`,
    `Subject: ${header(message.subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${host}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapped(message.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapped(message.html),
    `--${boundary}--`,
  ];
  return lines.map((line) => (line.startsWith(".") ? `.${line}` : line)).join("\r\n");
}

async function login(wire: Wire, server: Server, capabilities: string[]) {
  if (!server.user) return;
  const auth = capabilities.find((line) => line.toUpperCase().startsWith("AUTH")) ?? "";
  if (auth.toUpperCase().includes("PLAIN") || !auth.toUpperCase().includes("LOGIN")) {
    await command(
      wire,
      `AUTH PLAIN ${base64(`\0${server.user}\0${server.password ?? ""}`)}`,
      [235],
      "AUTH",
    );
    return;
  }
  await command(wire, "AUTH LOGIN", [334], "AUTH");
  await command(wire, base64(server.user), [334], "AUTH");
  await command(wire, base64(server.password ?? ""), [235], "AUTH");
}

async function deliver(server: Server, message: MailMessage, options: SmtpOptions) {
  const wire = await openWire(server, options);
  const hostname = options.hostname ?? "localhost";
  try {
    await expectReply(wire, "The greeting", [220]);
    let hello = await command(wire, `EHLO ${hostname}`, [250]);
    if (!server.secure) {
      if (!hello.lines.some((line) => line.toUpperCase().startsWith("STARTTLS"))) {
        throw new Error("the server does not offer STARTTLS, and mail is never sent unencrypted");
      }
      await command(wire, "STARTTLS", [220]);
      await wire.upgrade();
      hello = await command(wire, `EHLO ${hostname}`, [250]);
    }
    await login(wire, server, hello.lines);
    await command(wire, `MAIL FROM:<${addressOf(message.from)}>`, [250], "MAIL FROM");
    for (const to of message.to) await command(wire, `RCPT TO:<${to}>`, [250, 251], "RCPT TO");
    await command(wire, "DATA", [354]);
    wire.send(`${composeMessage(message, server.host, new Date())}\r\n.`);
    await expectReply(wire, "The message", [250]);
    wire.send("QUIT");
    await expectReply(wire, "QUIT", [221]);
  } finally {
    wire.close();
  }
}

/**
 * @name smtp
 * @description Sends mail over SMTP on `node:tls`: `smtps://user:password@host:465` speaks TLS
 * from the start, `smtp://...:587` upgrades with `STARTTLS`, and a server without it is refused,
 * so mail never travels unencrypted. It logs in with `AUTH PLAIN` or `AUTH LOGIN`, sends one
 * multipart mail with the text and HTML, and quits. `@` and `:` in the user or password are
 * written `%40` and `%3A`. A missing or malformed URL does not stop the API: `ready` reports it.
 *
 * @example
 * mail({ transport: smtp(process.env.MAIL_URL), from: "Analytics <remco@gmail.com>" });
 */
export function smtp(url: string | undefined, options: SmtpOptions = {}): MailTransport {
  const server = parseServer(url);

  function ready(): Result<null, EngineError> {
    return server.ok ? ok(null) : err(engineError("UNAVAILABLE", server.error));
  }

  return {
    name: "smtp",
    host: server.ok ? server.value.host : null,
    ready,
    async send(message) {
      if (!server.ok) return ready();
      try {
        await deliver(server.value, message, options);
        return ok(null);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return err(engineError("UNAVAILABLE", `SMTP ${server.value.host}: ${reason}`));
      }
    },
  };
}
