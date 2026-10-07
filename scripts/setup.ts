import { SQL } from "bun";

import { defaultOrigins, envBlock } from "@spoar/engine";
import { drizzleProjectAdmin, organizationId } from "@spoar/engine/adapters/access";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { drizzle } from "drizzle-orm/bun-sql";

import { createClient, printReport } from "./migrate";

type Options = {
  owner: string;
  project: { id: string; name: string; domain: string } | null;
};

type Parsed = { ok: true; value: Options } | { ok: false; error: string };

type Keys = { publicKey: string; secretKey: string };

const usage =
  "Usage: DATABASE_URL=postgres://... [API_URL=https://...] bun run setup --owner <github-login> [--project <id> --domain <domain> [--name <name>]]";

// A GitHub login: letters, digits and single hyphens, not at either end.
const loginPattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
// The project id pattern of `CreateProject` in @spoar/contract.
const projectPattern = /^[a-z0-9][a-z0-9.-]{0,63}$/;

function valueOf(argv: string[], flag: string) {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
}

/**
 * @name parseArguments
 * @description Reads the owner's GitHub login and the optional first project from the command
 * line. `--domain` is required with `--project`, and `--name` defaults to the domain.
 *
 * @example
 * parseArguments(["--owner", "remcostoeten", "--project", "blog", "--domain", "blog.nl"]);
 */
export function parseArguments(argv: string[]): Parsed {
  const owner = valueOf(argv, "--owner");
  if (!owner || !loginPattern.test(owner)) {
    return { ok: false, error: `--owner needs a GitHub login.\n${usage}` };
  }
  const id = valueOf(argv, "--project");
  if (id === undefined) return { ok: true, value: { owner, project: null } };
  if (!projectPattern.test(id)) {
    return { ok: false, error: "--project needs lowercase letters, digits, dots or hyphens." };
  }
  const domain = valueOf(argv, "--domain");
  if (!domain) return { ok: false, error: `--project needs --domain.\n${usage}` };
  return {
    ok: true,
    value: { owner, project: { id, name: valueOf(argv, "--name") ?? domain, domain } },
  };
}

function randomKey(prefix: string, bytes: number) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return prefix + Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

/**
 * @name allowOwner
 * @description Adds the GitHub login to the `dashboard_users` allowlist, so its first sign-in
 * creates the organization with that login as owner. Answers false when it was already there.
 *
 * @example
 * await allowOwner(sql, "remcostoeten");
 */
export async function allowOwner(sql: SQL, login: string): Promise<boolean> {
  const rows: { github_login: string }[] = await sql`
    INSERT INTO dashboard_users (github_login) VALUES (${login})
    ON CONFLICT (github_login) DO NOTHING
    RETURNING github_login`;
  return rows.length > 0;
}

/**
 * @name createFirstProject
 * @description Creates a public project with a new public key and secret key, storing only the
 * secret's sha256 hash, allowing `https://<domain>` and `https://www.<domain>` to send events.
 * Without an organization yet, the owner's first sign-in claims it. Answers null when the id is
 * taken.
 *
 * @example
 * const keys = await createFirstProject(sql, { id: "blog", name: "Blog", domain: "blog.nl" });
 */
export async function createFirstProject(
  sql: SQL,
  project: { id: string; name: string; domain: string },
): Promise<Keys | null> {
  const organizations: { id: string }[] =
    await sql`SELECT id FROM auth_organization WHERE id = ${organizationId}`;
  const secretKey = randomKey("sk_live_", 16);
  const publicKey = randomKey("pk_live_", 8);
  const created = await drizzleProjectAdmin(drizzle({ client: sql })).create({
    ...project,
    visibility: "public",
    publicVisitorData: false,
    allowedOrigins: defaultOrigins(project.domain),
    retentionDays: 90,
    publicKey,
    secretKeyHash: await webCryptoHasher().sha256(secretKey),
    orgId: organizations.length > 0 ? organizationId : null,
  });
  if (!created.ok) throw new Error(created.error.message);
  return created.value ? { publicKey, secretKey } : null;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`DATABASE_URL is not set.\n${usage}`);
    process.exitCode = 1;
    return;
  }
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exitCode = 1;
    return;
  }
  const { owner, project } = parsed.value;
  const apiUrl = process.env.API_URL ?? "https://api.analytics.remcostoeten.nl";
  // Unnamed statements, so pooled connections such as Neon's pooler do not collide on names.
  const sql = new SQL(url, { prepare: false });
  try {
    const report = await runMigrations(createClient(sql), readMigrations(migrationsDirectory), {
      dryRun: false,
      baseline: null,
    });
    if (!report.ok) {
      console.error(`${report.error.name}: ${report.error.message}`);
      process.exitCode = 1;
      return;
    }
    printReport(report.value);
    const added = await allowOwner(sql, owner);
    console.log(added ? `Allowed ${owner} to sign in` : `${owner} was already allowed`);
    if (project) {
      const keys = await createFirstProject(sql, project);
      if (keys) {
        console.log(
          `Created project ${project.id}, accepting events from ${defaultOrigins(project.domain).join(" and ")}`,
        );
        console.log(`Public key: ${keys.publicKey}`);
        console.log(`Secret key: ${keys.secretKey} (shown once)`);
        console.log("");
        console.log(
          envBlock({
            project: project.id,
            publicKey: keys.publicKey,
            secretKey: keys.secretKey,
            endpoint: apiUrl,
          }),
        );
        console.log("");
      } else {
        console.log(`Project ${project.id} already exists; its keys are unchanged`);
      }
    }
    console.log(`Next: sign in as ${owner} through the API to become the owner.`);
  } finally {
    await sql.close();
  }
}

if (import.meta.main) await main();
