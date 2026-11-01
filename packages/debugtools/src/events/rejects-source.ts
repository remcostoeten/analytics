import { clientSource } from "../source";
import type { ConsoleSource } from "../source";
import type { ViewContext } from "../widget/view";

/**
 * @name rejectsSource
 * @description A console source over the view's shared client, for the project's server side
 * rejects. The endpoint is left empty because every call goes through that client.
 *
 * @example
 * <RejectsView source={rejectsSource(context)} />
 */
export function rejectsSource(context: Pick<ViewContext, "project" | "client">): ConsoleSource {
  return clientSource({ endpoint: "", project: context.project }, null, undefined, context.client);
}
