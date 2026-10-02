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
}: {
  x: number;
  y: number;
  label: string;
  hot?: boolean;
}) {
  return (
    <g>
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
      <circle cx="30" cy="80" r="40" fill="url(#dep-cloud)" />
      <circle cx="30" cy="80" r="36" fill="url(#dep-dots)" opacity="0.45" />
      <g stroke="#d9d9de" strokeWidth="0.6" fill="none">
        <path d="M60 60 H88 V24 H132" />
        <path d="M88 60 H132" />
        <path d="M88 60 V96 H112" />
        <path d="M176 24 V60 H180" />
      </g>
      <g fill="#e8742b">
        <circle cx="60" cy="60" r="1.4" />
        <circle cx="132" cy="24" r="1.4" />
        <circle cx="132" cy="60" r="1.4" />
        <circle cx="112" cy="96" r="1.4" />
        <circle cx="176" cy="24" r="1.4" />
      </g>
      <NodeBox x={132} y={18.5} label="SPRINT-23" />
      <NodeBox x={88} y={54.5} label="SPRINT-24" />
      <NodeBox x={112} y={90.5} label="SPRINT-25" />
      <NodeBox x={16} y={54.5} label="ISSUE-48" hot />
      <NodeBox x={176} y={54.5} label="TASK-2041" hot />
    </svg>
  );
}

export function TeamMapFigure() {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      {mapPoints.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x * 2.1} cy={y * 1.4} r="0.9" fill="#3a3a3f" />
      ))}
      <g transform="translate(118 68)" fill="none" stroke="#e8742b" strokeWidth="0.7">
        <path d="M0 0 L2 10 L5 7 L8 12 L10 11 L7 6 L11 5 Z" />
      </g>
      <g transform="translate(166 60)" fill="none" stroke="#e8742b" strokeWidth="0.7">
        <path d="M0 0 L2 10 L5 7 L8 12 L10 11 L7 6 L11 5 Z" />
      </g>
      <g>
        <rect
          x="48"
          y="28"
          width="92"
          height="22"
          fill="#0e0e10"
          stroke="#3a3a3f"
          strokeWidth="0.6"
        />
        <circle cx="58" cy="39" r="4" fill="none" stroke="#e8742b" strokeWidth="0.8" />
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
        <rect x="66" y="40" width="18" height="4" fill="#3a3a3f" />
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
      <g stroke="#e8742b" strokeWidth="0.5" fill="none" opacity="0.8">
        {leaves.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M110 18 L${x + 22} ${y}`} />
        ))}
      </g>
      <NodeBox x={88} y={12.5} label="BLOCKED" hot />
      {leaves.map(([x, y, label]) => (
        <NodeBox key={label} x={x} y={y - 5.5} label={label} hot />
      ))}
    </svg>
  );
}

const capacity = [34, 46, 72, 40, 52, 44, 36, 30] as const;

export function WorkloadFigure() {
  const points = capacity.map((value, index) => [30 + index * 22, 100 - value - 10] as const);
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
          />
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
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="#e8742b"
        strokeWidth="0.8"
      />
      {points.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1.6" fill="#0a0a0b" stroke="#e8742b" strokeWidth="0.8" />
      ))}
    </svg>
  );
}
