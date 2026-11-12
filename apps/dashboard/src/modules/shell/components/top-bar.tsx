"use client";

import { SignOutButton } from "@/modules/session/components/sign-out-button";
import { useSessionRead } from "@/modules/session/use-session";
import { ThemeToggle } from "@/modules/shell/components/theme-toggle";
import { Link } from "@/shared/ui/link";

function Account() {
  const { known, session } = useSessionRead();
  if (!known) return <div className="skeleton h-4 w-16" />;
  if (!session.user) {
    return (
      <Link href="/sign-in" className="text-sm text-fg hover:underline">
        Sign in
      </Link>
    );
  }
  return (
    <>
      <span className="text-xs text-muted">
        {session.user.login} · {session.role}
      </span>
      <SignOutButton />
    </>
  );
}

export function TopBar() {
  return (
    <header className="top-bar">
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <Account />
      </div>
    </header>
  );
}
