import type { Result } from "@remcostoeten/analytics-shared/result";
import type {
  InviteID,
  Nullable,
  ProjectID,
  UserID,
} from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import type { AssignableRole, Membership } from "./access";

type Reply<Value> = Promise<Result<Value, EngineError>>;

export type InviteRecord = {
  id: InviteID;
  role: AssignableRole;
  projectIds: Nullable<ProjectID[]>;
  email: Nullable<string>;
  acceptedBy: Nullable<UserID>;
  acceptedAt: Nullable<Date>;
  expiresAt: Date;
  createdAt: Date;
};

export type NewInvite = Pick<InviteRecord, "id" | "role" | "projectIds" | "expiresAt"> & {
  tokenHash: string;
};

export type InviteStore = {
  list: () => Reply<InviteRecord[]>;
  create: (invite: NewInvite) => Reply<InviteRecord>;
  revoke: (id: InviteID) => Reply<boolean>;
  open: (hash: string, at: Date) => Reply<Nullable<InviteRecord>>;
  claim: (hash: string, email: string, at: Date) => Reply<Nullable<InviteRecord>>;
  release: (id: InviteID) => Reply<void>;
  claimed: (email: string, at: Date) => Reply<Nullable<InviteRecord>>;
  admit: (id: InviteID, userId: UserID, at: Date) => Reply<Membership>;
};
