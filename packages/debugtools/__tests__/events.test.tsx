import { afterEach, describe, expect, test } from "bun:test";
import type { Client } from "@spoar/client";
import type { LogLine, WireEvent } from "@spoar/contract";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { createEventLog, rejectionCode } from "../src/events/event-log";
import { EventsView } from "../src/events/events-view";
import type { ConsoleHost, HostListeners, HostStatus } from "../src/host";
import type { ViewContext } from "../src/widget/view";

type FakeHost = ConsoleHost & {
  emit: { [Name in keyof HostListeners]: (...args: Parameters<HostListeners[Name]>) => void };
  count: () => number;
};

function fakeHost(status: Partial<HostStatus> = {}): FakeHost {
  const handlers: { [Name in keyof HostListeners]: Set<HostListeners[Name]> } = {
    send: new Set(),
    drop: new Set(),
    error: new Set(),
  };
  let optedOut = false;
  return {
    on: (name, handler) => {
      const set = handlers[name] as Set<typeof handler>;
      set.add(handler);
      return () => set.delete(handler);
    },
    optOut: () => {
      optedOut = true;
    },
    optIn: () => {
      optedOut = false;
    },
    isOptedOut: () => optedOut,
    status: () => ({
      queued: 0,
      consent: "unset",
      endpoint: "/_ra",
      lastError: null,
      lastSend: null,
      ...status,
    }),
    emit: {
      send: (envelope) => {
        for (const handler of handlers.send) handler(envelope);
      },
      drop: (event, reason) => {
        for (const handler of handlers.drop) handler(event, reason);
      },
      error: (code, detail, event) => {
        for (const handler of handlers.error) handler(code, detail, event);
      },
    },
    count: () => handlers.send.size + handlers.drop.size + handlers.error.size,
  };
}

function wire(name: string, id: string, path = "/pricing"): WireEvent {
  return {
    id,
    name,
    ts: "2026-11-01T10:00:00.000Z",
    visitor: "v1",
    session: "s1",
    page: { path },
    props: { plan: "pro" },
  };
}

function at() {
  return new Date("2026-11-01T10:00:05.000Z");
}

describe("createEventLog", () => {
  test("marks events in a sent envelope accepted unless a rejection named them", () => {
    const host = fakeHost();
    const log = createEventLog(host, at);
    const signup = wire("signup", "e1");
    const view = wire("pageview", "e2");
    host.emit.error("RA_INGEST_REJECTED", "VALIDATION_FAILED: props.plan is too long", signup);
    host.emit.send({ events: [signup, view] });
    const rows = log.read();
    expect(rows.map((row) => [row.event?.name, row.status])).toEqual([
      ["pageview", "accepted"],
      ["signup", "rejected"],
    ]);
    expect(rows[1]?.reason).toBe("VALIDATION_FAILED: props.plan is too long");
    expect(rows[0]?.at).toBe("2026-11-01T10:00:05.000Z");
  });

  test("forgets a rejection once its envelope was sent", () => {
    const host = fakeHost();
    const log = createEventLog(host, at);
    const signup = wire("signup", "e1");
    host.emit.error("RA_INGEST_REJECTED", "VALIDATION_FAILED: bad", signup);
    host.emit.send({ events: [signup] });
    host.emit.send({ events: [signup] });
    expect(log.read()[0]?.status).toBe("accepted");
  });

  test("records drops, failed sends and ignores other errors", () => {
    const host = fakeHost();
    const log = createEventLog(host, at);
    host.emit.drop(wire("click", "e3"), "opt-out");
    host.emit.error("RA_INGEST_FAILED", "HTTP 503");
    host.emit.error("RA_SOMETHING_ELSE", "noise");
    expect(log.read().map((row) => [row.status, row.reason])).toEqual([
      ["failed", "HTTP 503"],
      ["dropped", "opt-out"],
    ]);
  });

  test("keeps the newest entries up to its limit and notifies on change", () => {
    const host = fakeHost();
    const log = createEventLog(host, at, 3);
    let calls = 0;
    const unsubscribe = log.subscribe(() => {
      calls += 1;
    });
    for (const id of ["a", "b", "c", "d"]) host.emit.drop(wire(id, id), "dnt");
    expect(log.read().map((row) => row.event?.name)).toEqual(["d", "c", "b"]);
    expect(calls).toBe(4);
    unsubscribe();
    log.clear();
    expect(log.read()).toEqual([]);
    expect(calls).toBe(4);
  });

  test("stop removes its host listeners", () => {
    const host = fakeHost();
    const log = createEventLog(host, at);
    expect(host.count()).toBe(3);
    log.stop();
    expect(host.count()).toBe(0);
  });

  test("rejectionCode takes the code before the colon", () => {
    expect(rejectionCode("VALIDATION_FAILED: props.plan is too long")).toBe("VALIDATION_FAILED");
    expect(rejectionCode("DUPLICATE")).toBe("DUPLICATE");
  });
});

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

function button(container: HTMLElement, name: string) {
  return [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.trim().startsWith(name),
  );
}

const rejectLine: LogLine = {
  id: "7",
  ts: "2026-11-01T09:00:00.000Z",
  level: "warn",
  kind: "ingest",
  source: "engine",
  message: "RA_INGEST_REJECTED props.plan is too long",
  data: {
    code: "RA_INGEST_REJECTED",
    reason: "VALIDATION_FAILED",
    event: "signup",
    field: "props",
  },
  visitor: null,
  session: null,
};

function fakeClient(queries: string[]) {
  return (async () =>
    ({
      project: () => ({
        logs: async ({ q }: { q: string }) => {
          queries.push(q);
          const data = q === "RA_INGEST_REJECTED" ? [rejectLine] : [];
          return { ok: true, value: { data, nextCursor: "0" } };
        },
      }),
    }) as unknown as Client<string>) satisfies ViewContext["client"];
}

function context(host: ConsoleHost | null, queries: string[] = []): ViewContext {
  return { project: "site", client: fakeClient(queries), host };
}

describe("EventsView", () => {
  test("explains how to hand the console a client when there is no host", async () => {
    const container = await render(<EventsView context={context(null)} />);
    expect(container.textContent).toContain("did not hand the console a client");
    expect(container.textContent).toContain("<Analytics debugConsole />");
    expect(container.textContent).toContain("mount({ host })");
  });

  test("says only later events show and hints at development mode when nothing was sent", async () => {
    const container = await render(<EventsView context={context(fakeHost())} />);
    expect(container.textContent).toContain("No events yet.");
    expect(container.textContent).toContain("after the console loaded on this page");
    expect(container.textContent).toContain("development mode");
    expect(container.textContent).toContain("last send never");
  });

  test("lists events newest first with their status and expands one", async () => {
    const host = fakeHost();
    const container = await render(<EventsView context={context(host)} />);
    const signup = wire("signup", "e1", "/signup");
    await act(async () => {
      host.emit.error("RA_INGEST_REJECTED", "VALIDATION_FAILED: props.plan is too long", signup);
      host.emit.send({ events: [signup, wire("pageview", "e2")] });
      host.emit.drop(wire("click", "e3"), "consent");
      host.emit.error("RA_INGEST_FAILED", "HTTP 500");
    });
    const rows = [...container.querySelectorAll("li")].map((row) => row.textContent ?? "");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain("failed HTTP 500");
    expect(rows[1]).toContain("dropped consent");
    expect(rows[2]).toContain("accepted");
    expect(rows[3]).toContain("/signup");
    expect(rows[3]).toContain("rejected VALIDATION_FAILED");

    const first = container.querySelector("li button") as HTMLButtonElement;
    await act(async () => first.click());
    const pre = container.querySelector("pre");
    expect(pre?.textContent).toBe("HTTP 500");

    const signupRow = [...container.querySelectorAll("li button")].at(-1) as HTMLButtonElement;
    await act(async () => signupRow.click());
    expect(signupRow.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain('"plan": "pro"');
  });

  test("filters by name and clears the log", async () => {
    const host = fakeHost();
    const container = await render(<EventsView context={context(host)} />);
    await act(async () => {
      host.emit.send({ events: [wire("signup", "e1"), wire("pageview", "e2")] });
    });
    const input = container.querySelector("input") as HTMLInputElement;
    await act(async () => {
      const native: { set?: (this: HTMLInputElement, value: string) => void } | undefined =
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      native?.set?.call(input, "SIGN");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(container.textContent).toContain("1 of 2");
    await act(async () => button(container, "Clear")?.click());
    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.textContent).toContain("No events yet.");
  });

  test("shows the project's server side rejects from its log", async () => {
    const queries: string[] = [];
    const container = await render(<EventsView context={context(fakeHost(), queries)} />);
    await act(async () => button(container, "Server rejects")?.click());
    expect(queries).toContain("RA_INGEST_REJECTED");
    expect(container.textContent).toContain("VALIDATION_FAILED");
    expect(container.textContent).toContain("signup");
  });
});
