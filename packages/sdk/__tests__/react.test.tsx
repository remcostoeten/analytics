import { afterEach, describe, expect, test } from "bun:test";

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";

import {
  AnalyticsProvider,
  computeRoute,
  ErrorBoundary,
  TrackClick,
  useAnalytics,
  useRoutePageviews,
} from "../src/react/index";
import { client, fresh, sent } from "./helpers";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

const mounted: (() => void)[] = [];

async function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  mounted.push(() => {
    root.unmount();
    container.remove();
  });
  return container;
}

afterEach(async () => {
  await act(async () => {
    for (const unmount of mounted.splice(0)) unmount();
  });
  fresh();
});

function Upgrade() {
  const analytics = useAnalytics<{ signup: { plan: string } }>();
  return (
    <button type="button" onClick={() => analytics.track("signup", { plan: "pro" })}>
      Upgrade
    </button>
  );
}

function Crash(): ReactNode {
  throw new TypeError("render failed");
}

function Routed({ path, route }: { path: string | null; route: string | null }) {
  useRoutePageviews(path, route);
  return null;
}

describe("react", () => {
  test("useAnalytics gives the provider's client", async () => {
    const { analytics, transport } = client();
    const view = await render(
      <AnalyticsProvider client={analytics}>
        <Upgrade />
      </AnalyticsProvider>,
    );
    view.querySelector("button")?.click();
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props])).toEqual([
      ["signup", { plan: "pro" }],
    ]);
  });

  test("useAnalytics outside a provider does nothing and does not throw", async () => {
    const view = await render(<Upgrade />);
    expect(() => view.querySelector("button")?.click()).not.toThrow();
  });

  test("TrackClick sends its event after the child's own onClick", async () => {
    const { analytics, transport } = client();
    const clicks: string[] = [];
    const view = await render(
      <AnalyticsProvider client={analytics}>
        <TrackClick name="cta_click" props={{ place: "hero" }}>
          <a href="#pricing" onClick={() => clicks.push("own")}>
            Pricing
          </a>
        </TrackClick>
      </AnalyticsProvider>,
    );
    view.querySelector("a")?.click();
    await analytics.flush();
    expect(clicks).toEqual(["own"]);
    expect(sent(transport)[0]).toMatchObject({ name: "cta_click", props: { place: "hero" } });
  });

  test("ErrorBoundary records the error with its tags and renders the fallback", async () => {
    const { analytics, transport } = client();
    const original = console.error;
    console.error = () => undefined;
    const view = await render(
      <AnalyticsProvider client={analytics}>
        <ErrorBoundary
          fallback={(error) => <p>{error instanceof Error ? error.message : "failed"}</p>}
          tags={{ area: "dashboard" }}
        >
          <Crash />
        </ErrorBoundary>
      </AnalyticsProvider>,
    );
    console.error = original;
    await analytics.flush();
    expect(view.textContent).toBe("render failed");
    expect(sent(transport)[0]).toMatchObject({
      name: "error",
      props: { area: "dashboard", type: "TypeError", message: "render failed", level: "error" },
    });
  });

  test("useRoutePageviews holds pageviews until the route is known, then sends each path once", async () => {
    const { analytics, transport } = client();
    const container = document.createElement("div");
    const root = createRoot(container);
    function show(path: string | null, route: string | null) {
      return act(async () =>
        root.render(
          <AnalyticsProvider client={analytics}>
            <Routed path={path} route={route} />
          </AnalyticsProvider>,
        ),
      );
    }
    await show("/blog/hello", null);
    await show("/blog/hello", "/blog/[slug]");
    await show("/blog/hello", "/blog/[slug]");
    await show("/blog/other", "/blog/[slug]");
    await act(async () => root.unmount());
    await analytics.flush();
    const pageviews = sent(transport).filter((event) => event.name === "pageview");
    expect(pageviews.map((event) => event.page.route)).toEqual(["/blog/[slug]", "/blog/[slug]"]);
    expect(analytics.status().route).toBe("/blog/[slug]");
  });
});

describe("computeRoute", () => {
  test.each([
    ["/blog/hello-world", { slug: "hello-world" }, "/blog/[slug]"],
    ["/docs/a/b", { path: ["a", "b"] }, "/docs/[...path]"],
    ["/en/blog/en", { lang: "en", slug: "en" }, "/[lang]/blog/[slug]"],
    ["/blog/blog", { slug: "blog" }, "/blog/[slug]"],
    ["/en/docs/a/b", { lang: "en", path: ["a", "b"] }, "/[lang]/docs/[...path]"],
    ["/blog/hello", { slug: "missing" }, "/blog/hello"],
    ["/shop/shoes/red", { category: "shoes", color: "red" }, "/shop/[category]/[color]"],
    ["/blog/caf%C3%A9", { slug: "café" }, "/blog/[slug]"],
    ["/about", {}, "/about"],
    ["/about", null, "/about"],
  ])("computeRoute(%s)", (pathname, params, expected) => {
    expect(computeRoute(pathname, params)).toBe(expected);
  });
});
