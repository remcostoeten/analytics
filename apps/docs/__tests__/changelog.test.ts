import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const postsDir = join(root, "content", "changelog");

function frontmatterValue(file: string, key: string) {
  const source = readFileSync(join(postsDir, file), "utf8");
  // Matches `key: value` on its own line inside the frontmatter block.
  return source.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim();
}

describe("changelog posts", () => {
  const files = readdirSync(postsDir).filter((file) => file.endsWith(".mdx"));

  test("every hero image exists in public", () => {
    const missing = files
      .map((file) => frontmatterValue(file, "image"))
      .filter((image) => image !== undefined)
      .filter((image) => !existsSync(join(root, "public", image)));
    expect(missing).toEqual([]);
  });

  test("every post with an image describes it", () => {
    const undescribed = files.filter(
      (file) => frontmatterValue(file, "image") && !frontmatterValue(file, "imageAlt"),
    );
    expect(undescribed).toEqual([]);
  });
});
