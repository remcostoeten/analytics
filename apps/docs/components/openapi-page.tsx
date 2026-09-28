import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/ui";

import { APIPage } from "@/components/api-page";
import { openapi } from "@/lib/openapi";

type Props = Omit<OpenAPIPageProps_Preloaded, "preloaded">;

export async function OpenAPIPage(props: Props) {
  const { bundled } = await openapi.getSchema(props.document);
  return <APIPage {...props} preloaded={{ docs: { [props.document]: bundled } }} />;
}
