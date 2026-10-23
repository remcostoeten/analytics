import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { preloadFileTree } from "@pierre/trees/ssr";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { ExampleBrowser } from "@/components/examples/example-browser";
import { highlightCode } from "@/components/landing/code-window";
import { ArrowIcon } from "@/components/landing/icons";
import { SiteShell } from "@/components/landing/site-shell";
import { getExample, listExamples } from "@/lib/examples";

type Props = {
  params: Promise<{ slug: string }>;
};

const repositoryUrl = "https://github.com/remcostoeten/analytics/tree/master/examples";

const languages: { [extension: string]: string } = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".json": "json",
  ".css": "css",
  ".html": "html",
  ".md": "md",
};

export function generateStaticParams() {
  const params = listExamples().map((example) => ({ slug: example.slug }));
  // Cache Components refuses an empty list, so a slug no example uses stands in and 404s.
  return params.length > 0 ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = getExample((await params).slug);
  if (!example) return {};
  return {
    title: example.title,
    description: example.description,
    alternates: { canonical: `/examples/${example.slug}` },
    openGraph: {
      type: "article",
      title: `${example.title} | Spoar docs`,
      description: example.description,
      url: `https://docs.analytics.remcostoeten.nl/examples/${example.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${example.title} | Spoar docs`,
      description: example.description,
    },
  };
}

function languageOf(file: string) {
  return languages[extname(file)] ?? "txt";
}

async function readSource(directory: string, file: string) {
  "use cache";
  cacheLife("max");
  return readFile(join(process.cwd(), "..", "..", "examples", directory, file), "utf8");
}

export default async function ExamplePage({ params }: Props) {
  const example = getExample((await params).slug);
  if (!example) notFound();
  const files = await Promise.all(
    example.files.map(async (file) => {
      const code = await readSource(example.directory, file);
      const lang = languageOf(file);
      return { path: file, lang, code, rendered: await highlightCode(code, lang) };
    }),
  );
  const treeId = `example-tree-${example.slug}`;
  const tree = preloadFileTree({
    id: treeId,
    paths: example.files,
    initialExpansion: "open",
    initialSelectedPaths: example.files.slice(0, 1),
    search: true,
  });
  return (
    <SiteShell>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="flex max-w-xl flex-col gap-3">
          <span className="caps text-muted">Example / {example.stack}</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            {example.title}
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">{example.description}</p>
          <a
            href={`${repositoryUrl}/${example.directory}`}
            className="link-line inline-flex w-fit items-center gap-1.5 text-sm text-fg"
          >
            Open on GitHub
            <ArrowIcon className="size-3" />
          </a>
        </header>
        {example.preview ? (
          <section>
            <iframe
              src={example.preview}
              title={`${example.title} preview`}
              loading="lazy"
              className="aspect-video w-full rounded-[10px] border border-line bg-surface"
            />
          </section>
        ) : null}
        <section>
          <ExampleBrowser
            id={treeId}
            files={files}
            preloaded={{ id: tree.id, shadowHtml: tree.shadowHtml }}
          />
        </section>
      </main>
    </SiteShell>
  );
}
