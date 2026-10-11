import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import Link from "next/link";

import { listPosts, postLabel } from "@/lib/changelog";
import { formatPostDate } from "@/lib/changelog-date";
import { baseOptions } from "@/lib/layout-options";

export const metadata: Metadata = {
  title: "Changelog",
  description: "New features and changes in Spoar, one post per change.",
};

export default function ChangelogPage() {
  const posts = listPosts();
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="flex max-w-xl flex-col gap-3">
          <span className="caps text-muted">Changelog</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            What changed in Spoar
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">
            One post per change worth knowing about. Every package version is listed in the{" "}
            <Link href="/docs/changelog" className="link-line text-fg">
              package changelog
            </Link>
            .
          </p>
        </header>
        <section>
          <ol className="flex flex-col">
            {posts.map((post) => {
              const { date, week } = formatPostDate(post.date);
              return (
                <li
                  key={post.slug}
                  className="grid gap-3 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[180px_1fr] md:gap-8"
                >
                  <div className="flex flex-col gap-1 text-[0.8rem]">
                    <time dateTime={post.date} className="text-fg">
                      {date}
                    </time>
                    <span className="text-muted">{week}</span>
                  </div>
                  <Link href={`/changelog/${post.slug}`} className="group flex flex-col gap-3">
                    <span className="caps text-muted">{postLabel(post.label)}</span>
                    <h2 className="text-[1.15rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg group-hover:underline">
                      {post.title}
                    </h2>
                    <p className="max-w-xl text-[0.875rem] leading-relaxed text-muted">
                      {post.description}
                    </p>
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.imageAlt ?? ""}
                        loading="lazy"
                        className="mt-2 aspect-video w-full rounded-[10px] border border-line bg-surface object-cover object-top"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </HomeLayout>
  );
}
