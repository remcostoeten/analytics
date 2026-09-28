import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError, IssueStore } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

export type AlertOptions = {
  url: string;
  secret: Nullable<string>;
  send: (url: string, init: RequestInit) => Promise<Response>;
};

const batchSize = 100;

async function sign(secret: string, body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * @name sendAlerts
 * @description Posts new issues and regressions not yet alerted on, up to 100 per run, to the
 * webhook as one JSON body signed with `x-analytics-signature: sha256=<hmac>` when a secret is
 * set, then marks them alerted. A failed delivery leaves them pending for the next run.
 *
 * @example
 * await sendAlerts(issues, { url, secret, send: fetch }, new Date());
 */
export async function sendAlerts(
  store: IssueStore,
  options: AlertOptions,
  now: Date,
): Promise<Result<{ sent: number }, EngineError>> {
  const pending = await store.pendingAlerts(batchSize);
  if (!pending.ok) return pending;
  if (pending.value.length === 0) return ok({ sent: 0 });
  const body = JSON.stringify({
    type: "issues.alert",
    sentAt: now.toISOString(),
    alerts: pending.value.map(({ issue, kind }) => ({
      kind,
      project: issue.projectId,
      issue: {
        id: issue.id,
        title: issue.title,
        culprit: issue.culprit,
        level: issue.level,
        count: issue.count,
        firstSeen: issue.firstSeen.toISOString(),
        lastSeen: issue.lastSeen.toISOString(),
        lastRelease: issue.lastRelease,
      },
    })),
  });
  const headers: { [name: string]: string } = { "content-type": "application/json" };
  if (options.secret)
    headers["x-analytics-signature"] = `sha256=${await sign(options.secret, body)}`;
  try {
    const response = await options.send(options.url, { method: "POST", headers, body });
    if (!response.ok) {
      return err(engineError("UNAVAILABLE", `The alert webhook answered ${response.status}`));
    }
  } catch {
    return err(engineError("UNAVAILABLE", "The alert webhook could not be reached"));
  }
  const marked = await store.markAlerted(pending.value.map((alert) => alert.issue));
  return marked.ok ? ok({ sent: pending.value.length }) : marked;
}
