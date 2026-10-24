import type { NextConfig } from "next";

import { basePath, siteUrl } from "./src/shared/config/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    staleTimes: { dynamic: 30, static: 300 },
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
    serverActions: {
      allowedOrigins: [new URL(siteUrl()).host],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/robots.txt",
        destination: `${basePath}/robots.txt`,
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default config;
