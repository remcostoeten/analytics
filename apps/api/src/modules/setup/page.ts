import type { Project } from "@spoar/contract";
import { envBlock } from "@spoar/engine";

import { escape, favicon, formatDay, mark, styles } from "../landing/page";
import type { SetupUser, SetupView } from "./service";

const projectToken = "__PROJECT__";
const publicKeyToken = "__PUBLIC_KEY__";
const secretKeyToken = "__SECRET_KEY__";

const setupStyles = `
.lead { color: var(--muted); max-width: 64ch; line-height: 1.55; }
.lead + .lead { margin-top: 8px; }
.lead b { color: var(--fg); font-weight: 500; }
.stack { display: grid; gap: 16px; }
.card .in { padding: 20px; }
.form { display: grid; gap: 14px; }
.field { display: grid; gap: 6px; }
.field > label, .pair > span { color: var(--muted); font-size: 0.62rem; }
.field input, .field select, .field textarea { width: 100%; height: 32px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--fg); padding: 0 10px; font: 0.8rem var(--mono); transition: border-color 140ms var(--ease-out); }
.field textarea { height: auto; min-height: 66px; padding: 8px 10px; resize: vertical; line-height: 1.5; }
.field select { appearance: none; padding-right: 28px; background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%); background-position: calc(100% - 15px) 14px, calc(100% - 10px) 14px; background-size: 5px 5px; background-repeat: no-repeat; }
.field :is(input, select, textarea):focus { outline: none; border-color: color-mix(in srgb, var(--accent) 60%, var(--line)); }
.field[data-invalid] :is(input, textarea, select) { border-color: var(--err); }
.hint { color: var(--muted); font-size: 0.75rem; line-height: 1.45; }
.error { color: var(--err); font-size: 0.75rem; line-height: 1.45; }
.error:empty { display: none; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ghost, .outline, .primary { transition: background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out), transform 160ms var(--ease-out); }
.ghost:active, .outline:active, .primary:active { transform: scale(0.97); }
.primary[disabled], .outline[disabled] { opacity: 0.6; pointer-events: none; }
.status { color: var(--muted); font-size: 0.72rem; }
.status.ok { color: var(--ok); }
.status.err { color: var(--err); }
.rows { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.row { padding: 16px 20px; display: grid; gap: 14px; }
.row + .row { border-top: 1px solid var(--line); }
.row .title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.row .title b { font-size: 0.95rem; font-weight: 500; letter-spacing: -0.01em; }
.row .title .when { margin-left: auto; color: var(--muted); font-family: var(--mono); font-size: 0.72rem; }
.tag.public { background: color-mix(in srgb, var(--ok) 15%, transparent); color: var(--ok); }
.tag.private { background: color-mix(in srgb, var(--warn) 15%, transparent); color: var(--warn); }
.pair { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 6px 16px; align-items: start; }
.pair > span { padding-top: 9px; }
.pair code { overflow-wrap: anywhere; }
.pair .field { gap: 8px; }
.confirm { display: grid; gap: 10px; border: 1px solid color-mix(in srgb, var(--warn) 45%, var(--line)); border-radius: 8px; padding: 12px 14px; background: color-mix(in srgb, var(--warn) 8%, transparent); }
.notice { border: 1px solid color-mix(in srgb, var(--warn) 45%, var(--line)); border-radius: 8px; padding: 10px 14px; background: color-mix(in srgb, var(--warn) 8%, transparent); line-height: 1.5; }
.keys { display: grid; gap: 18px; }
.block { display: grid; gap: 8px; }
.block .head { margin-bottom: 0; }
.block .head h3 { font-size: 0.62rem; color: var(--muted); }
pre { margin: 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--wash); font: 0.78rem/1.55 var(--mono); overflow-x: auto; white-space: pre; }
pre code { background: none; padding: 0; font-size: inherit; }
.copy { height: 24px; padding: 0 8px; font-size: 0.62rem; }
#keys { transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out); }
#keys[data-fresh] { animation: rise 220ms var(--ease-out); }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
@media (max-width: 620px) {
  .pair { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .pair > span { padding-top: 0; }
  .row .title .when { margin-left: 0; }
}
`;

const script = `
(() => {
  const copyLabelMs = 1200;
  function api(path, method, body) {
    return fetch(path, {
      method,
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((response) =>
      response.text().then((text) => {
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }
        return { status: response.status, body: json };
      }),
    );
  }
  function errorOf(result) {
    const error = result.body && result.body.error;
    const fields = {};
    for (const field of (error && error.details && error.details.fields) || []) {
      fields[String(field.path).replace(/^\\//, "")] = field.message;
    }
    const message = (error && error.message) || "Request failed with status " + result.status;
    return { message, fields };
  }
  function host(domain) {
    return domain.trim().toLowerCase().replace(/^[a-z]+:\\/\\//, "").replace(/[/?#].*$/, "").replace(/:\\d+$/, "");
  }
  function suggestId(domain) {
    return host(domain).replace(/^www\\./, "").replace(/[^a-z0-9.-]+/g, "-").replace(/^[.-]+/, "").slice(0, 64);
  }
  function defaultOrigins(domain) {
    const bare = host(domain);
    if (!bare) return [];
    if (bare.startsWith("www.")) return ["https://" + bare];
    return ["https://" + bare, "https://www." + bare];
  }
  function lines(value) {
    return value.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
  }
  function setStatus(node, text, kind) {
    node.textContent = text;
    node.className = "status" + (kind ? " " + kind : "");
  }
  function showFieldErrors(form, fields) {
    for (const field of form.querySelectorAll(".field")) {
      const name = field.dataset.field;
      const message = name ? fields[name] : undefined;
      field.querySelector(".error").textContent = message || "";
      if (message) field.dataset.invalid = ""; else delete field.dataset.invalid;
    }
  }
  for (const button of document.querySelectorAll("[data-sign-in]")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const result = await api("/v2/auth/sign-in/social", "POST", { provider: "github", callbackURL: "/v2/setup" });
      if (result.status === 200 && result.body && result.body.url) {
        location.href = result.body.url;
        return;
      }
      button.disabled = false;
      setStatus(document.querySelector("[data-sign-in-status]"), errorOf(result).message, "err");
    });
  }
  for (const button of document.querySelectorAll("[data-sign-out]")) {
    button.addEventListener("click", async () => {
      await api("/v2/auth/sign-out", "POST", {});
      location.reload();
    });
  }
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const target = document.querySelector(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(target.textContent);
        const label = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = label; }, copyLabelMs);
      } catch {
        button.textContent = "Select and copy";
      }
    });
  }
  const keys = document.getElementById("keys");
  function showKeys(title, project, publicKey, secretKey) {
    keys.querySelector("[data-keys-title]").textContent = title;
    keys.querySelector("[data-key=public]").textContent = publicKey;
    keys.querySelector("[data-key=secret]").textContent = secretKey;
    for (const block of keys.querySelectorAll("[data-template]")) {
      const target = document.querySelector(block.dataset.template);
      target.textContent = block.content.textContent
        .replaceAll("${projectToken}", project)
        .replaceAll("${publicKeyToken}", publicKey)
        .replaceAll("${secretKeyToken}", secretKey);
    }
    keys.hidden = false;
    keys.removeAttribute("data-fresh");
    void keys.offsetWidth;
    keys.dataset.fresh = "";
    keys.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  const create = document.querySelector("[data-create]");
  if (create) {
    const domain = create.elements.domain;
    const id = create.elements.id;
    const origins = create.elements.allowedOrigins;
    let idTouched = false;
    let originsTouched = false;
    id.addEventListener("input", () => { idTouched = id.value !== ""; });
    origins.addEventListener("input", () => { originsTouched = origins.value.trim() !== ""; });
    domain.addEventListener("input", () => {
      if (!idTouched) id.value = suggestId(domain.value);
      if (!originsTouched) origins.value = defaultOrigins(domain.value).join("\\n");
    });
    create.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = create.querySelector(".status");
      const submit = create.querySelector("[type=submit]");
      submit.disabled = true;
      setStatus(status, "Creating", "");
      const result = await api("/v2/projects", "POST", {
        id: id.value.trim(),
        name: create.elements.name.value.trim() || host(domain.value),
        domain: host(domain.value),
        visibility: create.elements.visibility.value,
        allowedOrigins: lines(origins.value),
      });
      submit.disabled = false;
      if (result.status === 201) {
        const project = result.body.data;
        showFieldErrors(create, {});
        setStatus(status, "Created " + project.id + ". The page lists it after a reload.", "ok");
        showKeys("Keys for " + project.id, project.id, project.publicKey, project.secretKey);
        return;
      }
      const failed = errorOf(result);
      showFieldErrors(create, failed.fields);
      setStatus(status, failed.message, "err");
    });
  }
  for (const row of document.querySelectorAll("[data-project]")) {
    const project = row.dataset.project;
    const form = row.querySelector("[data-origins]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".status");
      setStatus(status, "Saving", "");
      const result = await api("/v2/projects/" + encodeURIComponent(project), "PATCH", {
        allowedOrigins: lines(form.elements.allowedOrigins.value),
      });
      if (result.status === 200) {
        const saved = result.body.data.allowedOrigins;
        form.elements.allowedOrigins.value = saved.join("\\n");
        setStatus(status, saved.length ? "Saved" : "Saved: every origin is accepted", "ok");
        return;
      }
      setStatus(status, errorOf(result).message, "err");
    });
    const confirm = row.querySelector("[data-confirm]");
    row.querySelector("[data-rotate]").addEventListener("click", () => {
      confirm.hidden = false;
      confirm.querySelector("[data-rotate-cancel]").focus();
    });
    confirm.querySelector("[data-rotate-cancel]").addEventListener("click", () => {
      confirm.hidden = true;
    });
    confirm.querySelector("[data-rotate-confirm]").addEventListener("click", async () => {
      const status = confirm.querySelector(".status");
      setStatus(status, "Rotating", "");
      const result = await api("/v2/projects/" + encodeURIComponent(project) + "/keys", "POST", { kind: "secret" });
      if (result.status === 200) {
        confirm.hidden = true;
        setStatus(status, "", "");
        showKeys("New secret key for " + project, project, row.dataset.publicKey, result.body.data.key);
        return;
      }
      setStatus(status, errorOf(result).message, "err");
    });
  }
})();
`;

function importLine(names: string, module: string) {
  return `import ${names} from "${module}";`;
}

const providersSnippet = [
  '"use client";',
  "",
  importLine("type { ReactNode }", "react"),
  importLine("{ createAnalytics }", "@spoar/sdk"),
  importLine("{ AnalyticsProvider }", "@spoar/sdk/react"),
  importLine("{ Analytics }", "@spoar/sdk/next"),
  "",
  "const analytics = createAnalytics({ pageviews: false });",
  "",
  "export function Providers({ children }: { children: ReactNode }) {",
  "  return (",
  "    <AnalyticsProvider client={analytics}>",
  "      <Analytics />",
  "      {children}",
  "    </AnalyticsProvider>",
  "  );",
  "}",
].join("\n");

const proxySnippet = [
  importLine("{ createProxy }", "@spoar/sdk/proxy"),
  "",
  "export const POST = createProxy({",
  "  secret: process.env.RA_SECRET,",
  "  endpoint: process.env.RA_ENDPOINT,",
  "});",
].join("\n");

function copyButton(target: string) {
  return `<button class="outline caps copy" type="button" data-copy="${target}">Copy</button>`;
}

function block(id: string, title: string, content: string, template: boolean) {
  const attributes = template ? ` data-template="#${id}"` : "";
  const text = template ? `<template${attributes}>${escape(content)}</template>` : "";
  return `<div class="block">
<div class="head"><h3 class="caps">${escape(title)}</h3>${copyButton(`#${id}`)}</div>
${text}<pre><code id="${id}">${template ? "" : escape(content)}</code></pre>
</div>`;
}

function keysSection(baseUrl: string) {
  const env = envBlock({
    project: projectToken,
    publicKey: publicKeyToken,
    secretKey: secretKeyToken,
    endpoint: baseUrl,
  });
  return `<section id="keys" hidden>
<div class="head"><h2 class="caps" data-keys-title>Keys</h2></div>
<div class="card"><div class="in keys">
<p class="notice">The secret key is shown once. It is stored as a hash, so copy it now; if it is lost, rotate it.</p>
<div class="block"><div class="head"><h3 class="caps">Public key</h3>${copyButton("#public-key")}</div><pre><code id="public-key" data-key="public"></code></pre></div>
<div class="block"><div class="head"><h3 class="caps">Secret key</h3>${copyButton("#secret-key")}</div><pre><code id="secret-key" data-key="secret"></code></pre></div>
${block("env-block", ".env.local", env, true)}
${block("providers-snippet", "app/providers.tsx", providersSnippet, false)}
${block("proxy-snippet", "app/%5Fra/route.ts, served as /_ra", proxySnippet, false)}
<p class="hint">Wrap the root layout in <code>Providers</code>. <code>&lt;Analytics /&gt;</code> sends a pageview per navigation with its route template, and the proxy keeps events on your own origin.</p>
</div></div>
</section>`;
}

function field(input: { name: string; label: string; control: string; hint?: string }) {
  const id = `new-${input.name}`;
  const described = input.hint ? ` aria-describedby="${id}-hint"` : "";
  const control = input.control.replace(/^<(\w+)/, `<$1 id="${id}"${described}`);
  return `<div class="field" data-field="${input.name}">
<label class="caps" for="${id}">${escape(input.label)}</label>
${control}
${input.hint ? `<span class="hint" id="${id}-hint">${input.hint}</span>` : ""}
<span class="error" role="alert"></span>
</div>`;
}

function createSection(canCreate: boolean) {
  if (!canCreate) {
    return `<section id="new">
<div class="head"><h2 class="caps">New project</h2></div>
<p class="lead">Creating a project needs an owner, or an admin whose role lists no projects. An owner can widen your role.</p>
</section>`;
  }
  return `<section id="new">
<div class="head"><h2 class="caps">New project</h2></div>
<div class="card"><div class="in">
<form class="form" data-create novalidate>
${field({
  name: "domain",
  label: "Domain",
  control: `<input name="domain" type="text" autocomplete="off" spellcheck="false" placeholder="example.com" required>`,
  hint: "The site's host. The id and the allowed origins fill in from it.",
})}
${field({
  name: "id",
  label: "Id",
  control: `<input name="id" type="text" autocomplete="off" spellcheck="false" pattern="[a-z0-9][a-z0-9.-]*" maxlength="64" required>`,
  hint: "Lowercase letters, digits, dots and dashes. It is in every URL and cannot change.",
})}
${field({
  name: "name",
  label: "Name",
  control: `<input name="name" type="text" autocomplete="off" maxlength="128" placeholder="Defaults to the domain">`,
})}
${field({
  name: "visibility",
  label: "Visibility",
  control: `<select name="visibility"><option value="public">public: anyone may read the aggregates</option><option value="private">private: members and tokens only</option></select>`,
})}
${field({
  name: "allowedOrigins",
  label: "Allowed origins",
  control: `<textarea name="allowedOrigins" spellcheck="false" placeholder="https://example.com"></textarea>`,
  hint: "One per line, matched exactly against the browser's <code>Origin</code>. An empty list accepts events from any origin.",
})}
<div class="actions"><button class="primary caps" type="submit">Create project</button><span class="status"></span></div>
</form>
</div></div>
</section>`;
}

function projectRow(project: Project) {
  const origins = project.allowedOrigins.join("\n");
  return `<article class="row" data-project="${escape(project.id)}" data-public-key="${escape(project.publicKey)}">
<div class="title"><b>${escape(project.name)}</b><code>${escape(project.id)}</code><span class="muted">${escape(project.domain)}</span><span class="tag caps ${escape(project.visibility)}">${escape(project.visibility)}</span><span class="when">created ${formatDay(project.createdAt)}</span></div>
<div class="pair"><span class="caps">Public key</span><code>${escape(project.publicKey)}</code></div>
<form class="pair" data-origins>
<span class="caps">Allowed origins</span>
<div class="field" data-field="allowedOrigins">
<textarea name="allowedOrigins" spellcheck="false" aria-label="Allowed origins of ${escape(project.id)}" placeholder="Every origin is accepted">${escape(origins)}</textarea>
<div class="actions"><button class="outline caps" type="submit">Save origins</button><span class="status"></span></div>
</div>
</form>
<div class="pair"><span class="caps">Secret key</span>
<div class="stack">
<div class="actions"><span class="muted">Stored as a hash and never shown again.</span><button class="outline caps" type="button" data-rotate>Rotate secret</button></div>
<div class="confirm" data-confirm hidden>
<span>The old secret stops working at once. Every server and proxy that sends with it needs the new one.</span>
<div class="actions"><button class="primary caps" type="button" data-rotate-confirm>Rotate now</button><button class="ghost caps" type="button" data-rotate-cancel>Cancel</button><span class="status"></span></div>
</div>
</div>
</div>
</article>`;
}

function projectsSection(projects: Project[]) {
  const count = `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  const list =
    projects.length === 0
      ? `<p class="empty caps">No projects yet</p>`
      : `<div class="rows">${projects.map(projectRow).join("\n")}</div>`;
  return `<section id="projects">
<div class="head"><h2 class="caps">Projects</h2><span class="meta caps">${count}</span></div>
${list}
</section>`;
}

function signedOutSection() {
  return `<section id="sign-in">
<div class="head"><h2 class="caps">Sign in</h2></div>
<div class="card"><div class="in stack">
<p class="lead">This page creates projects and shows their keys until the dashboard exists. Sign in with GitHub to continue.</p>
<p class="lead">Only GitHub logins in the <code>dashboard_users</code> allowlist get in, and the first one to sign in becomes the owner of the organization.</p>
<div class="actions"><button class="primary caps" type="button" data-sign-in>Sign in with GitHub</button><span class="status" data-sign-in-status></span></div>
</div></div>
</section>`;
}

function noAccessSection(user: SetupUser) {
  return `<section id="access">
<div class="head"><h2 class="caps">Access</h2></div>
<div class="card"><div class="in stack">
<p class="lead">Signed in as <b>${escape(user.login)}</b> with the role <code>${escape(user.role)}</code>.</p>
<p class="lead">Creating projects and reading keys needs the owner or an admin. An owner must grant that access before this page shows more.</p>
</div></div>
</section>`;
}

function sections(view: SetupView) {
  if (view.state === "signed-out") return signedOutSection();
  if (view.state === "no-access") return noAccessSection(view.user);
  return [
    projectsSection(view.projects),
    keysSection(view.baseUrl),
    createSection(view.canCreate),
  ].join("\n\n");
}

function account(view: SetupView) {
  if (view.state === "signed-out") return "";
  return `<span class="context caps"><span class="host">${escape(view.user.login)} · ${escape(view.user.role)}</span></span>
<button class="ghost caps" type="button" data-sign-out>Sign out</button>`;
}

/**
 * @name setupPage
 * @description Renders the setup page for one caller in the landing page's design: the sign-in
 * button, the no-access note, or the project list with editable origins and secret rotation, the
 * keys panel that the inline script fills once a project is created or a secret rotated, and the
 * create form. The script and styles carry `nonce` for the page's Content-Security-Policy.
 *
 * @example
 * const html = setupPage(view, nonce);
 */
export function setupPage(view: SetupView, nonce: string): string {
  const host = view.baseUrl.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
<meta name="robots" content="noindex">
<title>Spoar setup</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style nonce="${nonce}">${styles}${setupStyles}</style>
</head>
<body>
<header class="top dots"><div class="in">
<a class="brand" href="/" aria-label="Spoar API home">${mark}<span>spoar</span></a>
<span class="context caps"><span class="live"></span><span class="host">${escape(host)}</span></span>
<span class="spacer"></span>
${account(view)}
<a class="ghost caps wide" href="/">API status</a>
</div></header>

<main>
${sections(view)}
</main>

<footer class="dots"><div class="in"><span>Setup · until the dashboard ships</span><span><a class="link" href="${escape(view.baseUrl)}/v2/openapi">API reference</a> · <a class="link" href="https://github.com/remcostoeten/analytics">Source</a></span></div></footer>
<script nonce="${nonce}">${script}</script>
</body>
</html>
`;
}
