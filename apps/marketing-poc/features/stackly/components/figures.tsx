const mapPoints = [
  [8, 38],
  [10, 44],
  [12, 36],
  [14, 42],
  [16, 48],
  [18, 40],
  [20, 34],
  [22, 46],
  [24, 52],
  [26, 44],
  [28, 36],
  [30, 30],
  [34, 28],
  [36, 34],
  [38, 26],
  [40, 32],
  [42, 38],
  [44, 30],
  [46, 24],
  [48, 28],
  [50, 36],
  [52, 42],
  [54, 32],
  [56, 26],
  [58, 30],
  [60, 38],
  [62, 44],
  [64, 34],
  [66, 28],
  [68, 36],
  [70, 42],
  [72, 48],
  [74, 32],
  [76, 40],
  [78, 54],
  [80, 46],
  [82, 60],
  [84, 56],
  [86, 50],
  [88, 64],
  [30, 60],
  [32, 66],
  [34, 72],
  [36, 64],
  [28, 70],
  [50, 58],
  [52, 64],
  [54, 70],
  [48, 66],
] as const;

type Props = {
  compact?: boolean;
};

export function DotMap({ compact = false }: Props) {
  return (
    <svg viewBox="0 0 100 80" className="h-full w-full" aria-hidden>
      {mapPoints.map(([x, y], index) => {
        const hot = index % 7 === 0;
        return (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={compact ? 0.9 : 1.1}
            fill={hot ? "#e5742b" : "#3a3a3f"}
          />
        );
      })}
      {!compact ? (
        <>
          <path d="M22 46 L60 38" stroke="#e5742b" strokeWidth="0.3" strokeDasharray="1 1" />
          <path d="M36 34 L74 32" stroke="#e5742b" strokeWidth="0.3" strokeDasharray="1 1" />
        </>
      ) : null}
    </svg>
  );
}

export function DependencyFigure() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <g fill="#141416" stroke="#2e2e32" strokeWidth="0.8">
        <rect x="56" y="10" width="48" height="12" />
        <rect x="56" y="44" width="48" height="12" />
        <rect x="56" y="78" width="48" height="12" />
        <rect x="6" y="44" width="40" height="12" />
        <rect x="114" y="44" width="40" height="12" />
      </g>
      <g stroke="#e5742b" strokeWidth="0.8" fill="none">
        <path d="M80 22 V44" />
        <path d="M80 56 V78" />
        <path d="M46 50 H56" />
        <path d="M104 50 H114" />
      </g>
      <g fill="#8a8a90" fontFamily="monospace" fontSize="5">
        <text x="60" y="18">
          SPRINT-23
        </text>
        <text x="60" y="52">
          SPRINT-24
        </text>
        <text x="60" y="86">
          SPRINT-25
        </text>
        <text x="10" y="52">
          ISSUE-48
        </text>
        <text x="118" y="52">
          PROD-2041
        </text>
      </g>
    </svg>
  );
}

export function RelationshipFigure() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <g stroke="#e5742b" strokeWidth="0.8" fill="none">
        <path d="M80 18 L30 50" />
        <path d="M80 18 L80 50" />
        <path d="M80 18 L130 50" />
        <path d="M80 50 L55 84" />
        <path d="M80 50 L105 84" />
      </g>
      <g fill="#141416" stroke="#e5742b" strokeWidth="0.8">
        <rect x="58" y="10" width="44" height="12" />
      </g>
      <g fill="#141416" stroke="#2e2e32" strokeWidth="0.8">
        <rect x="8" y="44" width="44" height="12" />
        <rect x="58" y="44" width="44" height="12" />
        <rect x="108" y="44" width="44" height="12" />
        <rect x="33" y="78" width="44" height="12" />
        <rect x="83" y="78" width="44" height="12" />
      </g>
      <g fill="#8a8a90" fontFamily="monospace" fontSize="5">
        <text x="62" y="18">
          BLOCKED
        </text>
        <text x="12" y="52">
          AUTH-12
        </text>
        <text x="62" y="52">
          API-31
        </text>
        <text x="112" y="52">
          WEB-07
        </text>
        <text x="37" y="86">
          QA-02
        </text>
        <text x="87" y="86">
          REL-9
        </text>
      </g>
    </svg>
  );
}

const workload = [38, 52, 44, 70, 58, 48, 64, 42] as const;

export function WorkloadFigure() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden>
      <g fill="#8a8a90" fontFamily="monospace" fontSize="5">
        <text x="8" y="12">
          Frontend
        </text>
        <text x="48" y="12">
          Backend
        </text>
        <text x="88" y="12">
          Platform
        </text>
      </g>
      {workload.map((value, index) => (
        <rect
          key={value + index}
          x={12 + index * 18}
          y={92 - value}
          width="10"
          height={value}
          fill={index === 3 ? "#e5742b" : "#232326"}
        />
      ))}
      <polyline
        points={workload.map((value, index) => `${17 + index * 18},${92 - value - 8}`).join(" ")}
        fill="none"
        stroke="#e5742b"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function TerrainFigure() {
  return (
    <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="terrain" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3a3a3f" />
          <stop offset="60%" stopColor="#1a1a1d" />
          <stop offset="100%" stopColor="#0d0d0f" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="64" rx="78" ry="46" fill="url(#terrain)" />
      {Array.from({ length: 9 }, (_, row) => (
        <path
          key={row}
          d={`M20 ${30 + row * 9} Q 60 ${20 + row * 9 + (row % 2) * 6}, 100 ${30 + row * 9} T 180 ${30 + row * 9}`}
          fill="none"
          stroke="#2e2e32"
          strokeWidth="0.6"
        />
      ))}
    </svg>
  );
}

export function StackFigure() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <g fill="#141416" stroke="#2e2e32" strokeWidth="0.8">
        <path d="M80 10 L120 32 L80 54 L40 32 Z" />
        <path d="M80 46 L120 68 L80 90 L40 68 Z" />
        <path d="M80 82 L120 104 L80 126 L40 104 Z" />
      </g>
      <g stroke="#e5742b" strokeWidth="1" fill="none">
        <path d="M72 30 L80 24 L88 30 L80 36 Z" />
        <path d="M74 64 L86 72 M86 64 L74 72" />
        <path d="M76 98 L84 104 L76 110" />
      </g>
    </svg>
  );
}
