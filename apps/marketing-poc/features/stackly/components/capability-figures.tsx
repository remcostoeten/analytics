const mapPoints: [number, number][] = [
  [10, 36],
  [13, 30],
  [16, 34],
  [19, 40],
  [22, 44],
  [25, 38],
  [28, 32],
  [31, 28],
  [34, 34],
  [37, 30],
  [40, 26],
  [43, 30],
  [46, 36],
  [49, 32],
  [52, 28],
  [55, 24],
  [58, 28],
  [61, 32],
  [64, 38],
  [67, 34],
  [70, 28],
  [73, 32],
  [76, 38],
  [79, 44],
  [82, 50],
  [85, 56],
  [88, 52],
  [91, 46],
  [28, 56],
  [31, 62],
  [34, 68],
  [37, 62],
  [25, 66],
  [52, 54],
  [55, 60],
  [58, 66],
  [49, 62],
  [61, 70],
  [16, 48],
  [19, 54],
];

function NodeBox({
  x,
  y,
  label,
  hot = false,
  delay = 0,
}: {
  x: number;
  y: number;
  label: string;
  hot?: boolean;
  delay?: number;
}) {
  return (
    <g className="node" style={{ animationDelay: `${delay}ms` }}>
      <rect
        x={x}
        y={y}
        width="44"
        height="11"
        fill={hot ? "#e8742b" : "#141416"}
        stroke={hot ? "#e8742b" : "#3a3a3f"}
        strokeWidth="0.6"
      />
      <text
        x={x + 22}
        y={y + 7.5}
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="4.6"
        fill={hot ? "#0a0a0b" : "#9a9a9f"}
      >
        {label}
      </text>
    </g>
  );
}

function Flow({
  d,
  duration = "2.4s",
  begin = "0s",
}: {
  d: string;
  duration?: string;
  begin?: string;
}) {
  return (
    <>
      <path d={d} stroke="#3a3a3f" strokeWidth="0.6" fill="none" />
      <path
        d={d}
        stroke="#e8742b"
        strokeWidth="0.8"
        fill="none"
        strokeDasharray="6 60"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="66"
          to="0"
          dur={duration}
          begin={begin}
          repeatCount="indefinite"
        />
      </path>
    </>
  );
}

function Ping({ cx, cy, begin = "0s" }: { cx: number; cy: number; begin?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="1.6" fill="#e8742b" />
      <circle cx={cx} cy={cy} r="1.6" fill="none" stroke="#e8742b" strokeWidth="0.6">
        <animate
          attributeName="r"
          from="1.6"
          to="12"
          dur="2.2s"
          begin={begin}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.9"
          to="0"
          dur="2.2s"
          begin={begin}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

export function DependencyFigure() {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="dep-cloud" r="0.5">
          <stop offset="0" stopColor="#e8742b" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e8742b" stopOpacity="0" />
        </radialGradient>
        <pattern id="dep-dots" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="#e8742b" />
        </pattern>
      </defs>
      <circle cx="30" cy="80" r="40" fill="url(#dep-cloud)">
        <animate attributeName="r" values="36;44;36" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="80" r="36" fill="url(#dep-dots)" opacity="0.45">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 30 80"
          to="360 30 80"
          dur="40s"
          repeatCount="indefinite"
        />
      </circle>
      <Flow d="M60 60 H88 V24 H132" begin="0s" />
      <Flow d="M88 60 H132" begin="0.6s" />
      <Flow d="M88 60 V96 H112" begin="1.2s" />
      <Flow d="M176 24 V60 H180" begin="1.8s" />
      <g fill="#e8742b">
        <circle cx="60" cy="60" r="1.4" />
        <circle cx="132" cy="24" r="1.4" />
        <circle cx="132" cy="60" r="1.4" />
        <circle cx="112" cy="96" r="1.4" />
        <circle cx="176" cy="24" r="1.4" />
      </g>
      <NodeBox x={132} y={18.5} label="SPRINT-23" delay={0} />
      <NodeBox x={88} y={54.5} label="SPRINT-24" delay={600} />
      <NodeBox x={112} y={90.5} label="SPRINT-25" delay={1200} />
      <NodeBox x={16} y={54.5} label="ISSUE-48" hot />
      <NodeBox x={176} y={54.5} label="TASK-2041" hot delay={1800} />
    </svg>
  );
}

export function TeamMapFigure() {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      {mapPoints.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x * 2.1} cy={y * 1.4} r="0.9" fill="#3a3a3f" />
      ))}
      <Ping cx={60} cy={62} begin="0s" />
      <Ping cx={128} cy={46} begin="0.7s" />
      <Ping cx={178} cy={70} begin="1.4s" />
      <g transform="translate(118 68)" fill="none" stroke="#e8742b" strokeWidth="0.7">
        <path d="M0 0 L2 10 L5 7 L8 12 L10 11 L7 6 L11 5 Z">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;6 -4;0 0"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <g transform="translate(166 60)" fill="none" stroke="#e8742b" strokeWidth="0.7">
        <path d="M0 0 L2 10 L5 7 L8 12 L10 11 L7 6 L11 5 Z">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;-5 5;0 0"
            dur="5s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <g className="float-svg">
        <rect
          x="48"
          y="28"
          width="92"
          height="22"
          fill="#0e0e10"
          stroke="#3a3a3f"
          strokeWidth="0.6"
        />
        <circle cx="58" cy="39" r="4" fill="none" stroke="#e8742b" strokeWidth="0.8">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 58 39"
            to="360 58 39"
            dur="6s"
            repeatCount="indefinite"
          />
        </circle>
        <path d="M58 33v2m0 8v2m-6-6h2m8 0h2" stroke="#e8742b" strokeWidth="0.8" />
        <text
          x="66"
          y="37"
          fontFamily="monospace"
          fontSize="4.6"
          fill="#e8742b"
          letterSpacing="0.5"
        >
          REPLAY VERIFICATION
        </text>
        <rect x="66" y="40" width="18" height="4" fill="#3a3a3f">
          <animate attributeName="width" values="4;44;4" dur="3s" repeatCount="indefinite" />
        </rect>
      </g>
      <g>
        <rect
          x="96"
          y="72"
          width="90"
          height="22"
          fill="#0e0e10"
          stroke="#3a3a3f"
          strokeWidth="0.6"
        />
        <text x="104" y="80" fontFamily="monospace" fontSize="4" fill="#e8742b" letterSpacing="0.5">
          FACE CHECKED
        </text>
        <text x="104" y="88" fontFamily="sans-serif" fontSize="4" fill="#9a9a9f">
          Liveness passed
        </text>
        <text x="178" y="87" textAnchor="end" fontFamily="serif" fontSize="12" fill="#f2f1ed">
          98%
        </text>
      </g>
    </svg>
  );
}

export function RelationshipFigure() {
  const leaves: [number, number, string][] = [
    [26, 52, "TASK-1102"],
    [152, 36, "TASK-1107"],
    [150, 74, "TASK-1140"],
    [40, 100, "TASK-1189"],
  ];
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <defs>
        <pattern id="rel-dots" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="#6a6a70" />
        </pattern>
        <radialGradient id="rel-fade" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="rel-mask">
          <circle cx="175" cy="60" r="50" fill="url(#rel-fade)" />
        </mask>
      </defs>
      <rect width="220" height="120" fill="url(#rel-dots)" mask="url(#rel-mask)" opacity="0.6" />
      {leaves.map(([x, y], index) => (
        <Flow
          key={`${x}-${y}`}
          d={`M110 18 L${x + 22} ${y}`}
          duration="1.8s"
          begin={`${index * 0.45}s`}
        />
      ))}
      <g>
        <rect x="88" y="12.5" width="44" height="11" fill="#e8742b">
          <animate attributeName="opacity" values="1;0.6;1" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <text
          x="110"
          y="20"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="4.6"
          fill="#0a0a0b"
        >
          BLOCKED
        </text>
      </g>
      {leaves.map(([x, y, label], index) => (
        <NodeBox key={label} x={x} y={y - 5.5} label={label} hot delay={index * 450} />
      ))}
    </svg>
  );
}

const capacity = [34, 46, 72, 40, 52, 44, 36, 30] as const;
const capacityAlt = [40, 38, 66, 52, 44, 58, 30, 42] as const;

export function WorkloadFigure() {
  function points(values: readonly number[]) {
    return values.map((value, index) => `${30 + index * 22},${90 - value}`).join(" ");
  }
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hot-bar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f0863a" />
          <stop offset="1" stopColor="#b14f14" />
        </linearGradient>
      </defs>
      <rect x="18" y="4" width="46" height="8" fill="#141416" stroke="#3a3a3f" strokeWidth="0.5" />
      <text x="22" y="9.5" fontFamily="monospace" fontSize="3.8" fill="#9a9a9f" letterSpacing="0.5">
        TEAM CAPACITY
      </text>
      <g fontFamily="sans-serif" fontSize="4.6" fill="#c4c4c9">
        <text x="18" y="22">
          Frontend
        </text>
        <text x="42" y="22" fill="#e8742b">
          ·
        </text>
        <text x="48" y="22">
          Backend
        </text>
        <text x="70" y="22" fill="#e8742b">
          ·
        </text>
        <text x="76" y="22">
          Platform
        </text>
      </g>
      {capacity.map((value, index) => (
        <g key={index}>
          <rect x={24 + index * 22} y={30} width="12" height="70" fill="#131315" />
          <rect
            x={24 + index * 22}
            y={100 - value}
            width="12"
            height={value}
            fill={index === 2 ? "url(#hot-bar)" : "#2a2a2e"}
          >
            <animate
              attributeName="y"
              values={`${100 - value};${100 - (capacityAlt[index] ?? value)};${100 - value}`}
              dur="6s"
              begin={`${index * 0.2}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="height"
              values={`${value};${capacityAlt[index] ?? value};${value}`}
              dur="6s"
              begin={`${index * 0.2}s`}
              repeatCount="indefinite"
            />
          </rect>
          {Array.from({ length: 6 }, (_, line) => (
            <line
              key={line}
              x1={24 + index * 22}
              x2={36 + index * 22}
              y1={38 + line * 10}
              y2={38 + line * 10}
              stroke="#0a0a0b"
              strokeWidth="0.6"
            />
          ))}
          <text
            x={30 + index * 22}
            y="110"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="3.4"
            fill="#6a6a70"
          >
            {`W${index + 1}`}
          </text>
        </g>
      ))}
      <polyline points={points(capacity)} fill="none" stroke="#e8742b" strokeWidth="0.8">
        <animate
          attributeName="points"
          values={`${points(capacity)};${points(capacityAlt)};${points(capacity)}`}
          dur="6s"
          repeatCount="indefinite"
        />
      </polyline>
      {capacity.map((value, index) => (
        <circle
          key={index}
          cx={30 + index * 22}
          cy={90 - value}
          r="1.6"
          fill="#0a0a0b"
          stroke="#e8742b"
          strokeWidth="0.8"
        >
          <animate
            attributeName="cy"
            values={`${90 - value};${90 - (capacityAlt[index] ?? value)};${90 - value}`}
            dur="6s"
            begin={`${index * 0.2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
