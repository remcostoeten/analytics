import type { ReactNode } from "react";

type Props = { title: string; children?: ReactNode };

export function EmptyState({ title, children }: Props) {
  return (
    <div className="empty-state">
      <svg
        viewBox="0 0 48 48"
        className="size-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="10" width="36" height="28" rx="3" />
        <path d="M6 32l9-8 7 5 8-10 12 9" />
        <path d="M12 16h8" />
      </svg>
      <span className="text-sm font-medium">{title}</span>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
