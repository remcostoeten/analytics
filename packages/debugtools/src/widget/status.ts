import type { Fetcher } from "@spoar/shared/http";
import type { Nullable } from "@spoar/shared/semantic";

export type KeyUse = { lastUsedAt: Nullable<string>; lastUsedOrigin: Nullable<string> };
export type KeyUsage = { public: KeyUse; secret: KeyUse };

type Options = { endpoint: string; project: string; token: string; fetch?: Fetcher };

function isUse(value: unknown): value is KeyUse {
  return typeof value === "object" && value !== null && "lastUsedAt" in value;
}

/**
 * @name fetchKeyUsage
 * @description Reads when each of the project's keys last authorized a batch, from
 * `GET /v2/projects/{project}/key-usage` with the widget token. A failed request gives null, so
 * the console just leaves the key lines out.
 *
 * @example
 * const usage = await fetchKeyUsage({ endpoint: "https://api.example.com", project: "site", token: "wt_1" });
 */
export async function fetchKeyUsage(options: Options): Promise<Nullable<KeyUsage>> {
  const send = options.fetch ?? fetch;
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  try {
    const response = await send(
      `${base}/v2/projects/${encodeURIComponent(options.project)}/key-usage`,
      {
        headers: { accept: "application/json", authorization: `Bearer ${options.token}` },
      },
    );
    if (response.status !== 200) return null;
    const body = (await response.json()) as { data?: Partial<KeyUsage> };
    const usage = body.data;
    return isUse(usage?.public) && isUse(usage?.secret)
      ? { public: usage.public, secret: usage.secret }
      : null;
  } catch {
    return null;
  }
}

/**
 * @name describeKeyUse
 * @description One key's last use for the status line, such as "Public key used 5 min ago from
 * https://site.nl" or "Secret key not used yet".
 *
 * @example
 * describeKeyUse("Public", { lastUsedAt: "2026-10-24T11:55:00.000Z", lastUsedOrigin: "https://site.nl" }, new Date("2026-10-24T12:00:00.000Z"));
 */
export function describeKeyUse(label: string, use: KeyUse, now: Date): string {
  if (use.lastUsedAt === null) return `${label} key not used yet`;
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(use.lastUsedAt)) / 60_000));
  const hours = Math.floor(minutes / 60);
  const ago =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes} min ago`
        : hours < 24
          ? `${hours} h ago`
          : `${Math.floor(hours / 24)} d ago`;
  return `${label} key used ${ago} from ${use.lastUsedOrigin ?? "a server"}`;
}

/**
 * @name describeToken
 * @description Whether the widget token is still good and until when, in the viewer's time.
 *
 * @example
 * describeToken("2026-10-24T12:15:00.000Z", new Date("2026-10-24T12:00:00.000Z")); // "Token live until 12:15"
 */
export function describeToken(expiresAt: string, now: Date): string {
  const at = new Date(expiresAt);
  if (at.getTime() <= now.getTime()) return "Token expired";
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `Token live until ${time}`;
}
