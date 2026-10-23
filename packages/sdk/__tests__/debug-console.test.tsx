import { afterEach, describe, expect, test } from "bun:test";

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";

import DebugConsoleGate from "../src/next/debug-console";
import { AnalyticsProvider } from "../src/react/index";
import { client, fresh } from "./helpers";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

const mounted: (() => void)[] = [];
const realOpen = window.open;
const realFetch = globalThis.fetch;
let opened: string[] = [];
let fetched: string[] = [];

async function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  mounted.push(() => {
    root.unmount();
    container.remove();
  });
}

function press(key = "K") {
  dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, shiftKey: true }));
}

function stub() {
  opened = [];
  fetched = [];
  window.open = (url) => {
    opened.push(String(url));
    return null;
  };
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      fetched.push(input instanceof Request ? input.url : input.toString());
      return new Response("{}", { status: 401 });
    },
    { preconnect: realFetch.preconnect },
  );
}

afterEach(async () => {
  await act(async () => {
    for (const unmount of mounted.splice(0)) unmount();
  });
  window.open = realOpen;
  globalThis.fetch = realFetch;
  fresh();
});

describe("DebugConsoleGate", () => {
  test("costs a visitor no request until the shortcut", async () => {
    stub();
    const { analytics } = client();
    await render(
      <AnalyticsProvider client={analytics}>
        <DebugConsoleGate option />
      </AnalyticsProvider>,
    );
    press("j");
    expect(opened).toEqual([]);
    expect(fetched).toEqual([]);
  });

  test("opens the connect popup on the API behind an absolute endpoint", async () => {
    stub();
    const { analytics } = client();
    await render(
      <AnalyticsProvider client={analytics}>
        <DebugConsoleGate option />
      </AnalyticsProvider>,
    );
    press();
    expect(opened).toEqual([
      "https://api.example.test/v2/widget/connect?origin=https%3A%2F%2Fremcostoeten.nl",
    ]);
    expect(fetched).toEqual([]);
  });

  test("uses the hosted API behind the proxy, or the api it is given", async () => {
    stub();
    const proxied = client({ endpoint: "/_ra" }).analytics;
    await render(
      <AnalyticsProvider client={proxied}>
        <DebugConsoleGate option />
      </AnalyticsProvider>,
    );
    press();
    expect(
      opened.at(-1)?.startsWith("https://api.analytics.remcostoeten.nl/v2/widget/connect?"),
    ).toBe(true);
    await act(async () => {
      for (const unmount of mounted.splice(0)) unmount();
    });
    const own = client({ endpoint: "/_ra" }).analytics;
    await render(
      <AnalyticsProvider client={own}>
        <DebugConsoleGate option={{ api: "https://stats.example.org" }} />
      </AnalyticsProvider>,
    );
    press();
    expect(opened.at(-1)?.startsWith("https://stats.example.org/v2/widget/connect?")).toBe(true);
  });

  test("does nothing while off", async () => {
    stub();
    const { analytics } = client();
    await render(
      <AnalyticsProvider client={analytics}>
        <DebugConsoleGate option={false} />
      </AnalyticsProvider>,
    );
    press();
    expect(opened).toEqual([]);
  });
});
