import { CodeBlock, Pre as CodePre } from "fumadocs-ui/components/codeblock";
import type { ComponentProps } from "react";

const labels: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  json: "JSON",
  sql: "SQL",
  env: "Env",
  dotenv: "Env",
  html: "HTML",
  css: "CSS",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  text: "Text",
  txt: "Text",
  md: "Markdown",
  mdx: "MDX",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
};

type Props = ComponentProps<typeof CodeBlock> & {
  "data-language"?: string;
};

export function Pre({ title, "data-language": language, children, ...props }: Props) {
  const label = language ? (labels[language] ?? language) : null;
  return (
    <CodeBlock
      {...props}
      title={
        <span className="flex w-full items-center justify-between gap-3">
          <span className="truncate text-[0.72rem] text-fd-foreground/80">{title ?? label}</span>
          {title && label ? (
            <span className="caps text-[0.6rem] text-fd-muted-foreground">{label}</span>
          ) : null}
        </span>
      }
    >
      <CodePre>{children}</CodePre>
    </CodeBlock>
  );
}
