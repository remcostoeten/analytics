import { useEffect, useRef, useState } from "react";

/**
 * @name useCopy
 * @description Copies a string to the clipboard and reports for 1.6 seconds
 * that the copy succeeded.
 *
 * @example
 * const { copied, copy } = useCopy("npm install @spoar/sdk");
 * <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>
 */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function copy() {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        clearTimeout(resetTimer.current);
        setCopied(true);
        resetTimer.current = setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => setCopied(false));
  }

  return { copied, copy };
}
