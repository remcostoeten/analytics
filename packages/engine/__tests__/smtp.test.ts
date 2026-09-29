import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tls from "node:tls";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { smtp } from "../src/alerts";
import type { MailMessage } from "../src/alerts";

type Script = {
  offerStartTls: boolean;
  auth: string;
  rcpt: string;
  data: string;
};

type Session = {
  commands: string[];
  body: string[];
  secure: boolean;
};

const directory = mkdtempSync(join(tmpdir(), "smtp-test-"));
const sessions: Session[] = [];
const servers: net.Server[] = [];
let script: Script;
let key: Buffer;
let cert: Buffer;
let implicitPort = 0;
let plainPort = 0;
let handoffPort = 0;

const message: MailMessage = {
  from: "Analytics <remco@gmail.com>",
  to: ["remco@gmail.com", "team@remcostoeten.nl"],
  subject: "[remcostoeten.nl] 1 new issue",
  text: "NEW         TypeError\n.leading dot\n",
  html: "<p>TypeError</p>",
};

function reset(overrides: Partial<Script> = {}) {
  sessions.length = 0;
  script = {
    offerStartTls: true,
    auth: "235 2.7.0 Accepted",
    rcpt: "250 2.1.5 OK",
    data: "250 2.0.0 queued",
    ...overrides,
  };
}

function serve(socket: net.Socket, session: Session, greet: boolean, onStartTls: () => void) {
  let buffer = "";
  let inData = false;
  if (greet) socket.write("220 fake.test ESMTP\r\n");
  function line(text: string) {
    if (inData) {
      if (text === ".") {
        inData = false;
        socket.write(`${script.data}\r\n`);
      } else {
        session.body.push(text);
      }
      return;
    }
    session.commands.push(text);
    const verb = text.split(" ")[0]?.toUpperCase() ?? "";
    if (verb === "EHLO") {
      const extensions = ["250-fake.test", "250-AUTH PLAIN LOGIN"];
      if (script.offerStartTls && !session.secure) extensions.push("250-STARTTLS");
      socket.write(`${[...extensions, "250 SIZE 1000000"].join("\r\n")}\r\n`);
    } else if (verb === "STARTTLS") {
      socket.write("220 2.0.0 Ready to start TLS\r\n");
      socket.removeAllListeners("data");
      onStartTls();
    } else if (verb === "AUTH") {
      socket.write(`${script.auth}\r\n`);
    } else if (verb === "MAIL") {
      socket.write("250 2.1.0 OK\r\n");
    } else if (verb === "RCPT") {
      socket.write(`${script.rcpt}\r\n`);
    } else if (verb === "DATA") {
      inData = true;
      socket.write("354 Go ahead\r\n");
    } else if (verb === "QUIT") {
      socket.end("221 2.0.0 Bye\r\n");
    } else {
      socket.write("500 5.5.1 Unknown command\r\n");
    }
  }
  socket.on("data", (chunk) => {
    buffer += String(chunk);
    let end = buffer.indexOf("\r\n");
    while (end !== -1) {
      line(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      end = buffer.indexOf("\r\n");
    }
  });
  socket.on("error", () => socket.destroy());
}

function listen(server: net.Server) {
  servers.push(server);
  return new Promise<number>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)),
  );
}

function url(protocol: "smtps" | "smtp", port: number) {
  return `${protocol}://remco%40gmail.com:app%3Apassword@127.0.0.1:${port}`;
}

function plainAuth(session: Session) {
  const auth = session.commands.find((command) => command.startsWith("AUTH PLAIN "));
  return auth ? Buffer.from(auth.slice("AUTH PLAIN ".length), "base64").toString("utf8") : null;
}

function decodedBody(session: Session) {
  return session.body.join("\n");
}

beforeAll(async () => {
  const generated = Bun.spawnSync([
    "openssl",
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    join(directory, "key.pem"),
    "-out",
    join(directory, "cert.pem"),
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ]);
  if (generated.exitCode !== 0) throw new Error(String(generated.stderr));
  key = readFileSync(join(directory, "key.pem"));
  cert = readFileSync(join(directory, "cert.pem"));
  reset();
  implicitPort = await listen(
    tls.createServer({ key, cert }, (socket) => {
      const session = { commands: [], body: [], secure: true };
      sessions.push(session);
      serve(socket, session, true, () => socket.destroy());
    }),
  );
  handoffPort = await listen(
    tls.createServer({ key, cert }, (socket) => {
      const session = sessions.at(-1);
      if (!session) return socket.destroy();
      session.secure = true;
      serve(socket, session, false, () => socket.destroy());
    }),
  );
  // Bun cannot upgrade a server-side socket to TLS, so STARTTLS hands the raw stream to a TLS listener.
  plainPort = await listen(
    net.createServer((socket) => {
      const session = { commands: [], body: [], secure: false };
      sessions.push(session);
      serve(socket, session, true, () => {
        const upstream = net.connect(handoffPort, "127.0.0.1");
        socket.pipe(upstream);
        upstream.pipe(socket);
      });
    }),
  );
});

afterAll(() => {
  for (const server of servers) server.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("smtp()", () => {
  test("smtps:// logs in over TLS, sends one multipart mail and quits", async () => {
    reset();
    const sent = await smtp(url("smtps", implicitPort), { tls: { ca: cert } }).send(message);
    expect(sent).toEqual({ ok: true, value: null });
    const [session] = sessions;
    if (!session) throw new Error("no session");
    expect(session.secure).toBe(true);
    expect(session.commands.map((command) => command.split(" ")[0])).toEqual([
      "EHLO",
      "AUTH",
      "MAIL",
      "RCPT",
      "RCPT",
      "DATA",
      "QUIT",
    ]);
    expect(plainAuth(session)).toBe("\0remco@gmail.com\0app:password");
    expect(session.commands).toContain("MAIL FROM:<remco@gmail.com>");
    expect(session.commands).toContain("RCPT TO:<team@remcostoeten.nl>");
    const body = decodedBody(session);
    expect(body).toContain("Subject: [remcostoeten.nl] 1 new issue");
    expect(body).toContain("To: remco@gmail.com, team@remcostoeten.nl");
    expect(body).toContain("Content-Type: multipart/alternative");
    expect(body).toContain(Buffer.from(message.text).toString("base64"));
  });

  test("smtp:// upgrades with STARTTLS before logging in", async () => {
    reset();
    const sent = await smtp(url("smtp", plainPort), { tls: { ca: cert } }).send(message);
    expect(sent).toEqual({ ok: true, value: null });
    const [session] = sessions;
    if (!session) throw new Error("no session");
    expect(session.secure).toBe(true);
    expect(session.commands.slice(0, 4).map((command) => command.split(" ")[0])).toEqual([
      "EHLO",
      "STARTTLS",
      "EHLO",
      "AUTH",
    ]);
  });

  test("refuses to send when the server offers no STARTTLS", async () => {
    reset({ offerStartTls: false });
    const sent = await smtp(url("smtp", plainPort), { tls: { ca: cert } }).send(message);
    expect(sent.ok ? null : sent.error.message).toContain("never sent unencrypted");
    expect(sessions[0]?.commands.some((command) => command.startsWith("AUTH"))).toBe(false);
  });

  test("refuses a server whose certificate is not trusted", async () => {
    reset();
    const sent = await smtp(url("smtps", implicitPort)).send(message);
    expect(sent.ok).toBe(false);
  });

  test("answers each server error with the step and the reply", async () => {
    reset({ auth: "535 5.7.8 Username and Password not accepted" });
    const login = await smtp(url("smtps", implicitPort), { tls: { ca: cert } }).send(message);
    expect(login.ok ? null : login.error.message).toBe(
      "SMTP 127.0.0.1: AUTH answered 535 5.7.8 Username and Password not accepted",
    );
    reset({ rcpt: "550 5.1.1 No such user" });
    const rcpt = await smtp(url("smtps", implicitPort), { tls: { ca: cert } }).send(message);
    expect(rcpt.ok ? null : rcpt.error.message).toContain(
      "RCPT TO answered 550 5.1.1 No such user",
    );
    reset({ data: "554 5.7.1 Message rejected" });
    const data = await smtp(url("smtps", implicitPort), { tls: { ca: cert } }).send(message);
    expect(data.ok ? null : data.error.message).toContain("The message answered 554");
  });

  test("an unreachable server is an error, not a throw", async () => {
    const sent = await smtp("smtps://user:pass@127.0.0.1:1", { timeoutMs: 2000 }).send(message);
    expect(sent.ok).toBe(false);
  });

  test("a missing or malformed URL is reported by ready, never thrown", () => {
    expect(smtp(undefined).ready()).toMatchObject({
      ok: false,
      error: { message: "MAIL_URL is not set" },
    });
    expect(smtp("https://example.com").ready()).toMatchObject({
      ok: false,
      error: { message: "MAIL_URL must start with smtps:// or smtp://" },
    });
    expect(smtp("smtps://user:pass@smtp.gmail.com").host).toBe("smtp.gmail.com");
  });
});
