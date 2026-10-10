import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowIcon } from "@/components/landing/icons";
import { getMDXComponents } from "@/components/mdx";
import { getPost, listPosts, postLabel } from "@/lib/changelog";
import { formatPostDate } from "@/lib/changelog-date";
import { baseOptions } from "@/lib/layout-options";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: post.image ? { images: [post.image] } : undefined,
  };
}

export default async function ChangelogPostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { date, week } = formatPostDate(post.date);
  const MDX = post.body;
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(760px,calc(100%-32px))] flex-1">
        <header className="flex flex-col gap-3">
          <Link href="/changelog" className="link-line w-fit text-[0.8rem] text-muted">
            All changes
          </Link>
          <span className="caps text-muted">{postLabel(post.label)}</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            {post.title}
          </h1>
          <p className="text-[0.8rem] text-muted">
            <time dateTime={post.date} className="text-fg">
              {date}
            </time>{" "}
            · {week}
          </p>
        </header>
        {post.image ? (
          <img
            src={post.image}
            alt={post.imageAlt ?? ""}
            className="w-full rounded-[10px] border border-line bg-surface"
          />
        ) : null}
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
        <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
          {post.docs ? (
            <Link href={post.docs} className="link-line inline-flex items-center gap-1.5 text-fg">
              Read the docs
              <ArrowIcon className="size-3" />
            </Link>
          ) : null}
          <Link href="/docs/changelog" className="link-line text-muted">
            Package changelog
          </Link>
        </footer>
      </main>
    </HomeLayout>
  );
}
