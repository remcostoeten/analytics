import { serverClient } from "@/shared/api/server-client";

const menuProjects = 5;

/**
 * @name GET
 * @description Who the request's session cookie belongs to, for the landing site's account menu,
 * which reaches this route same-origin through the `/dashboard` rewrite. It answers the user's
 * login, name and avatar, whether they administer, and their first projects with a total. It is
 * never cached.
 *
 * @example
 * const { signedIn, user, projects } = await (await fetch("/dashboard/session")).json();
 */
export async function GET() {
  const api = await serverClient();
  const result = await api.system.session();
  const headers = { "cache-control": "private, no-store" };
  if (!result.ok || result.value.user === null) {
    return Response.json({ signedIn: false }, { headers });
  }
  const { user, isAdmin } = result.value;
  const listed = await api.projects.list();
  const all = listed.ok ? listed.value.data : [];
  const projects = all.slice(0, menuProjects).map((project) => ({
    id: project.id,
    name: project.name,
  }));
  return Response.json(
    {
      signedIn: true,
      user: { login: user.login, name: user.name, avatarUrl: user.avatarUrl },
      isAdmin,
      projects,
      projectTotal: all.length,
    },
    { headers },
  );
}
