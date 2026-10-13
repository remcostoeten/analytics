import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const dashboard = (
  process.env.DASHBOARD_URL ?? "https://dashboard.analytics.remcostoeten.nl"
).replace(/\/+$/, "");

const config: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  reactCompiler: true,
  partialPrefetching: true,
  experimental: {
    inlineCss: true,
    cachedNavigations: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/dashboard", destination: `${dashboard}/dashboard` },
        { source: "/dashboard/:path*", destination: `${dashboard}/dashboard/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [{ source: "/docs/changelog", destination: "/changelog", permanent: true }];
  },
};

export default withMDX(config);
