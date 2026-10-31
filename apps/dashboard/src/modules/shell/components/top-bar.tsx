import { Link } from "@/shared/ui/link";

import { readSession } from "@/modules/session/session";
import { SignOutButton } from "@/modules/session/components/sign-out-button";
import { sessionKey } from "@/modules/session/use-session";
import { ThemeToggle } from "@/modules/shell/components/theme-toggle";
import { Seed } from "@/shared/query/seed";

export async function TopBar() {
  const session = await readSession();
  return (
    <header className="top-bar">
      <Seed queryKey={sessionKey} data={session} />
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
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
