import type { CSSProperties, ReactNode } from "react";

type Backdrop = "hills" | "glow";

type SceneProps = {
  backdrop: Backdrop;
  children: ReactNode;
  className?: string;
};

export function Scene({ backdrop, children, className = "" }: SceneProps) {
  return (
    <div className={`scene group/scene relative isolate overflow-hidden rounded-2xl ${className}`}>
      <span aria-hidden="true" className="scene-blob scene-blob-a" />
      <span aria-hidden="true" className="scene-blob scene-blob-b" />
      {backdrop === "hills" ? <Hills /> : null}
      <span aria-hidden="true" className="grain absolute inset-0 -z-10" />
      {children}
    </div>
  );
}

type TreeProps = {
  x: number;
  scale: number;
};

function Tree({ x, scale }: TreeProps) {
  return (
    <g transform={`translate(${x} ${320 - 230 * scale}) scale(${scale})`}>
      <rect x="-3" y="150" width="6" height="80" />
      <path d="M0 0 L26 70 L12 66 L38 120 L16 116 L46 170 L-46 170 L-16 116 L-38 120 L-12 66 L-26 70 Z" />
    </g>
  );
}

function Hills() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 320"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 -z-10 h-full w-full"
    >
      <defs>
        <filter id="scene-soft">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g fill="#f3a7a0" opacity="0.32" filter="url(#scene-soft)">
        <Tree x={40} scale={1.25} />
        <Tree x={92} scale={0.9} />
        <Tree x={330} scale={1.1} />
        <Tree x={372} scale={0.8} />
      </g>
      <path
        d="M0 250 C 80 220 140 260 220 235 S 340 215 400 240 V320 H0Z"
        fill="#f7b9c8"
        opacity="0.45"
      />
      <path
        d="M0 285 C 100 260 180 295 280 270 S 370 265 400 280 V320 H0Z"
        fill="#e7b3e3"
        opacity="0.5"
      />
    </svg>
  );
}

type StickerStyle = CSSProperties & { "--tilt": string; "--delay": string };

type StickerProps = {
  className: string;
  tilt?: number;
  delay?: number;
  children: ReactNode;
};

export function Sticker({ className, tilt = 0, delay = 0, children }: StickerProps) {
  const style: StickerStyle = { "--tilt": `${tilt}deg`, "--delay": `${delay}s` };
  return (
    <div aria-hidden="true" className={`sticker absolute ${className}`} style={style}>
      {children}
    </div>
  );
}
