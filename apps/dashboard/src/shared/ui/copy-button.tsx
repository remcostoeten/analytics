"use client";

import { useEffect, useState } from "react";

import { Button } from "./button";

type Props = { value: string; label?: string; className?: string };

const copiedMs = 1200;

export function CopyButton({ value, label = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), copiedMs);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
