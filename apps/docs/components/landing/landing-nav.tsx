import { listExamples } from "@/lib/examples";

import { SiteNav, type NavGroup, type NavLink } from "./site-nav";

const quickStart = "/docs/getting-started/quick-start";

type Props = {
  loginHref: string;
};

function navGroups(): NavGroup[] {
  const tools: NavLink[] = [
    {
      label: "API reference",
      href: "/docs/reference",
      description: "Every route of the v2 API.",
      art: "reference",
    },
    {
      label: "Query",
      href: "/query",
      description: "Run read-only SQL with an API token.",
      art: "query",
    },
  ];
  if (listExamples().length > 0) {
    tools.push({
      label: "Examples",
      href: "/examples",
      description: "Small apps, one per stack.",
      art: "examples",
    });
  }
  return [
    {
      title: "Start",
      links: [
        {
          label: "Quick start",
          href: quickStart,
          description: "Create a project and send the first event.",
          art: "quick-start",
        },
        {
          label: "Concepts",
          href: "/docs/getting-started/concepts",
          description: "Projects, keys, sessions and events.",
          art: "concepts",
        },
        {
          label: "Build a dashboard",
          href: "/docs/tutorial/create-a-project",
          description: "A seven step tutorial in React.",
          art: "tutorial",
        },
      ],
    },
    {
      title: "SDK",
      links: [
        {
          label: "Install",
          href: "/docs/sdk/install",
          description: "The package, its entries and sizes.",
          art: "install",
        },
        {
          label: "Frameworks",
          href: "/docs/frameworks",
          description: "Setup per stack: Next, React, Vue, Astro and more.",
          art: "frameworks",
        },
        {
          label: "Plugins",
          href: "/docs/plugins",
          description: "Opt-in errors, forms, scroll depth and more.",
          art: "plugins",
        },
      ],
    },
    {
      title: "Guides",
      links: [
        {
          label: "Custom events",
          href: "/docs/guides/custom-events",
          description: "Track what matters beyond page views.",
          art: "events",
        },
        {
          label: "Read your data",
          href: "/docs/guides/read-your-data",
          description: "Numbers and breakdowns over HTTP or TypeScript.",
          art: "read",
        },
        {
          label: "Self-host",
          href: "/docs/guides/self-host",
          description: "Run the API on your own Postgres.",
          art: "self-host",
        },
      ],
    },
    { title: "API", links: tools },
  ];
}

export function LandingNav({ loginHref }: Props) {
  return <SiteNav groups={navGroups()} loginHref={loginHref} />;
}
