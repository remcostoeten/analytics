import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Role } from "./enums";
import { dataOf, Id, listOf, nullable, oneOf, Timestamp } from "./schema";
import addMember from "../fixtures/AddMember/valid/analyst.json";
import githubLookup from "../fixtures/GithubLookup/valid/octocat.json";
import memberList from "../fixtures/MemberList/valid/two.json";
import memberResponse from "../fixtures/MemberResponse/valid/analyst.json";
import updateMember from "../fixtures/UpdateMember/valid/all-projects.json";

const Login = Type.String({
  minLength: 1,
  maxLength: 39,
  pattern: "^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$",
  description: "A GitHub login, checked against GitHub before it is stored.",
});
export const GrantedRole = oneOf(["admin", "analyst", "viewer"], {
  description: "The role to grant. The owner is the first account to sign in and is never granted.",
});
export type GrantedRole = Static<typeof GrantedRole>;

const ProjectIds = nullable(
  Type.Array(Id, {
    description: "The projects the member may use. Null means every project; empty means none.",
  }),
);

export const Member = Type.Object(
  {
    login: Login,
    githubId: nullable(
      Type.String({
        minLength: 1,
        description:
          "GitHub's numeric account id as text. Sign-in only admits this id, so a renamed login cannot be claimed by someone else. Null on entries from before ids were stored, until the first sign-in.",
      }),
    ),
    role: Role,
    projectIds: ProjectIds,
    joined: Type.Boolean({ description: "Whether the person has signed in yet." }),
    addedAt: Timestamp,
    lastSignInAt: nullable(
      Type.String({
        format: "date-time",
        description: "When the member last signed in. Null until the first sign-in.",
      }),
    ),
  },
  { description: "A GitHub login that may sign in, with the role and projects it holds." },
);
export type Member = Static<typeof Member>;

export const MemberList = listOf(Member, { examples: [memberList] });
export type MemberList = Static<typeof MemberList>;

export const MemberResponse = Type.Object(dataOf(Member).properties, {
  examples: [memberResponse],
});
export type MemberResponse = Static<typeof MemberResponse>;

export const AddMember = Type.Object(
  {
    login: Login,
    role: GrantedRole,
    projectIds: Type.Optional(ProjectIds),
  },
  {
    description:
      "The login must exist on GitHub. Leave `projectIds` out to grant no projects until they are listed.",
    examples: [addMember],
  },
);
export type AddMember = Static<typeof AddMember>;

export const UpdateMember = Type.Object(
  {
    role: Type.Optional(GrantedRole),
    projectIds: Type.Optional(ProjectIds),
  },
  {
    description:
      "Send only what changes: an absent field is left alone and `projectIds: null` grants every project.",
    examples: [updateMember],
  },
);
export type UpdateMember = Static<typeof UpdateMember>;

export const GithubProfile = Type.Object(
  {
    login: Login,
    id: Type.String({ minLength: 1, description: "GitHub's numeric account id as text." }),
    name: nullable(Type.String({ description: "The profile's display name." })),
    avatarUrl: Type.String({ format: "uri" }),
  },
  { description: "A GitHub account as the lookup found it, with the login in its own casing." },
);
export type GithubProfile = Static<typeof GithubProfile>;

export const GithubLookup = Type.Object(dataOf(GithubProfile).properties, {
  examples: [githubLookup],
});
export type GithubLookup = Static<typeof GithubLookup>;
