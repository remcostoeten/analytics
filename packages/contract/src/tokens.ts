import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { TokenScope } from "./enums";
import { dataOf, Id, listOf, nullable, Timestamp } from "./schema";
import createToken from "../fixtures/CreateToken/valid/report.json";
import createdToken from "../fixtures/CreatedToken/valid/report.json";
import tokenList from "../fixtures/TokenList/valid/one.json";

const TokenId = Type.String({
  minLength: 1,
  maxLength: 128,
  description: "The token's id (`tok_...`), used to revoke it. Not the token itself.",
});
const TokenName = Type.String({
  minLength: 1,
  maxLength: 128,
  description: "A label for people, such as `CI report`.",
});
const ProjectIds = nullable(
  Type.Array(Id, {
    minItems: 1,
    description: "The projects the token may use. Null means every project.",
  }),
);
const ExpiresAt = nullable(
  Type.String({
    format: "date-time",
    description: "When the token stops working. Null means it never expires.",
  }),
);

export const ApiToken = Type.Object(
  {
    id: TokenId,
    name: TokenName,
    scope: TokenScope,
    projectIds: ProjectIds,
    lastUsedAt: nullable(
      Type.String({ format: "date-time", description: "Last request made with the token." }),
    ),
    expiresAt: ExpiresAt,
    createdAt: Timestamp,
  },
  { description: "An API token without its value, which is only shown when it is created." },
);
export type ApiToken = Static<typeof ApiToken>;

export const TokenList = listOf(ApiToken, { examples: [tokenList] });
export type TokenList = Static<typeof TokenList>;

export const CreateToken = Type.Object(
  {
    name: TokenName,
    scope: TokenScope,
    projectIds: Type.Optional(ProjectIds),
    expiresAt: Type.Optional(ExpiresAt),
  },
  {
    description:
      "Leave `projectIds` out for every project and `expiresAt` out for no expiry; an expiry must be in the future.",
    examples: [createToken],
  },
);
export type CreateToken = Static<typeof CreateToken>;

export const CreatedToken = Type.Object(
  dataOf(
    Type.Object({
      id: TokenId,
      name: TokenName,
      scope: TokenScope,
      projectIds: ProjectIds,
      token: Type.String({
        minLength: 1,
        description:
          "The `at_live_` token to send as `Authorization: Bearer`. Shown only here; it is stored as a hash.",
      }),
      expiresAt: ExpiresAt,
      createdAt: Timestamp,
    }),
  ).properties,
  { examples: [createdToken] },
);
export type CreatedToken = Static<typeof CreatedToken>;
