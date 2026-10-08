import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";

import "./globals.css";

import { Account } from "@/modules/session/components/account";
import { Notifier } from "@/shared/ui/notifier";

export const metadata: Metadata = {
  title: { default: "Spoar", template: "%s | Spoar" },
  description: "Projects and keys for the Spoar analytics API.",
  robots: { index: false, follow: false },
};

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <header className="border-b border-line">
          <div className="mx-auto flex h-12 max-w-4xl items-center justify-between gap-4 px-4">
            <nav className="flex items-center gap-4">
              <Link href="/admin/projects" className="caps">
                Spoar
              </Link>
              <Link href="/admin/projects" className="caps text-muted hover:text-fg">
                Projects
              </Link>
              <Link href="/admin/tokens" className="caps text-muted hover:text-fg">
                Tokens
              </Link>
            </nav>
            <Account />
          </div>
        </header>
        <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8">{children}</main>
        <Notifier />
      </body>
    </html>
  );
}
