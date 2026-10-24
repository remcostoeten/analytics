import { ok } from "@spoar/shared/result";
import { asc, eq, inArray, isNull, max, sql } from "drizzle-orm";

import {
  apiTokens,
  authMember,
  authOrganization,
  authSession,
  authUser,
  dashboardUsers,
  deletedProjects,
  projects,
} from "../db/schema";
import type {
  AlertStore,
  AnnotationStore,
  Membership,
  MemberRecord,
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
  LogStore,
  TokenRecord,
  TokenStore,
  WidgetStore,
} from "../ports";
import { queryRunner } from "../query/runner";
import type { Transact } from "../query/runner";
import type { Database } from "./drizzle";
import { webCryptoHasher } from "./system";

export type { Database } from "./drizzle";
import { unavailable } from "./drizzle";
import { drizzleAlerts } from "./drizzle-alerts";
import { drizzleAnnotations } from "./drizzle-annotations";
import { drizzleDetails } from "./drizzle-details";
import { drizzleFeed } from "./drizzle-feed";
import { drizzleIssues } from "./drizzle-issues";
import { drizzleLogs } from "./drizzle-logs";
import { drizzleOps } from "./drizzle-ops";
import { drizzleSpeed } from "./drizzle-speed";
import { drizzleQueryLog, drizzleSavedQueries, readQuerySecret } from "./drizzle-queries";
import { drizzleReads } from "./drizzle-reads";
import { drizzleWidget } from "./drizzle-widget";

export const organizationId = "org_main";

const projectColumns = {
  id: projects.id,
  name: projects.name,
  domain: projects.domain,
  visibility: projects.visibility,
  publicVisitorData: projects.publicVisitorData,
  sqlEnabled: projects.sqlEnabled,
  widgetReports: projects.widgetReports,
  debugConsole: projects.debugConsole,
  allowedOrigins: projects.allowedOrigins,
  retentionDays: projects.retentionDays,
  publicKey: projects.publicKey,
  publicKeyUsedAt: projects.publicKeyUsedAt,
  publicKeyUsedOrigin: projects.publicKeyUsedOrigin,
  secretKeyUsedAt: projects.secretKeyUsedAt,
  secretKeyUsedOrigin: projects.secretKeyUsedOrigin,
  orgId: projects.orgId,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

const tokenColumns = {
  id: apiTokens.id,
  kind: apiTokens.kind,
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
 * @description The `ProjectAdmin` store on `projects`: find, list by visibility, create, patch,
 * key rotation and removal. Creating an existing id returns null, as does an id whose rows the
 * cleanup job is still purging, and so does changing a project that does not exist. Rotation
 * stores the public key as is and the secret key's hash, and clears that key's last use. Removal deletes the project row, so its
 * keys and routes stop at once, and records the id in `deleted_projects` for the cleanup job to
 * purge its rows in batches.
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
        const purging = await db
          .select({ id: deletedProjects.id })
          .from(deletedProjects)
          .where(eq(deletedProjects.id, project.id));
        if (purging.length > 0) return null;
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
        const keys =
          kind === "public"
            ? { publicKey: value, publicKeyUsedAt: null, publicKeyUsedOrigin: null }
            : { secretKeyHash: value, secretKeyUsedAt: null, secretKeyUsedOrigin: null };
        const [row] = await db
          .update(projects)
          .set({ ...keys, updatedAt: rotatedAt })
          .where(eq(projects.id, id))
          .returning({ updatedAt: projects.updatedAt });
        return row ? row.updatedAt : null;
      }),
    remove: (id) =>
      attempt("Could not delete the project", async () => {
        const rows = await db
          .delete(projects)
          .where(eq(projects.id, id))
          .returning({ id: projects.id });
        if (rows.length === 0) return false;
        await db.insert(deletedProjects).values({ id }).onConflictDoNothing();
        return true;
      }),
  };
}

/**
 * @name drizzleTokens
 * @description The `TokenStore` on `api_tokens`. Tokens are looked up by their sha256 hash, never
 * read back in full, listed per kind (`api` or the short-lived `widget` tokens), and revoking
 * deletes the row.
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
    list: (kind) =>
      attempt("Could not list tokens", async (): Promise<TokenRecord[]> =>
        db
          .select(tokenColumns)
          .from(apiTokens)
          .where(eq(apiTokens.kind, kind))
          .orderBy(apiTokens.createdAt),
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
 * @description The `MemberStore`: the `dashboard_users` sign-in allowlist, GitHub logins with the
 * role and projects granted to each, and membership of the single organization. An entry with a
 * GitHub id only admits that id, so a renamed account's old login cannot be claimed by someone
 * else; an entry without one takes the id of the first sign-in. The first user to join creates the
 * organization as its owner and claims the projects without one; later users join with the role
 * and projects of their entry. Changing an entry also changes the member it belongs to, and
 * removing one deletes the account and its sessions.
 *
 * @example
 * const members = drizzleMembers(db);
 * const membership = await members.join(user.id, "remcostoeten", "1234");
 */
export function drizzleMembers(db: Database): MemberStore {
  async function membership(userId: string): Promise<Membership | null> {
    const [row] = await db
      .select(memberColumns)
      .from(authMember)
      .where(eq(authMember.userId, userId));
    return row ?? null;
  }

  const entryColumns = {
    login: dashboardUsers.githubLogin,
    githubId: dashboardUsers.githubId,
    role: dashboardUsers.role,
    projectIds: dashboardUsers.projectIds,
    addedAt: dashboardUsers.addedAt,
    memberRole: authMember.role,
    memberProjectIds: authMember.projectIds,
    memberId: authMember.id,
    userId: authUser.id,
  };

  function entries() {
    return db
      .select(entryColumns)
      .from(dashboardUsers)
      .leftJoin(
        authUser,
        sql`lower(${authUser.githubLogin}) = lower(${dashboardUsers.githubLogin})`,
      )
      .leftJoin(authMember, eq(authMember.userId, authUser.id));
  }

  type EntryRow = Awaited<ReturnType<typeof entries>>[number];

  async function records(rows: EntryRow[]): Promise<MemberRecord[]> {
    const userIds = rows.flatMap((row) => (row.userId === null ? [] : [row.userId]));
    const sessions =
      userIds.length === 0
        ? []
        : await db
            .select({ userId: authSession.userId, last: max(authSession.createdAt) })
            .from(authSession)
            .where(inArray(authSession.userId, userIds))
            .groupBy(authSession.userId);
    const lastSignIn = new Map(sessions.map((row) => [row.userId, row.last]));
    return rows.map((row) => {
      const joined = row.memberId !== null;
      return {
        login: row.login,
        githubId: row.githubId,
        role: joined ? (row.memberRole ?? row.role) : row.role,
        projectIds: joined ? row.memberProjectIds : row.projectIds,
        joined,
        addedAt: row.addedAt,
        lastSignInAt: (row.userId === null ? null : lastSignIn.get(row.userId)) ?? null,
      };
    });
  }

  function byLogin(login: string) {
    return sql`lower(${dashboardUsers.githubLogin}) = ${login.toLowerCase()}`;
  }

  async function entryOf(login: string) {
    const rows = await entries().where(byLogin(login));
    const [found] = await records(rows);
    return found ?? null;
  }

  return {
    allowedLogin: (login, githubId) =>
      attempt("Could not read the allowlist", async () => {
        const [row] = await db
          .select({ githubId: dashboardUsers.githubId })
          .from(dashboardUsers)
          .where(byLogin(login));
        if (!row) return false;
        return row.githubId === null || githubId === null || row.githubId === githubId;
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
    join: (userId, login, githubId) =>
      attempt("Could not add the member", async () => {
        const existing = await membership(userId);
        if (existing) return existing;
        const [grant] = await db
          .select({ role: dashboardUsers.role, projectIds: dashboardUsers.projectIds })
          .from(dashboardUsers)
          .where(byLogin(login));
        const created = await db
          .insert(authOrganization)
          .values({ id: organizationId, name: login, slug: "main" })
          .onConflictDoNothing()
          .returning({ id: authOrganization.id });
        const owner = created.length > 0;
        await db
          .insert(authMember)
          .values({
            id: `mem_${crypto.randomUUID()}`,
            organizationId,
            userId,
            role: owner ? "owner" : (grant?.role ?? "viewer"),
            projectIds: owner ? null : (grant?.projectIds ?? []),
          })
          .onConflictDoNothing();
        if (githubId !== null) {
          await db
            .update(dashboardUsers)
            .set({ githubId })
            .where(sql`${byLogin(login)} AND ${dashboardUsers.githubId} IS NULL`);
        }
        if (owner) {
          await db.update(projects).set({ orgId: organizationId }).where(isNull(projects.orgId));
        }
        const joined = await membership(userId);
        if (!joined) throw new Error("The membership was not stored");
        return joined;
      }),
    list: () =>
      attempt("Could not list the members", async () => {
        return records(await entries().orderBy(asc(dashboardUsers.addedAt)));
      }),
    find: (login) => attempt("Could not read the member", () => entryOf(login)),
    allow: (member) =>
      attempt("Could not allow the member", async () => {
        const added = await db
          .insert(dashboardUsers)
          .values({
            githubLogin: member.login,
            githubId: member.githubId,
            role: member.role,
            projectIds: member.projectIds,
          })
          .onConflictDoNothing()
          .returning({ login: dashboardUsers.githubLogin });
        return added.length > 0;
      }),
    change: (login, patch) =>
      attempt("Could not change the member", async () => {
        const current = await entryOf(login);
        if (!current) return null;
        const changes = {
          ...(patch.role === undefined ? {} : { role: patch.role }),
          ...(patch.projectIds === undefined ? {} : { projectIds: patch.projectIds }),
        };
        if (Object.keys(changes).length === 0) return current;
        await db.update(dashboardUsers).set(changes).where(byLogin(login));
        await db
          .update(authMember)
          .set(changes)
          .where(
            sql`${authMember.userId} IN (SELECT ${authUser.id} FROM ${authUser} WHERE lower(${authUser.githubLogin}) = ${login.toLowerCase()})`,
          );
        return entryOf(login);
      }),
    remove: (login) =>
      attempt("Could not remove the member", async () => {
        const removed = await db
          .delete(dashboardUsers)
          .where(byLogin(login))
          .returning({ login: dashboardUsers.githubLogin });
        await db
          .delete(authUser)
          .where(sql`lower(${authUser.githubLogin}) = ${login.toLowerCase()}`);
        return removed.length > 0;
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
  annotations: AnnotationStore;
  speed: SpeedStore;
  issues: IssueStore;
  ops: OpsStore;
  alerts: AlertStore;
  logs: LogStore;
  widget: WidgetStore;
};

/**
 * @name accessOn
 * @description The project, token, member and read stores, the live feed, the log lines, the
 * widget reads and the SQL console on one Drizzle database, with the database for Better Auth's adapter. Console queries run through
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
    annotations: drizzleAnnotations(db),
    speed: drizzleSpeed(db),
    issues: drizzleIssues(db),
    ops: drizzleOps(db),
    alerts: drizzleAlerts(db),
    logs: drizzleLogs(db, { pollMs: 2000 }),
    widget: drizzleWidget(db),
  };
}
