import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const directory = join(import.meta.dir, "..", "data");
const files = ["GeoLite2-City.mmdb", "GeoLite2-ASN.mmdb"];
const mirror = "https://github.com/P3TERX/GeoLite.mmdb/releases/latest/download";

mkdirSync(directory, { recursive: true });

for (const file of files) {
  const target = join(directory, file);
  if (existsSync(target)) {
    console.log(`${file} already present`);
    continue;
  }
  const response = await fetch(`${mirror}/${file}`);
  if (!response.ok) throw new Error(`${file} download failed: ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  console.log(`Downloaded ${file}`);
}
