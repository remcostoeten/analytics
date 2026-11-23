import { blogPosts } from "collections/server";

type BlogPost = (typeof blogPosts)[number];

function slugOf(post: BlogPost) {
  return post.info.path.replace(/\.mdx$/, "");
}

/**
 * @name listBlogPosts
 * @description Lists every blog post with its slug, newest first, then by title.
 *
 * @example
 * const [latest] = listBlogPosts();
 */
export function listBlogPosts() {
  return blogPosts
    .map((post) => ({ ...post, slug: slugOf(post) }))
    .toSorted((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/**
 * @name getBlogPost
 * @description Finds the blog post with the given slug, or undefined when none uses it.
 *
 * @example
 * const post = getBlogPost("party-game-custom-data");
 * if (!post) notFound();
 */
export function getBlogPost(slug: string) {
  return listBlogPosts().find((post) => post.slug === slug);
}
