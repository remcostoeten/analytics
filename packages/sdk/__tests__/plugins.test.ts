import { beforeEach, describe, expect, test } from "bun:test";

import type { Metric } from "web-vitals";

import {
  botSignals,
  clicks,
  engagement,
  errors,
  experiments,
  forms,
  groups,
  ignoreSelf,
  notFound,
  outboundLinks,
  scrollDepth,
  scrub,
  speedInsights,
  speedProps,
} from "../src/plugins";
import type { NoProps } from "../src";
import type { SpeedOptions } from "../src/plugins";
import { client, fresh, sent } from "./helpers";

beforeEach(() => {
  fresh();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  history.replaceState(null, "", "/blog/rebuilding-analytics");
});

function hide() {
  dispatchEvent(new Event("pagehide"));
}

describe("scrollDepth", () => {
  test("sends the deepest point when the page is hidden, credited to that page", async () => {
    const { analytics, transport } = client({ plugins: [scrollDepth()] });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    dispatchEvent(new Event("scroll"));
    Object.defineProperty(window, "scrollY", { value: 250, configurable: true });
    dispatchEvent(new Event("scroll"));
    history.pushState(null, "", "/pricing");
    analytics.page();
    await analytics.flush();
    const depth = sent(transport).find((event) => event.name === "scroll_depth");
    expect(depth).toMatchObject({
      props: { depth: 50 },
      page: { path: "/blog/rebuilding-analytics" },
    });
    await analytics.shutdown();
  });
});

describe("engagement", () => {
  test("sends visible milliseconds when the page is left", async () => {
    const { analytics, transport } = client({ plugins: [engagement()] });
    await new Promise((resolve) => setTimeout(resolve, 20));
    hide();
    await analytics.flush();
    const [event] = sent(transport).filter((item) => item.name === "engagement");
    expect(Number(event?.props.ms)).toBeGreaterThanOrEqual(15);
    await analytics.shutdown();
  });
});

describe("clicks", () => {
  test("sends a click with the label and data-ra-prop attributes", async () => {
    const { analytics, transport } = client({ plugins: [clicks()] });
    document.body.innerHTML =
      '<button data-ra-click="upgrade" data-ra-prop-plan="pro"><span id="inner">Upgrade</span></button><button id="plain">No</button>';
    document.querySelector<HTMLElement>("#inner")?.click();
    document.querySelector<HTMLElement>("#plain")?.click();
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props])).toEqual([
      ["click", { label: "upgrade", plan: "pro" }],
    ]);
    await analytics.shutdown();
  });
});

describe("outboundLinks", () => {
  test.each([
    [
      "an outbound link",
      "https://github.com/remcostoeten?tab=repos",
      ["outbound_click", { url: "https://github.com/remcostoeten", host: "github.com" }],
    ],
    [
      "a download",
      "/files/report.PDF?v=2",
      ["file_download", { url: `${location.origin}/files/report.PDF`, extension: "pdf" }],
    ],
    ["an internal link", "/pricing", null],
    ["a mailto link", "mailto:ada@example.com", null],
  ])("%s", async (_, href, expected) => {
    const { analytics, transport } = client({ plugins: [outboundLinks()] });
    document.body.innerHTML = `<a id="link" href="${href}">x</a>`;
    const link = document.querySelector<HTMLAnchorElement>("#link");
    link?.addEventListener("click", (event) => event.preventDefault());
    link?.click();
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props])).toEqual(
      expected ? [expected] : [],
    );
    await analytics.shutdown();
  });
});

describe("forms", () => {
  test("sends the form id and action path, and nothing from the fields", async () => {
    const { analytics, transport } = client({ plugins: [forms()] });
    document.body.innerHTML =
      '<form id="signup" action="/api/signup?ref=x"><input name="email" value="ada@example.com"></form>';
    const form = document.querySelector("form");
    form?.addEventListener("submit", (event) => event.preventDefault());
    form?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props])).toEqual([
      ["form_submit", { form: "signup", action: "/api/signup" }],
    ]);
    await analytics.shutdown();
  });
});

describe("notFound", () => {
  test("sends not_found only on pages marked as not found", async () => {
    document.head.innerHTML = '<meta name="ra-not-found">';
    const marked = client({ plugins: [notFound()] });
    await marked.analytics.flush();
    expect(sent(marked.transport).map((event) => event.name)).toEqual(["not_found"]);
    await marked.analytics.shutdown();
    document.head.innerHTML = "";
    const plain = client({ plugins: [notFound()] });
    await plain.analytics.flush();
    expect(sent(plain.transport)).toEqual([]);
    await plain.analytics.shutdown();
  });

  test("reports a page once with the default pageviews plugin, and again after navigating", async () => {
    document.head.innerHTML = '<meta name="ra-not-found">';
    const { analytics, transport } = client({ pageviews: true, plugins: [notFound()] });
    history.pushState(null, "", "/missing-too");
    analytics.page();
    await analytics.flush();
    expect(
      sent(transport)
        .filter((event) => event.name === "not_found")
        .map((event) => event.page.path),
    ).toEqual(["/blog/rebuilding-analytics", "/missing-too"]);
    await analytics.shutdown();
  });

  test("reports a page once when an adapter sends the pageviews", async () => {
    document.head.innerHTML = '<meta name="ra-not-found">';
    const { analytics, transport } = client({ plugins: [notFound()] });
    analytics.route("/[...missing]");
    analytics.page();
    await analytics.flush();
    expect(sent(transport).map((event) => event.name)).toEqual(["not_found", "pageview"]);
    await analytics.shutdown();
  });
});

describe("ignoreSelf", () => {
  test("?ra=ignore opts this browser out and ?ra=track opts it back in", async () => {
    history.replaceState(null, "", "/?ra=ignore");
    const ignored = client({ plugins: [ignoreSelf()] });
    expect(ignored.analytics.isOptedOut()).toBe(true);
    await ignored.analytics.shutdown();
    history.replaceState(null, "", "/?ra=track");
    const tracked = client({ plugins: [ignoreSelf()] });
    expect(tracked.analytics.isOptedOut()).toBe(false);
    await tracked.analytics.shutdown();
  });
});

describe("botSignals", () => {
  test("sets the webdriver and no-input bits", async () => {
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    const { analytics, transport } = client({ plugins: [botSignals()] });
    analytics.track("before input");
    dispatchEvent(new Event("pointerdown"));
    analytics.track("after input");
    await analytics.flush();
    const [before, after] = sent(transport);
    expect((before?.signals ?? 0) & 1).toBe(1);
    expect((before?.signals ?? 0) & 4).toBe(4);
    expect((after?.signals ?? 0) & 4).toBe(0);
    Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await analytics.shutdown();
  });
});

describe("experiments", () => {
  test("registers each variant and sends one exposure per experiment", async () => {
    const { analytics, transport } = client({
      plugins: [experiments({ hero: "b", pricing: "annual" })],
    });
    analytics.track("signup");
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props])).toEqual([
      [
        "experiment_exposure",
        {
          "experiment:hero": "b",
          "experiment:pricing": "annual",
          experiment: "hero",
          variant: "b",
        },
      ],
      [
        "experiment_exposure",
        {
          "experiment:hero": "b",
          "experiment:pricing": "annual",
          experiment: "pricing",
          variant: "annual",
        },
      ],
      ["signup", { "experiment:hero": "b", "experiment:pricing": "annual" }],
    ]);
    await analytics.shutdown();
  });
});

describe("errors", () => {
  test.each([
    ["query strings", "GET /api/users?token=abc&x=1 failed", "GET /api/users[x] failed"],
    ["emails", "no user ada.lovelace+test@example.co.uk", "no user [x]"],
    ["long tokens", "session abcabcabcabcabcabcabcabc expired", "session [x] expired"],
    ["long numbers", "order 12345678 missing", "order [x] missing"],
    ["short words", "Cannot read properties of undefined", "Cannot read properties of undefined"],
  ])("scrub removes %s", (_, input, expected) => {
    expect(scrub(input)).toBe(expected);
  });

  test("scrub stays linear on long runs of email and token characters", () => {
    const started = performance.now();
    scrub("+".repeat(50_000));
    scrub("a-".repeat(25_000));
    expect(performance.now() - started).toBeLessThan(200);
  });

  test("captures uncaught errors and rejections with scrubbed breadcrumbs", async () => {
    const { analytics, transport } = client({ plugins: [errors()] });
    analytics.track("opened");
    document.body.innerHTML = "<button id=b>x</button>";
    document.querySelector<HTMLElement>("#b")?.click();
    dispatchEvent(
      new ErrorEvent("error", {
        error: new TypeError("failed for ada@example.com"),
        message: "failed for ada@example.com",
      }),
    );
    const rejection = new Event("unhandledrejection") as Event & { reason: unknown };
    rejection.reason = "rejected with 1234567890";
    dispatchEvent(rejection);
    await analytics.flush();
    const reported = sent(transport).filter((event) => event.name === "error");
    expect(reported.map((event) => [event.props.type, event.props.message])).toEqual([
      ["TypeError", "failed for [x]"],
      ["Error", "rejected with [x]"],
    ]);
    const crumbs = String(reported[0]?.props.breadcrumbs)
      .split("\n")
      .map((line) => line.split(" ").slice(1).join(" "));
    expect(crumbs).toEqual(["event opened", "click BUTTON"]);
    await analytics.shutdown();
  });

  test("records failed fetches as breadcrumbs and restores fetch on shutdown", async () => {
    const original = window.fetch;
    window.fetch = Object.assign(async () => new Response("", { status: 500 }), original);
    const patched = window.fetch;
    const { analytics, transport } = client({ plugins: [errors()] });
    await fetch("https://api.example.test/v1/posts?token=secret");
    dispatchEvent(new ErrorEvent("error", { error: new Error("after the fetch") }));
    await analytics.flush();
    expect(String(sent(transport)[0]?.props.breadcrumbs)).toContain("fetch 500");
    expect(String(sent(transport)[0]?.props.breadcrumbs)).not.toContain("secret");
    await analytics.shutdown();
    expect(window.fetch).toBe(patched);
    window.fetch = original;
  });
});

function metric(
  name: Metric["name"],
  value: number,
  attribution: { [key: string]: string },
  id = `v5-${name}`,
): never {
  return {
    name,
    value,
    rating: "good",
    id,
    navigationType: "navigate",
    attribution,
  } as never;
}

describe("speedInsights", () => {
  test("speedProps rounds CLS to 4 decimals and the rest to milliseconds, with one selector", () => {
    expect(
      speedProps(metric("CLS", 0.123456, { largestShiftTarget: "main>img" }), 1, "4g"),
    ).toEqual({
      metric: "cls",
      id: "v5-CLS",
      value: 0.1235,
      rating: "good",
      navigationType: "navigate",
      connection: "4g",
      selector: "main>img",
      sampleRate: 1,
    });
    expect(speedProps(metric("LCP", 2412.6, { target: "#hero" }), 0.5, null)).toMatchObject({
      value: 2413,
      selector: "#hero",
    });
    expect(
      speedProps(metric("INP", 180.2, { interactionTarget: "" }), 1, null).selector,
    ).toBeNull();
    expect(speedProps(metric("TTFB", 80.4, {}), 1, null).selector).toBeNull();
  });

  function loader(report: (callbacks: ((value: never) => void)[]) => void): SpeedOptions["load"] {
    return async () => {
      const callbacks: ((value: never) => void)[] = [];
      function register(callback: (value: never) => void) {
        callbacks.push(callback);
      }
      setTimeout(() => report(callbacks), 0);
      return {
        onLCP: register,
        onINP: register,
        onCLS: register,
        onFCP: register,
        onTTFB: register,
      } as never;
    };
  }

  test("buffers metrics and sends them when the page is hidden, credited to the load path", async () => {
    const load = loader(([lcp, , cls]) => {
      lcp?.(metric("LCP", 1800, { target: "#hero" }));
      cls?.(metric("CLS", 0.02, {}));
    });
    const { analytics, transport } = client({ plugins: [speedInsights({ load })] });
    await new Promise((resolve) => setTimeout(resolve, 10));
    history.pushState(null, "", "/elsewhere");
    hide();
    await analytics.flush();
    const vitals = sent(transport).filter((event) => event.name === "web_vital");
    expect(vitals.map((event) => [event.props.metric, event.page.path])).toEqual([
      ["lcp", "/blog/rebuilding-analytics"],
      ["cls", "/blog/rebuilding-analytics"],
    ]);
    await analytics.shutdown();
  });

  test("credits metrics to the loaded page's route after a client-side navigation", async () => {
    const load = loader(([lcp]) => lcp?.(metric("LCP", 1800, {})));
    const { analytics, transport } = client({ plugins: [speedInsights({ load })] });
    analytics.route("/blog/[slug]");
    await new Promise((resolve) => setTimeout(resolve, 10));
    history.pushState(null, "", "/pricing");
    analytics.route("/pricing");
    analytics.page();
    await analytics.flush();
    const vitals = sent(transport).filter((event) => event.name === "web_vital");
    expect(vitals.map((event) => [event.page.path, event.props.route])).toEqual([
      ["/blog/rebuilding-analytics", "/blog/[slug]"],
    ]);
    await analytics.shutdown();
  });

  test("keeps only the latest report per metric id and asks for every change", async () => {
    const options: unknown[] = [];
    const load: SpeedOptions["load"] = async () => {
      function register(callback: (value: never) => void, settings?: unknown) {
        options.push(settings);
        callback(metric("CLS", 0.01, {}));
        callback(metric("CLS", 0.04, {}));
      }
      return {
        onLCP: register,
        onINP: register,
        onCLS: register,
        onFCP: () => {},
        onTTFB: () => {},
      } as never;
    };
    const { analytics, transport } = client({ plugins: [speedInsights({ load })] });
    await new Promise((resolve) => setTimeout(resolve, 10));
    hide();
    await analytics.flush();
    const vitals = sent(transport).filter((event) => event.name === "web_vital");
    expect(vitals.map((event) => event.props.value)).toEqual([0.04]);
    expect(options).toEqual([
      { reportAllChanges: true },
      { reportAllChanges: true },
      { reportAllChanges: true },
    ]);
    await analytics.shutdown();
  });

  test("flushes at 6 metrics and skips pages outside the sample", async () => {
    const six = loader((callbacks) => {
      for (let index = 0; index < 6; index += 1)
        callbacks[index % 5]?.(metric("FCP", 100 + index, {}, `v5-FCP-${index}`));
    });
    const sampled = client({ plugins: [speedInsights({ load: six })] });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sent(sampled.transport).filter((event) => event.name === "web_vital")).toHaveLength(6);
    await sampled.analytics.shutdown();

    const skipped = client({
      plugins: [speedInsights({ sampleRate: 0.1, random: () => 0.5, load: six })],
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await skipped.analytics.flush();
    expect(sent(skipped.transport)).toEqual([]);
    await skipped.analytics.shutdown();
  });
});

describe("pageviews", () => {
  test("stands down once an adapter supplies the route, and skips hash-only changes", async () => {
    const { analytics, transport } = client({ pageviews: true });
    history.pushState(null, "", "/blog/rebuilding-analytics#comments");
    analytics.route("/blog/[slug]");
    history.pushState(null, "", "/pricing");
    await analytics.flush();
    expect(sent(transport).map((event) => event.page.path)).toEqual(["/blog/rebuilding-analytics"]);
    await analytics.shutdown();
  });

  test("sends the hash path for hash routers, and skips anchors", async () => {
    history.replaceState(null, "", "/#/blog/rebuilding-analytics");
    const { analytics, transport } = client({ pageviews: true });
    history.pushState(null, "", "/#/pricing?plan=pro");
    history.pushState(null, "", "/#/about");
    history.pushState(null, "", "/#/about");
    await analytics.flush();
    expect(sent(transport).map((event) => event.page.path)).toEqual([
      "/blog/rebuilding-analytics",
      "/pricing",
      "/about",
    ]);
    await analytics.shutdown();
  });
});

describe("groups", () => {
  type Workspaces = { company: { plan: "free" | "pro" }; team: NoProps };

  test("announces a group with its traits and puts every later event in it", async () => {
    const workspace = groups<Workspaces>();
    const { analytics, transport } = client({ plugins: [workspace] });
    workspace.set("company", "acme", { plan: "pro" });
    workspace.set("team", "design");
    analytics.track("signup");
    workspace.leave("team");
    analytics.track("upgrade");
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props, event.groups])).toEqual([
      ["group", { plan: "pro", groupType: "company", groupId: "acme" }, { company: "acme" }],
      ["group", { groupType: "team", groupId: "design" }, { company: "acme", team: "design" }],
      ["signup", {}, { company: "acme", team: "design" }],
      ["upgrade", {}, { company: "acme" }],
    ]);
    await analytics.shutdown();
  });

  test("holds a group set before the client starts and sends it on setup", async () => {
    const workspace = groups<Workspaces>();
    workspace.set("company", "acme");
    const { analytics, transport } = client({ plugins: [workspace] });
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.groups])).toEqual([
      ["group", { company: "acme" }],
    ]);
    await analytics.shutdown();
  });

  test("drops the groups when the visitor resets or revokes consent", async () => {
    const workspace = groups<Workspaces>();
    const { analytics, transport } = client({ plugins: [workspace] });
    workspace.set("company", "acme");
    analytics.reset();
    analytics.track("signup");
    await analytics.flush();
    workspace.set("company", "globex");
    analytics.consent.revoke();
    analytics.consent.grant();
    analytics.track("upgrade");
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.groups])).toEqual([
      ["group", { company: "acme" }],
      ["signup", undefined],
      ["upgrade", undefined],
    ]);
    await analytics.shutdown();
  });

  test("ignores invalid group types, empty ids and a sixth group", async () => {
    const workspace = groups();
    const { analytics, transport } = client({ plugins: [workspace] });
    workspace.set("Company", "acme");
    workspace.set("company", "");
    for (const type of ["a", "b", "c", "d", "e", "f"]) workspace.set(type, "x".repeat(200));
    await analytics.flush();
    const last = sent(transport).at(-1);
    expect(sent(transport)).toHaveLength(5);
    expect(Object.keys(last?.groups ?? {})).toEqual(["a", "b", "c", "d", "e"]);
    expect(last?.groups?.e).toHaveLength(128);
    await analytics.shutdown();
  });
});
