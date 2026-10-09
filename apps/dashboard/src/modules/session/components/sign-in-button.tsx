"use client";

import { notify } from "@remcostoeten/notifier";
import { useEffect, useState } from "react";

import { basePath } from "@/shared/config/site";
import { GithubIcon } from "@/shared/ui/github-icon";
import { startSignIn } from "../sign-in";
import { labelPosition } from "../sign-in-state";
import type { SignInState } from "../sign-in-state";

const errorShownMs = 1400;

const labels: { state: SignInState; text: string }[] = [
  { state: "idle", text: "Continue with GitHub" },
  { state: "busy", text: "Redirecting to GitHub" },
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
    <button
      type="button"
      className="auth-button sign-in"
      data-state={state}
      aria-busy={state === "busy"}
      aria-live="polite"
      onClick={async () => {
        if (state === "busy") return;
        setState("busy");
        const home = `${window.location.origin}${basePath}`;
        const started = await startSignIn(home, `${home}/sign-in`);
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
            {label.state === "busy" ? <Spinner /> : <GithubIcon className="size-4" />}
            {label.text}
          </span>
        ))}
      </span>
    </button>
  );
}
