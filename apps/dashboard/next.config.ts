import type { NextConfig } from "next";

import { basePath } from "./src/shared/config/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath,
};

export default config;
