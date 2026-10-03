"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "./icons";

type Props = {
  command: string;
};

export function InstallCommand({ command }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy install command"
      className="group inline-flex h-11 items-center gap-3 rounded-lg border border-fd-border bg-fd-card px-4 font-mono text-sm text-fd-muted-foreground transition-colors hover:border-fd-ring hover:text-fd-foreground"
    >
      <span className="select-none text-fd-muted-foreground/60">$</span>
      <span>{command}</span>
      <span className="ml-1 text-fd-muted-foreground/70 transition-colors group-hover:text-fd-foreground">
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </span>
    </button>
  );
}
