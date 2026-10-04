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
    <button type="button" onClick={copy} aria-label={label} title={label} className={ghostButton}>
      {copied ? <CheckIcon className="size-3.5 text-ok" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}
