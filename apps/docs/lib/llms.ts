import type { Folder, Item, Node } from "fumadocs-core/page-tree";
import type { InferPageType } from "fumadocs-core/source";
import type { ReactNode } from "react";

import { apiEndpoint } from "@/lib/api-endpoint";
import { operationMarkdown } from "@/lib/openapi-markdown";
import { source } from "@/lib/source";

type DocsPage = InferPageType<typeof source>;
type Section = { title: string; lines: string[] };

const siteUrl = "https://docs.analytics.remcostoeten.nl";

function openapiUrl() {
  return `${apiEndpoint()}/v2/openapi/json`;
}

function header() {
  const api = apiEndpoint();
  return `# Spoar

> Privacy-first web analytics you host yourself: a typed SDK for browsers and servers, one API under \`/v2\` for ingest, reads and sign-in, and a Postgres database you run. Tracked visitors get no cookies and raw IP addresses are never stored.

Entry points:

- \`@spoar/sdk\` tracks pageviews, custom events, errors and Core Web Vitals. Entries: the browser core, \`/plugins\`, \`/react\`, \`/next\`, \`/server\`, \`/proxy\` and \`/admin\`. ESM only.
- \`@spoar/client\` reads the data: the client is a scope over every project the caller may read, \`api.project("name")\` is a scope over one, and each read route is one method. Every call resolves to \`{ ok, value }\` or \`{ ok, error }\` and never throws.
- The API is served at ${api}/v2. The OpenAPI document is at ${openapiUrl()}.
- \`POST ${api}/v2/mcp\` is a Model Context Protocol server over Streamable HTTP, authenticated with an API token.

Keys: a \`pk_\` public key sends events from browsers, an \`sk_\` secret key sends them from servers and the proxy. An \`at_\` API token with scope \`read\`, \`sql\` or \`admin\`, optionally limited to listed projects, reads data and manages projects. Secret keys and API tokens stay on the server.

Every page below is Markdown. The HTML version is the same URL without \`.md\`, and [llms-full.txt](${siteUrl}/llms-full.txt) holds every guide in one file.`;
}

function nodeText(name: ReactNode) {
  return typeof name === "string" ? name : "";
}

function isOperation(page: DocsPage) {
  return page.slugs[0] === "reference" && page.slugs.length > 1;
}

function isReferenceIndex(page: DocsPage) {
  return page.slugs.length === 1 && page.slugs[0] === "reference";
}

function markdownPath(page: DocsPage) {
  return page.slugs.length === 0 ? "/docs/index.md" : `${page.url}.md`;
}

function linkLine(page: DocsPage) {
  const link = `- [${page.data.title}](${siteUrl}${markdownPath(page)})`;
  return page.data.description ? `${link}: ${page.data.description}` : link;
}

function nodePages(node: Node): DocsPage[] {
  if (node.type === "separator") return [];
  if (node.type === "page") return pageOf(node);
  return folderPages(node);
}

function pageOf(item: Item) {
  const page = source.getNodePage(item);
  return page ? [page] : [];
}

function folderPages(folder: Folder) {
  const index = folder.index ? pageOf(folder.index) : [];
  return [...index, ...folder.children.flatMap(nodePages)];
}

function folderSection(folder: Folder): Section {
  const pages = folderPages(folder).filter((page) => !isOperation(page));
  const lines = pages.map(linkLine);
  if (pages.some(isReferenceIndex)) {
    lines.push(
      `- [OpenAPI document](${openapiUrl()}): Every route with its request and response schemas, as JSON.`,
    );
  }
  return { title: nodeText(source.getNodeMeta(folder)?.data.title ?? folder.name), lines };
}

function treePages() {
  return source.getPageTree().children.flatMap(nodePages);
}

function isChangelog(page: DocsPage) {
  return page.slugs.length === 1 && page.slugs[0] === "changelog";
}

function pagesOutsideTree() {
  const inTree = new Set(treePages().map((page) => page.url));
  return source
    .getPages()
    .filter((page) => !inTree.has(page.url) && !isOperation(page) && !isChangelog(page));
}

function sections() {
  const start: Section = { title: "Start here", lines: [] };
  const all = [start];
  let current = start;
  for (const node of source.getPageTree().children) {
    if (node.type === "separator") {
      current = { title: nodeText(node.name), lines: [] };
      all.push(current);
    } else if (node.type === "page") {
      current.lines.push(...pageOf(node).map(linkLine));
    } else {
      all.push(folderSection(node));
    }
  }
  all.push({ title: "Other pages", lines: pagesOutsideTree().map(linkLine) });
  return all.filter((section) => section.lines.length > 0);
}

/**
 * @name renderIndex
 * @description Builds `llms.txt` from the docs page tree: a hand-written summary of the packages,
 * keys and API, then one section per sidebar group with a Markdown link and description per page.
 * The generated API reference collapses to its index page and the OpenAPI document.
 *
 * @example
 * return new Response(renderIndex(), { headers: { "content-type": "text/plain" } });
 */
export function renderIndex() {
  const body = sections().map((section) =>
    [`## ${section.title}`, "", ...section.lines].join("\n"),
  );
  const changelog = source.getPage(["changelog"]);
  const optional = changelog ? [`## Optional\n\n${linkLine(changelog)}`] : [];
  return `${[header(), ...body, ...optional].join("\n\n")}\n`;
}

function absoluteUrl(path: string) {
  const [pathname = "", hash] = path.split("#");
  const slugs = pathname
    .replace(/^\/docs\/?/, "")
    .split("/")
    .filter(Boolean);
  const page = pathname.startsWith("/docs") ? source.getPage(slugs) : undefined;
  const target = page ? `${siteUrl}${markdownPath(page)}` : `${siteUrl}${pathname}`;
  return hash ? `${target}#${hash}` : target;
}

function absoluteLinksInProse(text: string) {
  return text.replace(
    /(\]\(|href=")(\/[^)"\s]*)/g,
    (_match, prefix: string, path: string) => `${prefix}${absoluteUrl(path)}`,
  );
}

function absoluteLinks(markdown: string) {
  // Splits out fenced and inline code so links inside code samples stay as written.
  return markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, index) => (index % 2 === 0 ? absoluteLinksInProse(part) : part))
    .join("");
}

async function operationBody(page: DocsPage) {
  const markdown = await operationMarkdown(page.slugs.at(-1) ?? "");
  return (
    markdown ??
    `The request and response schemas for this route are in the OpenAPI document at ${openapiUrl()}.`
  );
}

/**
 * @name renderPage
 * @description One docs page as Markdown: its title, HTML URL, description and processed body, with
 * site links made absolute and pointed at their Markdown versions. A generated API reference page
 * renders its route from the OpenAPI document instead.
 *
 * @example
 * const page = pageForSlug(["sdk", "client"]);
 * if (page) return new Response(await renderPage(page));
 */
export async function renderPage(page: DocsPage) {
  const body = isOperation(page)
    ? await operationBody(page)
    : absoluteLinks(await page.data.getText("processed"));
  const lines = [`# ${page.data.title}`, "", `URL: ${siteUrl}${page.url}`];
  if (page.data.description) lines.push("", `> ${page.data.description}`);
  lines.push("", body.trim());
  return `${lines.join("\n")}\n`;
}

/**
 * @name renderFull
 * @description Builds `llms-full.txt`: every docs page in sidebar order, rendered by `renderPage`,
 * leaving out the generated API reference pages, which the OpenAPI document covers.
 *
 * @example
 * return new Response(await renderFull(), { headers: { "content-type": "text/plain" } });
 */
export async function renderFull() {
  const pages = [...treePages(), ...pagesOutsideTree()].filter((page) => !isOperation(page));
  const rendered = await Promise.all(pages.map(renderPage));
  return rendered.join("\n---\n\n");
}

/**
 * @name pageForSlug
 * @description Finds the docs page for a Markdown URL's slug. `/docs/index.md` is the overview page
 * at `/docs`.
 *
 * @example
 * pageForSlug(["index"])?.url; // "/docs"
 */
export function pageForSlug(slug: string[]) {
  return source.getPage(slug.length === 1 && slug[0] === "index" ? [] : slug);
}

/**
 * @name markdownUrl
 * @description The public Markdown URL of a docs page, for `<link rel="alternate">`.
 *
 * @example
 * markdownUrl(page); // "https://docs.analytics.remcostoeten.nl/docs/sdk/client.md"
 */
export function markdownUrl(page: DocsPage) {
  return `${siteUrl}${markdownPath(page)}`;
}
