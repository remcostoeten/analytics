import { describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";

import { fileFromArchive } from "../scripts/geo-archive";

function entry(path: string, content: string) {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  header.set(encoder.encode(path), 0);
  header.set(encoder.encode(`${content.length.toString(8).padStart(11, "0")}\0`), 124);
  const body = new Uint8Array(Math.ceil(content.length / 512) * 512);
  body.set(encoder.encode(content));
  return [header, body];
}

function archive(entries: [string, string][]) {
  const blocks = [
    ...entries.flatMap(([path, content]) => entry(path, content)),
    new Uint8Array(1024),
  ];
  const tar = new Uint8Array(blocks.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of blocks) {
    tar.set(part, offset);
    offset += part.length;
  }
  const gzipped = gzipSync(tar);
  return gzipped.buffer.slice(gzipped.byteOffset, gzipped.byteOffset + gzipped.byteLength);
}

describe("fileFromArchive", () => {
  const maxmind = archive([
    ["GeoLite2-City_20261001/COPYRIGHT.txt", "x".repeat(700)],
    ["GeoLite2-City_20261001/GeoLite2-City.mmdb", "mmdb"],
  ]);

  test("finds the database in its dated folder, past other files", () => {
    const file = fileFromArchive(maxmind, "GeoLite2-City.mmdb");
    expect(new TextDecoder().decode(file ?? new Uint8Array())).toBe("mmdb");
  });

  test("returns null when the archive does not hold it", () => {
    expect(fileFromArchive(maxmind, "GeoLite2-ASN.mmdb")).toBeNull();
  });
});
