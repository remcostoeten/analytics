import type { MetadataRoute } from "next";

import { listPosts } from "@/lib/changelog";
import { listExamples } from "@/lib/examples";
import { source } from "@/lib/source";

const baseUrl = "https://docs.analytics.remcostoeten.nl";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/query`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/changelog`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/examples`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const docRoutes: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${baseUrl}${page.url}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const changelogRoutes: MetadataRoute.Sitemap = listPosts().map((post) => ({
    url: `${baseUrl}/changelog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const exampleRoutes: MetadataRoute.Sitemap = listExamples().map((example) => ({
    url: `${baseUrl}/examples/${example.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...docRoutes, ...changelogRoutes, ...exampleRoutes];
}
