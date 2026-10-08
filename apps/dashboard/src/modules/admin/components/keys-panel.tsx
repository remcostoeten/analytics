"use client";

import { notify } from "@remcostoeten/notifier";
import type { KeyKind, RotatedKey } from "@spoar/contract";
import { useState } from "react";

import { apiEndpoint } from "@/shared/api/endpoint";
import { Button } from "@/shared/ui/button";
import { Code } from "@/shared/ui/code";
import { CopyButton } from "@/shared/ui/copy-button";
import { rotateKey } from "../actions";
import { envBlock } from "../env-block";
import { KeyReveal } from "./key-reveal";

type Props = { project: string; publicKey: string };

const notes = {
  public: "Browsers send it as X-Project-Key. The old key stops working at once.",
  secret: "For server-side ingest, sent as Authorization: Bearer. Shown once and stored as a hash.",
};

export function KeysPanel({ project, publicKey }: Props) {
  const [rotated, setRotated] = useState<RotatedKey | null>(null);
  const [busy, setBusy] = useState<KeyKind | null>(null);
  const currentPublic = rotated?.data.kind === "public" ? rotated.data.key : publicKey;
  const env = envBlock({ endpoint: apiEndpoint(), publicKey: currentPublic, secretKey: null });

  async function rotate(kind: KeyKind) {
    const confirmed = await notify.confirm(
      `Rotate the ${kind} key? The current one stops working at once.`,
      { confirmLabel: "Rotate", cancelLabel: "Keep" },
    );
    if (!confirmed) return;
    setBusy(kind);
    const result = await rotateKey(project, kind);
    setBusy(null);
    if (!result.ok) {
      notify.error(result.error.message);
      return;
    }
    notify.success(`Rotated the ${kind} key`);
    setRotated(result.value);
  }

  return (
    <div className="grid gap-4">
      {rotated && rotated.data.kind === "secret" ? (
        <KeyReveal title="New secret key" value={rotated.data.key} note={notes.secret} />
      ) : null}
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps">Public key</h2>
          <div className="flex gap-2">
            <CopyButton value={currentPublic} />
            <Button variant="danger" disabled={busy !== null} onClick={() => rotate("public")}>
              {busy === "public" ? "Rotating" : "Rotate"}
            </Button>
          </div>
        </div>
        <Code value={currentPublic} />
        <p className="text-muted text-xs">{notes.public}</p>
      </section>
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps">Secret key</h2>
          <Button variant="danger" disabled={busy !== null} onClick={() => rotate("secret")}>
            {busy === "secret" ? "Rotating" : "Rotate"}
          </Button>
        </div>
        <p className="text-muted text-xs">
          Stored as a hash and never shown again. Rotate it to get a new one.
        </p>
      </section>
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps">Environment</h2>
          <CopyButton value={env} />
        </div>
        <Code value={env} />
      </section>
    </div>
  );
}
