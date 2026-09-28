import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Device } from "./common";
import { IssueLevel, IssueStatus } from "./enums";
import { Count, dataOf, Id, listOf, nullable, oneOf, Timestamp } from "./schema";

export const IssuesQuery = Type.Object({ status: Type.Optional(IssueStatus) });
export type IssuesQuery = Static<typeof IssuesQuery>;

export const Issue = Type.Object({
  id: Id,
  title: Type.String({ minLength: 1 }),
  culprit: nullable(Type.String()),
  level: IssueLevel,
  status: IssueStatus,
  isRegression: Type.Boolean(),
  count: Count,
  visitors: Count,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  firstRelease: nullable(Type.String()),
  lastRelease: nullable(Type.String()),
  resolvedAt: nullable(Timestamp),
});
export type Issue = Static<typeof Issue>;

export const IssueList = listOf(Issue);
export type IssueList = Static<typeof IssueList>;

export const IssueResponse = dataOf(Issue);
export type IssueResponse = Static<typeof IssueResponse>;

export const StackFrame = Type.Object({
  file: Type.String(),
  line: nullable(Type.Integer({ minimum: 0 })),
  column: nullable(Type.Integer({ minimum: 0 })),
  function: nullable(Type.String()),
  inApp: Type.Boolean(),
});
export type StackFrame = Static<typeof StackFrame>;

export const BreadcrumbKind = oneOf(["navigation", "click", "fetch", "event"]);
export type BreadcrumbKind = Static<typeof BreadcrumbKind>;

export const Breadcrumb = Type.Object({
  ts: Timestamp,
  kind: BreadcrumbKind,
  message: Type.String(),
});
export type Breadcrumb = Static<typeof Breadcrumb>;

export const IssueEvent = Type.Object({
  id: Id,
  ts: Timestamp,
  visitor: Id,
  release: nullable(Type.String()),
  environment: nullable(Type.String()),
  page: Type.Object({ path: Type.String({ minLength: 1 }) }),
  error: Type.Object({
    type: Type.String(),
    message: Type.String(),
    stack: Type.Array(StackFrame),
  }),
  breadcrumbs: Type.Array(Breadcrumb, { maxItems: 20 }),
  device: Device,
});
export type IssueEvent = Static<typeof IssueEvent>;

export const IssueEventList = listOf(IssueEvent);
export type IssueEventList = Static<typeof IssueEventList>;

export const UpdateIssue = Type.Object({ status: IssueStatus });
export type UpdateIssue = Static<typeof UpdateIssue>;

export const UpdatedIssue = dataOf(
  Type.Object({ id: Id, status: IssueStatus, resolvedAt: nullable(Timestamp) }),
);
export type UpdatedIssue = Static<typeof UpdatedIssue>;

export const ErrorRuleKind = oneOf(["ignore", "mute"]);
export type ErrorRuleKind = Static<typeof ErrorRuleKind>;

export const ErrorRuleField = oneOf(["message", "stack"]);
export type ErrorRuleField = Static<typeof ErrorRuleField>;

export const ErrorRule = Type.Object({
  id: Id,
  kind: ErrorRuleKind,
  field: nullable(ErrorRuleField),
  pattern: nullable(Type.String({ minLength: 1 })),
  issue: nullable(Id),
  until: nullable(Timestamp),
  remaining: nullable(Count),
  createdAt: nullable(Timestamp),
});
export type ErrorRule = Static<typeof ErrorRule>;

export const ErrorRuleList = listOf(ErrorRule);
export type ErrorRuleList = Static<typeof ErrorRuleList>;

export const ErrorRuleResponse = dataOf(ErrorRule);
export type ErrorRuleResponse = Static<typeof ErrorRuleResponse>;

export const CreateErrorRule = Type.Union([
  Type.Object({
    kind: Type.Literal("ignore"),
    field: ErrorRuleField,
    pattern: Type.String({ minLength: 1, maxLength: 500 }),
  }),
  Type.Object({
    kind: Type.Literal("mute"),
    issue: Id,
    until: Type.Optional(Timestamp),
    count: Type.Optional(Type.Integer({ minimum: 1 })),
  }),
]);
export type CreateErrorRule = Static<typeof CreateErrorRule>;
