import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";
import { Type } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  ActiveVisitors,
  AdminMetrics,
  AnnotationList,
  AnnotationResponse,
  ApiError,
  AuthSession,
  BreakdownResponse,
  ClientLogBatch,
  CreatedProject,
  CreatedToken,
  CreateAnnotation,
  CreateErrorRule,
  CreateProject,
  CreateSavedQuery,
  CreateToken,
  ErrorRuleList,
  ErrorRuleResponse,
  EventList,
  Health,
  HeatmapResponse,
  IngestEnvelope,
  IngestResult,
  IssueEventList,
  IssueList,
  JobResult,
  LiveEvents,
  LogList,
  MapResponse,
  Overview,
  PathsResponse,
  PeopleList,
  PersonResponse,
  ProjectList,
  ProjectResponse,
  QueryHistory,
  QueryPlan,
  QueryRequest,
  QueryResult,
  QuerySchema,
  RealtimeResponse,
  RetentionResponse,
  RotatedKey,
  RotateKey,
  SavedQueryList,
  SavedQueryResponse,
  SessionEvents,
  SessionList,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
  StatsResponse,
  TimeseriesResponse,
  TokenList,
  UpdatedIssue,
  UpdatedProject,
  UpdatedVisitor,
  UpdateAnnotation,
  UpdateIssue,
  UpdateProject,
  UpdateSavedQuery,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
  VitalsBreakdownResponse,
  WidgetSession,
} from "../src";

const schemas: { [name: string]: TSchema } = {
  ActiveVisitors,
  AdminMetrics,
  AnnotationList,
  AnnotationResponse,
  ApiError,
  AuthSession,
  BreakdownResponse,
  ClientLogBatch,
  CreatedProject,
  CreatedToken,
  CreateAnnotation,
  CreateErrorRule,
  CreateProject,
  CreateSavedQuery,
  CreateToken,
  ErrorRuleList,
  ErrorRuleResponse,
  EventList,
  Health,
  HeatmapResponse,
  IngestEnvelope,
  IngestResult,
  IssueEventList,
  IssueList,
  JobResult,
  LiveEvents,
  LogList,
  MapResponse,
  Overview,
  PathsResponse,
  PeopleList,
  PersonResponse,
  ProjectList,
  ProjectResponse,
  QueryHistory,
  QueryPlan,
  QueryRequest,
  QueryResult,
  QuerySchema,
  RealtimeResponse,
  RetentionResponse,
  RotatedKey,
  RotateKey,
  SavedQueryList,
  SavedQueryResponse,
  SessionEvents,
  SessionList,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
  StatsResponse,
  TimeseriesResponse,
  TokenList,
  UpdatedIssue,
  UpdatedProject,
  UpdatedVisitor,
  UpdateAnnotation,
  UpdateIssue,
  UpdateProject,
  UpdateSavedQuery,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
  VitalsBreakdownResponse,
  WidgetSession,
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
