import type { ReactNode } from "react";

import { Tip } from "./tip";

type Props = {
  label: string;
  htmlFor: string;
  hint?: string;
  tip?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, tip, error, children }: Props) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="caps text-muted">
          {label}
        </label>
        {tip ? <Tip label={`About ${label}`}>{tip}</Tip> : null}
      </div>
      {children}
      {error ? (
        <p className="text-err text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
