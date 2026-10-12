import { preloadFile } from "@pierre/diffs/ssr";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { ArrowIcon } from "@/components/landing/icons";
import { QueryConsole } from "@/components/query/query-console";
import type { QueryPreset } from "@/components/query/query-console";
import { apiEndpoint } from "@/lib/api-endpoint";
import { pierreThemes } from "@/lib/diff-themes";
import { baseOptions } from "@/lib/layout-options";
import { sqlPresets } from "@/lib/sql-presets";

export const metadata: Metadata = {
  title: "Query",
  description: "Run read-only SQL against your projects with an API token.",
};

async function preloadPresets(): Promise<QueryPreset[]> {
  "use cache";
  cacheLife("max");
  return Promise.all(
    sqlPresets.map(async (preset) => {
      const preloaded = await preloadFile({
        file: { name: "query.sql", contents: preset.sql },
        options: { theme: pierreThemes, overflow: "wrap", disableFileHeader: true },
      });
      return {
        id: preset.id,
        title: preset.title,
        sql: preset.sql,
        prerenderedHTML: preloaded.prerenderedHTML,
      };
    }),
  );
}

export default async function QueryPage() {
  const presets = await preloadPresets();
  return (
    <HomeLayout {...baseOptions()}>
      <main className="framed mx-auto w-[min(1040px,calc(100%-32px))] flex-1">
        <header className="flex max-w-xl flex-col gap-3">
          <span className="caps text-muted">Tools / SQL</span>
          <h1 className="text-[1.75rem] leading-[1.2] font-medium tracking-[-0.015em] text-fg">
            Query
          </h1>
          <p className="text-[0.9rem] leading-relaxed text-muted">
            One read-only <code>SELECT</code> or <code>WITH</code> against the console views.{" "}
            <code>:from</code>, <code>:to</code> and <code>:project</code> are bound from the fields
            below.
          </p>
          <Link
            href="/docs/api/sql"
            className="link-line inline-flex w-fit items-center gap-1.5 text-sm text-fg"
          >
            Views, limits and who may run SQL
            <ArrowIcon className="size-3" />
          </Link>
        </header>
        <section>
          <QueryConsole endpoint={apiEndpoint()} presets={presets} />
        </section>
      </main>
    </HomeLayout>
  );
}
