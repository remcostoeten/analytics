import type { ProjectID } from "@spoar/shared/semantic";

// The project id pattern of `CreateProject` in @spoar/contract.
const projectIdPattern = /^[a-z0-9][a-z0-9.-]{0,63}$/;

export type InstallKeys = {
  project: ProjectID;
  publicKey: string;
  secretKey: string;
  endpoint: string;
};

function bareHost(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "");
}

/**
 * @name defaultOrigins
 * @description The allowed origins a new project starts with: `https://<domain>` and
 * `https://www.<domain>`, or only the first when the domain already starts with `www.`. A
 * domain with a scheme, path or port is reduced to its host first; an empty domain gives no
 * origins, which the API reads as every origin allowed.
 *
 * @example
 * defaultOrigins("remcostoeten.nl"); // ["https://remcostoeten.nl", "https://www.remcostoeten.nl"]
 */
export function defaultOrigins(domain: string): string[] {
  const host = bareHost(domain);
  if (!host) return [];
  if (host.startsWith("www.")) return [`https://${host}`];
  return [`https://${host}`, `https://www.${host}`];
}

/**
 * @name suggestProjectId
 * @description A project id for a domain: the host without `www.`, lowercased, with anything
 * outside the id pattern turned into a dash. Null when nothing valid remains.
 *
 * @example
 * suggestProjectId("www.Remco_Stoeten.nl"); // "remco-stoeten.nl"
 */
export function suggestProjectId(domain: string): ProjectID | null {
  const id = bareHost(domain)
    .replace(/^www\./, "")
    .replaceAll(/[^a-z0-9.-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 64);
  return projectIdPattern.test(id) ? id : null;
}

/**
 * @name envBlock
 * @description The three environment variables a Next app needs for `@spoar/sdk`:
 * `NEXT_PUBLIC_RA_CONFIG` with the project, the public key and `/_ra` as the endpoint,
 * `RA_SECRET` and `RA_ENDPOINT`.
 *
 * @example
 * console.log(envBlock({ project: "blog", publicKey, secretKey, endpoint: "https://api.example.com" }));
 */
export function envBlock(keys: InstallKeys): string {
  const config = JSON.stringify({ project: keys.project, key: keys.publicKey, endpoint: "/_ra" });
  return [
    `NEXT_PUBLIC_RA_CONFIG='${config}'`,
    `RA_SECRET=${keys.secretKey}`,
    `RA_ENDPOINT=${keys.endpoint}`,
  ].join("\n");
}
