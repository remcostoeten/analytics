import type {
  Hasher,
  MemberStore,
  ProjectAdmin,
  Role,
  TokenKind,
  TokenScope,
  TokenStore,
} from "@remcostoeten/analytics-engine";
import type { Nullable, ProjectID, TokenID, UserID } from "@remcostoeten/analytics-shared/semantic";

export type SignedIn = {
  userId: UserID;
  name: string;
  login: Nullable<string>;
  image: Nullable<string>;
  expiresAt: Date;
};

export type SessionReader = (headers: Headers) => Promise<Nullable<SignedIn>>;

export type Caller =
  | { kind: "anonymous" }
  | { kind: "cron" }
  | { kind: "user"; signedIn: SignedIn; role: Role; projectIds: Nullable<ProjectID[]> }
  | {
      kind: "token";
      tokenId: TokenID;
      tokenKind: TokenKind;
      scope: TokenScope;
      projectIds: Nullable<ProjectID[]>;
    };

export type Level = "public" | "project" | "detail" | "admin" | "cron";

export type AccessDeps = {
  projects: ProjectAdmin;
  tokens: TokenStore;
  members: MemberStore;
  sessions: SessionReader;
  hasher: Hasher;
  clock: () => Date;
  cronSecret: Nullable<string>;
};
