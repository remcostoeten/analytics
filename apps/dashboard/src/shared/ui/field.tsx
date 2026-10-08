import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, children }: Props) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="caps text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-err text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
