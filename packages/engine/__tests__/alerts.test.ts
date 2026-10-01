import { describe, expect, expectTypeOf, test } from "bun:test";

import type { WebhookBody } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";

import { fixedClock, memoryAlerts } from "../src/adapters/memory";
import {
  alerts,
  alertSubject,
  apiLinks,
  defaultRetry,
  discord,
  dispatchAlerts,
  durationMs,
  mail,
  mergeRetry,
  nextAttempt,
  defaultSpeedDrop,
  queueIssueAlerts,
  queueSpeedAlerts,
  renderDiscord,
  renderMail,
  resend,
  runAlerts,
  signBody,
  webhook,
} from "../src/alerts";
import type { AlertsOptions, MailMessage, MailTransport, RetryPolicy } from "../src/alerts";
import { defineConfig, findPlugin } from "../src/config";
import { engineError } from "../src/errors";
import type {
  DeliveryBatch,
  IssueRecord,
  IssueStore,
  PendingAlert,
  SpeedScope,
  SpeedStore,
  TargetSpec,
  VitalStat,
} from "../src/ports";

const project = "remcostoeten.nl";
const created = new Date("2026-09-29T12:00:00.000Z");
const minute = 60_000;
const links = apiLinks("https://api.remcostoeten.nl/");

function at(minutes: number) {
  return new Date(created.getTime() + minutes * minute);
}

function issue(id: number, overrides: Partial<IssueRecord> = {}): IssueRecord {
  return {
    id: `iss_${id}`,
    projectId: project,
    title: `TypeError: Cannot read properties of undefined (reading 'map') ${id}`,
    culprit: "app/blog/[slug]/page.tsx",
    level: "error",
    status: "open",
    isRegression: false,
    count: 14,
    visitors: 3,
    firstSeen: new Date("2026-09-28T10:00:00.000Z"),
    lastSeen: new Date(`2026-09-29T11:${String(id).padStart(2, "0")}:00.000Z`),
    firstRelease: "1.4.0",
    lastRelease: "1.4.2",
    resolvedAt: null,
    mutedUntil: null,
    muteRemaining: null,
    ...overrides,
  };
}

function bodyText(init: RequestInit | undefined) {
  return typeof init?.body === "string" ? init.body : "";
}

function unused(): never {
  throw new Error("not used by the alerts job");
}

function issueStore(pending: PendingAlert[]): IssueStore & { marked: string[] } {
  const marked: string[] = [];
  return {
    marked,
    pendingAlerts: async () =>
      ok(pending.filter((alert) => !marked.includes(`${alert.issue.id}:${alert.kind}`))),
    markAlerted: async (issues) => {
      for (const alert of pending) {
        if (issues.some((one) => one.id === alert.issue.id))
          marked.push(`${alert.issue.id}:${alert.kind}`);
      }
      return ok(null);
    },
    list: unused,
    get: unused,
    events: unused,
    setStatus: unused,
    ignores: unused,
    muted: unused,
    addIgnore: unused,
    removeIgnore: unused,
    mute: unused,
  };
}

function vitals(lcp: number, samples = 40): VitalStat[] {
  const base = { samples, good: samples, needsImprovement: 0, poor: 0 };
  return [
    { metric: "lcp", value: lcp, ...base },
    { metric: "inp", value: 200, ...base },
    { metric: "cls", value: 0.1, ...base },
    { metric: "fcp", value: 1800, ...base },
  ];
}

function speedStore(
  yesterday: VitalStat[],
  before: VitalStat[],
): SpeedStore & { scopes: SpeedScope[] } {
  const scopes: SpeedScope[] = [];
  return {
    scopes,
    summary: async (scope) => {
      scopes.push(scope);
      return ok(scope.from.toISOString() === "2026-09-28T00:00:00.000Z" ? yesterday : before);
    },
    series: unused,
    routes: unused,
    elements: unused,
    rollup: unused,
  };
}

const quietSpeed = speedStore([], []);

function memoryTransport(results: ("ok" | "fail")[] = []): MailTransport & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    name: "smtp",
    host: "smtp.example.test",
    sent,
    ready: () => ok(null),
    send: async (message) => {
      const result = results.shift() ?? "ok";
      if (result === "fail") return err(engineError("UNAVAILABLE", "535 Authentication failed"));
      sent.push(message);
      return ok(null);
    },
  };
}

function recordingFetch(statuses: number[] = []) {
  const calls: { url: string; init: RequestInit }[] = [];
  async function send(url: string, init: RequestInit) {
    calls.push({ url, init });
    return new Response("{}", { status: statuses.shift() ?? 200 });
  }
  return { calls, send };
}

const mailTarget: TargetSpec = {
  name: "mail",
  channel: "mail",
  on: ["issue.new", "issue.regression"],
  enabled: true,
  settings: { to: ["remco@gmail.com"] },
};
const hookTarget: TargetSpec = {
  name: "ops",
  channel: "webhook",
  on: ["issue.new", "issue.regression"],
  enabled: true,
  settings: { url: "https://ops.example.com/hooks/analytics" },
};
const speedTarget: TargetSpec = {
  name: "speed",
  channel: "mail",
  on: ["speed.drop"],
  enabled: true,
  settings: { to: ["remco@gmail.com"] },
};
const discordTarget: TargetSpec = {
  name: "discord",
  channel: "discord",
  on: ["issue.regression"],
  enabled: true,
  settings: { url: "https://discord.com/api/webhooks/1/abc" },
};

function newIssue(id: number): PendingAlert {
  return { issue: issue(id), kind: "new", regressedAt: null };
}

function regression(id: number, regressedAt: Date): PendingAlert {
  return { issue: issue(id, { isRegression: true }), kind: "regression", regressedAt };
}

describe("nextAttempt", () => {
  test("exponential waits 1, 5, 30, 120 and 720 minutes, then gives up", () => {
    const policy: RetryPolicy = { ...defaultRetry, maxAge: "2d" };
    const waits = [1, 2, 3, 4, 5].map((attempts) => {
      const next = nextAttempt(policy, attempts, created, created);
      return next ? (next.getTime() - created.getTime()) / minute : null;
    });
    expect(waits).toEqual([1, 5, 30, 120, 720]);
    expect(nextAttempt(policy, 6, created, created)).toBeNull();
  });

  test("fixed retries every 10 minutes", () => {
    const next = nextAttempt({ ...defaultRetry, backoff: "fixed" }, 4, created, at(30));
    expect(next).toEqual(at(40));
  });

  test("never schedules past maxAge", () => {
    expect(nextAttempt({ ...defaultRetry, maxAge: "1h" }, 3, created, at(20))).toEqual(at(50));
    expect(nextAttempt({ ...defaultRetry, maxAge: "1h" }, 4, created, at(50))).toBeNull();
  });

  test("zero attempts turns retrying off", () => {
    expect(nextAttempt({ ...defaultRetry, attempts: 0 }, 1, created, created)).toBeNull();
  });

  test("durations and merging", () => {
    expect([durationMs("30s"), durationMs("30m"), durationMs("6h"), durationMs("2d")]).toEqual([
      30_000,
      30 * minute,
      360 * minute,
      2880 * minute,
    ]);
    expect(durationMs("24 hours")).toBeNull();
    expect(mergeRetry({ attempts: 8, maxAge: "6h" }, { maxAge: "1h" })).toEqual({
      attempts: 8,
      backoff: "exponential",
      maxAge: "1h",
    });
  });

  test("a Duration is typed", () => {
    expectTypeOf<"24h">().toMatchTypeOf<RetryPolicy["maxAge"]>();
    expectTypeOf<"24 hours">().not.toMatchTypeOf<RetryPolicy["maxAge"]>();
    function wrongDuration(): AlertsOptions {
      // @ts-expect-error "24 hours" is not a Duration
      return { channels: [], retry: { maxAge: "24 hours" } };
    }
    expect(typeof wrongDuration).toBe("function");
  });
});

describe("renderers and signing", () => {
  const store = memoryAlerts(fixedClock(created));

  async function batch(): Promise<DeliveryBatch> {
    await store.syncTargets(project, [mailTarget]);
    await queueIssueAlerts(
      issueStore([newIssue(42), newIssue(43), regression(17, at(-30))]),
      store,
      { links, channels: ["mail"], now: created },
    );
    const due = await store.due(at(1), 100);
    if (!due.ok || !due.value[0]) throw new Error("nothing due");
    return due.value[0];
  }

  test("renderMail writes one mail per batch, newest first", async () => {
    const rendered = renderMail(await batch());
    expect(rendered.subject).toBe("[remcostoeten.nl] 2 new issues, 1 regression");
    expect(rendered.text).toBe(
      [
        "NEW         TypeError: Cannot read properties of undefined (reading 'map') 43",
        "            app/blog/[slug]/page.tsx · 14 times · release 1.4.2",
        "            https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_43",
        "",
        "NEW         TypeError: Cannot read properties of undefined (reading 'map') 42",
        "            app/blog/[slug]/page.tsx · 14 times · release 1.4.2",
        "            https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_42",
        "",
        "REGRESSION  TypeError: Cannot read properties of undefined (reading 'map') 17",
        "            app/blog/[slug]/page.tsx · 14 times · resolved, seen again in 1.4.2",
        "            https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_17",
        "",
      ].join("\n"),
    );
    expect(rendered.html).toContain("background:#0a0a0a");
    expect(rendered.html).toContain("(reading &#39;map&#39;) 43");
    expect(rendered.html.indexOf("iss_43")).toBeLessThan(rendered.html.indexOf("iss_17"));
  });

  test("renderDiscord writes one message with an embed per alert and no mentions", async () => {
    const message = renderDiscord(await batch());
    expect(message.content).toBe(alertSubject(await batch()));
    expect(message.allowed_mentions).toEqual({ parse: [] });
    expect(message.embeds.map((embed) => embed.url)).toEqual([
      "https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_43",
      "https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_42",
      "https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_17",
    ]);
    expect(message.embeds[0]).toMatchObject({
      title: "NEW  TypeError: Cannot read properties of undefined (reading 'map') 43",
      description: "app/blog/[slug]/page.tsx · 14 times · release 1.4.2",
    });
  });

  test("signBody is the HMAC of timestamp.body", async () => {
    expect(await signBody('{"v":1}', "whsec_test", 1790000000)).toBe(
      "sha256=d5c06a001ca1635ba862cc34bc67e9d72843e244fe5939a348b83662912c429f",
    );
  });
});

describe("queue and dispatch", () => {
  test("queues once per target and subject, and dispatches one batch per target", async () => {
    const clock = fixedClock(created);
    const store = memoryAlerts(clock, () => "whsec_fixed");
    const transport = memoryTransport();
    const hooks = recordingFetch();
    const chat = recordingFetch();
    const synced = await store.syncTargets(project, [mailTarget, hookTarget, discordTarget]);
    expect(synced).toEqual({
      ok: true,
      value: {
        created: ["mail", "ops", "discord"],
        updated: [],
        removed: [],
        secrets: { ops: "whsec_fixed" },
      },
    });
    const plugin = alerts({
      channels: [
        mail({ transport, from: "Analytics <remco@gmail.com>" }),
        webhook({ fetch: hooks.send }),
        discord({ fetch: chat.send }),
      ],
    });
    const issues = issueStore([newIssue(42), regression(17, at(-30))]);
    const run = await runAlerts(
      plugin,
      { issues, speed: quietSpeed, alerts: store, links },
      created,
    );
    expect(run).toEqual({ ok: true, value: { queued: 5, sent: 5, retrying: 0, failed: 0 } });
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({
      from: "Analytics <remco@gmail.com>",
      to: ["remco@gmail.com"],
      subject: "[remcostoeten.nl] 1 new issue, 1 regression",
    });
    expect(hooks.calls).toHaveLength(1);
    const call = hooks.calls[0];
    if (!call) throw new Error("no webhook call");
    const headers = new Headers(call.init.headers);
    const body = bodyText(call.init);
    const parsed: WebhookBody = JSON.parse(body);
    expect(parsed.v).toBe(1);
    expect(parsed.events.map((event) => event.name)).toEqual(["issue.new", "issue.regression"]);
    const timestamp = Number(headers.get("x-analytics-timestamp"));
    expect(timestamp).toBe(Math.floor(created.getTime() / 1000));
    expect(headers.get("x-analytics-signature")).toBe(
      await signBody(body, "whsec_fixed", timestamp),
    );
    expect(chat.calls).toHaveLength(1);
    expect(JSON.parse(bodyText(chat.calls[0]?.init)).embeds).toHaveLength(1);

    const again = await runAlerts(
      plugin,
      { issues, speed: quietSpeed, alerts: store, links },
      at(1),
    );
    expect(again).toEqual({ ok: true, value: { queued: 0, sent: 0, retrying: 0, failed: 0 } });
    const requeued = await store.queue(
      [{ event: store.held.deliveries[0]?.event ?? unused(), subject: "iss_42" }],
      ["mail", "webhook", "discord"],
      created,
    );
    expect(requeued).toEqual({ ok: true, value: { queued: 0 } });
  });

  test("a failing target retries by its policy without holding back the others", async () => {
    const store = memoryAlerts(fixedClock(created));
    const transport = memoryTransport(["fail", "fail"]);
    const hooks = recordingFetch();
    await store.syncTargets(project, [mailTarget, hookTarget]);
    const channels = [mail({ transport, from: "a@b.co" }), webhook({ fetch: hooks.send })];
    await queueIssueAlerts(issueStore([newIssue(42)]), store, {
      links,
      channels: ["mail", "webhook"],
      now: created,
    });
    const first = await dispatchAlerts(store, { channels, retry: {} }, created);
    expect(first).toEqual({ ok: true, value: { sent: 1, retrying: 1, failed: 0 } });
    const pending = store.held.deliveries.find((delivery) => delivery.channel === "mail");
    expect(pending).toMatchObject({
      status: "pending",
      attempts: 1,
      nextAttemptAt: at(1),
      lastError: "535 Authentication failed",
    });
    const early = await dispatchAlerts(store, { channels, retry: {} }, at(0.5));
    expect(early).toEqual({ ok: true, value: { sent: 0, retrying: 0, failed: 0 } });
    await dispatchAlerts(store, { channels, retry: {} }, at(1));
    expect(
      store.held.deliveries.find((delivery) => delivery.channel === "mail")?.nextAttemptAt,
    ).toEqual(at(6));
    const target = await store.target(project, "mail");
    expect(target.ok ? target.value?.failure : null).toBe("535 Authentication failed");
    const failing = await store.failing();
    expect(failing.ok ? failing.value.map((one) => one.name) : null).toEqual(["mail"]);
    await dispatchAlerts(store, { channels, retry: {} }, at(6));
    expect(store.held.deliveries.find((delivery) => delivery.channel === "mail")).toMatchObject({
      status: "sent",
      attempts: 3,
    });
    expect(transport.sent).toHaveLength(1);
    expect(hooks.calls).toHaveLength(1);
  });

  test("a channel's retry overrides the plugin's, and maxAge turns a delivery failed", async () => {
    const store = memoryAlerts(fixedClock(created));
    const hooks = recordingFetch([500, 500, 500]);
    await store.syncTargets(project, [hookTarget]);
    await queueIssueAlerts(issueStore([newIssue(42)]), store, {
      links,
      channels: ["webhook"],
      now: created,
    });
    const options = {
      channels: [
        webhook({
          fetch: hooks.send,
          retry: { backoff: "fixed" as const, maxAge: "15m" as const },
        }),
      ],
      retry: { attempts: 10, maxAge: "24h" as const },
    };
    expect((await dispatchAlerts(store, options, created)).ok).toBe(true);
    expect(store.held.deliveries[0]).toMatchObject({ status: "pending", nextAttemptAt: at(10) });
    await dispatchAlerts(store, options, at(10));
    expect(store.held.deliveries[0]).toMatchObject({
      status: "failed",
      attempts: 2,
      nextAttemptAt: null,
    });
    expect(store.held.deliveries[0]?.lastError).toContain("answered 500");
  });

  test("a delivery on a channel the config no longer enables fails at once", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [discordTarget]);
    await queueIssueAlerts(issueStore([regression(17, at(-30))]), store, {
      links,
      channels: ["discord"],
      now: created,
    });
    const run = await dispatchAlerts(store, { channels: [webhook()], retry: {} }, created);
    expect(run).toEqual({ ok: true, value: { sent: 0, retrying: 0, failed: 1 } });
    expect(store.held.deliveries[0]?.lastError).toBe("discord is not enabled on this deployment");
  });

  test("a transport that is not ready keeps deliveries pending with its reason", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [mailTarget]);
    await queueIssueAlerts(issueStore([newIssue(42)]), store, {
      links,
      channels: ["mail"],
      now: created,
    });
    const channel = mail({ transport: resend(undefined), from: "a@b.co" });
    const run = await dispatchAlerts(store, { channels: [channel], retry: {} }, created);
    expect(run).toEqual({ ok: true, value: { sent: 0, retrying: 1, failed: 0 } });
    expect(store.held.deliveries[0]?.lastError).toBe("The Resend API key is not set");
  });

  test("only enabled targets subscribed to the event on an enabled channel are queued", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [
      mailTarget,
      { ...hookTarget, enabled: false },
      discordTarget,
    ]);
    const queued = await queueIssueAlerts(issueStore([newIssue(42)]), store, {
      links,
      channels: ["webhook", "discord"],
      now: created,
    });
    expect(queued).toEqual({ ok: true, value: { queued: 0, events: 1 } });
  });

  test("every regression alerts once", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [discordTarget]);
    const first = issueStore([regression(17, at(-30))]);
    const second = issueStore([regression(17, at(-5))]);
    await queueIssueAlerts(first, store, { links, channels: ["discord"], now: created });
    await queueIssueAlerts(second, store, { links, channels: ["discord"], now: created });
    expect(store.held.deliveries.map((delivery) => delivery.subject)).toEqual([
      `iss_17@${at(-30).toISOString()}`,
      `iss_17@${at(-5).toISOString()}`,
    ]);
  });
});

describe("speed drops", () => {
  const options = { links, channels: ["mail" as const], now: created, drop: defaultSpeedDrop };

  test("queues a drop of 10 points or more to under 90 once per project and day", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [speedTarget, mailTarget]);
    const speed = speedStore(vitals(4000), vitals(2500));
    const first = await queueSpeedAlerts(speed, store, options);
    expect(first).toEqual({ ok: true, value: { queued: 1, events: 1 } });
    expect(speed.scopes.map((scope) => [scope.from.toISOString(), scope.to.toISOString()])).toEqual(
      [
        ["2026-09-28T00:00:00.000Z", "2026-09-29T00:00:00.000Z"],
        ["2026-09-21T00:00:00.000Z", "2026-09-28T00:00:00.000Z"],
      ],
    );
    expect(speed.scopes[0]).toMatchObject({ environment: "production", device: "all" });
    expect(store.held.deliveries.map((delivery) => [delivery.subject, delivery.event])).toEqual([
      [
        `${project}@2026-09-28`,
        {
          name: "speed.drop",
          project,
          speed: {
            score: 78,
            previous: 90,
            rating: "needs-improvement",
            worst: "lcp",
            samples: 40,
            from: "2026-09-28T00:00:00.000Z",
            to: "2026-09-29T00:00:00.000Z",
            url: "https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/speed",
          },
        },
      ],
    ]);
    const again = await queueSpeedAlerts(speed, store, options);
    expect(again).toEqual({ ok: true, value: { queued: 0, events: 1 } });
  });

  test("small drops, scores still good, thin samples and unsubscribed projects stay quiet", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [speedTarget]);
    const small = await queueSpeedAlerts(speedStore(vitals(3000), vitals(2500)), store, options);
    expect(small).toEqual({ ok: true, value: { queued: 0, events: 0 } });
    const thin = await queueSpeedAlerts(speedStore(vitals(4000, 5), vitals(2500)), store, options);
    expect(thin).toEqual({ ok: true, value: { queued: 0, events: 0 } });
    const loose = await queueSpeedAlerts(speedStore(vitals(4000), vitals(2500)), store, {
      ...options,
      drop: { ...defaultSpeedDrop, points: 20 },
    });
    expect(loose).toEqual({ ok: true, value: { queued: 0, events: 0 } });
    const other = memoryAlerts(fixedClock(created));
    await other.syncTargets(project, [mailTarget]);
    const speed = speedStore(vitals(4000), vitals(2500));
    expect(await queueSpeedAlerts(speed, other, options)).toEqual({
      ok: true,
      value: { queued: 0, events: 0 },
    });
    expect(speed.scopes).toEqual([]);
  });

  test("a speed drop renders in mail next to issues", async () => {
    const store = memoryAlerts(fixedClock(created));
    await store.syncTargets(project, [{ ...speedTarget, on: ["speed.drop", "issue.new"] }]);
    await queueIssueAlerts(issueStore([newIssue(42)]), store, {
      links,
      channels: ["mail"],
      now: created,
    });
    await queueSpeedAlerts(speedStore(vitals(4000), vitals(2500)), store, options);
    const due = await store.due(at(1), 100);
    if (!due.ok || !due.value[0]) throw new Error("nothing due");
    const rendered = renderMail(due.value[0]);
    expect(rendered.subject).toBe("[remcostoeten.nl] 1 new issue, 1 speed drop");
    expect(rendered.text).toContain(
      [
        "SLOWER      Real Experience Score 90 to 78",
        "            needs improvement · LCP fell most · 40 samples",
        "            https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/speed",
      ].join("\n"),
    );
    const embeds = renderDiscord(due.value[0]).embeds;
    expect(embeds.map((embed) => embed.title)).toContain("SLOWER  Real Experience Score 90 to 78");
  });
});

describe("targets", () => {
  test("sync adds, updates and removes, and running it twice changes nothing", async () => {
    let count = 0;
    const store = memoryAlerts(fixedClock(created), () => `whsec_${++count}`);
    await store.syncTargets(project, [mailTarget, hookTarget]);
    const changed = await store.syncTargets(project, [
      { ...mailTarget, settings: { to: ["team@remcostoeten.nl"] } },
      discordTarget,
    ]);
    expect(changed).toEqual({
      ok: true,
      value: { created: ["discord"], updated: ["mail"], removed: ["ops"], secrets: {} },
    });
    const same = await store.syncTargets(project, [
      { ...mailTarget, settings: { to: ["team@remcostoeten.nl"] } },
      discordTarget,
    ]);
    expect(same).toEqual({
      ok: true,
      value: { created: [], updated: [], removed: [], secrets: {} },
    });
  });

  test("rotate replaces a webhook secret only", async () => {
    let count = 0;
    const store = memoryAlerts(fixedClock(created), () => `whsec_${++count}`);
    await store.syncTargets(project, [mailTarget, hookTarget]);
    expect(await store.rotateSecret(project, "ops")).toEqual({ ok: true, value: "whsec_2" });
    expect(await store.rotateSecret(project, "mail")).toEqual({ ok: true, value: null });
  });
});

describe("config", () => {
  test("findPlugin answers the listed plugin or null", () => {
    const plugin = alerts({ channels: [webhook()] });
    expect(findPlugin(defineConfig({ plugins: [plugin] }), "alerts")).toBe(plugin);
    expect(findPlugin(defineConfig({ plugins: [] }), "alerts")).toBeNull();
    expect(plugin.channel("webhook")?.name).toBe("webhook");
    expect(plugin.channel("mail")).toBeNull();
  });
});

describe("resend", () => {
  test("posts one mail to Resend with the key", async () => {
    const calls = recordingFetch();
    const transport = resend("re_test", { fetch: calls.send });
    const sent = await transport.send({
      from: "Analytics <alerts@remcostoeten.nl>",
      to: ["remco@gmail.com"],
      subject: "[remcostoeten.nl] 1 new issue",
      text: "text",
      html: "<p>html</p>",
    });
    expect(sent).toEqual({ ok: true, value: null });
    expect(calls.calls[0]?.url).toBe("https://api.resend.com/emails");
    expect(new Headers(calls.calls[0]?.init.headers).get("authorization")).toBe("Bearer re_test");
  });

  test("answers what Resend said on failure", async () => {
    async function rejecting() {
      return new Response('{"message":"The domain is not verified"}', { status: 403 });
    }
    const sent = await resend("re_test", { fetch: rejecting }).send({
      from: "a@b.co",
      to: ["c@d.co"],
      subject: "s",
      text: "t",
      html: "h",
    });
    expect(sent.ok ? null : sent.error.message).toContain("The domain is not verified");
  });
});
