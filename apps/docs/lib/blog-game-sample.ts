export type SampleGame = {
  day: number;
  players: number;
  rounds: number;
  durationSeconds: number;
  goal: string | null;
};

export type SampleCell = string | number | null;

export type SampleQuery = {
  id: string;
  name: string;
  description: string;
  chart: "table" | "line" | "bar";
  sql: string;
  columns: string[];
  rows: SampleCell[][];
};

export const SAMPLE_DAYS = 30;

const GOALS = ["points-20", "points-30", "points-40", "rounds-10"];
const GOAL_FROM_DAY = 12;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random: () => number, low: number, high: number) {
  return low + Math.floor(random() * (high - low + 1));
}

function sampleGames() {
  const random = seeded(23_11_2026);
  const games: SampleGame[] = [];
  for (let day = 0; day < SAMPLE_DAYS; day += 1) {
    const weekend = day % 7 === 5 || day % 7 === 6;
    const count = pick(random, 6, 12) + (weekend ? pick(random, 6, 10) : 0) + Math.floor(day / 6);
    for (let index = 0; index < count; index += 1) {
      const players = pick(random, 3, 10);
      const rounds = pick(random, 4, 10);
      const turnSeconds = 45 + players * 4 + pick(random, 0, 20);
      games.push({
        day,
        players,
        rounds,
        durationSeconds: rounds * turnSeconds,
        goal: day < GOAL_FROM_DAY ? null : GOALS[pick(random, 0, GOALS.length - 1)],
      });
    }
  }
  return games;
}

/**
 * @name SAMPLE_GAMES
 * @description A fixed, made-up month of `game_completed` events for the blog's sample dashboard.
 * The same seed gives the same games on the server and in the browser.
 *
 * @example
 * const finished = SAMPLE_GAMES.length;
 */
export const SAMPLE_GAMES = sampleGames();

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBy<T>(items: T[], key: (item: T) => string | number) {
  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const value = key(item);
    groups.set(value, [...(groups.get(value) ?? []), item]);
  }
  return groups;
}

/**
 * @name dayLabel
 * @description The calendar date of a sample day, counting back from 22 November 2026.
 *
 * @example
 * const lastDay = dayLabel(29);
 */
export function dayLabel(day: number) {
  const date = new Date(Date.UTC(2026, 10, 22 - (SAMPLE_DAYS - 1 - day)));
  return date.toISOString().slice(0, 10);
}

/**
 * @name gamesPerDay
 * @description How many sample games finished on each day of the window, oldest first.
 *
 * @example
 * const bars = gamesPerDay(SAMPLE_GAMES);
 */
export function gamesPerDay(games: SampleGame[]) {
  return Array.from({ length: SAMPLE_DAYS }, (_, day) => ({
    day: dayLabel(day),
    games: games.filter((game) => game.day === day).length,
  }));
}

/**
 * @name gameTotals
 * @description The three numbers the post wanted: finished games, average rounds and average
 * length in seconds.
 *
 * @example
 * const { games, rounds, seconds } = gameTotals(SAMPLE_GAMES);
 */
export function gameTotals(games: SampleGame[]) {
  return {
    games: games.length,
    rounds: Math.round(average(games.map((game) => game.rounds)) * 10) / 10,
    seconds: Math.round(average(games.map((game) => game.durationSeconds))),
  };
}

function byGroupSize(games: SampleGame[]) {
  return [...groupBy(games, (game) => game.players)]
    .toSorted(([a], [b]) => Number(a) - Number(b))
    .map(([players, group]) => [
      players,
      group.length,
      Math.round(average(group.map((game) => game.durationSeconds))),
    ]);
}

function byGoal(games: SampleGame[]) {
  return [...groupBy(games, (game) => game.goal ?? "unknown")]
    .toSorted(([, a], [, b]) => b.length - a.length)
    .map(([goal, group]) => [
      goal,
      group.length,
      Math.round(average(group.map((game) => game.rounds)) * 10) / 10,
    ]);
}

function longestDays(games: SampleGame[]) {
  return gamesPerDay(games)
    .map((entry, day) => ({
      ...entry,
      minutes: Math.round(
        games
          .filter((game) => game.day === day)
          .reduce((sum, game) => sum + game.durationSeconds, 0) / 60,
      ),
    }))
    .toSorted((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
    .map((entry) => [entry.day, entry.games, entry.minutes]);
}

/**
 * @name sampleQueries
 * @description The SQL presets for the blog's query section, each with the rows it returns on the
 * sample games.
 *
 * @example
 * const [groupSize] = sampleQueries(SAMPLE_GAMES);
 */
export function sampleQueries(games: SampleGame[]): SampleQuery[] {
  return [
    {
      id: "group-size",
      name: "Game length per group size",
      description: "Average seconds per finished game, split by how many players joined.",
      chart: "bar",
      sql: `SELECT
  (props->>'players')::int AS players,
  count(*) AS games,
  round(avg((props->>'duration_seconds')::int)) AS seconds
FROM events
WHERE name = 'game_completed' AND ts >= :from AND ts < :to
GROUP BY players
ORDER BY players;`,
      columns: ["players", "games", "seconds"],
      rows: byGroupSize(games),
    },
    {
      id: "goal",
      name: "Rounds per goal",
      description: "Average rounds per goal. Games from before the goal prop count as unknown.",
      chart: "table",
      sql: `SELECT
  coalesce(props->>'goal', 'unknown') AS goal,
  count(*) AS games,
  round(avg((props->>'rounds')::int), 1) AS rounds
FROM events
WHERE name = 'game_completed' AND ts >= :from AND ts < :to
GROUP BY goal
ORDER BY games DESC;`,
      columns: ["goal", "games", "rounds"],
      rows: byGoal(games),
    },
    {
      id: "busiest",
      name: "Most played days",
      description: "The five days with the most minutes of play.",
      chart: "table",
      sql: `SELECT
  date_trunc('day', ts)::date AS day,
  count(*) AS games,
  round(sum((props->>'duration_seconds')::int) / 60.0) AS minutes
FROM events
WHERE name = 'game_completed' AND ts >= :from AND ts < :to
GROUP BY day
ORDER BY minutes DESC
LIMIT 5;`,
      columns: ["day", "games", "minutes"],
      rows: longestDays(games),
    },
  ];
}
