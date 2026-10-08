"use client";

import { notify } from "@remcostoeten/notifier";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { startSignIn } from "../sign-in";

export function SignInButton() {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const started = await startSignIn(`${window.location.origin}/admin/projects`);
        if (!started.ok) {
          setBusy(false);
          notify.error(started.error);
          return;
        }
        window.location.assign(started.value);
      }}
    >
      {busy ? "Redirecting" : "Sign in with GitHub"}
    </Button>
  );
}
