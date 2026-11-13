import type { ReactNode } from "react";

import { siteUrl } from "@/shared/config/site";
import { Logo } from "@/shared/ui/logo";

type Props = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
};

export function StatusPage({ eyebrow, title, description, children }: Props) {
  const docs = siteUrl();

  return (
    <div className="auth flex min-h-screen flex-col">
      <nav className="flex justify-center px-4 pt-3">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-[0_6px_24px_-12px_rgb(60_30_10/0.25)] backdrop-blur-md">
          <a
            href={docs}
            className="mr-6 flex items-center gap-2 rounded-full py-1 pr-2 pl-1.5 text-[0.85rem] font-medium tracking-tight"
          >
            <Logo className="size-6" />
            Spoar
          </a>
          <a href={`${docs}/docs`} className="auth-pill">
            Docs
          </a>
        </div>
      </nav>

      <main className="flex flex-1 items-start justify-center px-4 pt-[12vh] pb-24">
        <section className="auth-card w-full max-w-md p-6 sm:p-8">
          <header className="mb-8 grid gap-3 text-center font-serif">
            <p className="text-sm text-muted">{eyebrow}</p>
            <h1 className="text-4xl leading-tight font-light tracking-[-0.02em]">{title}</h1>
            <div className="text-sm text-muted">{description}</div>
          </header>
          <div className="flex flex-wrap justify-center gap-2">{children}</div>
        </section>
      </main>
    </div>
  );
}
