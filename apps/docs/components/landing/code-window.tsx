import { highlight } from "fumadocs-core/highlight";
import { cacheLife } from "next/cache";

import { Pre } from "@/components/code-block";
import { codeThemes } from "@/lib/code-theme";

import { CodeFrame } from "./code-frame";

type Props = {
  title: string;
  lang: string;
  code: string;
  mark?: number[];
};

export async function highlightCode(code: string, lang: string, mark: number[] = []) {
  "use cache";
  cacheLife("max");
  return highlight(code.trimEnd(), {
    lang,
    themes: codeThemes,
    defaultColor: false,
    components: { pre: Pre },
    transformers: [
      {
        line(node, line) {
          if (mark.includes(line)) this.addClassToHast(node, "is-marked");
        },
      },
    ],
  });
}

export async function CodeWindow({ title, lang, code, mark = [] }: Props) {
  const rendered = await highlightCode(code, lang, mark);
  return (
    <CodeFrame files={[{ id: title, title }]} active={title} lang={lang} code={code}>
      {rendered}
    </CodeFrame>
  );
}
