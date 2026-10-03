import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CodeWindow } from "@/components/landing/code-window";
import { ArrowIcon } from "@/components/landing/icons";
import type { Example } from "@/lib/examples";
import { getExample, listExamples } from "@/lib/examples";
import { baseOptions } from "@/lib/layout-options";

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

export const dynamicParams = false;

export function generateStaticParams() {
  return listExamples().map((example) => ({ slug: example.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = getExample((await params).slug);
  if (!example) return {};
  return { title: example.title, description: example.description };
}

function languageOf(file: string) {
  return languages[extname(file)] ?? "txt";
}

function readSource(example: Example, file: string) {
  return readFile(join(process.cwd(), "..", "..", "examples", example.directory, file), "utf8");
}

export default async function ExamplePage({ params }: Props) {
  const example = getExample((await params).slug);
  if (!example) notFound();
  const sources = await Promise.all(example.files.map((file) => readSource(example, file)));
  return (
    <HomeLayout {...baseOptions()}>
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
          <Tabs items={example.files}>
            {example.files.map((file, index) => (
              <Tab key={file} value={file}>
                <CodeWindow title={file} lang={languageOf(file)} code={sources[index] ?? ""} />
              </Tab>
            ))}
          </Tabs>
        </section>
      </main>
    </HomeLayout>
  );
}
