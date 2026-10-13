import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

import { resolveIcon } from "@/lib/icons";
import { openapi } from "@/lib/openapi";

export const source = loader({
  baseUrl: "/docs",
  icon: resolveIcon,
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
