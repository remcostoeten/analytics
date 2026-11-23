import type { BeforeSend } from "@spoar/sdk";

type BlogClickLabel = "blog-post" | "blog-guide";
type BlogPlacement = "home-banner" | "home-teaser" | "blog-index" | "post-footer";
type TrackedEvent = Parameters<BeforeSend>[0];

const READING_EVENTS = new Set(["engagement", "scroll_depth"]);

/**
 * @name blogClick
 * @description The `clicks` plugin attributes for a blog link. The click is sent with the post and
 * the place on the site where the link was shown.
 *
 * @example
 * <Link href="/blog/post" {...blogClick("blog-post", "post", "home-banner")} />
 */
export function blogClick(label: BlogClickLabel, post: string, placement: BlogPlacement) {
  return {
    "data-spoar-click": label,
    "data-spoar-prop-post": post,
    "data-spoar-prop-placement": placement,
  };
}

/**
 * @name keepReadingOnBlog
 * @description Drops time and scroll events outside blog posts and passes every other event on.
 *
 * @example
 * createAnalytics({ plugins: [engagement(), scrollDepth()], beforeSend: keepReadingOnBlog });
 */
export function keepReadingOnBlog(event: TrackedEvent) {
  if (!READING_EVENTS.has(event.name)) return event;
  return event.page.path.startsWith("/blog/") ? event : null;
}
