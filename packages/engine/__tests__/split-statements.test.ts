import { describe, expect, test } from "bun:test";

import { splitStatements } from "../src/db/split-statements";

const cases = [
  { name: "plain statements", sql: "SELECT 1; SELECT 2;", expected: ["SELECT 1", "SELECT 2"] },
  {
    name: "missing final semicolon",
    sql: "SELECT 1;\nSELECT 2",
    expected: ["SELECT 1", "SELECT 2"],
  },
  {
    name: "semicolon inside a string",
    sql: "SELECT 'a;b'; SELECT 2",
    expected: ["SELECT 'a;b'", "SELECT 2"],
  },
  { name: "escaped quote", sql: "SELECT 'it''s; fine'", expected: ["SELECT 'it''s; fine'"] },
  {
    name: "quoted identifier",
    sql: 'CREATE TABLE "a;b" (id int)',
    expected: ['CREATE TABLE "a;b" (id int)'],
  },
  {
    name: "dollar-quoted body",
    sql: "DO $$ BEGIN PERFORM 1; END $$; SELECT 2",
    expected: ["DO $$ BEGIN PERFORM 1; END $$", "SELECT 2"],
  },
  {
    name: "named dollar tag",
    sql: "CREATE FUNCTION f() RETURNS int AS $body$ SELECT 1; $body$ LANGUAGE sql;",
    expected: ["CREATE FUNCTION f() RETURNS int AS $body$ SELECT 1; $body$ LANGUAGE sql"],
  },
  {
    name: "line comments and drizzle breakpoints",
    sql: "CREATE TABLE a (id int);--> statement-breakpoint\n-- note; here\nCREATE TABLE b (id int);",
    expected: ["CREATE TABLE a (id int)", "CREATE TABLE b (id int)"],
  },
  { name: "empty input", sql: " \n ", expected: [] },
];

describe("splitStatements", () => {
  for (const { name, sql, expected } of cases) {
    test(name, () => {
      expect(splitStatements(sql)).toEqual(expected);
    });
  }
});
