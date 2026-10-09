import Link from "next/link";

import { readSession } from "@/modules/session/session";
import { SignOutButton } from "@/modules/session/components/sign-out-button";

export async function TopBar() {
  const session = await readSession();
  return (
    <header className="top-bar">
      <div className="ml-auto flex items-center gap-3">
        {session.user ? (
          <>
            <span className="text-xs text-muted">
              {session.user.login} · {session.role}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link href="/sign-in" className="text-sm text-fg hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
