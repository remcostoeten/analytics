import type { Metadata } from "next";
import Link from "next/link";

import { BlogFrame } from "@/components/blog/blog-frame";
import { SiteShell } from "@/components/landing/site-shell";
import { listBlogPosts } from "@/lib/blog";
import { blogClick } from "@/lib/blog-tracking";
import { formatPostDate } from "@/lib/changelog-date";

export const metadata: Metadata = {
  title: "Blog",
  description: "Case studies of real apps that send their own data to Spoar.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = listBlogPosts();
  return (
    <SiteShell>
      <BlogFrame>
        <header className="flex flex-col gap-3">
          <span className="caps text-muted">Blog</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            Spoar in real apps
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">
            What these apps send, how they read it back, and what went wrong on the way.
          </p>
        </header>
        <section>
          <ol className="flex flex-col">
            {posts.map((post) => (
              <li
                key={post.slug}
                className="grid gap-3 border-t border-line py-8 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[140px_1fr] md:gap-6"
              >
                <time dateTime={post.date} className="text-[0.8rem] text-fg">
                  {formatPostDate(post.date).date}
                </time>
                <Link
                  href={`/blog/${post.slug}`}
                  {...blogClick("blog-post", post.slug, "blog-index")}
                  className="group flex flex-col gap-3"
                >
                  <span className="caps text-muted">{post.category}</span>
                  <h2 className="text-[1.15rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg group-hover:underline">
                    {post.title}
                  </h2>
                  <p className="text-[0.875rem] leading-relaxed text-muted">{post.description}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </BlogFrame>
    </SiteShell>
  );
}
