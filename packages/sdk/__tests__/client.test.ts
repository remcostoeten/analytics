import { beforeEach, describe, expect, test } from "bun:test";

import type { NoProps } from "../src/core/types";
import { definePlugin } from "../src/core/plugin-host";
import { client, fresh, sent } from "./helpers";

type Events = {
  signup: { plan: "free" | "pro" };
  newsletter_subscribed: NoProps;
};

beforeEach(() => {
  fresh();
  history.replaceState(null, "", "/blog/rebuilding-analytics?utm_source=hn");
  document.title = "Rebuilding analytics";
});

describe("track and page", () => {
  test("sends events in the contract's envelope with ids, context and page", async () => {
    const { analytics, transport } = client<Events>({ release: "2026.09.28" });
    analytics.track("signup", { plan: "pro" });
    analytics.track("newsletter_subscribed");
    analytics.page();
    expect(await analytics.flush()).toEqual({ accepted: 3, duplicates: 0, failed: 0 });
    const [signup, newsletter, pageview] = sent(transport);
    expect(signup).toMatchObject({
      name: "signup",
      props: { plan: "pro" },
      page: { path: "/blog/rebuilding-analytics", title: "Rebuilding analytics" },
      context: { utm: { source: "hn" }, release: "2026.09.28", lang: navigator.language },
    });
    expect(signup?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(newsletter?.props).toEqual({});
    expect(pageview?.name).toBe("pageview");
    expect(new Set(sent(transport).map((event) => event.visitor)).size).toBe(1);
    expect(new Set(sent(transport).map((event) => event.session)).size).toBe(1);
  });

  test("gives the referrer to the first pageview only and uses the route an adapter supplied", async () => {
    const { analytics, transport } = client();
    analytics.route("/blog/[slug]");
    analytics.page();
    analytics.page();
    await analytics.flush();
    const [first, second] = sent(transport);
    expect(first?.page.route).toBe("/blog/[slug]");
    expect("referrer" in (first?.page ?? {})).toBe(document.referrer !== "");
    expect(second?.page.referrer).toBeUndefined();
  });

  test("strips props outside the limits", async () => {
    const { analytics, transport } = client();
    const props: { [key: string]: unknown } = { nested: { a: 1 }, long: "x".repeat(300) };
    for (let index = 0; index < 30; index += 1) props[`p${index}`] = index;
    analytics.track("big", props as never);
    await analytics.flush();
    const [event] = sent(transport);
    expect(Object.keys(event?.props ?? {})).toHaveLength(25);
    expect(event?.props.nested).toBeUndefined();
    expect(event?.props.long).toHaveLength(255);
  });
});

describe("identity", () => {
  test("register adds props to later events and identify sends traits once", async () => {
    const { analytics, transport } = client();
    analytics.register({ experiment: "hero-b" });
    analytics.identify("user_123", { plan: "pro" });
    analytics.track("clicked");
    await analytics.flush();
    const [identify, clicked] = sent(transport);
    expect(identify).toMatchObject({
      name: "identify",
      props: { userId: "user_123", plan: "pro", experiment: "hero-b" },
    });
    expect(clicked?.props).toEqual({ experiment: "hero-b" });
  });

  test("reset starts a new visitor and clears registered props", async () => {
    const { analytics, transport } = client();
    analytics.register({ experiment: "hero-b" });
    analytics.track("before");
    analytics.reset();
    analytics.track("after");
    await analytics.flush();
    const [before, after] = sent(transport);
    expect(after?.visitor).not.toBe(before?.visitor);
    expect(after?.props).toEqual({});
  });

  test("scope adds tags to everything it sends and nests", async () => {
    const { analytics, transport } = client();
    const checkout = analytics.scope({ area: "checkout" }).scope({ step: 2 });
    checkout.track("paid");
    checkout.captureMessage("slow payment");
    await analytics.flush();
    const [paid, message] = sent(transport);
    expect(paid?.props).toEqual({ area: "checkout", step: 2 });
    expect(message).toMatchObject({
      name: "error",
      props: { message: "slow payment", level: "warning", area: "checkout" },
    });
  });

  test("captureError records the type, message, stack and context", async () => {
    const { analytics, transport } = client();
    analytics.captureError(new TypeError("x is undefined"), {
      tags: { area: "cart" },
      fingerprint: "cart-x",
    });
    await analytics.flush();
    const [event] = sent(transport);
    expect(event?.props).toMatchObject({
      type: "TypeError",
      message: "x is undefined",
      level: "error",
      area: "cart",
      fingerprint: "cart-x",
    });
    expect(String(event?.props.stack)).toContain("TypeError");
  });
});

describe("consent and opt-out", () => {
  test("required consent holds events and identity until granted", async () => {
    const { analytics, transport } = client({ consent: "required" });
    analytics.track("early");
    expect(analytics.status().queued).toBe(1);
    expect(localStorage.getItem("__ra")).not.toContain("visitor");
    analytics.consent.grant();
    await analytics.flush();
    expect(sent(transport).map((event) => event.name)).toEqual(["early"]);
    expect(analytics.consent.status()).toBe("granted");
    expect(localStorage.getItem("__ra")).toContain("visitor");
  });

  test("revoking drops held events and forgets the visitor", async () => {
    const { analytics, transport } = client({ consent: "required" });
    analytics.consent.grant();
    analytics.identify("user_1");
    analytics.consent.revoke();
    analytics.track("after revoke");
    await analytics.flush();
    expect(sent(transport)).toEqual([]);
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}")).toEqual({ consent: "denied" });
  });

  test("optOut stops sending until optIn, and is remembered", async () => {
    const { analytics, transport } = client();
    const drops: string[] = [];
    analytics.on("drop", (_, reason) => drops.push(reason));
    analytics.optOut();
    analytics.track("hidden");
    expect(analytics.isOptedOut()).toBe(true);
    expect(client().analytics.isOptedOut()).toBe(true);
    analytics.optIn();
    analytics.track("visible");
    await analytics.flush();
    expect(sent(transport).map((event) => event.name)).toEqual(["visible"]);
    expect(drops).toEqual(["opt-out"]);
  });
});

describe("delivery", () => {
  test("holds calls until start when autostart is off", async () => {
    const { analytics, transport } = client({ autostart: false });
    analytics.track("before start");
    await analytics.flush();
    expect(sent(transport)).toEqual([]);
    (analytics as typeof analytics & { start: () => void }).start();
    await analytics.flush();
    expect(sent(transport).map((event) => event.name)).toEqual(["before start"]);
  });

  test("development mode without an explicit endpoint logs instead of sending", async () => {
    const { analytics, transport } = client({ mode: "development", endpoint: undefined });
    analytics.track("local");
    await analytics.flush();
    expect(sent(transport)).toEqual([]);
  });

  test("beforeSend can change or drop events, and status reports the last send", async () => {
    const { analytics, transport } = client({
      beforeSend: (event) =>
        event.name === "secret" ? null : { ...event, props: { ...event.props, via: "hook" } },
    });
    analytics.track("secret");
    analytics.track("public");
    await analytics.flush();
    expect(sent(transport).map((event) => [event.name, event.props.via])).toEqual([
      ["public", "hook"],
    ]);
    expect(analytics.status()).toMatchObject({ queued: 0, consent: "unset", lastError: null });
    expect(analytics.status().lastSend).not.toBeNull();
  });

  test("a 4xx is reported through on('error') and not retried", async () => {
    const { analytics, transport } = client();
    const errors: string[] = [];
    analytics.on("error", (code, detail) => errors.push(`${code} ${detail}`));
    transport.respond({ ok: false, retry: false, status: 401 });
    analytics.track("rejected");
    expect(await analytics.flush()).toEqual({ accepted: 0, duplicates: 0, failed: 1 });
    expect(errors).toEqual(["RA_INGEST_FAILED HTTP 401"]);
    expect(analytics.status().lastError).toBe("HTTP 401");
  });

  test("shutdown flushes and stops plugins", async () => {
    let stopped = false;
    const { analytics, transport } = client({
      plugins: [definePlugin({ name: "probe", setup: () => () => (stopped = true) })],
    });
    analytics.track("last");
    await analytics.shutdown();
    expect(sent(transport)).toHaveLength(1);
    expect(stopped).toBe(true);
  });
});

describe("plugins", () => {
  test("hooks run for pages, consent and hidden pages; use returns a remover", async () => {
    const seen: string[] = [];
    const probe = definePlugin({
      name: "probe",
      setup: (client) => {
        const removers = [
          client.beforeSend((event) => ({ ...event, props: { ...event.props, probe: true } })),
          client.onPage(() => seen.push("page")),
          client.onConsent((status) => seen.push(`consent:${status}`)),
          client.onHidden(() => seen.push("hidden")),
        ];
        return () => {
          for (const remove of removers) remove();
          seen.push("removed");
        };
      },
    });
    const { analytics, transport } = client({ consent: "required" });
    const remove = analytics.use(probe);
    analytics.consent.grant();
    analytics.page();
    dispatchEvent(new Event("pagehide"));
    remove();
    analytics.track("after");
    await analytics.flush();
    expect(seen).toEqual(["consent:granted", "page", "hidden", "removed"]);
    expect(sent(transport).map((event) => event.props.probe ?? null)).toEqual([true, null]);
  });

  test("the default pageviews plugin tracks navigation once per URL", async () => {
    const { analytics, transport } = client({ pageviews: true });
    history.pushState(null, "", "/pricing");
    history.pushState(null, "", "/pricing");
    history.replaceState(null, "", "/about");
    await analytics.flush();
    expect(sent(transport).map((event) => event.page.path)).toEqual([
      "/blog/rebuilding-analytics",
      "/pricing",
      "/about",
    ]);
    await analytics.shutdown();
  });
});

describe("contract fixtures", () => {
  test("a pageview has the same fields as the contract's browser batch fixture", async () => {
    const fixture = (await Bun.file(
      new URL("../../contract/fixtures/IngestEnvelope/valid/browser-batch.json", import.meta.url),
    ).json()) as { events: { [key: string]: unknown }[] };
    const { analytics, transport } = client();
    analytics.page();
    await analytics.flush();
    const [event] = sent(transport);
    const expected = Object.keys(fixture.events[0] ?? {}).filter((key) => key !== "signals");
    expect(Object.keys(event ?? {}).sort()).toEqual(expected.sort());
    expect(Object.keys(event?.context ?? {}).sort()).toEqual(
      Object.keys((fixture.events[0]?.context as object | undefined) ?? {}).sort(),
    );
  });
});
