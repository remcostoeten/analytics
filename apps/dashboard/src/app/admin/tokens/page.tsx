import type { Metadata } from "next";

import { CreateTokenForm } from "@/modules/admin/components/create-token-form";
import { TokenList } from "@/modules/admin/components/token-list";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { serverClient } from "@/shared/api/server-client";
import { Heading } from "@/shared/ui/heading";

export const metadata: Metadata = { title: "API tokens" };

export default async function Page() {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  const api = await serverClient();
  const listed = await api.tokens.list();
  if (!listed.ok) {
    return <p className="text-err text-sm">Could not list tokens: {listed.error.message}</p>;
  }
  const tokens = listed.value.data;
  return (
    <>
      <Heading
        title="API tokens"
        meta={`${tokens.length} token${tokens.length === 1 ? "" : "s"}`}
      />
      <p className="text-muted max-w-xl text-sm">
        For scripts, CI, the docs query page and other frontends. Sites send events with their
        project keys, not with a token.
      </p>
      <TokenList tokens={tokens} />
      <section className="grid gap-4">
        <h2 className="caps text-muted">New token</h2>
        <CreateTokenForm />
      </section>
    </>
  );
}
