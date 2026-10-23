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

function buildBreadcrumbs(slug: string[] = []) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://docs.analytics.remcostoeten.nl",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Docs",
      item: "https://docs.analytics.remcostoeten.nl/docs",
    },
  ];

  let currentPath = "/docs";
  for (let i = 0; i < slug.length; i++) {
    currentPath += `/${slug[i]}`;
    const name = slug[i]
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name,
      item: `https://docs.analytics.remcostoeten.nl${currentPath}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildArticleSchema(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: `https://docs.analytics.remcostoeten.nl${url}`,
    publisher: {
      "@type": "Organization",
      name: "Spoar",
      url: "https://docs.analytics.remcostoeten.nl",
    },
  };
}

async function PageContent({ params }: Props) {
  const resolvedParams = await params;
  const page = source.getPage(resolvedParams.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const description =
    page.data.description ??
    `${page.data.title} - Spoar API reference and developer documentation.`;
  const breadcrumbs = buildBreadcrumbs(resolvedParams.slug);
  const articleSchema = buildArticleSchema(page.data.title, description, page.url);

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
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

  const description =
    page.data.description ??
    `${page.data.title} - Spoar API reference and developer documentation.`;

  return {
    title: page.data.title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "article",
      title: `${page.data.title} | Spoar docs`,
      description,
      url: `https://docs.analytics.remcostoeten.nl${page.url}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.data.title} | Spoar docs`,
      description,
    },
  };
}
