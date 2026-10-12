import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

export type Target = {
  project: string;
  label: string;
  paths: string[];
};

export type DeployState =
  | "QUEUED"
  | "INITIALIZING"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED"
  | "BLOCKED"
  | "DELETED";

export type Deployment = {
  id: string;
  url: string;
  state: DeployState;
  sha: string | null;
  created: number;
  inspector: string | null;
};

export type Row = {
  target: Target;
  live: Deployment | null;
  latest: Deployment | null;
  behind: number | null;
  touched: number | null;
};

type Raw = {
  id?: string;
  uid?: string;
  url?: string;
  state?: DeployState;
  readyState?: DeployState;
  created?: number;
  createdAt?: number;
  inspectorUrl?: string | null;
  meta?: { githubCommitSha?: string };
};

const root = join(import.meta.dir, "..");
const api = process.env.VERCEL_API ?? "https://api.vercel.com";
const owner = "remcostoeten";
const repo = "analytics";
const branch = "master";
const shared = ["packages", "bun.lock", "package.json"];
const finished: DeployState[] = ["READY", "ERROR", "CANCELED", "BLOCKED", "DELETED"];

export const targets: Target[] = [
  { project: "v2.dashboard", label: "dashboard", paths: ["apps/dashboard", ...shared] },
  {
    project: "v2.analytics-docs",
    label: "docs",
    paths: ["apps/docs", "apps/api/openapi.json", ...shared],
  },
  { project: "v2.ingestion", label: "api", paths: ["apps/api", ...shared] },
];

/**
 * @name parseSelection
 * @description Turns an answer such as `1,3`, `dashboard docs`, `all` or an empty line into the targets to deploy; an empty line picks the ones behind master.
 * @example parseSelection("1 docs", rows)
 */
export function parseSelection(answer: string, rows: Row[]): Target[] | null {
  const words = answer
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (words.length === 0) return rows.filter(isBehind).map((row) => row.target);
  if (words.includes("all") || words.includes("a")) return rows.map((row) => row.target);
  const picked: Target[] = [];
  for (const word of words) {
    const index = Number(word);
    const row = Number.isInteger(index)
      ? rows[index - 1]
      : rows.find((item) => item.target.label === word || item.target.project === word);
    if (!row) return null;
    if (!picked.includes(row.target)) picked.push(row.target);
  }
  return picked;
}

/**
 * @name isBehind
 * @description Tells whether a project's live production deployment is missing commits from master, or has no known live deployment at all.
 * @example isBehind({ target, live, latest: live, behind: 2, touched: 1 })
 */
export function isBehind(row: Row): boolean {
  if (!row.live) return true;
  if (row.behind === null) return true;
  return row.behind > 0;
}

/**
 * @name formatAge
 * @description Formats the time since a timestamp as a short age such as `45s`, `12m`, `3h` or `2d`.
 * @example formatAge(Date.now() - 90_000)
 */
export function formatAge(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * @name toDeployment
 * @description Normalizes a deployment from any Vercel endpoint (`/v6/deployments`, `/v13/deployments/:id` or a project's `targets.production`) into one shape.
 * @example toDeployment({ uid: "dpl_1", url: "a.vercel.app", state: "READY", created: 1, meta: { githubCommitSha: "abc" } })
 */
export function toDeployment(raw: Raw | null | undefined): Deployment | null {
  const id = raw?.id ?? raw?.uid;
  if (!raw || !id) return null;
  return {
    id,
    url: raw.url ?? "",
    state: raw.readyState ?? raw.state ?? "QUEUED",
    sha: raw.meta?.githubCommitSha ?? null,
    created: raw.createdAt ?? raw.created ?? 0,
    inspector: raw.inspectorUrl ?? null,
  };
}

function style(code: number, text: string): string {
  return process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function dim(text: string): string {
  return style(2, text);
}

function paint(state: DeployState, width = 0): string {
  const text = state.padEnd(width);
  if (state === "READY") return style(32, text);
  if (state === "ERROR" || state === "BLOCKED") return style(31, text);
  if (state === "CANCELED" || state === "DELETED") return dim(text);
  return style(33, text);
}

function short(sha: string | null): string {
  return sha ? sha.slice(0, 7) : "-------";
}

function git(args: string[]): string | null {
  const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0 ? result.stdout.toString().trim() : null;
}

function readToken(): string | null {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const files = [
    join(homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
    join(homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json"),
    join(process.env.APPDATA ?? "", "com.vercel.cli", "auth.json"),
  ];
  for (const file of files) {
    if (!existsSync(file)) continue;
    try {
      const token = (JSON.parse(readFileSync(file, "utf8")) as { token?: string }).token;
      if (token) return token;
    } catch {
      continue;
    }
  }
  return null;
}

function createClient(token: string, team: string) {
  return async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${api}${path}${separator}slug=${team}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        `${method} ${path} failed with ${response.status}: ${data.error?.message ?? "no message"}`,
      );
    }
    return data;
  };
}

type Call = ReturnType<typeof createClient>;

function countCommits(sha: string | null, head: string, paths: string[]): number | null {
  if (!sha) return null;
  if (git(["cat-file", "-e", `${sha}^{commit}`]) === null) return null;
  const count = git(["rev-list", "--count", `${sha}..${head}`, "--", ...paths]);
  return count === null ? null : Number(count);
}

async function resolveLive(
  call: Call,
  target: Target,
  production: Raw | undefined,
): Promise<Deployment | null> {
  const live = toDeployment(production);
  if (live?.sha) return live;
  if (live) return toDeployment(await call<Raw>("GET", `/v13/deployments/${live.id}`)) ?? live;
  const ready = await call<{ deployments: Raw[] }>(
    "GET",
    `/v6/deployments?projectId=${target.project}&target=production&state=READY&limit=1`,
  );
  return toDeployment(ready.deployments[0]);
}

async function inspect(call: Call, target: Target, head: string): Promise<Row> {
  const [project, list] = await Promise.all([
    call<{ targets?: { production?: Raw } }>("GET", `/v9/projects/${target.project}`),
    call<{ deployments: Raw[] }>(
      "GET",
      `/v6/deployments?projectId=${target.project}&target=production&limit=1`,
    ),
  ]);
  const live = await resolveLive(call, target, project.targets?.production);
  const latest = toDeployment(list.deployments[0]) ?? live;
  const sha = live?.sha ?? null;
  const all = countCommits(sha, head, ["."]);
  const touched = countCommits(sha, head, target.paths);
  return { target, live, latest, behind: all, touched };
}

function describe(row: Row, head: string): string {
  if (!row.live) return style(31, "no production deployment");
  if (row.live.sha === head) return style(32, "up to date");
  if (row.behind === null) return style(33, "commit not in local history, run git fetch");
  if (row.behind === 0) return style(32, "up to date");
  const touched =
    row.touched === 0 ? dim("no changes in its paths") : `${row.touched} in its paths`;
  return `${style(33, `${row.behind} commits behind`)}, ${touched}`;
}

function printRows(rows: Row[], head: string): void {
  console.log("");
  rows.forEach((row, index) => {
    const live = row.live;
    const name = `${index + 1}. ${row.target.label.padEnd(10)}${dim(row.target.project.padEnd(19))}`;
    const state = live
      ? `${paint(live.state, 9)} ${short(live.sha)} ${dim(`${formatAge(live.created)} ago`.padEnd(9))}`
      : " ".repeat(27);
    console.log(`${name}${state} ${describe(row, head)}`);
    const latest = row.latest;
    if (latest && live && latest.id !== live.id) {
      console.log(
        `   ${dim("latest attempt:")} ${paint(latest.state)} ${short(latest.sha)} ${dim(formatAge(latest.created) + " ago")}`,
      );
    }
  });
  console.log("");
}

async function follow(call: Call, target: Target, id: string): Promise<DeployState> {
  let last: DeployState | null = null;
  const started = Date.now();
  while (true) {
    const raw = await call<Raw>("GET", `/v13/deployments/${id}`);
    const deployment = toDeployment(raw);
    const state = deployment?.state ?? "QUEUED";
    if (state !== last) {
      console.log(`${target.label.padEnd(10)} ${paint(state)} ${dim(formatAge(started))}`);
      last = state;
    }
    if (finished.includes(state)) {
      if (deployment?.url)
        console.log(`${target.label.padEnd(10)} ${dim(`https://${deployment.url}`)}`);
      if (state !== "READY" && deployment?.inspector)
        console.log(`${target.label.padEnd(10)} ${deployment.inspector}`);
      return state;
    }
    await Bun.sleep(5000);
  }
}

async function deploy(call: Call, target: Target, sha: string): Promise<DeployState> {
  const created = await call<Raw>("POST", "/v13/deployments", {
    name: target.project,
    project: target.project,
    target: "production",
    gitSource: { type: "github", org: owner, repo, ref: branch, sha },
  });
  const id = created.id ?? created.uid;
  if (!id) throw new Error(`Vercel returned no deployment id for ${target.project}`);
  console.log(`${target.label.padEnd(10)} started ${dim(created.inspectorUrl ?? id)}`);
  return follow(call, target, id);
}

async function main(): Promise<number> {
  const flags = process.argv.slice(2);
  const statusOnly = flags.includes("--status");
  const skipConfirm = flags.includes("--yes") || flags.includes("-y");
  const named = flags.filter((flag) => !flag.startsWith("-")).join(" ");

  const token = readToken();
  if (!token) {
    console.error("No Vercel token. Set VERCEL_TOKEN or run `vercel login` first.");
    return 1;
  }
  const call = createClient(token, process.env.VERCEL_TEAM ?? "remcostoetens-projects");

  if (git(["fetch", "--quiet", "origin", branch]) === null) {
    console.error(dim(`Could not fetch origin/${branch}, using the local copy.`));
  }
  const head = git(["rev-parse", `origin/${branch}`]);
  if (!head) {
    console.error(`No origin/${branch} in this checkout.`);
    return 1;
  }
  const subject = git(["log", "-1", "--format=%s", head]) ?? "";
  console.log(`${branch} is at ${style(1, short(head))} ${dim(subject)}`);

  const rows = await Promise.all(targets.map((target) => inspect(call, target, head)));
  printRows(rows, head);
  if (statusOnly) return 0;

  const picked = await choose(rows, named, head, skipConfirm);
  if (!picked) return 0;

  console.log("");
  const results = await Promise.all(
    picked.map((target) =>
      deploy(call, target, head).catch((error: unknown) => {
        console.error(`${target.label.padEnd(10)} ${style(31, String(error))}`);
        return "ERROR" as const;
      }),
    ),
  );
  console.log("");
  picked.forEach((target, index) => {
    console.log(`${target.label.padEnd(10)} ${paint(results[index] ?? "ERROR")}`);
  });
  return results.every((state) => state === "READY") ? 0 : 1;
}

async function choose(
  rows: Row[],
  named: string,
  head: string,
  skipConfirm: boolean,
): Promise<Target[] | null> {
  const prompt = createInterface({ input: process.stdin, terminal: false });
  const lines = prompt[Symbol.asyncIterator]();
  async function ask(question: string): Promise<string> {
    process.stdout.write(question);
    const line = await lines.next();
    return line.done ? "q" : String(line.value);
  }
  try {
    let picked = named ? parseSelection(named, rows) : null;
    if (named && !picked) {
      console.error(
        `Unknown project in "${named}". Use ${targets.map((target) => target.label).join(", ")}.`,
      );
      return null;
    }
    while (!picked) {
      const behind = rows.filter(isBehind).map((row) => row.target.label);
      const hint = behind.length ? `enter for ${behind.join(", ")}` : "enter for none";
      const answer = await ask(`Deploy which? numbers or names, all, ${hint}, q to quit: `);
      if (answer.trim().toLowerCase() === "q") return null;
      picked = parseSelection(answer, rows);
      if (!picked) console.log("Unknown choice.");
    }
    if (picked.length === 0) {
      console.log("Nothing to deploy.");
      return null;
    }
    if (skipConfirm) return picked;
    const names = picked.map((target) => target.label).join(", ");
    const answer = await ask(`Deploy ${names} to production from ${branch} ${short(head)}? [y/N] `);
    if (answer.trim().toLowerCase() === "y") return picked;
    console.log("Cancelled.");
    return null;
  } finally {
    prompt.close();
  }
}

if (import.meta.main) {
  const code = await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  });
  process.exit(code);
}
