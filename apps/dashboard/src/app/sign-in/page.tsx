import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { redirect } from "next/navigation";

import { SignInButton } from "@/modules/session/components/sign-in-button";
import { readSession } from "@/modules/session/session";
import { siteUrl } from "@/shared/config/site";
import { Logo } from "@/shared/ui/logo";

export const metadata: Metadata = { title: "Sign in" };

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

type Props = { searchParams: Promise<{ error?: string | string[] }> };

export default async function Page({ searchParams }: Props) {
  const session = await readSession();
  if (session.user !== null) redirect("/");
  const docs = siteUrl();
  const { error } = await searchParams;
  const refused = typeof error === "string" ? error : null;

  return (
    <div className={`auth ${serif.variable} flex min-h-screen flex-col`}>
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
            <p className="text-sm text-muted">Spoar dashboard</p>
            <h1 className="text-4xl leading-tight font-light tracking-[-0.02em]">Sign in</h1>
            <p className="text-sm text-muted">Manage projects, keys and API tokens.</p>
          </header>

          {refused ? (
            <p
              role="alert"
              className="mb-5 rounded-2xl border border-err/25 bg-err/5 px-4 py-3 font-serif text-sm"
            >
              GitHub sign-in did not go through. Only logins on the allowlist can sign in.{" "}
              <code className="font-mono text-xs text-muted">{refused}</code>
            </p>
          ) : null}

          <SignInButton />

          <p className="mt-6 text-center font-serif text-sm text-muted">
            No access yet?{" "}
            <a href={`${docs}/docs/api/auth`} className="text-fg underline hover:no-underline">
              How access works
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
