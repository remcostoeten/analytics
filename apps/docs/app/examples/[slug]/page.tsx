import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SourceBrowser } from "@/components/examples/source-browser";
import { ArrowIcon } from "@/components/landing/icons";
import { getExample, listExamples } from "@/lib/examples";
import { baseOptions } from "@/lib/layout-options";

type Props = {
  params: Promise<{ slug: string }>;
};

const repositoryUrl = "https://github.com/remcostoeten/analytics/tree/master/examples";

export function generateStaticParams() {
  const params = listExamples().map((example) => ({ slug: example.slug }));
  // Cache Components refuses an empty list, so a slug no example uses stands in and 404s.
  return params.length > 0 ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = getExample((await params).slug);
  if (!example) return {};
  return { title: example.title, description: example.description };
}

async function readSource(directory: string, file: string) {
  "use cache";
  cacheLife("max");
  return readFile(join(process.cwd(), "..", "..", "examples", directory, file), "utf8");
}

export default async function ExamplePage({ params }: Props) {
  const example = getExample((await params).slug);
  if (!example) notFound();
  const sources = await Promise.all(
    example.files.map((file) => readSource(example.directory, file)),
  );
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="flex max-w-xl flex-col gap-3">
          <span className="caps text-muted">Example / {example.stack}</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            {example.title}
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">{example.description}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {example.tutorial ? (
              <Link
                href={example.tutorial}
                className="link-line inline-flex w-fit items-center gap-1.5 text-sm text-fg"
              >
                Build it step by step
                <ArrowIcon className="size-3" />
              </Link>
            ) : null}
            <a
              href={`${repositoryUrl}/${example.directory}`}
              className="link-line inline-flex w-fit items-center gap-1.5 text-sm text-fg"
            >
              Open on GitHub
              <ArrowIcon className="size-3" />
            </a>
          </div>
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
          <SourceBrowser
            files={example.files.map((file, index) => ({
              name: file,
              contents: sources[index] ?? "",
            }))}
          />
        </section>
      </main>
    </HomeLayout>
  );
}
