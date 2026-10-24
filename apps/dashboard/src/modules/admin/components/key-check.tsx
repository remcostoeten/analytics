"use client";

import { notify } from "@remcostoeten/notifier";
import type { KeyStatus } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { formatDateTime, formatRelative } from "@/modules/analytics/format";
import { checkKeys } from "../actions";

type Props = { project: string; status: KeyStatus["data"] };

const states = {
  connected: {
    answer: "Yes",
    tone: "text-ok",
    hint: "Events were accepted with the current public key.",
  },
  rejected: {
    answer: "No",
    tone: "text-err",
    hint: "Events arrived but none were accepted. Check the allowed origins and that the site uses the current public key.",
  },
  waiting: {
    answer: "No",
    tone: "text-muted",
    hint: "No events since the public key was generated. Load a page on the site with the current key.",
  },
} as const;

const secrets = {
  matches: { label: "Matches the stored key", tone: "text-ok" },
  mismatch: { label: "Does not match the stored key", tone: "text-err" },
  "not-tested": { label: "Not tested", tone: "text-muted" },
} as const;

export function KeyCheck({ project, status }: Props) {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const { check } = status;

  async function run() {
    setBusy(true);
    const result = await checkKeys(project, secret.trim() || null);
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error.message);
      return;
    }
    setSecret("");
  }

  return (
    <section className="card grid gap-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="caps">Key check</h2>
        <Button disabled={busy} onClick={run}>
          {busy ? "Checking" : check ? "Recheck" : "Run first check"}
        </Button>
      </div>
      {check ? (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm">
              Connected{" "}
              <span className={`font-medium ${states[check.state].tone}`}>
                {states[check.state].answer}
              </span>
            </span>
            <span className="caps text-muted" title={formatDateTime(check.checkedAt)}>
              Checked {formatRelative(check.checkedAt)}
            </span>
          </div>
          <p className="text-muted text-sm">{states[check.state].hint}</p>
          <dl className="grid gap-2 text-sm">
            <Row
              label="Public key"
              value={`Generated ${formatDateTime(status.publicKeyCreatedAt)} UTC`}
              note={`${check.accepted.toLocaleString()} accepted and ${check.rejected.toLocaleString()} refused since ${formatDateTime(check.since)} UTC`}
            />
            <Row
              label="Secret key"
              value={`Generated ${formatDateTime(status.secretKeyCreatedAt)} UTC`}
              note={secrets[check.secretKey].label}
              tone={secrets[check.secretKey].tone}
            />
          </dl>
        </>
      ) : (
        <p className="text-muted text-sm">
          Never checked. Public key generated {formatDateTime(status.publicKeyCreatedAt)} UTC,
          secret key generated {formatDateTime(status.secretKeyCreatedAt)} UTC.
        </p>
      )}
      <Field
        label="Secret key to verify"
        htmlFor="key-check-secret"
        hint="Optional. Compared by hash and never stored, since only the hash is kept."
      >
        <input
          id="key-check-secret"
          className="control font-mono"
          type="password"
          autoComplete="off"
          placeholder="sk_live_"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
      </Field>
    </section>
  );
}

type RowProps = { label: string; value: string; note: string; tone?: string };

function Row({ label, value, note, tone = "text-muted" }: RowProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="caps text-muted">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
      <dd className={`text-xs ${tone}`}>{note}</dd>
    </div>
  );
}
