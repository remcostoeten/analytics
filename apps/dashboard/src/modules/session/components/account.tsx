import { readSession } from "../session";
import { SignOutButton } from "./sign-out-button";

export async function Account() {
  const session = await readSession();
  if (session.user === null) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="caps text-muted">
        {session.user.login} · {session.role}
      </span>
      <SignOutButton />
    </div>
  );
}
