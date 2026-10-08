"use client";

import { ghostButton } from "./control";
import { CheckIcon, CopyIcon } from "./icons";
import { useCopy } from "./use-copy";

type Props = {
  text: string;
  label: string;
};

export function CopyButton({ text, label }: Props) {
  const { copied, copy } = useCopy(text);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      data-copied={copied}
      className={`${ghostButton} copy-control`}
    >
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
