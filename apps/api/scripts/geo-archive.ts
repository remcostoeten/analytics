import { gunzipSync } from "node:zlib";

import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

const block = 512;
const decoder = new TextDecoder();

function field(header: Uint8Array, start: number, length: number) {
  const raw = decoder.decode(header.subarray(start, start + length));
  const end = raw.indexOf("\0");
  return (end === -1 ? raw : raw.slice(0, end)).trim();
}

/**
 * @name fileFromArchive
 * @description Reads one file out of a gzipped tar archive, the format MaxMind serves its
 * databases in, matched on its name in any folder. Returns null when the archive does not hold it.
 *
 * @example
 * fileFromArchive(await response.arrayBuffer(), "GeoLite2-City.mmdb");
 */
export function fileFromArchive(gzipped: ArrayBuffer, name: string): Nullable<Uint8Array> {
  const archive = gunzipSync(new Uint8Array(gzipped));
  let offset = 0;
  while (offset + block <= archive.length) {
    const header = archive.subarray(offset, offset + block);
    const path = field(header, 0, 100);
    if (!path) return null;
    const size = Number.parseInt(field(header, 124, 12) || "0", 8);
    const start = offset + block;
    if (path === name || path.endsWith(`/${name}`)) return archive.subarray(start, start + size);
    offset = start + Math.ceil(size / block) * block;
  }
  return null;
}
