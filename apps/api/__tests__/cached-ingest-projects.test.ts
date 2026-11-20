import { expect, test } from "bun:test";

import type { ProjectAccess, ProjectStore } from "@spoar/engine";
import { engineError } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";

import { cachedIngestProjects } from "../src/access/cached-ingest-projects";

const project: ProjectAccess = { id: "docs", allowedOrigins: [], widgetReports: false };

function counted(state: { fail: boolean }) {
  const calls = { byPublicKey: 0, bySecretHash: 0, markUsed: 0 };
  const store: ProjectStore = {
    byPublicKey: async () => {
      calls.byPublicKey += 1;
      return state.fail ? err(engineError("UNAVAILABLE", "down")) : ok(project);
    },
    bySecretHash: async () => {
      calls.bySecretHash += 1;
      return ok(null);
    },
    markUsed: async () => {
      calls.markUsed += 1;
      return state.fail ? err(engineError("UNAVAILABLE", "down")) : ok(undefined);
    },
  };
  return { store, calls };
}

test("key lookups are remembered until they expire", async () => {
  const clock = { now: 0 };
  const { store, calls } = counted({ fail: false });
  const projects = cachedIngestProjects(store, () => new Date(clock.now), 60_000);
  expect(await projects.byPublicKey("pk_live_1")).toEqual(ok(project));
  await projects.byPublicKey("pk_live_1");
  await projects.bySecretHash("hash");
  await projects.bySecretHash("hash");
  expect(calls).toMatchObject({ byPublicKey: 1, bySecretHash: 1 });
  clock.now = 60_000;
  await projects.byPublicKey("pk_live_1");
  expect(calls.byPublicKey).toBe(2);
});

test("a failed lookup is asked again", async () => {
  const state = { fail: true };
  const { store, calls } = counted(state);
  const projects = cachedIngestProjects(store, () => new Date(0), 60_000);
  await projects.byPublicKey("pk_live_1");
  state.fail = false;
  expect(await projects.byPublicKey("pk_live_1")).toEqual(ok(project));
  expect(calls.byPublicKey).toBe(2);
});

test("key usage is written once a minute, or when the origin changes", async () => {
  const state = { fail: false };
  const { store, calls } = counted(state);
  const projects = cachedIngestProjects(store, () => new Date(0), 60_000);
  const origin = "https://docs.example";
  await projects.markUsed("docs", "public", new Date(0), origin);
  await projects.markUsed("docs", "public", new Date(30_000), origin);
  expect(calls.markUsed).toBe(1);
  await projects.markUsed("docs", "public", new Date(31_000), "https://other.example");
  await projects.markUsed("docs", "secret", new Date(31_000), null);
  expect(calls.markUsed).toBe(3);
  await projects.markUsed("docs", "public", new Date(91_000), "https://other.example");
  expect(calls.markUsed).toBe(4);
  state.fail = true;
  await projects.markUsed("docs", "public", new Date(200_000), origin);
  state.fail = false;
  await projects.markUsed("docs", "public", new Date(200_001), origin);
  expect(calls.markUsed).toBe(6);
});
