type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

export type IconName =
  | "search"
  | "home"
  | "check-square"
  | "users"
  | "file"
  | "chart"
  | "compass"
  | "inbox"
  | "list"
  | "layers"
  | "sort"
  | "flag"
  | "group"
  | "star"
  | "circle"
  | "circle-dashed"
  | "circle-half"
  | "arrow-ne"
  | "crosshair"
  | "scan"
  | "note"
  | "mark";

const paths: Record<IconName, string> = {
  search: "M6.5 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm3.5-1 3 3",
  home: "M2 7.5 8 2.5l6 5V13H2V7.5Zm4 5.5V9h4v4",
  "check-square": "M2.5 2.5h11v11h-11zM5 8l2 2 4-4",
  users:
    "M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-4 6c0-2.2 1.8-4 4-4s4 1.8 4 4m1-6a2 2 0 1 0 0-4m3 10c0-2-1.2-3.5-3-3.9",
  file: "M4 2h5l3 3v9H4V2Zm5 0v3h3",
  chart: "M2.5 13.5h11M4 11V7m4 4V4m4 7V6",
  compass: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm2.5-9-1.5 4-4 1.5 1.5-4 4-1.5Z",
  inbox: "M2.5 9h3l1 2h3l1-2h3v4.5h-11V9Zm0 0 2-6h7l2 6",
  list: "M3 4h10M3 8h10M3 12h7",
  layers: "M8 2.5 14 6 8 9.5 2 6l6-3.5Zm-6 7 6 3.5 6-3.5",
  sort: "M4 3v10m0 0-2-2m2 2 2-2m6-8v10m0-10-2 2m2-2 2 2",
  flag: "M4 14V2.5h8l-2 3 2 3H4",
  group: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z",
  star: "m8 2 1.8 3.8 4.2.6-3 2.9.7 4.2L8 11.5l-3.7 2 .7-4.2-3-2.9 4.2-.6L8 2Z",
  circle: "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z",
  "circle-dashed": "M8 2.5a5.5 5.5 0 0 1 5.5 5.5M8 13.5A5.5 5.5 0 0 1 2.5 8",
  "circle-half": "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Zm0-11v11",
  "arrow-ne": "M4 12 12 4M6 4h6v6",
  crosshair: "M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM8 1v3m0 8v3M1 8h3m8 0h3",
  scan: "M2 5V2h3m6 0h3v3m0 6v3h-3m-6 0H2v-3M5 8h6",
  note: "M3 2.5h10v11H3zM5.5 6h5m-5 2.5h5M5.5 11h3",
  mark: "M8 2.5 13.5 8 8 13.5 2.5 8 8 2.5Zm0 3L10.5 8 8 10.5 5.5 8 8 5.5Z",
};

export function Icon({ name, size = 14, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
