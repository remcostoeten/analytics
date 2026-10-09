"use client";

import { outlineButton } from "./control";
import { CheckIcon, CopyIcon } from "./icons";
import { useCopy } from "./use-copy";

type Props = {
  command: string;
};

export function InstallCommand({ command }: Props) {
  const { copied, copy } = useCopy(command);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy install command"
      title="Copy install command"
      data-copied={copied}
      className={`${outlineButton} copy-control h-auto px-3 py-2.5 font-mono text-[0.75rem] whitespace-nowrap`}
    >
      <span className="opacity-60 select-none">$</span>
      <span>{command}</span>
      <span className="copy-feedback" aria-hidden="true">
        <CopyIcon className="copy-idle size-3.5" />
        <CheckIcon className="copy-done size-3.5 text-ok" />
      </span>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
