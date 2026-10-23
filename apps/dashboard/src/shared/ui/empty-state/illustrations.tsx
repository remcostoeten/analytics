import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type IllustrationLoop = "float" | "spread" | "pulse";

type IllustrationProps = ComponentPropsWithoutRef<"div"> & {
  loop?: boolean | IllustrationLoop;
};

const frame = "h-30 w-50 text-current [&>svg]:size-full [&>svg]:overflow-visible";
const wave =
  "origin-bottom [transform-box:fill-box] in-data-loop:animate-[esi-bar_3.2s_cubic-bezier(0.77,0,0.175,1)_calc(var(--esi-n)*250ms)_infinite]";
const march = "in-data-loop:animate-[esi-march_1.6s_linear_infinite]";
const variantLoop =
  "[animation:var(--esi-loop,none)_3.6s_cubic-bezier(0.77,0,0.175,1)_calc(var(--esi-step,0ms)*var(--esi-n))_infinite]";
const stackLoop = `in-data-[loop=float]:[--esi-loop:esi-stack-float] in-data-[loop=float]:[--esi-step:180ms] in-data-[loop=spread]:[--esi-loop:esi-stack-spread] in-data-[loop=pulse]:[--esi-loop:esi-stack-pulse] in-data-[loop=pulse]:[--esi-step:450ms] ${variantLoop}`;
const cubeVariants =
  "in-data-[loop=float]:[--esi-loop:esi-lift] in-data-[loop=float]:[--esi-step:200ms] in-data-[loop=spread]:[--esi-loop:esi-cube-spread] in-data-[loop=pulse]:[--esi-loop:esi-cube-pulse] in-data-[loop=pulse]:[--esi-step:450ms]";
const orders = ["[--esi-n:0]", "[--esi-n:1]", "[--esi-n:2]"];
const layerOutline =
  "M42.2538 2.046C41.4408 1.6325 40.3965 1.6677 39.2612 2.2424L7.9616 18.1934C5.3895 19.5039 3.301 23.1064 3.301 26.2322V64.3226C3.301 66.0677 3.9458 67.2943 4.962 67.8199L1.8363 66.229C0.8201 65.7104 0.1753 64.4771 0.1753 62.732V24.6412C0.1753 21.5085 2.2638 17.913 4.8359 16.6024L36.1355 0.6515C37.2778 0.0698 38.322 0.0416 39.128 0.4551L42.2538 2.046Z";
const layerFace =
  "M42.2545 2.0456C43.2707 2.5643 43.9155 3.7979 43.9155 5.543V43.6337C43.9155 46.7665 41.827 50.3616 39.2549 51.6722L7.9554 67.6235C6.813 68.2052 5.7687 68.2331 4.9628 67.8196C3.9465 67.301 3.3018 66.0673 3.3018 64.3222V26.2318C3.3018 23.0991 5.3903 19.5036 7.9624 18.193L39.2619 2.2421C40.4043 1.6604 41.4486 1.6321 42.2545 2.0456Z";
const layers = [
  { x: 0, y: 0, opacity: 0.4, strokeOpacity: 0.2, order: "[--esi-n:0]" },
  { x: 13.65, y: 6.04, opacity: 0.6, strokeOpacity: 0.2, order: "[--esi-n:1]" },
  { x: 27.32, y: 12.08, opacity: 0.8, strokeOpacity: 0.3, order: "[--esi-n:2]" },
];

const shadeTop = "fill-[color-mix(in_srgb,currentColor_9%,var(--es-surface,transparent))]";
const shadeLeft = "fill-[color-mix(in_srgb,currentColor_5%,var(--es-surface,transparent))]";
const shadeRight = "fill-[color-mix(in_srgb,currentColor_2%,var(--es-surface,transparent))]";

function iso(x: number, y: number, z: number) {
  return `${80 + x - y},${48 + (x + y) / 2 - z}`;
}

function isoRect(x: number, y: number, z: number, w: number, d: number) {
  return `${iso(x, y, z)} ${iso(x + w, y, z)} ${iso(x + w, y + d, z)} ${iso(x, y + d, z)}`;
}

function isoLine(x1: number, y1: number, x2: number, y2: number, z: number) {
  return `M${iso(x1, y1, z)}L${iso(x2, y2, z)}`;
}

type IsoBoxProps = {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  ghost?: boolean;
  className?: string;
  children?: ReactNode;
};

function IsoBox({ x, y, z = 0, w, d, h, ghost = false, className = "", children }: IsoBoxProps) {
  const top = isoRect(x, y, z + h, w, d);

  if (ghost) {
    return (
      <g className={className} strokeOpacity="0.4" strokeWidth="0.6" strokeDasharray="2 2">
        <polygon points={top} />
        <path
          d={`M${iso(x, y + d, z + h)}L${iso(x, y + d, z)}L${iso(x + w, y + d, z)}L${iso(x + w, y, z)}L${iso(x + w, y, z + h)}M${iso(x + w, y + d, z + h)}L${iso(x + w, y + d, z)}`}
        />
        {children}
      </g>
    );
  }

  return (
    <g className={className} strokeOpacity="0.5" strokeWidth="0.75">
      <polygon
        className={shadeLeft}
        points={`${iso(x, y + d, z + h)} ${iso(x + w, y + d, z + h)} ${iso(x + w, y + d, z)} ${iso(x, y + d, z)}`}
      />
      <polygon
        className={shadeRight}
        points={`${iso(x + w, y, z + h)} ${iso(x + w, y + d, z + h)} ${iso(x + w, y + d, z)} ${iso(x + w, y, z)}`}
      />
      <polygon className={shadeTop} points={top} />
      {children}
    </g>
  );
}

const tileLines = [0, 1, 2, 3].flatMap((n) => [
  { x1: 80 + 14 * n, y1: 27 + 7 * n, x2: 38 + 14 * n, y2: 48 + 7 * n },
  { x1: 80 - 14 * n, y1: 27 + 7 * n, x2: 122 - 14 * n, y2: 48 + 7 * n },
]);
const columns = [
  { x: -30, height: 12, ghost: false },
  { x: -8, height: 28, ghost: true },
  { x: 14, height: 18, ghost: false },
];

const projectCubes = [
  { x: -27, y: -27, order: "[--esi-n:0]" },
  { x: 0, y: -27, order: "[--esi-n:1]" },
  { x: -27, y: 0, order: "[--esi-n:2]" },
];

export function ProjectIllustration({ loop = false, className = "", ...props }: IllustrationProps) {
  return (
    <div
      {...props}
      className={`h-32 w-54 text-current ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 220 140"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        className="block size-full overflow-visible"
      >
        <g transform="translate(30 30)">
          <IsoBox x={-32} y={-32} z={-3} w={59} d={59} h={3} />
          <path
            d={`${isoLine(-32, -2.5, 27, -2.5, 0)}${isoLine(-2.5, -32, -2.5, 27, 0)}`}
            strokeOpacity="0.14"
            strokeWidth="0.5"
          />
          {projectCubes.map((cube) => (
            <IsoBox
              key={`${cube.x}-${cube.y}`}
              className={`${cube.order} ${cubeVariants} ${variantLoop}`}
              x={cube.x}
              y={cube.y}
              w={22}
              d={22}
              h={22}
            />
          ))}
          <IsoBox
            className={`[--esi-n:3] in-data-loop:[--esi-march:esi-march] ${cubeVariants} [animation:var(--esi-loop,none)_3.6s_cubic-bezier(0.77,0,0.175,1)_calc(var(--esi-step,0ms)*var(--esi-n))_infinite,var(--esi-march,none)_1.6s_linear_infinite]`}
            x={0}
            y={0}
            w={22}
            d={22}
            h={22}
            ghost
          />
        </g>
      </svg>
    </div>
  );
}

type IconStackProps = IllustrationProps & {
  icon?: ReactNode;
};

export function IconStack({ icon, loop = false, className = "", ...props }: IconStackProps) {
  return (
    <div
      {...props}
      className={`relative h-24 w-22 text-current ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 81" fill="none" className="size-full overflow-visible">
        <ellipse
          className="fill-current blur-[4px] [fill-opacity:0.055]"
          cx="36"
          cy="76"
          rx="30"
          ry="7"
        />
        {layers.map((layer) => (
          <g
            key={layer.x}
            className={`${layer.order} ${stackLoop}`}
            opacity={layer.opacity}
            transform={`translate(${layer.x} ${layer.y})`}
            stroke="currentColor"
            strokeOpacity={layer.strokeOpacity}
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="fill-(--es-surface)" d={layerOutline} />
            <path className="fill-(--es-surface)" d={layerFace} />
          </g>
        ))}
      </svg>
      {icon && (
        <div
          className={`pointer-events-none absolute top-[57%] left-[70%] flex text-(color:--es-muted) [transform:translate(-50%,-50%)_scaleX(0.9)_skewY(-26deg)] [--esi-k:1.185] [--esi-n:2] [&_svg]:size-5 ${stackLoop}`}
        >
          {icon}
        </div>
      )}
    </div>
  );
}

export function SearchIllustration({ loop = false, className = "", ...props }: IllustrationProps) {
  return (
    <div
      {...props}
      className={`${frame} ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 96" fill="none" stroke="currentColor">
        {tileLines.map((line) => (
          <line
            key={`${line.x1}-${line.x2}`}
            {...line}
            strokeOpacity="0.16"
            strokeWidth="0.5"
            strokeLinecap="round"
          />
        ))}
        <g className="in-data-loop:animate-[esi-scan_8s_cubic-bezier(0.65,0,0.35,1)_infinite]">
          <polygon
            className={march}
            points="80,41 94,48 80,55 66,48"
            fill="currentColor"
            fillOpacity="0.05"
            strokeOpacity="0.6"
            strokeWidth="0.75"
            strokeDasharray="2 2"
            strokeLinejoin="round"
          />
          <circle
            cx="80"
            cy="48"
            r="17"
            fill="currentColor"
            fillOpacity="0.03"
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
          <path
            d="M70 39.5a13 13 0 0 1 8-4.4"
            strokeOpacity="0.25"
            strokeWidth="0.75"
            strokeLinecap="round"
          />
          <path d="M92.4 60.4 104 72" strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

export function ChartIllustration({ loop = false, className = "", ...props }: IllustrationProps) {
  return (
    <div
      {...props}
      className={`${frame} ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 96" fill="none" stroke="currentColor" strokeLinejoin="round">
        <IsoBox x={-36} y={-20} z={-16} w={72} d={36} h={3} />
        <path
          d={`${isoLine(-36, -11, 36, -11, -13)}${isoLine(-36, 7, 36, 7, -13)}`}
          strokeOpacity="0.12"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        {columns.map((column, index) => (
          <g key={column.x} className={`${orders[index]} ${wave}`}>
            <IsoBox
              className={column.ghost ? march : ""}
              x={column.x}
              y={-8}
              z={-13}
              w={14}
              d={14}
              h={column.height}
              ghost={column.ghost}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

const feed = [
  { y: -26, width: 30, ghost: true },
  { y: -7, width: 30, ghost: false },
  { y: 12, width: 20, ghost: false },
];

export function ActivityIllustration({
  loop = false,
  className = "",
  ...props
}: IllustrationProps) {
  return (
    <div
      {...props}
      className={`${frame} ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {feed.map((card) => (
          <IsoBox
            key={card.y}
            className={card.ghost ? march : ""}
            x={-26}
            y={card.y}
            w={52}
            d={14}
            h={3}
            ghost={card.ghost}
          >
            {!card.ghost && (
              <>
                <polygon
                  points={isoRect(-21, card.y + 5, 3, 4, 4)}
                  fill="currentColor"
                  fillOpacity="0.5"
                  stroke="none"
                />
                <path
                  d={isoLine(-11, card.y + 7, -11 + card.width, card.y + 7, 3)}
                  strokeOpacity="0.25"
                  strokeWidth="2"
                />
              </>
            )}
          </IsoBox>
        ))}
        <path
          d={isoLine(-19, -19, -19, 19, 3)}
          strokeOpacity="0.3"
          strokeWidth="0.6"
          strokeDasharray="0.5 2.5"
        />
        <circle
          className="in-data-loop:animate-[esi-feed_4s_cubic-bezier(0.65,0,0.35,1)_infinite]"
          cx={80 - 19 + 19}
          cy={48 + (-19 - 19) / 2 - 3}
          r="1.6"
          fill="currentColor"
          fillOpacity="0.8"
          stroke="none"
        />
      </svg>
    </div>
  );
}

function KeyholeKey() {
  return (
    <>
      <rect
        width="40"
        height="52"
        rx="6"
        transform="matrix(1 .5 0 1 84 3)"
        strokeOpacity="0.18"
        strokeWidth="0.5"
      />
      <g transform="matrix(1 .5 0 1 78 6)">
        <rect
          width="40"
          height="52"
          rx="6"
          fill="currentColor"
          fillOpacity="0.05"
          strokeOpacity="0.5"
          strokeWidth="0.75"
        />
        <path
          d="M17.2 27.2a5 5 0 1 1 5.6 0L24.5 38h-9Z"
          fill="currentColor"
          fillOpacity="0.08"
          strokeOpacity="0.6"
          strokeWidth="0.75"
        />
      </g>
      <g
        className="in-data-loop:animate-[esi-insert_3.2s_cubic-bezier(0.77,0,0.175,1)_infinite]"
        transform="matrix(-1 .5 0 1 86 46)"
      >
        <path
          className={march}
          d="M30 -2.5H0V2.5H6V6H10V2.5H14V5H18V2.5H30"
          strokeOpacity="0.55"
          strokeWidth="0.7"
          strokeDasharray="2 2"
        />
        <circle
          className={march}
          cx="40"
          cy="0"
          r="10"
          strokeOpacity="0.55"
          strokeWidth="0.7"
          strokeDasharray="2 2"
        />
        <circle cx="43" cy="0" r="3.2" strokeOpacity="0.35" strokeWidth="0.6" />
      </g>
    </>
  );
}

export function KeyIllustration({ loop = false, className = "", ...props }: IllustrationProps) {
  return (
    <div
      {...props}
      className={`${frame} ${className}`}
      data-loop={loop === true ? "float" : loop || undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <KeyholeKey />
      </svg>
    </div>
  );
}
