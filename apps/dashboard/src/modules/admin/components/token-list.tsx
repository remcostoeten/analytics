"use client";

import { notify } from "@remcostoeten/notifier";
import type { ApiToken } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { revokeToken } from "../actions";
import { formatDay } from "../token-form";

type Props = { tokens: ApiToken[] };

export function TokenList({ tokens }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  if (tokens.length === 0) {
    return <p className="caps text-muted py-8 text-center">No tokens yet</p>;
  }

  async function revoke(token: ApiToken) {
    const confirmed = await notify.confirm(
      `Revoke ${token.name}? Requests with it fail from then on.`,
      { confirmLabel: "Revoke", cancelLabel: "Keep" },
    );
    if (!confirmed) return;
    setBusy(token.id);
    const result = await revokeToken(token.id);
    setBusy(null);
    if (!result.ok) {
      notify.error(result.error.message);
      return;
    }
    notify.success(`Revoked ${token.name}`);
  }

  return (
    <ul className="card divide-y divide-line">
      {tokens.map((token) => (
        <li key={token.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{token.name}</span>
            <span className="text-muted font-mono text-xs">
              {token.scope} ·{" "}
              {token.projectIds === null ? "every project" : token.projectIds.join(", ")}
            </span>
          </span>
          <span className="flex items-center gap-4">
            <span className="caps text-muted hidden sm:inline">
              used {formatDay(token.lastUsedAt)} · expires {formatDay(token.expiresAt)}
            </span>
            <Button variant="danger" disabled={busy !== null} onClick={() => revoke(token)}>
              {busy === token.id ? "Revoking" : "Revoke"}
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
