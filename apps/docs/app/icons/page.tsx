import type { NavArt } from "@/components/landing/nav-art";
import { NavArtTile } from "@/components/landing/nav-art";

type IconItem = {
  label: string;
  description: string;
  art: NavArt;
};

type IconGroup = {
  title: string;
  items: IconItem[];
};

const groups: IconGroup[] = [
  {
    title: "Start",
    items: [
      {
        label: "Quick start",
        description: "Create a project and send the first event.",
        art: "quick-start",
      },
      {
        label: "Concepts",
        description: "Projects, keys, sessions and events.",
        art: "concepts",
      },
      {
        label: "Build a dashboard",
        description: "A seven step tutorial in React.",
        art: "tutorial",
      },
    ],
  },
  {
    title: "SDK",
    items: [
      {
        label: "Install",
        description: "The package, its entries and sizes.",
        art: "install",
      },
      {
        label: "Frameworks",
        description: "Setup per stack: Next, React, Vue, Astro and more.",
        art: "frameworks",
      },
      {
        label: "Plugins",
        description: "Opt-in errors, forms, scroll depth and more.",
        art: "plugins",
      },
    ],
  },
  {
    title: "Guides",
    items: [
      {
        label: "Custom events",
        description: "Track what matters beyond page views.",
        art: "events",
      },
      {
        label: "Read your data",
        description: "Numbers and breakdowns over HTTP or TypeScript.",
        art: "read",
      },
      {
        label: "Self-host",
        description: "Run the API on your own Postgres.",
        art: "self-host",
      },
    ],
  },
  {
    title: "API",
    items: [
      {
        label: "API reference",
        description: "Every route of the v2 API.",
        art: "reference",
      },
      {
        label: "Query",
        description: "Run read-only SQL with an API token.",
        art: "query",
      },
      {
        label: "Examples",
        description: "Small apps, one per stack.",
        art: "examples",
      },
    ],
  },
];

export default function IconsPage() {
  return (
    <main className="landing min-h-screen bg-surface px-5 py-16 text-fg sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Artifact</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
            Docs menu icons
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Hover or focus an icon to preview the animation used in the docs dropdown.
          </p>
        </header>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="px-1 text-xs font-medium tracking-[0.16em] text-muted uppercase">
                {group.title}
              </h2>
              <div className="mt-3 grid gap-1 rounded-2xl border border-line bg-surface p-2 shadow-[0_16px_40px_-28px_rgb(var(--shade)/0.35)]">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    tabIndex={0}
                    className="nav-item flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-fg/5 focus-visible:bg-fg/5 focus-visible:outline-none"
                  >
                    <NavArtTile art={item.art} />
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-[0.85rem] text-fg">{item.label}</span>
                      <span className="mt-0.5 block text-[0.75rem] leading-snug text-muted">
                        {item.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
