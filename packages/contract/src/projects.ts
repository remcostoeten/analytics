import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Visibility } from "./enums";
import { dataOf, listOf, nullable, oneOf, Timestamp } from "./schema";
import keyUsageResponse from "../fixtures/KeyUsageResponse/valid/used.json";
import createProject from "../fixtures/CreateProject/valid/docs.json";
import createdProject from "../fixtures/CreatedProject/valid/docs.json";
import projectList from "../fixtures/ProjectList/valid/admin-private.json";
import projectResponse from "../fixtures/ProjectResponse/valid/signed-out.json";
import rotateKey from "../fixtures/RotateKey/valid/secret.json";
import rotatedKey from "../fixtures/RotatedKey/valid/secret.json";
import updateProject from "../fixtures/UpdateProject/valid/make-public.json";
import updatedProject from "../fixtures/UpdatedProject/valid/make-public.json";

const ProjectId = Type.String({
  minLength: 1,
  maxLength: 64,
  pattern: "^[a-z0-9][a-z0-9.-]*$",
  description:
    "The project id used in every `/v2/projects/{project}` path: lowercase letters, digits, dots and dashes. It cannot be changed.",
});
const ProjectName = Type.String({ minLength: 1, maxLength: 128, description: "Display name." });
const Domain = Type.String({
  minLength: 1,
  maxLength: 253,
  description: "The site's host, such as `remcostoeten.nl`. The Chrome UX Report job looks it up.",
});
const Origin = Type.String({ format: "uri" });
const AllowedOrigins = Type.Array(Origin, {
  description:
    "Origins that may send events with the public key, matched exactly, such as `https://remcostoeten.nl`. An empty list allows every origin.",
});
const RetentionDays = Type.Integer({
  minimum: 1,
  maximum: 3650,
  description:
    "Days events and sessions are kept before the cleanup job deletes them; 90 by default.",
});
const PublicVisitorData = Type.Boolean({
  description:
    "On a public project, also lets anyone read visitor-level data: events, visitors and sessions. Off by default.",
});
const SqlEnabled = Type.Boolean({
  description:
    "Allows the SQL console on this project for admins, analysts and `sql` tokens. Owners can always run SQL. On by default.",
});
const WidgetReports = Type.Boolean({
  description:
    "Accepts SDK outcome reports at `POST /v2/projects/{project}/logs/client`. Off by default.",
});
const DebugConsole = Type.Boolean({
  description:
    "Lets project admins open the debug console on the project's own sites through `GET /v2/widget/connect` and `GET /v2/widget/session`. Off by default.",
});
const PublicKey = Type.String({
  minLength: 1,
  description:
    "The `pk_live_` key browsers send in `X-Project-Key`. It is not secret; `allowedOrigins` limits where it works.",
});

const KeyUse = Type.Object(
  {
    lastUsedAt: nullable(
      Type.String({ format: "date-time", description: "When the key last authorized a batch." }),
    ),
    lastUsedOrigin: nullable(
      Type.String({
        description:
          "The `Origin` of that request. Null when none was sent, as server-side secret key calls usually do.",
      }),
    ),
  },
  { description: "Null values mean the key has not been used since it was created or rotated." },
);

export const KeyUsage = Type.Object(
  { public: KeyUse, secret: KeyUse },
  {
    description:
      "When and from where each key last authorized an ingest batch. Updated at most once a minute, or at once when the origin changes.",
  },
);

export const PublicProject = Type.Object(
  {
    id: ProjectId,
    name: ProjectName,
    domain: Domain,
    visibility: Visibility,
    createdAt: Timestamp,
  },
  { description: "The fields anyone who may read the project sees." },
);
export type PublicProject = Static<typeof PublicProject>;

export const Project = Type.Object(
  {
    id: ProjectId,
    name: ProjectName,
    domain: Domain,
    visibility: Visibility,
    publicVisitorData: PublicVisitorData,
    sqlEnabled: SqlEnabled,
    widgetReports: WidgetReports,
    debugConsole: DebugConsole,
    allowedOrigins: AllowedOrigins,
    retentionDays: RetentionDays,
    publicKey: PublicKey,
    keyUsage: KeyUsage,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  {
    description:
      "Every setting of a project, shown to callers who may change it. The secret key is never included.",
  },
);
export type Project = Static<typeof Project>;

export type KeyUsage = Static<typeof KeyUsage>;

export const KeyUsageResponse = Type.Object(dataOf(KeyUsage).properties, {
  examples: [keyUsageResponse],
});
export type KeyUsageResponse = Static<typeof KeyUsageResponse>;

export const ProjectsQuery = Type.Object({
  visibility: Type.Optional(
    oneOf(["public", "private"], {
      description: "Keep only public or only private projects.",
    }),
  ),
});
export type ProjectsQuery = Static<typeof ProjectsQuery>;

export const ProjectList = listOf(Type.Union([Project, PublicProject]), {
  examples: [projectList],
});
export type ProjectList = Static<typeof ProjectList>;

export const ProjectResponse = Type.Object(
  dataOf(Type.Union([Project, PublicProject])).properties,
  {
    examples: [projectResponse],
  },
);
export type ProjectResponse = Static<typeof ProjectResponse>;

export const CreateProject = Type.Object(
  {
    id: ProjectId,
    name: ProjectName,
    domain: Domain,
    visibility: Type.Optional(Visibility),
    publicVisitorData: Type.Optional(PublicVisitorData),
    allowedOrigins: Type.Optional(AllowedOrigins),
    retentionDays: Type.Optional(RetentionDays),
  },
  { examples: [createProject] },
);
export type CreateProject = Static<typeof CreateProject>;

export const CreatedProject = Type.Object(
  dataOf(
    Type.Intersect([
      Project,
      Type.Object({
        secretKey: Type.String({
          minLength: 1,
          description:
            "The `sk_live_` key for server-side ingest, sent as `Authorization: Bearer`. Shown only here; it is stored as a hash, so rotate it if lost.",
        }),
      }),
    ]),
  ).properties,
  { examples: [createdProject] },
);
export type CreatedProject = Static<typeof CreatedProject>;

export const UpdateProject = Type.Object(
  {
    name: Type.Optional(ProjectName),
    visibility: Type.Optional(Visibility),
    publicVisitorData: Type.Optional(PublicVisitorData),
    sqlEnabled: Type.Optional(SqlEnabled),
    widgetReports: Type.Optional(WidgetReports),
    debugConsole: Type.Optional(DebugConsole),
    allowedOrigins: Type.Optional(AllowedOrigins),
    retentionDays: Type.Optional(RetentionDays),
  },
  {
    minProperties: 1,
    description: "Only the fields sent are changed; send at least one.",
    examples: [updateProject],
  },
);
export type UpdateProject = Static<typeof UpdateProject>;

export const UpdatedProject = Type.Object(
  dataOf(
    Type.Intersect([
      Type.Object({ id: ProjectId, updatedAt: Timestamp }),
      Type.Partial(
        Type.Pick(Project, [
          "name",
          "visibility",
          "publicVisitorData",
          "sqlEnabled",
          "widgetReports",
          "debugConsole",
          "allowedOrigins",
          "retentionDays",
        ]),
      ),
    ]),
  ).properties,
  {
    description: "The project id, `updatedAt` and the fields that were sent.",
    examples: [updatedProject],
  },
);
export type UpdatedProject = Static<typeof UpdatedProject>;

export const KeyKind = oneOf(["public", "secret"], {
  description: "`public` is the `pk_live_` browser key; `secret` is the `sk_live_` server key.",
});
export type KeyKind = Static<typeof KeyKind>;

export const RotateKey = Type.Object({ kind: KeyKind }, { examples: [rotateKey] });
export type RotateKey = Static<typeof RotateKey>;

export const RotatedKey = Type.Object(
  dataOf(
    Type.Object({
      kind: KeyKind,
      key: Type.String({
        minLength: 1,
        description:
          "The new key, shown only here. The old key stops working at once; a secret key is stored as a hash.",
      }),
      rotatedAt: Timestamp,
    }),
  ).properties,
  { examples: [rotatedKey] },
);
export type RotatedKey = Static<typeof RotatedKey>;
