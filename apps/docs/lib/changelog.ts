import { posts } from "collections/server";

type PostLabel = "release" | "feature" | "improvement" | "fix";

type Post = (typeof posts)[number];

const labels: { [Label in PostLabel]: string } = {
  release: "Release",
  feature: "New feature",
  improvement: "Improvement",
  fix: "Fix",
};

/**
 * @name postLabel
 * @description The display text for a post's label.
 *
 * @example
 * postLabel("feature"); // "New feature"
 */
export function postLabel(label: PostLabel) {
  return labels[label];
}

function slugOf(post: Post) {
  return post.info.path.replace(/\.mdx$/, "");
}

/**
 * @name listPosts
 * @description Lists every changelog post with its slug, newest first. On the same day a release
 * comes before other posts, then titles sort alphabetically.
 *
 * @example
 * const params = listPosts().map((post) => ({ slug: post.slug }));
 */
export function listPosts() {
  return posts
    .map((post) => ({ ...post, slug: slugOf(post) }))
    .toSorted(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        Number(b.label === "release") - Number(a.label === "release") ||
        a.title.localeCompare(b.title),
    );
}

/**
 * @name getPost
 * @description Finds the changelog post with the given slug, or undefined when none uses it.
 *
 * @example
 * const post = getPost("dev-widget");
 * if (!post) notFound();
 */
export function getPost(slug: string) {
  return listPosts().find((post) => post.slug === slug);
}
