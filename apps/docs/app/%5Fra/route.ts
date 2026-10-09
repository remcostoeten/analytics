import { createProxy } from "@spoar/sdk/proxy";

import { apiEndpoint } from "@/lib/api-endpoint";

export const POST = createProxy({ secret: process.env.RA_SECRET, endpoint: apiEndpoint() });
