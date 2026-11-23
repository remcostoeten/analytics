import { expect, test } from "bun:test";

import {
  dayLabel,
  gamesPerDay,
  gameTotals,
  SAMPLE_DAYS,
  SAMPLE_GAMES,
  sampleQueries,
} from "./blog-game-sample";

test("the sample month has one bar per day that adds up to every game", () => {
  const days = gamesPerDay(SAMPLE_GAMES);
  expect(days).toHaveLength(SAMPLE_DAYS);
  expect(days.reduce((sum, entry) => sum + entry.games, 0)).toBe(SAMPLE_GAMES.length);
  expect(days.at(-1)?.day).toBe("2026-11-22");
  expect(dayLabel(0)).toBe("2026-10-24");
});

test("every query returns rows shaped like its columns", () => {
  for (const query of sampleQueries(SAMPLE_GAMES)) {
    expect(query.rows.length).toBeGreaterThan(0);
    for (const row of query.rows) expect(row).toHaveLength(query.columns.length);
  }
});

test("games from before the goal prop group as unknown", () => {
  const goal = sampleQueries(SAMPLE_GAMES).find((query) => query.id === "goal");
  expect(goal?.rows.map((row) => row[0])).toContain("unknown");
  const games = goal?.rows.reduce((sum, row) => sum + Number(row[1]), 0);
  expect(games).toBe(gameTotals(SAMPLE_GAMES).games);
});
