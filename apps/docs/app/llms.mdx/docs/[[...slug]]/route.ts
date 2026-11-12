import { notFound } from "next/navigation";

import { pageForSlug, renderPage } from "@/lib/llms";
import { source } from "@/lib/source";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export async function GET(_request: Request, props: Props) {
  const { slug = [] } = await props.params;
  const page = pageForSlug(slug);
  if (!page) notFound();

  return new Response(await renderPage(page), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
