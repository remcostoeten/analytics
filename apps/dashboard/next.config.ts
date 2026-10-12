import type { NextConfig } from "next";

import { basePath } from "./src/shared/config/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath,
  cacheComponents: true,
  partialPrefetching: true,
};

export default config;
