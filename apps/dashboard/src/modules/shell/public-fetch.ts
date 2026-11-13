import { lookup } from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import type { LookupFunction } from "node:net";

import type { Nullable } from "@spoar/shared/semantic";

export type PublicResponse = {
  url: URL;
  status: number;
  contentType: string;
  body: Buffer;
};

export type Overflow = "refuse" | "truncate";

type LookupCallback = Parameters<LookupFunction>[2];

const maxRedirects = 3;
const requestTimeoutMs = 4000;
const userAgent = "Mozilla/5.0 (compatible; SpoarDashboard/1.0; project icon)";

// Hostnames whose last label is a letter-led TLD of at least two characters, so IP literals never match.
const hostnamePattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/;
// Reserved and internal-only top-level names.
const privateSuffixes =
  /\.(?:localhost|local|localdomain|internal|intranet|lan|home|corp|private|arpa|test|invalid|example|onion)$/;

const blockedV4: readonly [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const blockedV6: readonly [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

const blocked = new BlockList();
for (const [network, prefix] of blockedV4) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of blockedV6) blocked.addSubnet(network, prefix, "ipv6");

function isPublicAddress(address: LookupAddress) {
  return !blocked.check(address.address, address.family === 6 ? "ipv6" : "ipv4");
}

/**
 * @name isPublicHostname
 * @description Whether a hostname is a plain public DNS name: lowercase letters, digits and dashes
 * in dotted labels, no IP literal, no port, and no reserved or internal suffix such as `localhost`,
 * `.local` or `.internal`. It checks the name only; `fetchPublic` also checks every address the
 * name resolves to.
 *
 * @example
 * isPublicHostname("remcostoeten.nl"); // true
 * isPublicHostname("169.254.169.254"); // false
 */
export function isPublicHostname(hostname: string): boolean {
  return (
    hostname.length <= 253 &&
    isIP(hostname) === 0 &&
    hostnamePattern.test(hostname) &&
    !privateSuffixes.test(hostname)
  );
}

function refuse(callback: LookupCallback, hostname: string) {
  const error: NodeJS.ErrnoException = new Error(
    `${hostname} does not resolve to a public address`,
  );
  error.code = "ENOTFOUND";
  callback(error, "", 0);
}

function publicLookup(hostname: string, options: LookupOptions, callback: LookupCallback) {
  lookup(
    hostname,
    { family: options.family, hints: options.hints, all: true },
    (error, addresses) => {
      if (error) return callback(error, "", 0);
      const [first] = addresses;
      if (first === undefined || !addresses.every(isPublicAddress))
        return refuse(callback, hostname);
      if (options.all) return callback(null, addresses);
      callback(null, first.address, first.family);
    },
  );
}

function isAllowedUrl(url: URL) {
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    isPublicHostname(url.hostname)
  );
}

function requestOnce(url: URL, accept: string, maxBytes: number, overflow: Overflow) {
  return new Promise<Nullable<PublicResponse & { location: Nullable<string> }>>((resolve) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.get(
      url,
      {
        agent: false,
        lookup: publicLookup,
        timeout: requestTimeoutMs,
        signal: AbortSignal.timeout(requestTimeoutMs),
        headers: { accept, "user-agent": userAgent },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = response.headers["content-type"] ?? "";
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({
            url,
            status,
            contentType,
            body: Buffer.alloc(0),
            location: response.headers.location ?? null,
          });
          return;
        }
        const declared = Number(response.headers["content-length"] ?? 0);
        if (overflow === "refuse" && declared > maxBytes) {
          request.destroy();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        function finish() {
          resolve({ url, status, contentType, body: Buffer.concat(chunks), location: null });
        }
        response.on("data", (chunk: Buffer) => {
          const room = maxBytes - size;
          size += chunk.length;
          if (size <= maxBytes) {
            chunks.push(chunk);
            return;
          }
          if (overflow === "truncate") {
            chunks.push(chunk.subarray(0, room));
            finish();
          } else {
            resolve(null);
          }
          request.destroy();
        });
        response.on("end", finish);
        response.on("error", () => resolve(null));
      },
    );
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(null));
  });
}

/**
 * @name fetchPublic
 * @description GETs a URL on the public internet from the server, for fetching resources from a
 * project's own site. Only `http` and `https` on default ports with a public DNS hostname are
 * allowed, every address the name resolves to must be public (checked at connect time, so DNS
 * rebinding cannot swap in a private address), redirects are followed by hand up to three times
 * under the same rules, and each request stops after four seconds. A body above `maxBytes` is
 * refused, or cut to its first `maxBytes` with `truncate`. It answers `null` for anything refused
 * or failed.
 *
 * @example
 * const page = await fetchPublic(new URL("https://remcostoeten.nl/"), "text/html", 256 * 1024, "truncate");
 * if (page?.status === 200) parse(page.body.toString("utf8"));
 */
export async function fetchPublic(
  url: URL,
  accept: string,
  maxBytes: number,
  overflow: Overflow = "refuse",
): Promise<Nullable<PublicResponse>> {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!isAllowedUrl(current)) return null;
    const response = await requestOnce(current, accept, maxBytes, overflow);
    if (response === null) return null;
    if (response.location === null) {
      return {
        url: response.url,
        status: response.status,
        contentType: response.contentType,
        body: response.body,
      };
    }
    const next = URL.parse(response.location, current);
    if (next === null) return null;
    current = next;
  }
  return null;
}
