import { redirect } from "next/navigation";

import type { Access } from "../session";

type Props = { access: Exclude<Access, { state: "admin" }> };

export function AccessNotice({ access }: Props) {
  if (access.state === "signed-out") redirect("/sign-in");
  const { user, role } = access.session;
  return (
    <section className="card grid max-w-xl gap-3 p-5">
      <h1 className="text-base font-medium">No access</h1>
      <p className="text-muted text-sm">
        Signed in as <b className="text-fg">{user?.login}</b> with the role{" "}
        <code className="font-mono">{role}</code>. Creating projects and reading keys needs the
        owner or an admin.
      </p>
    </section>
  );
}
