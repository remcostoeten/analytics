import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { EmailAddress } from "./alerts";
import { AssignableRole, Role } from "./enums";
import { dataOf, Id, listOf, nullable, oneOf, Timestamp, Url } from "./schema";

const ProjectIds = nullable(Type.Array(Id));

export const SignInMethod = oneOf(["github", "password"]);
export type SignInMethod = Static<typeof SignInMethod>;

export const Member = Type.Object({
  id: Id,
  name: Type.String(),
  email: EmailAddress,
  login: nullable(Type.String({ minLength: 1 })),
  avatarUrl: nullable(Url),
  signIn: SignInMethod,
  role: Role,
  projectIds: ProjectIds,
  joinedAt: Timestamp,
});
export type Member = Static<typeof Member>;

export const MemberList = listOf(Member);
export type MemberList = Static<typeof MemberList>;

export const MemberResponse = dataOf(Member);
export type MemberResponse = Static<typeof MemberResponse>;

export const UpdateMember = Type.Object(
  {
    role: Type.Optional(AssignableRole),
    projectIds: Type.Optional(ProjectIds),
  },
  { minProperties: 1 },
);
export type UpdateMember = Static<typeof UpdateMember>;
