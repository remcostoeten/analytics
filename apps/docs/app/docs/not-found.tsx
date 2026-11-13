import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";

const starts = [
  { label: "Introduction", href: "/docs" },
  { label: "Quick start", href: "/docs/getting-started/quick-start" },
  { label: "Install the SDK", href: "/docs/sdk/install" },
  { label: "API reference", href: "/docs/reference" },
];

export default function NotFound() {
  return (
    <DocsPage>
      <DocsTitle>Page not found</DocsTitle>
      <DocsDescription>
        There is no docs page at this address. It may have been renamed or moved.
      </DocsDescription>
      <DocsBody>
        <p>Search with the box in the sidebar, or start from one of these pages:</p>
        <ul>
          {starts.map((start) => (
            <li key={start.href}>
              <Link href={start.href}>{start.label}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/">Back to the Spoar homepage</Link>
        </p>
      </DocsBody>
    </DocsPage>
  );
}
