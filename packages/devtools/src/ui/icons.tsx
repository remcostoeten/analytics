type Props = { name: "dock" | "float" | "wide" | "tall" | "collapse" | "chevron" };

const paths: { [Name in Props["name"]]: string } = {
  dock: "M1.5 2.5h11v9h-11zM1.5 8.5h11",
  float: "M1.5 4.5h8v7h-8zM4.5 4.5V1.5h8v8H9.5",
  wide: "M1.5 7h11M4 4.5 1.5 7 4 9.5M10 4.5 12.5 7 10 9.5",
  tall: "M7 1.5v11M4.5 4 7 1.5 9.5 4M4.5 10 7 12.5 9.5 10",
  collapse: "M3.5 5.5 7 9l3.5-3.5",
  chevron: "M5 3l4 4-4 4",
};

export function Icon({ name }: Props) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
