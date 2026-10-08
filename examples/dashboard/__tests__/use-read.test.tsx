import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import type { ClientError, ClientResult } from "@spoar/client";

import { useRead } from "../src/use-read";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

type Mounted = { root: Root; container: HTMLDivElement };

const mounted: Mounted[] = [];

function Probe({ read, name }: { read: () => ClientResult<number>; name: string }) {
  const state = useRead(read, [name]);
  const code = state.status === "error" ? state.error.code : null;
  return (
    <output>
      {JSON.stringify({ status: state.status, value: state.value, code })}
      <button type="button" onClick={state.retry}>
        retry
      </button>
    </output>
  );
}

function failure(code: ClientError["code"]): ClientError {
  return { code, message: code, status: null, details: null, requestId: null };
}

function snapshot(container: HTMLDivElement) {
  const text = container.querySelector("output")?.firstChild?.textContent ?? "{}";
  return JSON.parse(text) as { status: string; value: number | null; code: string | null };
}

async function mount(read: () => ClientResult<number>, name = "a") {
  const container = document.createElement("div");
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(<Probe read={read} name={name} />));
  return { root, container };
}

async function ok(value: number): ClientResult<number> {
  return { ok: true, value };
}

afterEach(async () => {
  await act(async () => {
    for (const { root } of mounted.splice(0)) root.unmount();
  });
});

describe("useRead", () => {
  test("holds a successful result", async () => {
    const { container } = await mount(() => ok(7));
    expect(snapshot(container)).toEqual({ status: "ready", value: 7, code: null });
  });

  test("holds the error and keeps the last value", async () => {
    const { root, container } = await mount(() => ok(3));
    expect(snapshot(container).value).toBe(3);
    await act(async () =>
      root.render(<Probe read={async () => ({ ok: false, error: failure("NETWORK") })} name="b" />),
    );
    expect(snapshot(container)).toEqual({ status: "error", value: 3, code: "NETWORK" });
  });

  test("retry runs the read again", async () => {
    let calls = 0;
    const { container } = await mount(() => {
      calls += 1;
      return ok(calls);
    });
    expect(snapshot(container).value).toBe(1);
    await act(async () => container.querySelector("button")?.click());
    expect(snapshot(container).value).toBe(2);
  });

  test("drops a response that arrives after a newer read started", async () => {
    let release: (() => void) | null = null;
    function slow(): ClientResult<number> {
      return new Promise((resolve) => {
        release = () => resolve({ ok: true, value: 1 });
      });
    }
    const { root, container } = await mount(slow, "slow");
    await act(async () => root.render(<Probe read={() => ok(2)} name="fast" />));
    expect(snapshot(container).value).toBe(2);
    await act(async () => release?.());
    expect(snapshot(container).value).toBe(2);
  });
});
