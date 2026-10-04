import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID, TokenID, UserID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";

export type Visibility = "public" | "private";
export type Role = "owner" | "admin" | "analyst" | "viewer";
export type TokenScope = "read" | "sql" | "admin";
export type KeyKind = "public" | "secret";
export type TokenKind = "api" | "widget";

export type ProjectRecord = {
  id: ProjectID;
  name: string;
  domain: string;
  visibility: Visibility;
  publicVisitorData: boolean;
  sqlEnabled: boolean;
  widgetReports: boolean;
  allowedOrigins: string[];
  retentionDays: number;
  publicKey: string;
  orgId: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
};

export type NewProject = {
  id: ProjectID;
  name: string;
  domain: string;
  visibility: Visibility;
  publicVisitorData: boolean;
  allowedOrigins: string[];
  retentionDays: number;
  publicKey: string;
  secretKeyHash: string;
  orgId: Nullable<string>;
};

export type ProjectPatch = Partial<
  Pick<
    ProjectRecord,
    | "name"
    | "visibility"
    | "publicVisitorData"
    | "sqlEnabled"
    | "widgetReports"
    | "allowedOrigins"
    | "retentionDays"
  >
>;

export type Membership = {
  userId: UserID;
  orgId: string;
  role: Role;
  projectIds: Nullable<ProjectID[]>;
};

export type TokenRecord = {
  id: TokenID;
  kind: TokenKind;
  name: string;
  scope: TokenScope;
  projectIds: Nullable<ProjectID[]>;
  lastUsedAt: Nullable<Date>;
  expiresAt: Nullable<Date>;
  createdAt: Date;
};

export type NewToken = Omit<TokenRecord, "lastUsedAt" | "createdAt"> & { tokenHash: string };

type Stored<Value> = Promise<Result<Value, EngineError>>;

export type ProjectAdmin = {
  find: (id: ProjectID) => Stored<Nullable<ProjectRecord>>;
  list: (visibility: Nullable<Visibility>) => Stored<ProjectRecord[]>;
  create: (project: NewProject) => Stored<Nullable<ProjectRecord>>;
  update: (id: ProjectID, patch: ProjectPatch) => Stored<Nullable<ProjectRecord>>;
  rotate: (id: ProjectID, kind: KeyKind, value: string) => Stored<Nullable<Date>>;
};

export type TokenStore = {
  byHash: (hash: string) => Stored<Nullable<TokenRecord>>;
  list: (kind: TokenKind) => Stored<TokenRecord[]>;
  create: (token: NewToken) => Stored<TokenRecord>;
  revoke: (id: TokenID) => Stored<boolean>;
  touch: (id: TokenID, at: Date) => Stored<void>;
};

export type MemberStore = {
  allowedLogin: (login: string) => Stored<boolean>;
  loginOf: (userId: UserID) => Stored<Nullable<string>>;
  membership: (userId: UserID) => Stored<Nullable<Membership>>;
  join: (userId: UserID, name: string) => Stored<Membership>;
};
