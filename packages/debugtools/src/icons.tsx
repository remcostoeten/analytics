import type { ReactNode } from "react";

export type IconName =
  | "builder"
  | "code"
  | "clock"
  | "chevron-down"
  | "chevron-right"
  | "play"
  | "more"
  | "grid"
  | "collapse"
  | "plus"
  | "search"
  | "dataset"
  | "list"
  | "trend"
  | "rows"
  | "user"
  | "agent"
  | "dock"
  | "float"
  | "maximize"
  | "restore"
  | "close";

const paths: { [Name in IconName]: ReactNode } = {
  builder: (
    <>
      <path d="M8 1.5 14 4.75v6.5L8 14.5 2 11.25v-6.5z" />
      <path d="M2 4.75 8 8l6-3.25M8 8v6.5" />
    </>
  ),
  code: <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5M9 3 7 13" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75V8l2 1.5" />
    </>
  ),
  "chevron-down": <path d="m4 6 4 4 4-4" />,
  "chevron-right": <path d="m6 4 4 4-4 4" />,
  play: <path d="M4.5 2.75v10.5L13 8z" />,
  more: (
    <>
      <circle cx="8" cy="3.5" r=".6" />
      <circle cx="8" cy="8" r=".6" />
      <circle cx="8" cy="12.5" r=".6" />
    </>
  ),
  grid: (
    <>
      <circle cx="4" cy="4" r=".6" />
      <circle cx="8" cy="4" r=".6" />
      <circle cx="12" cy="4" r=".6" />
      <circle cx="4" cy="8" r=".6" />
      <circle cx="8" cy="8" r=".6" />
      <circle cx="12" cy="8" r=".6" />
      <circle cx="4" cy="12" r=".6" />
      <circle cx="8" cy="12" r=".6" />
      <circle cx="12" cy="12" r=".6" />
    </>
  ),
  collapse: <path d="M3 2.5h10M8 13.5V5.5M4.75 8.75 8 5.5l3.25 3.25" />,
  plus: <path d="M8 3v10M3 8h10" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m13 13-2.9-2.9" />
    </>
  ),
  dataset: <path d="m8 2 6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3" />,
  list: <path d="M2.5 4h1M2.5 8h1M2.5 12h1M6 4h7.5M6 8h7.5M6 12h7.5" />,
  trend: <path d="m2 12 4-4.5 3 2.5 5-6" />,
  rows: <path d="M2.5 3.5h2v2h-2zM2.5 10.5h2v2h-2zM7 4.5h6.5M7 11.5h6.5" />,
  user: (
    <>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 14c.6-2.6 2.7-4 5.25-4s4.65 1.4 5.25 4" />
    </>
  ),
  agent: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 14c.5-2.4 2.3-3.75 4.5-3.75s4 1.35 4.5 3.75M11 3.5l1 1.5 1.5.5-1.5.5-1 1.5-.5-1.5L9 5l1.5-.5z" />
    </>
  ),
  dock: (
    <>
      <rect x="2" y="2.75" width="12" height="10.5" rx="1.5" />
      <path d="M2 9.5h12" />
    </>
  ),
  float: (
    <>
      <rect x="2" y="2.75" width="12" height="10.5" rx="1.5" />
      <rect x="7.5" y="6.5" width="4.5" height="4" rx="0.75" />
    </>
  ),
  maximize: <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" />,
  restore: <path d="M13.5 2.5 9.5 6.5M9.5 3v3.5H13M2.5 13.5l4-4M6.5 13V9.5H3" />,
  close: <path d="m4 4 8 8M12 4l-8 8" />,
};

type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 14, className }: Props) {
  return (
    <svg
      className={className ? `block flex-none ${className}` : "block flex-none"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function DefaultLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c-.35 0-.68.18-.86.49L5.3 12.6A7.4 7.4 0 0 0 12 21.5a7.4 7.4 0 0 0 6.7-8.9L12.86 3a1 1 0 0 0-.86-.49Zm0 15.5a3.6 3.6 0 0 1-3.6-3.6c0-.7.2-1.37.55-1.93L12 7.6l3.05 4.87c.35.56.55 1.22.55 1.93A3.6 3.6 0 0 1 12 18Z" />
    </svg>
  );
}
