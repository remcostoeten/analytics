import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

import { codeThemes } from "./lib/code-theme";

export const docs = defineDocs({
  dir: "content/docs",
  docs: { schema: pageSchema },
  meta: { schema: metaSchema },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: codeThemes,
      transformers: [
        {
          name: "spoar:language",
          pre(node) {
            node.properties["data-language"] = this.options.lang;
            return node;
          },
        },
      ],
    },
  },
});
