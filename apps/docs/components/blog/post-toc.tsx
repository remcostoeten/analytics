import type { TOCItemType } from "fumadocs-core/toc";

type Props = {
  items: readonly TOCItemType[];
};

export function PostToc({ items }: Props) {
  const sections = items.filter((item) => item.depth === 2);
  return (
    <nav
      aria-label="On this page"
      className="fixed top-28 left-[calc(50%+404px)] hidden max-h-[calc(100dvh-9rem)] w-52 overflow-y-auto text-[0.75rem] leading-snug xl:block"
    >
      <p className="caps mb-3 text-muted">On this page</p>
      <ol className="flex flex-col gap-2">
        {sections.map((item) => (
          <li key={item.url}>
            <a href={item.url} className="link-line text-muted hover:text-fg focus-visible:text-fg">
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
