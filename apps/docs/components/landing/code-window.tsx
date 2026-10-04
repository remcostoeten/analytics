import { highlight } from "fumadocs-core/highlight";
import { cacheLife } from "next/cache";

import { Pre } from "@/components/code-block";
import { codeThemes } from "@/lib/code-theme";

type Props = {
  title: string;
  lang: string;
  code: string;
};

export async function CodeWindow({ title, lang, code }: Props) {
  "use cache";
  cacheLife("max");
  const rendered = await highlight(code, {
    lang,
    themes: codeThemes,
    defaultColor: false,
    components: { pre: Pre },
  });

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-dashed border-line px-4 py-2">
        <span className="caps text-[0.62rem] text-muted">{title}</span>
        <span className="caps text-[0.62rem] text-muted">{lang}</span>
      </div>
      {rendered}
    </div>
  );
}
