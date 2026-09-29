import { ok } from "@remcostoeten/analytics-shared/result";
import { eq, isNull, sql } from "drizzle-orm";

import {
  apiTokens,
  authMember,
  authOrganization,
  authUser,
  dashboardUsers,
  projects,
} from "../db/schema";
import type {
  AlertStore,
  Membership,
  MemberStore,
  ProjectAdmin,
  ProjectRecord,
  QueryLog,
  QueryRunner,
  ReadStore,
  SavedQueryStore,
  SpeedStore,
  IssueStore,
  OpsStore,
  RealtimeFeed,
  DetailStore,
  TokenRecord,
  TokenStore,
} from "../ports";
import { queryRunner } from "../query/runner";
import type { Transact } from "../query/runner";
import type { Database } from "./drizzle";
import { webCryptoHasher } from "./system";

export type { Database } from "./drizzle";
import { unavailable } from "./drizzle";
import { drizzleAlerts } from "./drizzle-alerts";
import { drizzleDetails } from "./drizzle-details";
import { drizzleFeed } from "./drizzle-feed";
import { drizzleIssues } from "./drizzle-issues";
import { drizzleOps } from "./drizzle-ops";
import { drizzleSpeed } from "./drizzle-speed";
import { drizzleQueryLog, drizzleSavedQueries, readQuerySecret } from "./drizzle-queries";
import { drizzleReads } from "./drizzle-reads";

export const organizationId = "org_main";

const projectColumns = {
  id: projects.id,
  name: projects.name,
  domain: projects.domain,
  visibility: projects.visibility,
  publicVisitorData: projects.publicVisitorData,
  sqlEnabled: projects.sqlEnabled,
  allowedOrigins: projects.allowedOrigins,
  retentionDays: projects.retentionDays,
  publicKey: projects.publicKey,
  orgId: projects.orgId,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

const tokenColumns = {
  id: apiTokens.id,
  name: apiTokens.name,
  scope: apiTokens.scope,
  projectIds: apiTokens.projectIds,
  lastUsedAt: apiTokens.lastUsedAt,
  expiresAt: apiTokens.expiresAt,
  createdAt: apiTokens.createdAt,
};

const memberColumns = {
  userId: authMember.userId,
  orgId: authMember.organizationId,
  role: authMember.role,
  projectIds: authMember.projectIds,
};

async function attempt<Value>(message: string, run: () => Promise<Value>) {
  try {
    return ok(await run());
  } catch (error) {
    return unavailable(message, error);
  }
}

/**
 * @name drizzleProjectAdmin
 * @description The `ProjectAdmin` store on `projects`: find, list by visibility, create, patch and
 * key rotation. Creating an existing id returns null, as does changing a project that does not
 * exist. Rotation stores the public key as is and the secret key's hash.
 *
 * @example
 * const admin = drizzleProjectAdmin(db);
 * const project = await admin.find("remcostoeten.nl");
 */
export function drizzleProjectAdmin(db: Database): ProjectAdmin {
  return {
    find: (id) =>
      attempt("Could not read the project", async () => {
        const [row] = await db.select(projectColumns).from(projects).where(eq(projects.id, id));
        return row ?? null;
      }),
    list: (visibility) =>
      attempt("Could not list projects", async (): Promise<ProjectRecord[]> => {
        const query = db.select(projectColumns).from(projects);
        return visibility
          ? query.where(eq(projects.visibility, visibility)).orderBy(projects.id)
          : query.orderBy(projects.id);
      }),
    create: (project) =>
      attempt("Could not create the project", async () => {
        const [row] = await db
          .insert(projects)
          .values(project)
          .onConflictDoNothing({ target: projects.id })
          .returning(projectColumns);
        return row ?? null;
      }),
    update: (id, patch) =>
      attempt("Could not update the project", async () => {
        const [row] = await db
          .update(projects)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(projects.id, id))
          .returning(projectColumns);
        return row ?? null;
      }),
    rotate: (id, kind, value) =>
      attempt("Could not rotate the key", async () => {
        const rotatedAt = new Date();
        const keys = kind === "public" ? { publicKey: value } : { secretKeyHash: value };
        const [row] = await db
          .update(projects)
          .set({ ...keys, updatedAt: rotatedAt })
          .where(eq(projects.id, id))
          .returning({ updatedAt: projects.updatedAt });
        return row ? row.updatedAt : null;
      }),
  };
}

/**
 * @name drizzleTokens
 * @description The `TokenStore` on `api_tokens`. Tokens are looked up by their sha256 hash, never
 * read back in full, and revoking deletes the row.
 *
 * @example
 * const tokens = drizzleTokens(db);
 * const token = await tokens.byHash(await hasher.sha256(bearer));
 */
export function drizzleTokens(db: Database): TokenStore {
  return {
    byHash: (hash) =>
      attempt("Could not read the token", async () => {
        const [row] = await db
          .select(tokenColumns)
          .from(apiTokens)
          .where(eq(apiTokens.tokenHash, hash));
        return row ?? null;
      }),
    list: () =>
      attempt("Could not list tokens", async (): Promise<TokenRecord[]> =>
        db.select(tokenColumns).from(apiTokens).orderBy(apiTokens.createdAt),
      ),
    create: (token) =>
      attempt("Could not create the token", async () => {
        const [row] = await db.insert(apiTokens).values(token).returning(tokenColumns);
        if (!row) throw new Error("The insert returned no row");
        return row;
      }),
    revoke: (id) =>
      attempt("Could not revoke the token", async () => {
        const rows = await db
          .delete(apiTokens)
          .where(eq(apiTokens.id, id))
          .returning({ id: apiTokens.id });
        return rows.length > 0;
      }),
    touch: (id, at) =>
      attempt("Could not update the token", async () => {
        await db.update(apiTokens).set({ lastUsedAt: at }).where(eq(apiTokens.id, id));
      }),
  };
}

/**
 * @name drizzleMembers
 * @description The `MemberStore`: the `dashboard_users` sign-in allowlist, GitHub logins, and
 * membership of the single organization. The first user to join creates the organization as its
 * owner and claims the projects without one; later users join as viewers of no projects until an
 * owner lists theirs.
 *
 * @example
 * const members = drizzleMembers(db);
 * const membership = await members.join(user.id, "remcostoeten");
 */
export function drizzleMembers(db: Database): MemberStore {
  async function membership(userId: string): Promise<Membership | null> {
    const [row] = await db
      .select(memberColumns)
      .from(authMember)
      .where(eq(authMember.userId, userId));
    return row ?? null;
  }

  return {
    allowedLogin: (login) =>
      attempt("Could not read the allowlist", async () => {
        const rows = await db
          .select({ login: dashboardUsers.githubLogin })
          .from(dashboardUsers)
          .where(sql`lower(${dashboardUsers.githubLogin}) = ${login.toLowerCase()}`);
        return rows.length > 0;
      }),
    loginOf: (userId) =>
      attempt("Could not read the user", async () => {
        const [row] = await db
          .select({ login: authUser.githubLogin })
          .from(authUser)
          .where(eq(authUser.id, userId));
        return row?.login ?? null;
      }),
    membership: (userId) => attempt("Could not read the membership", () => membership(userId)),
    join: (userId, name) =>
      attempt("Could not add the member", async () => {
        const existing = await membership(userId);
        if (existing) return existing;
        const created = await db
          .insert(authOrganization)
          .values({ id: organizationId, name, slug: "main" })
          .onConflictDoNothing()
          .returning({ id: authOrganization.id });
        const owner = created.length > 0;
        await db
          .insert(authMember)
          .values({
            id: `mem_${crypto.randomUUID()}`,
            organizationId,
            userId,
            role: owner ? "owner" : "viewer",
            projectIds: owner ? null : [],
          })
          .onConflictDoNothing();
        if (owner) {
          await db.update(projects).set({ orgId: organizationId }).where(isNull(projects.orgId));
        }
        const joined = await membership(userId);
        if (!joined) throw new Error("The membership was not stored");
        return joined;
      }),
  };
}

export type Access = {
  db: Database;
  projects: ProjectAdmin;
  tokens: TokenStore;
  members: MemberStore;
  reads: ReadStore;
  details: DetailStore;
  feed: RealtimeFeed;
  queries: QueryRunner;
  queryLog: QueryLog;
  savedQueries: SavedQueryStore;
  speed: SpeedStore;
  issues: IssueStore;
  ops: OpsStore;
  alerts: AlertStore;
};

/**
 * @name accessOn
 * @description The project, token, member and read stores, the live feed and the SQL console on
 * one Drizzle database, with the database for Better Auth's adapter. Console queries run through
 * `transact`, the driver's read-only transaction, with a 10-second timeout and 10,000 rows.
 *
 * @example
 * const access = accessOn(drizzle(client), pgliteTransact(client));
 */
export function accessOn(db: Database, transact: Transact): Access {
  return {
    db,
    projects: drizzleProjectAdmin(db),
    tokens: drizzleTokens(db),
    members: drizzleMembers(db),
    reads: drizzleReads(db),
    details: drizzleDetails(db),
    feed: drizzleFeed(db, { pollMs: 2000 }),
    queries: queryRunner(transact, () => readQuerySecret(db), webCryptoHasher(), {
      timeoutMs: 10_000,
      maxRows: 10_000,
    }),
    queryLog: drizzleQueryLog(db),
    savedQueries: drizzleSavedQueries(db),
    speed: drizzleSpeed(db),
    issues: drizzleIssues(db),
    ops: drizzleOps(db),
    alerts: drizzleAlerts(db),
  };
}
