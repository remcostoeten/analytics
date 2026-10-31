import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props<Value> = { queryKey: QueryKey; data: Value; children?: ReactNode };

/**
 * @name Seed
 * @description Hands a value a server component already read to the browser's query cache under
 * its key, so the first client render of a hook on that key has data without a request. A later
 * read refreshes it like any other query.
 *
 * @example
 * <Seed queryKey={sessionKey} data={session} />
 */
export function Seed<Value>({ queryKey, data, children }: Props<Value>) {
  const client = new QueryClient();
  client.setQueryData(queryKey, data);
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
