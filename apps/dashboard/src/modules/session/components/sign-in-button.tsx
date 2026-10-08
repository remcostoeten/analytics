"use client";

import { notify } from "@remcostoeten/notifier";
import { useEffect, useState } from "react";

import { Button } from "@/shared/ui/button";
import { startSignIn } from "../sign-in";
import { labelPosition } from "../sign-in-state";
import type { SignInState } from "../sign-in-state";

const errorShownMs = 1400;

const labels: { state: SignInState; text: string }[] = [
  { state: "idle", text: "Sign in with GitHub" },
  { state: "busy", text: "Redirecting" },
  { state: "error", text: "Try again" },
];

function Spinner() {
  return (
    <svg className="sign-in-spinner" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28"
        strokeDashoffset="10"
      />
    </svg>
  );
}

export function SignInButton() {
  const [state, setState] = useState<SignInState>("idle");

  useEffect(() => {
    if (state !== "error") return;
    const timer = setTimeout(() => setState("idle"), errorShownMs);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <Button
      className="sign-in"
      data-state={state}
      aria-busy={state === "busy"}
      aria-live="polite"
      onClick={async () => {
        if (state === "busy") return;
        setState("busy");
        const started = await startSignIn(`${window.location.origin}/admin/projects`);
        if (!started.ok) {
          setState("error");
          notify.error(started.error);
          return;
        }
        window.location.assign(started.value);
      }}
    >
      <span className="grid">
        {labels.map((label) => (
          <span
            key={label.state}
            className="sign-in-label"
            data-position={labelPosition(label.state, state)}
          >
            {label.state === "busy" ? <Spinner /> : null}
            {label.text}
          </span>
        ))}
      </span>
    </Button>
  );
}
