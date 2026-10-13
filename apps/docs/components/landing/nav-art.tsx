import type { ReactNode } from "react";

export type NavArt =
  | "quick-start"
  | "concepts"
  | "tutorial"
  | "install"
  | "frameworks"
  | "plugins"
  | "events"
  | "read"
  | "self-host"
  | "reference"
  | "query"
  | "examples";

const art: Record<NavArt, ReactNode> = {
  "quick-start": (
    <>
      <path d="M5 18c5 0 9-3.5 13-11" strokeDasharray="1.5 2.5" className="text-muted" />
      <circle cx="18" cy="7" r="2.6" />
      <circle cx="5" cy="18" r="1.7" className="art-accent art-travel" fill="currentColor" />
    </>
  ),
  concepts: (
    <>
      <path d="M7.5 7.5h9M7 9l4 7M17 9l-4 7" className="text-muted" />
      <circle cx="6" cy="7.5" r="2" className="art-node" />
      <circle cx="18" cy="7.5" r="2" className="art-node" />
      <circle cx="12" cy="18" r="2" className="art-node art-accent" />
    </>
  ),
  tutorial: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M8 16.5v-3" className="art-bar art-accent" />
      <path d="M12 16.5v-7" className="art-bar art-accent" />
      <path d="M16 16.5v-5" className="art-bar art-accent" />
    </>
  ),
  install: (
    <>
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12M3.5 12h17" />
      <path d="M12 3.5v8M9 8.5l3 3 3-3" className="art-accent art-drop" />
    </>
  ),
  frameworks: (
    <>
      <path d="m3.5 16 8.5 4 8.5-4" className="text-muted" />
      <path d="m3.5 12 8.5 4 8.5-4" className="art-layer-mid" />
      <path d="M12 4 3.5 8l8.5 4 8.5-4L12 4Z" className="art-accent art-layer-top" />
    </>
  ),
  plugins: (
    <>
      <rect x="3.5" y="7" width="8" height="10" rx="2" />
      <path d="M11.5 10.5h1.5M11.5 13.5h1.5" className="text-muted" />
      <rect x="13" y="7" width="7.5" height="10" rx="2" className="art-accent art-snap" />
    </>
  ),
  events: (
    <>
      <path d="m9 9 4 11 1.8-4.6 4.6-1.8L9 9Z" />
      <path d="M9 3.5v1.8M3.5 9h1.8M5.2 5.2l1.2 1.2" className="text-muted" />
      <circle cx="9" cy="9" r="3" className="art-accent art-ripple" />
    </>
  ),
  read: (
    <>
      <path d="M4 4v16h16" className="text-muted" />
      <path d="m7.5 15 3-4 3 2.5 5-6.5" pathLength={1} className="art-accent art-draw" />
    </>
  ),
  "self-host": (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
      <circle cx="8.5" cy="10.5" r="0.9" className="art-accent art-led" fill="currentColor" />
      <circle cx="8.5" cy="16.5" r="0.9" className="art-accent art-led" fill="currentColor" />
    </>
  ),
  reference: (
    <>
      <path
        d="M9 4.5c-2 0-3 1-3 2.8v2c0 1.6-.9 2.7-2.2 2.7 1.3 0 2.2 1.1 2.2 2.7v2c0 1.8 1 2.8 3 2.8"
        className="art-brace-l"
      />
      <path
        d="M15 4.5c2 0 3 1 3 2.8v2c0 1.6.9 2.7 2.2 2.7-1.3 0-2.2 1.1-2.2 2.7v2c0 1.8-1 2.8-3 2.8"
        className="art-brace-r"
      />
      <path d="M10 12h.01M12 12h.01M14 12h.01" strokeWidth={2.2} className="art-accent art-dots" />
    </>
  ),
  query: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m7 10 2.5 2L7 14" className="text-muted" />
      <path d="M12 14.5h5" className="art-accent art-cursor" />
    </>
  ),
  examples: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 8h18" className="text-muted" />
      <rect x="6" y="11" width="5" height="6" rx="1" className="art-accent art-card" />
      <rect x="13" y="11" width="5" height="6" rx="1" className="art-accent art-card" />
    </>
  ),
};

export function NavArtTile({ art: name }: { art: NavArt }) {
  return (
    <span className="nav-art" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        {art[name]}
      </svg>
    </span>
  );
}
