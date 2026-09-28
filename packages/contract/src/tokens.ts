import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { TokenScope } from "./enums";
import { dataOf, Id, listOf, nullable, Timestamp } from "./schema";

const TokenName = Type.String({ minLength: 1, maxLength: 128 });
const ProjectIds = nullable(Type.Array(Id, { minItems: 1 }));

export const ApiToken = Type.Object({
  id: Id,
  name: TokenName,
  scope: TokenScope,
  projectIds: ProjectIds,
  lastUsedAt: nullable(Timestamp),
  expiresAt: nullable(Timestamp),
  createdAt: Timestamp,
});
export type ApiToken = Static<typeof ApiToken>;

export const TokenList = listOf(ApiToken);
export type TokenList = Static<typeof TokenList>;

export const CreateToken = Type.Object({
  name: TokenName,
  scope: TokenScope,
  projectIds: Type.Optional(ProjectIds),
  expiresAt: Type.Optional(nullable(Timestamp)),
});
export type CreateToken = Static<typeof CreateToken>;

export const CreatedToken = dataOf(
  Type.Object({
    id: Id,
    name: TokenName,
    scope: TokenScope,
    projectIds: ProjectIds,
    token: Type.String({ minLength: 1 }),
    expiresAt: nullable(Timestamp),
    createdAt: Timestamp,
  }),
);
export type CreatedToken = Static<typeof CreatedToken>;
