import type { ReactNode, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Icon({ children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2.5 7 8 2.5 13.5 7v6.5h-3.5v-4h-4v4H2.5Z" />
    </Icon>
  );
}

export function ChartIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V7" />
    </Icon>
  );
}

export function FolderIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2 4.5c0-.6.4-1 1-1h3l1.5 1.5H13c.6 0 1 .4 1 1v6c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1Z" />
    </Icon>
  );
}

export function KeyIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="5.5" cy="10.5" r="3" />
      <path d="m7.7 8.3 5.8-5.8M11 5l1.5 1.5" />
    </Icon>
  );
}

export function GearIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </Icon>
  );
}

export function BookIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 2.5h7.5c.6 0 1 .4 1 1v10H4a1 1 0 0 1-1-1ZM3 12.5c0-.6.4-1 1-1h7.5" />
    </Icon>
  );
}

export function SelectorIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="m5 6 3-3 3 3M5 10l3 3 3-3" />
    </Icon>
  );
}

export function PlusCircleIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5.5v5M5.5 8h5" />
    </Icon>
  );
}

export function CloseIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </Icon>
  );
}

export function TrendIcon({ down, ...props }: Props & { down: boolean }) {
  return (
    <Icon {...props}>
      {down ? <path d="M4 4l8 8M12 6.5V12H6.5" /> : <path d="M4 12l8-8M6.5 4H12v5.5" />}
    </Icon>
  );
}

export function ExternalIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v3c0 .6-.4 1-1 1h-7c-.6 0-1-.4-1-1v-7c0-.6.4-1 1-1h3" />
    </Icon>
  );
}

export function GaugeIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0" />
      <path d="M8 11.5 10.5 7" />
    </Icon>
  );
}

export function BugIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.5a2.5 2.5 0 0 1 5 0v3a2.5 2.5 0 0 1-5 0Z" />
      <path d="M8 9.5V13M5.5 8H3M13 8h-2.5M6 4.5 4.5 3M10 4.5 11.5 3M5.8 11 4 12.5M10.2 11l1.8 1.5" />
    </Icon>
  );
}

export function PulseIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M2 8h2.5l1.5-4 2.5 8 1.5-4H14" />
    </Icon>
  );
}

export function UsersIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M10.5 3.5a2.5 2.5 0 0 1 0 4M12 9.8c1.5.5 2.5 1.8 2.5 3.7" />
    </Icon>
  );
}

export function GridIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </Icon>
  );
}

export function ListIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5" />
    </Icon>
  );
}

export function PanelIcon(props: Props) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M6 3v10" />
    </Icon>
  );
}

export function SunIcon(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M3.4 12.6l1.05-1.05M11.55 4.45l1.05-1.05" />
    </Icon>
  );
}

export function MoonIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" />
    </Icon>
  );
}
