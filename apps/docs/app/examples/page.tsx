import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { outlineButton } from "@/components/landing/control";
import { listExamples } from "@/lib/examples";
import { baseOptions } from "@/lib/layout-options";

export const metadata: Metadata = {
  title: "Examples",
  description: "Small apps that use the Spoar SDK, one per stack, with their full source.",
};

export default function ExamplesPage() {
  const examples = listExamples();
  if (examples.length === 0) notFound();
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="flex max-w-xl flex-col gap-3">
          <span className="caps text-muted">Examples</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            The SDK in a real app
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">
            Each example is a small app in the repository, with its source shown file by file.
          </p>
        </header>
        <section>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((example) => (
              <li key={example.slug}>
                <Link
                  href={`/examples/${example.slug}`}
                  className="card-wash flex h-full flex-col gap-4 rounded-[10px] border border-line bg-surface p-5"
                >
                  <span className={`${outlineButton} caps w-fit text-[0.6rem]`}>
                    {example.stack}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[0.95rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
                      {example.title}
                    </h2>
                    <p className="text-[0.8rem] leading-relaxed text-muted">
                      {example.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </HomeLayout>
  );
}
