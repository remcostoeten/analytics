import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogFrame } from "@/components/blog/blog-frame";
import { PostToc } from "@/components/blog/post-toc";
import { ArrowIcon } from "@/components/landing/icons";
import { SiteShell } from "@/components/landing/site-shell";
import { getMDXComponents } from "@/components/mdx";
import { getBlogPost, listBlogPosts } from "@/lib/blog";
import { blogClick } from "@/lib/blog-tracking";
import { formatPostDate } from "@/lib/changelog-date";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: `${post.title} | Spoar`,
      description: post.description,
      url: `https://docs.analytics.remcostoeten.nl/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Spoar`,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const MDX = post.body;
  return (
    <SiteShell>
      <PostToc items={post.toc} />
      <BlogFrame>
        <header className="flex flex-col gap-3">
          <nav aria-label="Breadcrumb">
            <ol className="caps flex items-center gap-2 text-muted">
              <li>
                <Link
                  href="/blog"
                  className="transition-colors hover:text-fg focus-visible:text-accent focus-visible:outline-none"
                >
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{post.category}</li>
            </ol>
          </nav>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            {post.title}
          </h1>
          <time dateTime={post.date} className="text-[0.8rem] text-muted">
            {formatPostDate(post.date).date}
          </time>
        </header>
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
        {post.docs ? (
          <footer className="border-t border-line pt-6 text-sm">
            <Link
              href={post.docs}
              {...blogClick("blog-guide", post.slug, "post-footer")}
              className="link-line inline-flex items-center gap-1.5 text-fg"
            >
              Read the custom events guide
              <ArrowIcon className="size-3" />
            </Link>
          </footer>
        ) : null}
      </BlogFrame>
    </SiteShell>
  );
}
