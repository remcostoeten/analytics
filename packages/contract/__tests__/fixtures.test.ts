import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";
import { Type } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  AdminMetrics,
  ApiError,
  AuthSession,
  BreakdownResponse,
  CreatedProject,
  CreatedToken,
  CreateProject,
  CreateToken,
  EventList,
  Health,
  IngestEnvelope,
  IngestResult,
  IssueEventList,
  IssueList,
  JobResult,
  PeopleList,
  PersonResponse,
  ProjectList,
  ProjectResponse,
  QueryRequest,
  QueryResult,
  RealtimeResponse,
  RotatedKey,
  RotateKey,
  SessionEvents,
  SessionList,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  StatsResponse,
  TimeseriesResponse,
  TokenList,
  UpdatedIssue,
  UpdatedProject,
  UpdatedVisitor,
  UpdateIssue,
  UpdateProject,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
  VitalsBreakdownResponse,
} from "../src";

const schemas: { [name: string]: TSchema } = {
  AdminMetrics,
  ApiError,
  AuthSession,
  BreakdownResponse,
  CreatedProject,
  CreatedToken,
  CreateProject,
  CreateToken,
  EventList,
  Health,
  IngestEnvelope,
  IngestResult,
  IssueEventList,
  IssueList,
  JobResult,
  PeopleList,
  PersonResponse,
  ProjectList,
  ProjectResponse,
  QueryRequest,
  QueryResult,
  RealtimeResponse,
  RotatedKey,
  RotateKey,
  SessionEvents,
  SessionList,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  StatsResponse,
  TimeseriesResponse,
  TokenList,
  UpdatedIssue,
  UpdatedProject,
  UpdatedVisitor,
  UpdateIssue,
  UpdateProject,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
  VitalsBreakdownResponse,
};

const InvalidFixture = Type.Object({ expectedPath: Type.String(), value: Type.Unknown() });

const root = join(import.meta.dir, "../fixtures");

function fixtureFiles(schemaName: string, kind: string) {
  const directory = join(root, schemaName, kind);
  try {
    return readdirSync(directory)
      .filter((file) => file.endsWith(".json"))
      .map((file) => ({ file, raw: JSON.parse(readFileSync(join(directory, file), "utf8")) }));
  } catch {
    return [];
  }
}

function schemaFor(name: string): TSchema {
  const schema = schemas[name];
  if (!schema) throw new Error(`No schema registered for fixtures/${name}`);
  return schema;
}

describe("fixtures", () => {
  test("every fixture folder has a schema and every schema has a valid fixture", () => {
    const folders = readdirSync(root).sort();
    expect(folders).toEqual(Object.keys(schemas).sort());
    for (const name of folders) expect(fixtureFiles(name, "valid").length).toBeGreaterThan(0);
  });

  for (const name of readdirSync(root)) {
    describe(name, () => {
      for (const { file, raw } of fixtureFiles(name, "valid")) {
        test(`accepts valid/${file}`, () => {
          const errors = [...Value.Errors(schemaFor(name), raw)].map(
            (error) => `${error.path} ${error.message}`,
          );
          expect(errors).toEqual([]);
        });
      }

      for (const { file, raw } of fixtureFiles(name, "invalid")) {
        test(`rejects invalid/${file} at its expected path`, () => {
          if (!Value.Check(InvalidFixture, raw))
            throw new Error(`${file} is not an invalid fixture`);
          const paths = [...Value.Errors(schemaFor(name), raw.value)].map((error) => error.path);
          expect(paths.length).toBeGreaterThan(0);
          expect(paths).toContain(raw.expectedPath);
        });
      }
    });
  }
});
