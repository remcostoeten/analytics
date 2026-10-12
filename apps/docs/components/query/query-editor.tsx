"use client";

import { Editor } from "@pierre/diffs/edit";
import type { EditorOptions, EditorType } from "@pierre/diffs/edit";
import { EditProvider, File } from "@pierre/diffs/react";
import type { CSSProperties } from "react";

import { pierreThemes } from "@/lib/diff-themes";

type Props = {
  id: string;
  contents: string;
  prerenderedHTML: string;
  onChange: (sql: string) => void;
};

type EditorVariables = CSSProperties & {
  "--diffs-font-family": string;
  "--diffs-font-size": string;
};

const editorStyle: EditorVariables = {
  colorScheme: "inherit",
  "--diffs-font-family": "var(--font-mono)",
  "--diffs-font-size": "13px",
};

function createEditor<Type extends EditorType>(
  type: Type,
  options: EditorOptions<Type, undefined, undefined>,
  editStateKey?: string,
) {
  return new Editor(type, options, editStateKey);
}

export function QueryEditor({ id, contents, prerenderedHTML, onChange }: Props) {
  return (
    <EditProvider createEditor={createEditor}>
      <File
        key={id}
        file={{ name: "query.sql", contents }}
        prerenderedHTML={prerenderedHTML}
        options={{ theme: pierreThemes, overflow: "wrap", disableFileHeader: true }}
        style={editorStyle}
        edit
        editStateKey={`query:${id}`}
        onEditChange={(event) => onChange(event.file.contents)}
        onEditComplete={() => "accept"}
      />
    </EditProvider>
  );
}
