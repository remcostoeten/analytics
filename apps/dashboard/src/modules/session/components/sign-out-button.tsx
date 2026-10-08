"use client";

import { notify } from "@remcostoeten/notifier";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { signOut } from "../sign-in";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const ended = await signOut();
        setBusy(false);
        if (!ended.ok) {
          notify.error(ended.error);
          return;
        }
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
