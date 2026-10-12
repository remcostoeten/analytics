import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Link from "next/link";

import { ChevronIcon } from "@/components/landing/icons";
import { LandingNav } from "@/components/landing/landing-nav";
import { changelog } from "@/generated/changelog";
import { dashboardUrl } from "@/lib/dashboard-url";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Product updates and package releases for Spoar, privacy-first web analytics you host yourself.",
  alternates: { canonical: "/changelog" },
};

function inlineChange(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

type Version = (typeof changelog.releases)[number]["versions"][number];

function ReleaseVersion({ version }: { version: Version }) {
  return (
    <div className="max-w-[44rem]">
      <h4 className="font-mono text-sm text-fg">{version.version}</h4>
      <div className="mt-4 flex flex-col gap-6">
        {version.sections.map((section) => (
          <div key={section.title}>
            <p className="caps text-muted">{section.title}</p>
            <ul className="mt-3 flex list-disc flex-col gap-4 pl-5 font-serif text-[1.02rem] leading-[1.7] text-fg marker:text-muted [&_code]:rounded [&_code]:bg-line/40 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.85em]">
              {section.changes.map((change) => (
                <li key={change} className="[&>p+p]:mt-3">
                  {change.split("\n\n").map((paragraph) => (
                    <p key={paragraph}>{inlineChange(paragraph)}</p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
      <LandingNav loginHref={dashboardUrl("/sign-in")} />
      <main className="hero-wash flex-1 px-4 pt-32 pb-20 font-serif sm:pt-40 sm:pb-28">
        <div className="container-land flex flex-col gap-14 sm:gap-20">
          <header className="max-w-2xl">
            <span className="caps text-muted">Changelog</span>
            <h1 className="mt-3 font-serif text-[2.8rem] leading-[1.04] font-light tracking-[-0.025em] text-fg sm:text-[4.2rem]">
              What changed in <em className="accent-text">Spoar</em>
            </h1>
            <p className="mt-5 max-w-xl font-serif text-[1.05rem] leading-relaxed text-muted">
              Releases, dashboard updates and API changes for privacy-first web analytics you host
              yourself.
            </p>
          </header>

          <section aria-labelledby="releases-heading" className="flex flex-col gap-6">
            <div>
              <span className="caps text-muted">Packages</span>
              <h2
                id="releases-heading"
                className="mt-2 font-serif text-[2.2rem] leading-[1.1] font-light tracking-[-0.015em] text-fg sm:text-[2.7rem]"
              >
                Package releases
              </h2>
            </div>
            <div className="flex flex-col gap-12 sm:gap-16">
              {changelog.releases.map((release) => {
                const [latest, ...earlier] = release.versions;
                return (
                  <article
                    key={release.name}
                    className="grid gap-6 border-t border-line pt-8 md:grid-cols-[14rem_1fr] md:gap-10"
                  >
                    <div className="md:sticky md:top-28 md:self-start">
                      <h3 className="font-mono text-[0.95rem] text-fg">{release.name}</h3>
                      <a
                        href={`https://www.npmjs.com/package/${release.name}`}
                        className="link-line mt-2 inline-block text-sm text-muted"
                      >
                        View on npm
                      </a>
                    </div>
                    <div className="flex min-w-0 flex-col gap-8">
                      {latest ? <ReleaseVersion version={latest} /> : null}
                      {earlier.length > 0 ? (
                        <details className="group rounded-2xl border border-line">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm text-muted transition-colors duration-150 ease-[ease] select-none group-open:border-b group-open:border-line hover:text-fg [&::-webkit-details-marker]:hidden">
                            {earlier.length} earlier {earlier.length === 1 ? "release" : "releases"}
                            <ChevronIcon className="size-4 shrink-0 transition-transform duration-200 ease-(--ease-out) group-open:rotate-180" />
                          </summary>
                          <div className="flex flex-col gap-10 px-5 py-6 group-open:animate-settle">
                            {earlier.map((version) => (
                              <ReleaseVersion key={version.version} version={version} />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="updates-heading" className="flex flex-col gap-6">
            <div>
              <span className="caps text-muted">Repository</span>
              <h2
                id="updates-heading"
                className="mt-2 font-serif text-[2.2rem] leading-[1.1] font-light tracking-[-0.015em] text-fg sm:text-[2.7rem]"
              >
                Recent product updates
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-line border-y border-line">
              {changelog.updates.map((group) => (
                <section key={group.date} className="grid gap-4 py-6 sm:grid-cols-[9rem_1fr]">
                  <h3 className="font-mono text-xs text-muted">{group.date}</h3>
                  <ul className="flex flex-col gap-3">
                    {group.updates.map((update) => (
                      <li
                        key={`${update.scope}-${update.title}`}
                        className="font-serif text-[0.95rem] leading-relaxed text-fg"
                      >
                        <span className="mr-2 font-mono text-xs text-muted">{update.scope}</span>
                        {update.title}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <p className="text-sm text-muted">
            Read the{" "}
            <Link href="/docs" className="link-line text-fg">
              documentation
            </Link>{" "}
            or browse the project on{" "}
            <a href="https://github.com/remcostoeten/analytics" className="link-line text-fg">
              GitHub
            </a>
            .
          </p>
        </div>
      </main>
      <footer className="footer-wash px-4 pt-12 pb-10">
        <div className="container-land flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href="/" className="font-medium tracking-tight">
            Spoar
          </Link>
          <p className="font-serif text-sm text-muted">
            <Link href="/docs" className="link-line text-fg">
              Documentation
            </Link>{" "}
            ·{" "}
            <a href="https://github.com/remcostoeten/analytics" className="link-line text-fg">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
