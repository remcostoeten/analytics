import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Device } from "./common";
import { IssueLevel, IssueStatus } from "./enums";
import { dataOf, Id, listOf, nullable, oneOf, Timestamp } from "./schema";
import createErrorRule from "../fixtures/CreateErrorRule/valid/ignore.json";
import errorRuleList from "../fixtures/ErrorRuleList/valid/rules.json";
import errorRuleResponse from "../fixtures/ErrorRuleResponse/valid/mute.json";
import issueEventList from "../fixtures/IssueEventList/valid/post-card.json";
import issueList from "../fixtures/IssueList/valid/open.json";
import updateIssue from "../fixtures/UpdateIssue/valid/resolve.json";
import updatedIssue from "../fixtures/UpdatedIssue/valid/resolved.json";

const IssueId = Type.String({
  minLength: 1,
  maxLength: 128,
  description: "The issue id (`iss_...`).",
});

export const IssuesQuery = Type.Object({
  status: Type.Optional(
    oneOf(["open", "resolved", "ignored"], {
      description: "Keep only issues with this status.",
    }),
  ),
});
export type IssuesQuery = Static<typeof IssuesQuery>;

export const Issue = Type.Object(
  {
    id: IssueId,
    title: Type.String({
      minLength: 1,
      description: "`<type>: <message>` of the latest occurrence, or the type alone.",
    }),
    culprit: nullable(
      Type.String({
        description:
          "`<file> in <function>` of the top in-app stack frame; null when the stack has no frames.",
      }),
    ),
    level: IssueLevel,
    status: IssueStatus,
    isRegression: Type.Boolean({
      description: "True when it happened again after being resolved; resolving clears it.",
    }),
    count: Type.Integer({ minimum: 0, description: "Occurrences, ignored errors not included." }),
    visitors: Type.Integer({ minimum: 0, description: "Unique visitors among the stored events." }),
    firstSeen: Timestamp,
    lastSeen: Timestamp,
    firstRelease: nullable(Type.String({ description: "The release it was first seen in." })),
    lastRelease: nullable(Type.String({ description: "The release it was last seen in." })),
    resolvedAt: nullable(Timestamp),
  },
  {
    description:
      "Errors grouped by type, message with numbers and ids normalised, and the top in-app frame, or by the app's own `fingerprint`.",
  },
);
export type Issue = Static<typeof Issue>;

export const IssueList = listOf(Issue, { examples: [issueList] });
export type IssueList = Static<typeof IssueList>;

export const IssueResponse = dataOf(Issue);
export type IssueResponse = Static<typeof IssueResponse>;

export const StackFrame = Type.Object({
  file: Type.String({ description: "The script URL or path of the frame." }),
  line: nullable(Type.Integer({ minimum: 0 })),
  column: nullable(Type.Integer({ minimum: 0 })),
  function: nullable(Type.String()),
  inApp: Type.Boolean({
    description: "False for frames from `node_modules`, browser extensions and native code.",
  }),
});
export type StackFrame = Static<typeof StackFrame>;

export const BreadcrumbKind = oneOf(["navigation", "click", "fetch", "event"], {
  description:
    "`navigation` for a page change, `click` with the clicked tag, `fetch` for a failed request with its status and URL, `event` for another tracked event.",
});
export type BreadcrumbKind = Static<typeof BreadcrumbKind>;

export const Breadcrumb = Type.Object(
  {
    ts: Timestamp,
    kind: BreadcrumbKind,
    message: Type.String({
      description:
        "Up to 200 characters. Emails, long tokens, runs of 6 or more digits and query strings other than `utm_` are removed.",
    }),
  },
  { description: "Something that happened in the page before the error." },
);
export type Breadcrumb = Static<typeof Breadcrumb>;

export const IssueEvent = Type.Object(
  {
    id: Id,
    ts: Timestamp,
    visitor: Type.String({
      minLength: 1,
      maxLength: 128,
      description: "The visitor's anonymous id.",
    }),
    release: nullable(Type.String({ description: "The release the app reported." })),
    environment: nullable(Type.String({ description: "The environment the app reported." })),
    page: Type.Object({ path: Type.String({ minLength: 1, description: "The page path." }) }),
    error: Type.Object({
      type: Type.String({ description: "The error's name, such as `TypeError`." }),
      message: Type.String({
        description:
          "The message. Emails, long tokens, runs of 6 or more digits and query strings other than `utm_` are removed.",
      }),
      stack: Type.Array(StackFrame, { description: "Parsed stack frames, top first." }),
    }),
    breadcrumbs: Type.Array(Breadcrumb, {
      maxItems: 20,
      description: "The last 20, oldest first.",
    }),
    device: Device,
  },
  {
    description:
      "One stored occurrence. After 100 in a minute, further ones are counted but not stored.",
  },
);
export type IssueEvent = Static<typeof IssueEvent>;

export const IssueEventList = listOf(IssueEvent, {
  examples: [issueEventList],
});
export type IssueEventList = Static<typeof IssueEventList>;

export const UpdateIssue = Type.Object(
  { status: IssueStatus },
  {
    description:
      "`resolved` stamps `resolvedAt`, and a later occurrence reopens the issue as a regression.",
    examples: [updateIssue],
  },
);
export type UpdateIssue = Static<typeof UpdateIssue>;

export const UpdatedIssue = Type.Object(
  dataOf(Type.Object({ id: IssueId, status: IssueStatus, resolvedAt: nullable(Timestamp) }))
    .properties,
  { examples: [updatedIssue] },
);
export type UpdatedIssue = Static<typeof UpdatedIssue>;

export const ErrorRuleKind = oneOf(["ignore", "mute"], {
  description:
    "`ignore` drops new errors whose message or stack contains `pattern`; `mute` sets an issue to ignored until a date or a number of further occurrences.",
});
export type ErrorRuleKind = Static<typeof ErrorRuleKind>;

export const ErrorRuleField = oneOf(["message", "stack"], {
  description: "Which part of the error `pattern` is matched against.",
});
export type ErrorRuleField = Static<typeof ErrorRuleField>;

export const ErrorRule = Type.Object(
  {
    id: Type.String({
      minLength: 1,
      maxLength: 128,
      description: "`rule_...` for an ignore pattern, `mute_<issue>` for a muted issue.",
    }),
    kind: ErrorRuleKind,
    field: nullable(ErrorRuleField),
    pattern: nullable(
      Type.String({
        minLength: 1,
        description: "Text matched case-insensitively as a substring; null on mute rules.",
      }),
    ),
    issue: nullable(Type.String({ description: "The muted issue; null on ignore rules." })),
    until: nullable(
      Type.String({ format: "date-time", description: "The mute ends at this time." }),
    ),
    remaining: nullable(
      Type.Integer({
        minimum: 0,
        description: "Occurrences left before the mute ends and the issue reopens.",
      }),
    ),
    createdAt: nullable(Timestamp),
  },
  { description: "An ignore pattern or a muted issue; fields that do not apply are null." },
);
export type ErrorRule = Static<typeof ErrorRule>;

export const ErrorRuleList = listOf(ErrorRule, {
  examples: [errorRuleList],
});
export type ErrorRuleList = Static<typeof ErrorRuleList>;

export const ErrorRuleResponse = Type.Object(dataOf(ErrorRule).properties, {
  examples: [errorRuleResponse],
});
export type ErrorRuleResponse = Static<typeof ErrorRuleResponse>;

export const CreateErrorRule = Type.Union(
  [
    Type.Object({
      kind: Type.Literal("ignore"),
      field: ErrorRuleField,
      pattern: Type.String({
        minLength: 1,
        maxLength: 500,
        description: "Text to match case-insensitively as a substring.",
      }),
    }),
    Type.Object({
      kind: Type.Literal("mute"),
      issue: Type.String({ minLength: 1, maxLength: 128, description: "The issue to mute." }),
      until: Type.Optional(
        Type.String({ format: "date-time", description: "Unmute at this time." }),
      ),
      count: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "Unmute after this many more occurrences; with `until`, whichever comes first.",
        }),
      ),
    }),
  ],
  {
    description:
      "An ignore pattern, or a mute for one issue. A mute needs `until`, `count` or both, and `until` must be in the future.",
    examples: [createErrorRule],
  },
);
export type CreateErrorRule = Static<typeof CreateErrorRule>;
