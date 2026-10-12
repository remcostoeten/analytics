import type { CSSProperties, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

type Order = CSSProperties & { "--d": number };

function frame(props: Props) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

function order(step: number): Order {
  return { "--d": step };
}

const drawn = { pathLength: 1, className: "draw-path" };

export function DrawCookieOffIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path {...drawn} style={order(0)} d="M20 12a8 8 0 1 1-8-8 3 3 0 0 0 3 3 3 3 0 0 0 5 5Z" />
      <path {...drawn} style={order(1)} d="M8.5 10.5h.01M11 15h.01M15.5 14h.01" />
      <path {...drawn} style={order(2)} d="M4 4l16 16" />
    </svg>
  );
}

export function DrawHashIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path {...drawn} style={order(0)} d="M10 4 8 20" />
      <path {...drawn} style={order(0.5)} d="M16 4l-2 16" />
      <path {...drawn} style={order(1)} d="M4.5 9h15" />
      <path {...drawn} style={order(1.5)} d="M4 15h15" />
    </svg>
  );
}

export function DrawDatabaseIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <ellipse {...drawn} style={order(0)} cx="12" cy="6" rx="7" ry="2.5" />
      <path {...drawn} style={order(1)} d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path {...drawn} style={order(2)} d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </svg>
  );
}

export function DrawGaugeIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path {...drawn} style={order(0)} d="M4 17a8 8 0 1 1 16 0" />
      <path {...drawn} style={order(1)} d="M6.5 11.5 8 12.5M12 7v1.8M17.5 11.5 16 12.5" />
      <path {...drawn} style={order(2)} d="M12 17l3.5-4.5" />
    </svg>
  );
}
