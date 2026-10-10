import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineCollections, defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

import { codeThemes } from "./lib/code-theme";

export const docs = defineDocs({
  dir: "content/docs",
  docs: { schema: pageSchema },
  meta: { schema: metaSchema },
});

export const posts = defineCollections({
  type: "doc",
  dir: "content/changelog",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.iso.date(),
    label: z.enum(["release", "feature", "improvement", "fix"]),
    image: z.string().startsWith("/images/").optional(),
    imageAlt: z.string().optional(),
    docs: z.string().startsWith("/").optional(),
  }),
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: { themes: codeThemes },
  },
});
