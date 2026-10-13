import type { NextConfig } from "next";

import { basePath } from "./src/shared/config/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
};

export default config;
