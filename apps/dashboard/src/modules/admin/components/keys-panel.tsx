"use client";

import { notify } from "@remcostoeten/notifier";
import type { KeyKind, Project, RotatedKey } from "@spoar/contract";
import { useEffect, useState } from "react";

import { apiEndpoint } from "@/shared/api/endpoint";
import { Button } from "@/shared/ui/button";
import { Code } from "@/shared/ui/code";
import { CopyButton } from "@/shared/ui/copy-button";
import { rotateKey } from "../actions";
import { envBlock } from "../env-block";
import { describeKeyUsage } from "../key-usage";
import { Tip } from "@/shared/ui/tip";
import { KeyReveal } from "./key-reveal";

type Props = {
  project: string;
  publicKey: string;
  usage: Project["keyUsage"];
};

const notes = {
  public: "Browsers send it as X-Project-Key. The old key stops working at once.",
  secret: "For server-side ingest, sent as Authorization: Bearer. Shown once and stored as a hash.",
};

const unused = { lastUsedAt: null, lastUsedOrigin: null };

export function KeysPanel({ project, publicKey, usage }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [rotatedKinds, setRotatedKinds] = useState<KeyKind[]>([]);
  const [rotated, setRotated] = useState<RotatedKey | null>(null);
  const [busy, setBusy] = useState<KeyKind | null>(null);
  const currentPublic = rotated?.data.kind === "public" ? rotated.data.key : publicKey;
  const env = envBlock({
    project,
    endpoint: apiEndpoint(),
    publicKey: currentPublic,
    secretKey: null,
  });

  function usageLine(kind: KeyKind) {
    if (!now) return "";
    return describeKeyUsage(rotatedKinds.includes(kind) ? unused : usage[kind], now);
  }

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
    setRotatedKinds((kinds) => [...kinds, kind]);
  }

  return (
    <div className="grid gap-4">
      {rotated && rotated.data.kind === "secret" ? (
        <KeyReveal title="New secret key" value={rotated.data.key} note={notes.secret} />
      ) : null}
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps flex items-center gap-1.5">
            Public key
            <Tip label="About the public key">
              An ID that tells us which project the data belongs to. It sits in your site's code, so
              anyone can see it. That is fine: it can only send data in, never read it out.
            </Tip>
          </h2>
          <div className="flex gap-2">
            <CopyButton value={currentPublic} />
            <Button variant="danger" disabled={busy !== null} onClick={() => rotate("public")}>
              {busy === "public" ? "Rotating" : "Rotate"}
            </Button>
          </div>
        </div>
        <Code value={currentPublic} />
        <p className="text-muted min-h-4 text-xs">{usageLine("public")}</p>
        <p className="text-muted text-xs">{notes.public}</p>
      </section>
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps flex items-center gap-1.5">
            Secret key
            <Tip label="About the secret key">
              A password for sending data from your own server. Keep it private and out of browser
              code. Rotating gives you a new one and the old one stops working straight away.
            </Tip>
          </h2>
          <Button variant="danger" disabled={busy !== null} onClick={() => rotate("secret")}>
            {busy === "secret" ? "Rotating" : "Rotate"}
          </Button>
        </div>
        <p className="text-muted min-h-4 text-xs">{usageLine("secret")}</p>
        <p className="text-muted text-xs">
          Stored as a hash and never shown again. Rotate it to get a new one.
        </p>
      </section>
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps flex items-center gap-1.5">
            Environment
            <Tip label="About the environment block">
              Ready-made settings to paste into your project's .env file, so your site knows where
              to send data and which project it is.
            </Tip>
          </h2>
          <CopyButton value={env} />
        </div>
        <Code value={env} />
      </section>
    </div>
  );
}
