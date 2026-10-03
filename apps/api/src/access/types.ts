import type {
  EngineError,
  Hasher,
  InviteStore,
  MemberStore,
  ProjectAdmin,
  Role,
  TokenScope,
  TokenStore,
} from "@remcostoeten/analytics-engine";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID, TokenID, UserID } from "@remcostoeten/analytics-shared/semantic";

export type SignedIn = {
  userId: UserID;
  name: string;
  login: Nullable<string>;
  image: Nullable<string>;
  expiresAt: Date;
};

export type SessionReader = (headers: Headers) => Promise<Nullable<SignedIn>>;

type Registration = { name: string; email: string; password: string };

type Registered = {
  user: { id: UserID; name: string; email: string };
  cookies: string[];
};

export type Register = (
  input: Registration,
  headers: Headers,
) => Promise<Result<Registered, EngineError>>;

export type Caller =
  | { kind: "anonymous" }
  | { kind: "cron" }
  | { kind: "user"; signedIn: SignedIn; role: Role; projectIds: Nullable<ProjectID[]> }
  | { kind: "token"; tokenId: TokenID; scope: TokenScope; projectIds: Nullable<ProjectID[]> };

export type Level = "public" | "project" | "detail" | "admin" | "cron";

export type AccessDeps = {
  projects: ProjectAdmin;
  tokens: TokenStore;
  members: MemberStore;
  invites: InviteStore;
  sessions: SessionReader;
  hasher: Hasher;
  clock: () => Date;
  cronSecret: Nullable<string>;
};
