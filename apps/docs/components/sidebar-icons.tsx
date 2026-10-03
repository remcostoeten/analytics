import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function frame(props: Props) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

function Rocket(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" />
      <path d="M9 15 15 9c2.5-2.5 5-3 6-3 0 1-.5 3.5-3 6l-6 6-3-3Z" />
      <path d="M9 15 6 12l3-1M12 18l3 3 1-3" />
      <circle cx="15" cy="9" r="1" />
    </svg>
  );
}

function Box(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

function Plug(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8Z" />
      <path d="M12 16v5" />
    </svg>
  );
}

function Layers(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </svg>
  );
}

function Compass(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 5-4 2 2-5 4-2Z" />
    </svg>
  );
}

function Branch(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="9" r="2.5" />
      <path d="M6 8.5v7M18 11.5c0 3-3 4-6 4H8.5" />
    </svg>
  );
}

function Wrench(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M14.5 6.5a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.5-6.5Z" />
      <path d="M14.5 6.5 18 3l3 3-3.5 3.5" />
    </svg>
  );
}

function Server(props: Props) {
  return (
    <svg {...frame(props)}>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </svg>
  );
}

function Book(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  );
}

function Terminal(props: Props) {
  return (
    <svg {...frame(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M12 15h5" />
    </svg>
  );
}

function Shield(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M12 3 4.5 6v5c0 4.6 3.2 8.5 7.5 10 4.3-1.5 7.5-5.4 7.5-10V6L12 3Z" />
    </svg>
  );
}

function Key(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="8" cy="14" r="4" />
      <path d="m11 11 9-9M17 5l2 2M14 8l2 2" />
    </svg>
  );
}

function Database(props: Props) {
  return (
    <svg {...frame(props)}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}

function Bell(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function Gauge(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="m12 15 4-5" />
    </svg>
  );
}

function Bug(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M8 9a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V9Z" />
      <path d="M12 13v6M4 12h4M16 12h4M5 7l3 2M19 7l-3 2M5 18l3-2M19 18l-3-2" />
    </svg>
  );
}

function Globe(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </svg>
  );
}

function Cursor(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="m5 4 14 7-6 2-2 6L5 4Z" />
    </svg>
  );
}

function User(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function Sliders(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

function Flag(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M5 21V4M5 4h13l-2 4 2 4H5" />
    </svg>
  );
}

function Pin(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function Clock(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function File(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

const sectionIcons = {
  "getting-started": Rocket,
  sdk: Box,
  plugins: Plug,
  frameworks: Layers,
  guides: Compass,
  "edge-cases": Branch,
  troubleshooting: Wrench,
  api: Server,
  reference: Book,
};

const pageIcons = {
  index: Book,
  "quick-start": Rocket,
  "how-it-works": Branch,
  concepts: Compass,
  install: Box,
  client: Cursor,
  options: Sliders,
  react: Layers,
  next: Layers,
  server: Server,
  proxy: Globe,
  admin: Key,
  migrating: Flag,
  plugins: Plug,
  "custom-events": Cursor,
  "identify-users": User,
  "server-side-tracking": Server,
  "exclude-your-traffic": Shield,
  "read-your-data": Database,
  "self-host": Server,
  "speed-insights": Gauge,
  errors: Bug,
  pageviews: File,
  "bot-signals": Shield,
  overview: Book,
  auth: Key,
  sql: Terminal,
  alerts: Bell,
  "alert-retries": Clock,
  annotations: Pin,
  bots: Shield,
  "sessions-and-visitors": User,
  "consent-and-privacy": Shield,
  "no-events": Bug,
  "api-errors": Server,
  "wrong-numbers": Gauge,
  "web-vitals": Gauge,
  nextjs: Layers,
  vanilla: File,
};

export function sectionIcon(slug: string) {
  return (sectionIcons as Record<string, typeof Book | undefined>)[slug];
}

export function pageIcon(slug: string) {
  return (pageIcons as Record<string, typeof Book | undefined>)[slug];
}
