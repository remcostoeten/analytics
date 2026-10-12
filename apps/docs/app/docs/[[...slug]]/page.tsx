import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getMDXComponents } from "@/components/mdx";
import { OpenAPIPage } from "@/components/openapi-page";
import { source } from "@/lib/source";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default function Page(props: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <PageContent params={props.params} />
    </Suspense>
  );
}

function PageFallback() {
  return (
    <DocsPage>
      <DocsTitle>Loading documentation</DocsTitle>
      <DocsBody>
        <div className="flex flex-col gap-4" aria-hidden="true">
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-fd-muted" />
          <div className="h-4 w-full animate-pulse rounded-md bg-fd-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-fd-muted" />
          <div className="mt-4 h-32 w-full animate-pulse rounded-md bg-fd-muted" />
        </div>
      </DocsBody>
    </DocsPage>
  );
}

async function PageContent({ params }: Props) {
  const resolvedParams = await params;
  const page = source.getPage(resolvedParams.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page), OpenAPIPage })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
