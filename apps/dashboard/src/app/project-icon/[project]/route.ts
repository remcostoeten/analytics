import { iconHost, projectFavicon } from "@/modules/shell/favicon";
import { serverClient } from "@/shared/api/server-client";

type Context = { params: Promise<{ project: string }> };

// A project id as the contract allows it: lowercase letters, digits, dots and dashes.
const projectId = /^[a-z0-9][a-z0-9.-]{0,63}$/;

function answer(icon: string, cacheControl: string) {
  return new Response(icon, {
    headers: {
      "cache-control": cacheControl,
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * @name GET
 * @description A project's favicon as a `data:` URI in a plain text body, or an empty body when it
 * has none, so the sidebar never asks a third party for icons and the browser never logs a failed
 * image. The domain comes from the project the caller may read through the API, never from the
 * request, and the icon is fetched server-side from that site by `projectFavicon`. The `domain`
 * search parameter is ignored here and only keys the browser cache, so an edited domain asks again.
 * Answers are private to the session, cached in the browser for a day and served stale for a week
 * while revalidating; a failed project read is cached for a minute.
 *
 * @example
 * const icon = await (await fetch("/dashboard/project-icon/skriuw")).text();
 * if (icon !== "") image.src = icon;
 */
export async function GET(_request: Request, context: Context) {
  const { project } = await context.params;
  if (!projectId.test(project)) return answer("", "private, max-age=86400");
  const api = await serverClient();
  const read = await api.projects.get(project);
  if (!read.ok) return answer("", "private, max-age=60");
  const host = iconHost(read.value.data.domain);
  const icon = host === null ? null : await projectFavicon(host);
  return answer(icon ?? "", "private, max-age=86400, stale-while-revalidate=604800");
}
