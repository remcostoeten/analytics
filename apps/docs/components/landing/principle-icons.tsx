import type { CSSProperties, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

type Stroke = CSSProperties & { "--d": number };

function step(order: number): Stroke {
  return { "--d": order };
}

function frame(props: Props) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
    className: `draw-icon ${props.className ?? ""}`,
  };
}

export function NoCookieIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path
        pathLength={1}
        style={step(0)}
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5 3 3 0 0 1-3.5-3 3 3 0 0 1-3-3.5 2.5 2.5 0 0 1-2-2Z"
      />
      <path pathLength={1} style={step(1)} d="M8.5 10.5h.01M11 15.5h.01M15.5 14h.01" />
      <path pathLength={1} style={step(2)} d="M3.5 3.5l17 17" />
    </svg>
  );
}

export function HashIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path pathLength={1} style={step(0)} d="M10 3.5 8 20.5" />
      <path pathLength={1} style={step(0.5)} d="M16 3.5l-2 17" />
      <path pathLength={1} style={step(1)} d="M4.5 9h16" />
      <path pathLength={1} style={step(1.5)} d="M3.5 15h16" />
    </svg>
  );
}

export function OwnDatabaseIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path pathLength={1} style={step(0)} d="M12 2v6.5m-2.5-2.5L12 8.5 14.5 6" />
      <path
        pathLength={1}
        style={step(1)}
        d="M5 11c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5-3.1 2.5-7 2.5S5 12.4 5 11Z"
      />
      <path pathLength={1} style={step(1.6)} d="M5 11v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-8" />
      <path pathLength={1} style={step(2.2)} d="M5 15c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </svg>
  );
}

export function ScoreIcon(props: Props) {
  return (
    <svg {...frame(props)}>
      <path pathLength={1} style={step(0)} d="M3.5 17a8.5 8.5 0 1 1 17 0" />
      <path pathLength={1} style={step(1)} d="M12 4.5v1.5M6 7l1 1M18 7l-1 1M3.5 12H5M20.5 12H19" />
      <path pathLength={1} style={step(2)} d="M12 17l4-5.5" />
      <path pathLength={1} style={step(2.6)} d="M12 17h.01" />
    </svg>
  );
}
