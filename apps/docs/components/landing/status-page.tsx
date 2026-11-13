import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
};

export function StatusPage({ eyebrow, title, description, children }: Props) {
  return (
    <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
      <header className="flex max-w-xl flex-col gap-3 py-16!">
        <span className="caps text-muted">{eyebrow}</span>
        <h1 className="font-serif text-[2.25rem] leading-[1.15] font-light tracking-[-0.02em] text-fg">
          {title}
        </h1>
        <div className="text-[0.9rem] leading-relaxed text-muted">{description}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
      </header>
    </main>
  );
}
