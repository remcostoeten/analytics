import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { fileFromArchive } from "./geo-archive";

type Edition = "GeoLite2-City" | "GeoLite2-ASN";

type Credentials = { accountId: string; licenseKey: string };

const directory = join(import.meta.dir, "..", "data");
const editions: Edition[] = ["GeoLite2-City", "GeoLite2-ASN"];
const mirror = "https://github.com/P3TERX/GeoLite.mmdb/releases/latest/download";
const maxAgeMs = 7 * 86_400_000;

function credentials(): Nullable<Credentials> {
  const accountId = process.env.MAXMIND_ACCOUNT_ID;
  const licenseKey = process.env.MAXMIND_LICENSE_KEY;
  return accountId && licenseKey ? { accountId, licenseKey } : null;
}

function fresh(target: string) {
  return existsSync(target) && Date.now() - statSync(target).mtimeMs < maxAgeMs;
}

async function fromMaxmind(edition: Edition, { accountId, licenseKey }: Credentials) {
  const response = await fetch(
    `https://download.maxmind.com/geoip/databases/${edition}/download?suffix=tar.gz`,
    { headers: { authorization: `Basic ${btoa(`${accountId}:${licenseKey}`)}` } },
  );
  if (!response.ok) throw new Error(`${edition} download from MaxMind failed: ${response.status}`);
  const file = fileFromArchive(await response.arrayBuffer(), `${edition}.mmdb`);
  if (!file) throw new Error(`${edition}.mmdb is missing from the MaxMind archive`);
  return file;
}

async function fromMirror(edition: Edition) {
  const response = await fetch(`${mirror}/${edition}.mmdb`);
  if (!response.ok)
    throw new Error(`${edition} download from the mirror failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

mkdirSync(directory, { recursive: true });
const account = credentials();
const source = account ? "MaxMind" : "the mirror";

for (const edition of editions) {
  const target = join(directory, `${edition}.mmdb`);
  if (fresh(target)) {
    console.log(`${edition}.mmdb is less than 7 days old`);
    continue;
  }
  try {
    writeFileSync(
      target,
      account ? await fromMaxmind(edition, account) : await fromMirror(edition),
    );
    console.log(`Downloaded ${edition}.mmdb from ${source}`);
  } catch (error) {
    if (!existsSync(target)) throw error;
    console.warn(`Kept the old ${edition}.mmdb: ${String(error)}`);
  }
}
