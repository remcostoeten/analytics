import type { Nullable } from "@spoar/shared/semantic";
import { cacheLife } from "next/cache";

import { fetchPublic, isPublicHostname } from "./public-fetch";

type Candidate = { rank: number; url: URL };

const maxPageBytes = 256 * 1024;
const maxIconBytes = 100 * 1024;
const maxCandidates = 4;
const searchBudgetMs = 10_000;
const pageAccept = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1";
const iconAccept = "image/avif,image/webp,image/svg+xml,image/png,image/x-icon,image/*;q=0.8";

// A `<link ...>` start tag.
const linkTag = /<link\b[^>]*>/gi;
// One attribute: its name, then a double-quoted, single-quoted or bare value.
const attribute = /([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const prologParts: readonly [string, string][] = [
  ["<?xml", ">"],
  ["<!--", "-->"],
  ["<!doctype", ">"],
];

function isSvgDocument(text: string) {
  const lower = text.toLowerCase();
  let at = 0;
  for (;;) {
    while (at < lower.length && /\s/.test(lower.charAt(at))) at++;
    const part = prologParts.find(([open]) => lower.startsWith(open, at));
    if (part === undefined) break;
    const end = lower.indexOf(part[1], at + part[0].length);
    if (end === -1) return false;
    at = end + part[1].length;
  }
  return lower.startsWith("<svg", at) && /[\s>]/.test(lower.charAt(at + 4));
}

const signatures: readonly [string, readonly number[], number][] = [
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0],
  ["image/x-icon", [0x00, 0x00, 0x01, 0x00], 0],
  ["image/jpeg", [0xff, 0xd8, 0xff], 0],
  ["image/gif", [0x47, 0x49, 0x46, 0x38], 0],
  ["image/webp", [0x57, 0x45, 0x42, 0x50], 8],
  ["image/avif", [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4],
];

/**
 * @name iconHost
 * @description The hostname to look a project's icon up on, from its stored domain: lowercased,
 * without scheme, path, port or trailing dot. Answers `null` when what is left is not a public DNS
 * name, such as `localhost`, an IP address or an internal suffix.
 *
 * @example
 * iconHost("https://Remcostoeten.nl/blog"); // "remcostoeten.nl"
 * iconHost("localhost:3000"); // null
 */
export function iconHost(domain: string): Nullable<string> {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const hostname = (host.split(/[/?#]/)[0] ?? "").replace(/:\d+$/, "").replace(/\.$/, "");
  return isPublicHostname(hostname) ? hostname : null;
}

function attributesOf(tag: string) {
  const attributes = new Map<string, string>();
  for (const [, name = "", double, single, bare] of tag.matchAll(attribute)) {
    attributes.set(name.toLowerCase(), double ?? single ?? bare ?? "");
  }
  return attributes;
}

function rankOf(attributes: Map<string, string>) {
  const tokens = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
  if (tokens.includes("icon")) return attributes.get("type") === "image/svg+xml" ? 0 : 1;
  if (tokens.includes("apple-touch-icon") || tokens.includes("apple-touch-icon-precomposed")) {
    return 2;
  }
  return null;
}

function iconLinks(html: string, base: URL) {
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);
  const candidates: Candidate[] = [];
  for (const [tag] of head.matchAll(linkTag)) {
    const attributes = attributesOf(tag);
    const rank = rankOf(attributes);
    const href = (attributes.get("href") ?? "").replaceAll("&amp;", "&").trim();
    const url = href === "" ? null : URL.parse(href, base);
    if (rank !== null && url !== null) candidates.push({ rank, url });
  }
  return candidates.sort((left, right) => left.rank - right.rank).map((entry) => entry.url);
}

function imageType(body: Buffer): Nullable<string> {
  const signature = signatures.find(([, bytes, offset]) =>
    body.subarray(offset, offset + bytes.length).equals(Buffer.from(bytes)),
  );
  if (signature !== undefined) return signature[0];
  return isSvgDocument(body.toString("utf8", 0, 4096)) ? "image/svg+xml" : null;
}

function asDataUri(body: Buffer): Nullable<string> {
  if (body.length === 0 || body.length > maxIconBytes) return null;
  const type = imageType(body);
  return type === null ? null : `data:${type};base64,${body.toString("base64")}`;
}

function inlineIcon(href: string): Nullable<string> {
  const comma = href.indexOf(",");
  if (comma === -1 || comma > 200) return null;
  const meta = href.slice(0, comma).toLowerCase();
  const payload = href.slice(comma + 1);
  if (meta.endsWith(";base64")) return asDataUri(Buffer.from(payload, "base64"));
  try {
    return asDataUri(Buffer.from(decodeURIComponent(payload), "utf8"));
  } catch {
    return null;
  }
}

async function iconAt(url: URL): Promise<Nullable<string>> {
  if (url.protocol === "data:") return inlineIcon(url.href);
  const response = await fetchPublic(url, iconAccept, maxIconBytes);
  return response?.status === 200 ? asDataUri(response.body) : null;
}

async function findFavicon(hostname: string): Promise<Nullable<string>> {
  const deadline = Date.now() + searchBudgetMs;
  const home = new URL(`https://${hostname}/`);
  const page = await fetchPublic(home, pageAccept, maxPageBytes, "truncate");
  const base = page?.url ?? home;
  const links =
    page?.status === 200 && /html/i.test(page.contentType)
      ? iconLinks(page.body.toString("utf8"), base)
      : [];
  const seen = new Set<string>();
  const candidates = [...links, new URL("/favicon.ico", base)].filter((url) => {
    if (seen.has(url.href)) return false;
    seen.add(url.href);
    return true;
  });
  for (const candidate of candidates.slice(0, maxCandidates)) {
    if (Date.now() > deadline) return null;
    const icon = await iconAt(candidate);
    if (icon !== null) return icon;
  }
  return null;
}

/**
 * @name projectFavicon
 * @description A site's favicon as a `data:` URI, fetched by the server from the site itself: the
 * first `<link rel="icon">` on the homepage, SVG ones first, then `apple-touch-icon`, then `/favicon.ico`. The
 * bytes must be a PNG, ICO, JPEG, GIF, WebP, AVIF or SVG of at most 100 KB, recognised by their
 * content rather than the served type. Answers `null` when the site has none. Results are cached
 * on the server by hostname, a found icon for a day and a miss for an hour, so each site is asked
 * at most that often.
 *
 * @example
 * const host = iconHost(project.domain);
 * const icon = host === null ? null : await projectFavicon(host);
 */
export async function projectFavicon(hostname: string): Promise<Nullable<string>> {
  "use cache";
  const icon = isPublicHostname(hostname) ? await findFavicon(hostname) : null;
  if (icon === null) cacheLife("hours");
  else cacheLife("days");
  return icon;
}
