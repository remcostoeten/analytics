"use client";

import { useState } from "react";

import { outlineButton } from "./control";
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
      title="Copy install command"
      className={`${outlineButton} h-auto px-3 py-2.5 font-mono text-[0.75rem] whitespace-nowrap`}
    >
      <span className="opacity-60 select-none">$</span>
      <span>{command}</span>
      {copied ? <CheckIcon className="size-3.5 text-ok" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}
