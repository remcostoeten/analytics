import type { LLMsOptions } from "fumadocs-core/mdx-plugins/remark-llms";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineCollections, defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

import { codeThemes } from "./lib/code-theme";

type MarkdownNode = Parameters<NonNullable<LLMsOptions["filterElement"]>>[0];

const interactiveOnly = new Set(["DashboardPreview", "DevWidgetToggle", "LiveRead"]);
const wrappers = new Set(["Accordions", "Cards", "Step", "Steps", "Tabs"]);

function markdownElement(node: MarkdownNode) {
  if (node.type === "mdxjsEsm") return false;
  if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return true;
  if (interactiveOnly.has(node.name ?? "")) return false;
  return wrappers.has(node.name ?? "") ? "children-only" : true;
}

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: { headingIds: false, filterElement: markdownElement },
    },
  },
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
