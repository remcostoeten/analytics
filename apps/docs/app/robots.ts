import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/_ra", "/api/search", "/dashboard", "/icons", "/logo-editor"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/docs", "/llms.txt"],
        disallow: ["/_ra", "/api/search", "/dashboard"],
      },
    ],
    sitemap: "https://docs.analytics.remcostoeten.nl/sitemap.xml",
  };
}
