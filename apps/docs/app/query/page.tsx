import type { Metadata } from "next";
import Link from "next/link";

import { QueryConsole } from "@/components/query-console";
import { SiteShell } from "@/components/landing/site-shell";
import { apiEndpoint } from "@/lib/api-endpoint";

export const metadata: Metadata = {
  title: "Query",
  description: "Run read-only SQL against your projects with an API token.",
  alternates: { canonical: "/query" },
};

export default function QueryPage() {
  return (
    <SiteShell>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-fd-foreground">Query</h1>
          <p className="text-sm text-fd-muted-foreground">
            One read-only <code>SELECT</code> or <code>WITH</code> against the console views, with{" "}
            <code>:from</code>, <code>:to</code> and <code>:project</code> bound from the fields
            below. See the{" "}
            <Link href="/docs/api/sql" className="underline">
              SQL console guide
            </Link>{" "}
            for the views, limits and who may run SQL.
          </p>
        </header>
        <QueryConsole endpoint={apiEndpoint()} />
      </main>
    </SiteShell>
  );
}
