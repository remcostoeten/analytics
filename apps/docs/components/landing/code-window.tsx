import { highlight } from "fumadocs-core/highlight";
import type { ComponentProps } from "react";

import { codeThemes } from "@/lib/code-theme";

function Pre({ className, ...props }: ComponentProps<"pre">) {
  return (
    <pre
      {...props}
      className={`${className ?? ""} not-fumadocs-codeblock overflow-x-auto p-4 font-mono text-[13px] leading-6`}
    />
  );
}

type Props = {
  title: string;
  lang: string;
  code: string;
};

export async function CodeWindow({ title, lang, code }: Props) {
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
