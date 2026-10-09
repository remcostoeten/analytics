import { expect, test } from "bun:test";

import { parseSqlAnswer, sqlShowcaseRequest } from "./sql-answer";
import { sqlPresets } from "./sql-presets";

const window = {
  from: new Date("2026-09-10T12:00:00.000Z"),
  to: new Date("2026-10-10T12:00:00.000Z"),
};

test("the request carries the preset's SQL and the window as ISO strings", () => {
  const request = sqlShowcaseRequest(sqlPresets[0], window);
  expect(request.sql).toBe(sqlPresets[0].sql);
  expect(request.params).toEqual({
    from: "2026-09-10T12:00:00.000Z",
    to: "2026-10-10T12:00:00.000Z",
  });
});

test("a documented result is passed through", () => {
  const body = {
    columns: ["path", "visitors"],
    rows: [["/", 12]],
    rowCount: 1,
    truncated: false,
    durationMs: 8.4,
  };
  expect(parseSqlAnswer(200, body)).toEqual({ status: "done", result: body });
});

test("an answer in another shape fails instead of rendering", () => {
  const outcome = parseSqlAnswer(200, { data: [] });
  expect(outcome.status).toBe("failed");
});

test("the API's own message is shown, with sentences for the rate limit and silence", () => {
  expect(
    parseSqlAnswer(403, { error: { message: "You may not run SQL on this project" } }),
  ).toEqual({ status: "failed", message: "You may not run SQL on this project" });
  expect(parseSqlAnswer(429, null)).toEqual({
    status: "failed",
    message: "The query budget for this minute is used up.",
  });
  expect(parseSqlAnswer(502, null)).toEqual({ status: "failed", message: "The API answered 502." });
});
