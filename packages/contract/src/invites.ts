import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { EmailAddress } from "./alerts";
import { AssignableRole } from "./enums";
import { dataOf, Id, listOf, nullable, oneOf, Timestamp, Url } from "./schema";

const ProjectIds = nullable(Type.Array(Id, { minItems: 1 }));

export const InviteStatus = oneOf(["pending", "accepted", "expired"]);
export type InviteStatus = Static<typeof InviteStatus>;

export const Invite = Type.Object({
  id: Id,
  role: AssignableRole,
  projectIds: ProjectIds,
  status: InviteStatus,
  email: nullable(EmailAddress),
  acceptedAt: nullable(Timestamp),
  expiresAt: Timestamp,
  createdAt: Timestamp,
});
export type Invite = Static<typeof Invite>;

export const InviteList = listOf(Invite);
export type InviteList = Static<typeof InviteList>;

export const CreateInvite = Type.Object({
  role: AssignableRole,
  projectIds: Type.Optional(ProjectIds),
  expiresAt: Type.Optional(Timestamp),
});
export type CreateInvite = Static<typeof CreateInvite>;

export const CreatedInvite = dataOf(
  Type.Object({
    id: Id,
    role: AssignableRole,
    projectIds: ProjectIds,
    token: Type.String({ minLength: 1 }),
    url: nullable(Url),
    expiresAt: Timestamp,
    createdAt: Timestamp,
  }),
);
export type CreatedInvite = Static<typeof CreatedInvite>;

export const InvitePreview = dataOf(
  Type.Object({
    role: AssignableRole,
    projectIds: ProjectIds,
    expiresAt: Timestamp,
  }),
);
export type InvitePreview = Static<typeof InvitePreview>;

export const AcceptInvite = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: EmailAddress,
  password: Type.String({ minLength: 8, maxLength: 128 }),
});
export type AcceptInvite = Static<typeof AcceptInvite>;

export const AcceptedInvite = dataOf(
  Type.Object({
    user: Type.Object({ id: Id, name: Type.String(), email: EmailAddress }),
    role: AssignableRole,
    projectIds: ProjectIds,
  }),
);
export type AcceptedInvite = Static<typeof AcceptedInvite>;
