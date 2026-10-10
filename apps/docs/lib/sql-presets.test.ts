import { expect, test } from "bun:test";

import { findSqlPreset, sqlPresets } from "./sql-presets";

test("every preset has its own id and binds the showcase window", () => {
  const ids = sqlPresets.map((preset) => preset.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const preset of sqlPresets) {
    expect(preset.sql.startsWith("SELECT")).toBe(true);
    expect(preset.sql).toContain(":from");
    expect(preset.sql).toContain(":to");
    expect(preset.sql).not.toContain(";");
  }
});

test("every preset aggregates and keeps visitor and session ids out of the rows", () => {
  for (const preset of sqlPresets) {
    expect(preset.sql).toContain("GROUP BY");
    const outsideCounts = preset.sql.replaceAll("count(DISTINCT visitor_id)", "");
    expect(outsideCounts).not.toContain("visitor_id");
    expect(outsideCounts).not.toContain("session_id");
    expect(outsideCounts).not.toContain("event_id");
  }
});

test("every preset only reads humans", () => {
  for (const preset of sqlPresets) expect(preset.sql).toContain("is_human");
});

test("findSqlPreset answers null for anything made up", () => {
  expect(findSqlPreset("pages")?.title).toBe("Top pages");
  expect(findSqlPreset("drop table events")).toBeNull();
  expect(findSqlPreset("")).toBeNull();
});
