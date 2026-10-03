export type ID = string;
export type Timestamp = string;
export type Day = string;
export type Milliseconds = number;
export type Nullable<Value> = Value | null;

export type Timestamps<Deleted extends boolean = false> = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
} & (Deleted extends true ? { deletedAt: Nullable<Timestamp> } : {});

export type Entity<Deleted extends boolean = false> = { id: ID } & Timestamps<Deleted>;

export type CreateInput<Value extends Entity> = Omit<Value, "id" | "createdAt" | "updatedAt">;
export type UpdateInput<Value extends Entity> = Partial<CreateInput<Value>> & { id: ID };

export type ProjectID = ID;
export type VisitorID = ID;
export type SessionID = ID;
export type EventID = ID;
export type IssueID = ID;
export type TokenID = ID;
export type InviteID = ID;
export type UserID = ID;

export type CountryCode = string;
export type Path = string;
export type Route = string;
export type Selector = string;
