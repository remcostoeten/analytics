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

export function ShieldIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M12 3 4.5 6v5c0 4.6 3.2 8.5 7.5 10 4.3-1.5 7.5-5.4 7.5-10V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BoxIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </svg>
  );
}

export function RouteIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H14a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h5.5" />
    </svg>
  );
}

export function GaugeIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="m12 15 4-5" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

export function BugIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M8 9a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V9Z" />
      <path d="M12 13v6M4 12h4M16 12h4M5 7l3 2M19 7l-3 2M5 18l3-2M19 18l-3-2M9.5 5l1.5 1.5M14.5 5 13 6.5" />
    </svg>
  );
}

export function TerminalIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M12 15h5" />
    </svg>
  );
}

export function ArrowIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CopyIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function CheckIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function FileIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
