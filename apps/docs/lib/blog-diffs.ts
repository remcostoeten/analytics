import type { StepChange } from "./tutorial";

type PostDiffNote = { match: string; text: string };

type PostDiff = {
  name: string;
  before: string;
  after: string;
  notes?: readonly PostDiffNote[];
};

const naiveEndScreen = `export function FinalScreen({ game }: Props) {
  const analytics = useAnalytics<GameEvents>();

  useEffect(() => {
    analytics.track("game_completed", metricsFor(game));
  }, [analytics, game]);

  return <Results game={game} />;
}
`;

const endScreen = `export function FinalScreen({ game }: Props) {
  return <Results game={game} />;
}
`;

const serverClient = `import { createServerAnalytics } from "@spoar/sdk/server";

import { env } from "@/env";

import type { GameEvents } from "./game-events";

export type GameMetrics = GameEvents["game_completed"];

export async function recordGameCompleted(metrics: GameMetrics) {
  const analytics = createServerAnalytics<GameEvents>({
    project: env.SPOAR_PROJECT,
    secret: env.SPOAR_SECRET,
    endpoint: env.SPOAR_ENDPOINT,
    origin: env.BETTER_AUTH_URL,
  });
  const result = await analytics.track("game_completed", metrics);
  return result.ok;
}
`;

const stableId = `import { createServerAnalytics, type Fetcher } from "@spoar/sdk/server";

import { env } from "@/env";

import type { GameEvents } from "./game-events";

export type GameMetrics = GameEvents["game_completed"];
export type GameCompletedDelivery = "sent" | "skipped" | "rejected" | "retry";

function withEventId(eventId: string): Fetcher {
  return (url, init) => {
    const body = JSON.parse(String(init.body));
    const events = body.events.map((event: object) => ({ ...event, id: eventId }));
    return fetch(url, { ...init, body: JSON.stringify({ ...body, events }) });
  };
}

export async function recordGameCompleted(
  metrics: GameMetrics,
  eventId: string,
): Promise<GameCompletedDelivery> {
  if (!env.SPOAR_ENDPOINT || !env.SPOAR_SECRET || !env.SPOAR_PROJECT) return "skipped";

  const analytics = createServerAnalytics<GameEvents>({
    project: env.SPOAR_PROJECT,
    secret: env.SPOAR_SECRET,
    endpoint: env.SPOAR_ENDPOINT,
    origin: env.BETTER_AUTH_URL,
    fetch: withEventId(eventId),
  });
  const result = await analytics.track("game_completed", metrics);
  if (result.ok) return "sent";
  return result.error.code === "RA_INGEST_REJECTED" ? "rejected" : "retry";
}
`;

const directSend = `private saveGame(game: GameState) {
  const previous = this.game();
  this.ctx.storage.kv.put(GAME_KEY, game);
  if (game.phase === "finished" && previous?.phase !== "finished") {
    void recordGameCompleted(metricsFor(game), crypto.randomUUID());
  }
}

async alarm() {
  await this.runRoomAlarm();
  await this.schedule();
}
`;

const queuedSend = `private saveGame(game: GameState) {
  const previous = this.game();
  this.ctx.storage.kv.put(GAME_KEY, game);
  queueFinishedGame(this.ctx.storage.kv, previous, game, Date.now());
}

async alarm() {
  await this.runRoomAlarm();
  await flushCompletions(this.ctx.storage.kv, Date.now());
  await this.schedule();
}
`;

const countsWalkouts = `private saveGame(game: GameState, change: GameChange) {
  const previous = this.game();
  const now = Date.now();
  const kv = this.ctx.storage.kv;
  kv.put(GAME_KEY, game);
  queueFinishedGame(kv, previous, game, now);
}
`;

const skipsWalkouts = `private saveGame(game: GameState, change: GameChange) {
  const previous = this.game();
  const now = Date.now();
  const kv = this.ctx.storage.kv;
  kv.put(GAME_KEY, game);
  if ((change === "left" || change === "kicked") && game.phase === "finished") {
    if (previous?.phase !== "finished") cancelGameRun(kv);
  }
  queueFinishedGame(kv, previous, game, now);
}
`;

const runWithoutId = `export function beginGameRun(store: CompletionStore, now: number) {
  store.put<GameRun>(RUN_KEY, { startedAt: now });
}
`;

const runWithId = `export function beginGameRun(store: CompletionStore, now: number) {
  const id = createEventId(now);
  store.put<GameRun>(RUN_KEY, { id, startedAt: now });
  return id;
}
`;

const collector = `const client = createAnalytics({
  project,
  key: publicKey,
  endpoint,
  pageviews: false,
  autostart: false,
});
`;

const collectorWithPlugins = `const client = createAnalytics({
  project,
  key: publicKey,
  endpoint,
  pageviews: false,
  autostart: false,
  plugins: [errors(), speedInsights()],
});
`;

const eagerImport = `import { recordGameCompleted } from "@/features/analytics/events/game-analytics";

import { deliverCompletions, type CompletionStore, type PendingCompletion } from "./completion-outbox";

async function sendCompletion({ id, metrics }: PendingCompletion) {
  return recordGameCompleted(metrics, id);
}

export async function flushCompletions(store: CompletionStore, now: number) {
  await deliverCompletions(store, sendCompletion, now);
}
`;

const lazyImport = `import { deliverCompletions, type CompletionStore, type PendingCompletion } from "./completion-outbox";

async function sendCompletion({ id, metrics }: PendingCompletion) {
  // A top-level import validates the env at startup, when Cloudflare withholds Worker secrets.
  const { recordGameCompleted } = await import("@/features/analytics/events/game-analytics");
  return recordGameCompleted(metrics, id);
}

export async function flushCompletions(store: CompletionStore, now: number) {
  await deliverCompletions(store, sendCompletion, now);
}
`;

const eventType = `export type GameEvents = {
  game_completed: {
    players: number;
    rounds: number;
    duration_seconds: number;
  };
};
`;

const eventTypeWithGoal = `export type GameEvents = {
  game_completed: {
    players: number;
    rounds: number;
    duration_seconds: number;
    goal: "points-20" | "points-30" | "points-40" | "rounds-10";
  };
};
`;

const postDiffs = {
  "end-screen": {
    name: "features/lobby/ui/game-screen.tsx",
    before: naiveEndScreen,
    after: endScreen,
  },
  "server-client": {
    name: "features/analytics/events/game-analytics.ts",
    before: "",
    after: serverClient,
    notes: [
      {
        match: "secret: env.SPOAR_SECRET",
        text: "The secret key stays in the Worker. The browser only has the public key.",
      },
    ],
  },
  "stable-id": {
    name: "features/analytics/events/game-analytics.ts",
    before: serverClient,
    after: stableId,
    notes: [
      {
        match: "fetch: withEventId(eventId)",
        text: "Every attempt for this game now sends the same event id.",
      },
    ],
  },
  "lazy-env": {
    name: "features/lobby/server/completion/send-completion.ts",
    before: eagerImport,
    after: lazyImport,
  },
  outbox: {
    name: "features/lobby/server/game-room.ts",
    before: directSend,
    after: queuedSend,
    notes: [
      {
        match: "queueFinishedGame(this.ctx.storage.kv",
        text: "This write commits together with the game state.",
      },
    ],
  },
  "abandoned-game": {
    name: "features/lobby/server/game-room.ts",
    before: countsWalkouts,
    after: skipsWalkouts,
  },
  "add-prop": {
    name: "features/analytics/events/game-events.ts",
    before: eventType,
    after: eventTypeWithGoal,
  },
  "shared-id": {
    name: "features/lobby/server/completion/completion-outbox.ts",
    before: runWithoutId,
    after: runWithId,
  },
  plugins: {
    name: "features/analytics/ui/analytics-collector.tsx",
    before: collector,
    after: collectorWithPlugins,
  },
} satisfies Record<string, PostDiff>;

export type PostDiffId = keyof typeof postDiffs;

function noteLine(after: string, match: string) {
  const index = after.split("\n").findIndex((line) => line.includes(match));
  if (index < 0) throw new Error(`Diff note not found: ${match}`);
  return index + 1;
}

/**
 * @name postDiffChange
 * @description Builds the file change for one diff in a blog post, with each note placed on the
 * line that contains its match.
 *
 * @example
 * const change = postDiffChange("stable-id");
 */
export function postDiffChange(id: PostDiffId): StepChange {
  const diff: PostDiff = postDiffs[id];
  return {
    name: diff.name,
    before: diff.before,
    after: diff.after,
    notes: (diff.notes ?? []).map((note) => ({
      line: noteLine(diff.after, note.match),
      text: note.text,
    })),
  };
}
