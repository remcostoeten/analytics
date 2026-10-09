import type { ClientError } from "@spoar/client";
import Link from "next/link";

type Props = { error: ClientError; what: string };

export function ReadNotice({ error, what }: Props) {
  if (error.code === "UNAUTHORIZED") {
    return (
      <section className="panel-section grid gap-2 py-12 text-center">
        <p className="text-sm">Sign in to see {what}.</p>
        <p className="text-xs text-muted">
          Visitor-level data is only shown to members.{" "}
          <Link href="/sign-in" className="text-link underline">
            Sign in
          </Link>
        </p>
      </section>
    );
  }
  if (error.code === "FORBIDDEN") {
    return (
      <section className="panel-section grid gap-2 py-12 text-center">
        <p className="text-sm">Your role cannot see {what}.</p>
        <p className="text-xs text-muted">{error.message}</p>
      </section>
    );
  }
  return (
    <section className="panel-section">
      <p className="text-sm text-err">
        Could not read {what}: {error.message}
      </p>
    </section>
  );
}
