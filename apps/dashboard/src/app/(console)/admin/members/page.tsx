import type { Metadata } from "next";

import { AddMemberForm } from "@/modules/admin/components/add-member-form";
import { MemberList } from "@/modules/admin/components/member-list";
import { listMembers } from "@/modules/admin/reads";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { Heading } from "@/shared/ui/heading";

export const metadata: Metadata = { title: "Members" };

export default async function Page() {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  if (access.session.role !== "owner") {
    return (
      <section className="card grid max-w-xl gap-3 p-5">
        <h1 className="text-base font-medium">Owner only</h1>
        <p className="text-muted text-sm">Only the owner decides who may sign in.</p>
      </section>
    );
  }
  const listed = await listMembers();
  if (!listed.ok) {
    return <p className="text-err text-sm">Could not list members: {listed.error.message}</p>;
  }
  const members = listed.value;
  return (
    <>
      <Heading title="Members" meta={`${members.length} login${members.length === 1 ? "" : "s"}`} />
      <p className="text-muted max-w-xl text-sm">
        The GitHub logins that may sign in. Each is checked against GitHub when added, and only that
        account may use the login, even if the name is later renamed or reused.
      </p>
      <MemberList members={members} />
      <section className="grid gap-4">
        <h2 className="caps text-muted">Allow a login</h2>
        <AddMemberForm />
      </section>
    </>
  );
}
