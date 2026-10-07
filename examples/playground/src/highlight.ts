import { useEffect, useState } from "react";
import { createHighlighterCore } from "shiki/core";
import type { HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type Language = "json" | "shellscript" | "typescript" | "tsx";

const maxLength = 60_000;

let loading: Promise<HighlighterCore> | null = null;

function highlighter() {
  loading ??= createHighlighterCore({
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark-dimmed.mjs"),
    ],
    langs: [
      import("shiki/langs/json.mjs"),
      import("shiki/langs/shellscript.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/tsx.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return loading;
}

/**
 * @name useHighlight
 * @description Highlights code with Shiki in both themes once the highlighter has loaded. Returns
 * null until then, and for code too long to highlight quickly, so callers show plain text.
 *
 * @example
 * const html = useHighlight(snippet, "typescript");
 */
export function useHighlight(code: string, language: Language) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setHtml(null);
    if (code.length > maxLength) return;
    highlighter().then(
      (shiki) => {
        if (!current) return;
        setHtml(
          shiki.codeToHtml(code, {
            lang: language,
            themes: { light: "github-light", dark: "github-dark-dimmed" },
            defaultColor: false,
          }),
        );
      },
      (error) => console.warn("Highlighting failed", error),
    );
    return () => {
      current = false;
    };
  }, [code, language]);
  return html;
}
