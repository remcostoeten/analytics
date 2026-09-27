import Type from "typebox";
import type { Static } from "typebox";

import { Visibility } from "./enums";
import { dataOf, listOf, Timestamp } from "./schema";

const ProjectId = Type.String({ minLength: 1, maxLength: 64, pattern: "^[a-z0-9][a-z0-9.-]*$" });
const Origin = Type.String({ format: "uri" });
const RetentionDays = Type.Integer({ minimum: 1, maximum: 3650 });

export const PublicProject = Type.Object({
  id: ProjectId,
  name: Type.String({ minLength: 1, maxLength: 128 }),
  domain: Type.String({ minLength: 1, maxLength: 253 }),
  visibility: Visibility,
  createdAt: Timestamp,
});
export type PublicProject = Static<typeof PublicProject>;

export const Project = Type.Object({
  id: ProjectId,
  name: Type.String({ minLength: 1, maxLength: 128 }),
  domain: Type.String({ minLength: 1, maxLength: 253 }),
  visibility: Visibility,
  publicVisitorData: Type.Boolean(),
  allowedOrigins: Type.Array(Origin),
  retentionDays: RetentionDays,
  publicKey: Type.String({ minLength: 1 }),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Project = Static<typeof Project>;

export const ProjectsQuery = Type.Object({ visibility: Type.Optional(Visibility) });
export type ProjectsQuery = Static<typeof ProjectsQuery>;

export const ProjectList = listOf(Type.Union([Project, PublicProject]));
export type ProjectList = Static<typeof ProjectList>;

export const ProjectResponse = dataOf(Type.Union([Project, PublicProject]));
export type ProjectResponse = Static<typeof ProjectResponse>;

export const CreateProject = Type.Object({
  id: ProjectId,
  name: Type.String({ minLength: 1, maxLength: 128 }),
  domain: Type.String({ minLength: 1, maxLength: 253 }),
  visibility: Type.Optional(Visibility),
  publicVisitorData: Type.Optional(Type.Boolean()),
  allowedOrigins: Type.Optional(Type.Array(Origin)),
  retentionDays: Type.Optional(RetentionDays),
});
export type CreateProject = Static<typeof CreateProject>;

export const CreatedProject = dataOf(
  Type.Intersect([Project, Type.Object({ secretKey: Type.String({ minLength: 1 }) })]),
);
export type CreatedProject = Static<typeof CreatedProject>;

export const UpdateProject = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
    visibility: Type.Optional(Visibility),
    publicVisitorData: Type.Optional(Type.Boolean()),
    allowedOrigins: Type.Optional(Type.Array(Origin)),
    retentionDays: Type.Optional(RetentionDays),
  },
  { minProperties: 1 },
);
export type UpdateProject = Static<typeof UpdateProject>;

export const UpdatedProject = dataOf(
  Type.Intersect([
    Type.Object({ id: ProjectId, updatedAt: Timestamp }),
    Type.Partial(
      Type.Pick(Project, [
        "name",
        "visibility",
        "publicVisitorData",
        "allowedOrigins",
        "retentionDays",
      ]),
    ),
  ]),
);
export type UpdatedProject = Static<typeof UpdatedProject>;

export const KeyKind = Type.Enum(["public", "secret"]);
export type KeyKind = Static<typeof KeyKind>;

export const RotateKey = Type.Object({ kind: KeyKind });
export type RotateKey = Static<typeof RotateKey>;

export const RotatedKey = dataOf(
  Type.Object({ kind: KeyKind, key: Type.String({ minLength: 1 }), rotatedAt: Timestamp }),
);
export type RotatedKey = Static<typeof RotatedKey>;
