import { SQL } from "bun";

import { webCryptoHasher } from "@spoar/engine/adapters/system";

import { createFirstProject } from "./setup";

type ProjectRow = { id: string; domain: string; public_key: string; allowed_origins: string[] };

type TokenRow = { id: string; name: string; scope: string; project_ids: string[] | null };

const port = Number(process.env.ADMIN_PORT ?? 3400);
const scopes = ["read", "sql", "admin"];

function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function field(form: URLSearchParams, name: string) {
  return (form.get(name) ?? "").trim();
}

function list(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function randomSecret(prefix: string, bytes: number) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return prefix + Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function createToken(sql: SQL, name: string, scope: string, projects: string[]) {
  const token = randomSecret("at_live_", 16);
  const hash = await webCryptoHasher().sha256(token);
  const projectIds = projects.length > 0 ? sql.array(projects, "TEXT") : null;
  await sql`
    INSERT INTO api_tokens (id, name, token_hash, scope, project_ids, kind)
    VALUES (${randomSecret("tok_", 8)}, ${name}, ${hash}, ${scope}, ${projectIds}, 'api')`;
  return token;
}

async function page(sql: SQL, message: string) {
  const projects: ProjectRow[] =
    await sql`SELECT id, domain, public_key, allowed_origins FROM projects ORDER BY created_at`;
  const tokens: TokenRow[] =
    await sql`SELECT id, name, scope, project_ids FROM api_tokens WHERE kind = 'api' ORDER BY created_at`;
  const projectRows = projects
    .map(
      (project) => `<tr>
  <td>${escape(project.id)}</td><td>${escape(project.domain)}</td><td><code>${escape(project.public_key)}</code></td>
  <td><form method="post" action="/origins"><input type="hidden" name="project" value="${escape(project.id)}">
  <input name="origins" size="40" value="${escape(project.allowed_origins.join(" "))}"> <button>Save</button></form></td>
</tr>`,
    )
    .join("");
  const tokenRows = tokens
    .map(
      (token) => `<tr>
  <td>${escape(token.id)}</td><td>${escape(token.name)}</td><td>${escape(token.scope)}</td>
  <td>${escape(token.project_ids?.join(", ") ?? "all")}</td>
  <td><form method="post" action="/tokens/delete"><input type="hidden" name="id" value="${escape(token.id)}"><button>Revoke</button></form></td>
</tr>`,
    )
    .join("");
  const scopeOptions = scopes.map((scope) => `<option>${scope}</option>`).join("");
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spoar admin</title>
<style>
  :root { color-scheme: light; font: 15px/1.5 system-ui, sans-serif; background: #f5f6f8; color: #20242b; }
  body { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
  h1 { margin-bottom: 28px; font-size: 1.8rem; }
  h2 { margin: 32px 0 12px; font-size: 1.2rem; }
  h3 { margin: 20px 0 8px; font-size: 1rem; }
  table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #dfe3e8; border-radius: 8px; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #e8ebef; text-align: left; }
  th { background: #f9fafb; color: #586170; font-size: .85rem; }
  tr:last-child td { border-bottom: 0; }
  input, select, button { box-sizing: border-box; padding: 7px 9px; border: 1px solid #cbd1d9; border-radius: 5px; font: inherit; }
  button { background: #fff; cursor: pointer; }
  button:hover { background: #f0f2f5; }
  form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  pre { padding: 12px; overflow: auto; white-space: pre-wrap; background: #fff; border: 1px solid #dfe3e8; border-radius: 6px; }
  @media (max-width: 700px) { body { margin: 24px auto; } table { display: block; overflow-x: auto; } }
</style>
<h1>Spoar admin</h1>
${message ? `<pre>${message}</pre>` : ""}
<h2>Projects</h2>
<table>
<tr><th>Id</th><th>Domain</th><th>Public key</th><th>Allowed origins (empty allows any)</th></tr>
${projectRows}
</table>
<h3>New project</h3>
<form method="post" action="/projects">
<input name="id" placeholder="playground" required>
<input name="domain" placeholder="localhost" required>
<button>Create</button>
</form>
<h2>API tokens</h2>
<table>
<tr><th>Id</th><th>Name</th><th>Scope</th><th>Projects</th><th></th></tr>
${tokenRows}
</table>
<h3>New token</h3>
<form method="post" action="/tokens">
<input name="name" placeholder="playground" required>
<select name="scope">${scopeOptions}</select>
<input name="projects" placeholder="project ids, empty for all">
<button>Create</button>
</form>`;
}

async function act(sql: SQL, path: string, form: URLSearchParams) {
  if (path === "/projects") {
    const id = field(form, "id");
    const domain = field(form, "domain");
    const keys = await createFirstProject(sql, { id, name: domain, domain });
    if (!keys) return `Project ${escape(id)} already exists.`;
    return `Created ${escape(id)}.\nPublic key: ${keys.publicKey}\nSecret key: ${keys.secretKey} (shown once)`;
  }
  if (path === "/tokens") {
    const scope = field(form, "scope");
    if (!scopes.includes(scope)) return `Unknown scope ${escape(scope)}.`;
    const token = await createToken(sql, field(form, "name"), scope, list(field(form, "projects")));
    return `API token: ${token} (shown once)`;
  }
  if (path === "/tokens/delete") {
    await sql`DELETE FROM api_tokens WHERE id = ${field(form, "id")} AND kind = 'api'`;
    return "Token revoked.";
  }
  if (path === "/origins") {
    const origins = list(field(form, "origins"));
    await sql`UPDATE projects SET allowed_origins = ${sql.array(origins, "TEXT")}, updated_at = now() WHERE id = ${field(form, "project")}`;
    return "Origins saved.";
  }
  return `Unknown action ${escape(path)}.`;
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Usage: DATABASE_URL=postgres://... bun run admin");
    process.exitCode = 1;
    return;
  }
  const sql = new SQL(url, { prepare: false });
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      try {
        const message =
          request.method === "POST"
            ? await act(sql, path, new URLSearchParams(await request.text()))
            : "";
        return new Response(await page(sql, message), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      } catch (error) {
        return new Response(`Failed: ${String(error)}`, { status: 500 });
      }
    },
  });
  console.log(`Spoar admin on ${server.url}`);
}

if (import.meta.main) main();
