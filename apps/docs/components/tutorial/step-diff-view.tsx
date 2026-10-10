"use client";

import type { DiffLineAnnotation, FileDiffMetadata } from "@pierre/diffs/react";
import { FileDiff } from "@pierre/diffs/react";
import { useState } from "react";
import type { CSSProperties } from "react";

import { diffThemes, registerDiffThemes } from "@/lib/diff-themes";

// Server rendering reuses the prerendered HTML; loading themes there blocks the prerender.
if (typeof window !== "undefined") registerDiffThemes();

export type PreloadedChange = {
  name: string;
  added: boolean;
  fileDiff: FileDiffMetadata;
  annotations: DiffLineAnnotation<{ text: string }>[];
  prerenderedHTML: string;
};

type Props = {
  changes: PreloadedChange[];
};

type DiffStyle = "unified" | "split";

type DiffVariables = CSSProperties & { "--diffs-font-family": string; "--diffs-font-size": string };

const diffStyleVariables: DiffVariables = {
  colorScheme: "inherit",
  "--diffs-font-family": "var(--font-mono)",
  "--diffs-font-size": "13px",
};

const styles: { value: DiffStyle; label: string }[] = [
  { value: "unified", label: "Unified" },
  { value: "split", label: "Split" },
];

function Note({ text }: { text: string }) {
  return (
    <p className="not-prose m-0 border-l-2 border-accent bg-surface px-4 py-2 font-sans text-[0.8rem] leading-relaxed text-fg">
      {text}
    </p>
  );
}

export function StepDiffView({ changes }: Props) {
  const [diffStyle, setDiffStyle] = useState<DiffStyle>("unified");
  const added = changes.filter((change) => change.added).length;
  return (
    <section className="not-prose my-6 flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-mono text-[0.72rem] text-muted">
          {changes.length} {changes.length === 1 ? "file" : "files"}, {added} new
        </p>
        <div role="group" aria-label="Diff layout" className="flex rounded-md border border-line">
          {styles.map((style) => (
            <button
              key={style.value}
              type="button"
              aria-pressed={diffStyle === style.value}
              onClick={() => setDiffStyle(style.value)}
              className="px-3 py-1 font-mono text-[0.72rem] text-muted aria-pressed:bg-surface aria-pressed:text-fg"
            >
              {style.label}
            </button>
          ))}
        </div>
      </header>
      {changes.map((change) => (
        <FileDiff<{ text: string }>
          key={change.name}
          fileDiff={change.fileDiff}
          lineAnnotations={change.annotations}
          prerenderedHTML={diffStyle === "unified" ? change.prerenderedHTML : undefined}
          renderAnnotation={(annotation) => <Note text={annotation.metadata.text} />}
          options={{ theme: diffThemes, diffStyle, overflow: "wrap" }}
          className="overflow-hidden rounded-[10px] border border-line"
          style={diffStyleVariables}
        />
      ))}
    </section>
  );
}
