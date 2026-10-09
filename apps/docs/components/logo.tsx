import { useId } from "react";

import { getLogoGradients, logoPaths, logoViewBox } from "./logo-artwork";
import type { LogoPalette } from "./logo-palette";

type Props = {
  className?: string;
  palette?: LogoPalette;
};

export function Logo({ className, palette }: Props) {
  const id = useId();
  const silver = `${id}-silver`;
  const fold = `${id}-fold`;
  const gradients = getLogoGradients(palette);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={logoViewBox}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={silver} x1=".1" y1=".7" x2=".95" y2=".25">
          {gradients.silver.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
        <linearGradient id={fold} x1="0" y1="0" x2="1" y2="1">
          {gradients.fold.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
      <path fill={`url(#${silver})`} d={logoPaths.body} />
      <path fill={`url(#${fold})`} d={logoPaths.fold} />
    </svg>
  );
}
