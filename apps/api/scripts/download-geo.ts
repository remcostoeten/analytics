import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const directory = join(import.meta.dir, "..", "data");
const editions = ["GeoLite2-City", "GeoLite2-ASN"];
const maxmind = "https://download.maxmind.com/app/geoip_download";
const mirror = "https://github.com/P3TERX/GeoLite.mmdb/releases/latest/download";
const licenseKey = process.env.MAXMIND_LICENSE_KEY ?? "";
const blockSize = 512;

function editionUrl(edition: string, suffix: string) {
  const query = new URLSearchParams({ edition_id: edition, license_key: licenseKey, suffix });
  return `${maxmind}?${query}`;
}

async function fetchBytes(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function extractFile(archive: Buffer, name: string) {
  let offset = 0;
  while (offset + blockSize <= archive.length) {
    const header = archive.subarray(offset, offset + blockSize);
    const path = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
    if (path === "") break;
    const size = Number.parseInt(header.subarray(124, 136).toString("utf8").trim(), 8);
    const start = offset + blockSize;
    if (path.endsWith(`/${name}`) || path === name) return archive.subarray(start, start + size);
    offset = start + Math.ceil(size / blockSize) * blockSize;
  }
  throw new Error(`${name} not found in the archive`);
}

async function fromMaxmind(edition: string) {
  const archive = await fetchBytes(editionUrl(edition, "tar.gz"), edition);
  const listed = await fetchBytes(editionUrl(edition, "tar.gz.sha256"), `${edition} checksum`);
  const expected = listed.toString("utf8").trim().split(/\s+/)[0];
  const actual = createHash("sha256").update(archive).digest("hex");
  if (actual !== expected) throw new Error(`${edition} checksum mismatch`);
  return extractFile(gunzipSync(archive), `${edition}.mmdb`);
}

function fromMirror(edition: string) {
  return fetchBytes(`${mirror}/${edition}.mmdb`, edition);
}

mkdirSync(directory, { recursive: true });

if (licenseKey === "") {
  console.warn("MAXMIND_LICENSE_KEY is not set, falling back to the community mirror");
}

for (const edition of editions) {
  const target = join(directory, `${edition}.mmdb`);
  if (existsSync(target)) {
    console.log(`${edition}.mmdb already present`);
    continue;
  }
  const file = licenseKey === "" ? await fromMirror(edition) : await fromMaxmind(edition);
  writeFileSync(target, file);
  console.log(`Downloaded ${edition}.mmdb from ${licenseKey === "" ? "the mirror" : "MaxMind"}`);
}
