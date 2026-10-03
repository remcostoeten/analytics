type NodeProps = {
  x: number;
  y: number;
  label: string;
  detail?: string;
  width?: number;
};

function Node({ x, y, label, detail, width = 108 }: NodeProps) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height="44" rx="6" fill="var(--surface)" stroke="var(--line)" />
      <text x="12" y="19" className="fill-fg" fontSize="11" fontWeight="500">
        {label}
      </text>
      {detail ? (
        <text x="12" y="33" className="fill-muted" fontSize="9" fontFamily="var(--mono)">
          {detail}
        </text>
      ) : null}
    </g>
  );
}

type WireProps = {
  d: string;
  delay?: string;
};

function Wire({ d, delay = "0s" }: WireProps) {
  return (
    <g>
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
      <circle r="2.5" fill="var(--accent)">
        <animateMotion dur="2.4s" begin={delay} repeatCount="indefinite" path={d} />
      </circle>
    </g>
  );
}

export function PipelineDiagram() {
  return (
    <svg
      viewBox="0 0 520 150"
      className="h-auto w-full"
      role="img"
      aria-label="Events flow from the SDK through the proxy and API into Postgres"
    >
      <Wire d="M108 50 L136 50" />
      <Wire d="M244 50 L272 50" delay="0.6s" />
      <Wire d="M380 50 L408 50" delay="1.2s" />
      <Wire d="M62 94 L62 118 L226 118 L226 94" delay="0.3s" />
      <Node x={0} y={28} label="Browser SDK" detail="20 events or 5 s" />
      <Node x={136} y={28} label="/_ra proxy" detail="your domain" />
      <Node x={272} y={28} label="API" detail="key, origin, bots" />
      <Node x={408} y={28} label="Postgres" detail="your database" />
      <text
        x="62"
        y="140"
        textAnchor="middle"
        className="fill-muted"
        fontSize="9"
        fontFamily="var(--mono)"
      >
        retries 1 s, 4 s, 16 s
      </text>
    </svg>
  );
}

export function ProxyDiagram() {
  return (
    <svg
      viewBox="0 0 520 170"
      className="h-auto w-full"
      role="img"
      aria-label="The browser posts to your own domain and the proxy forwards to the API"
    >
      <rect
        x="0"
        y="8"
        width="300"
        height="154"
        rx="8"
        fill="none"
        stroke="var(--line)"
        strokeDasharray="4 4"
      />
      <text x="12" y="26" className="fill-muted" fontSize="9" fontFamily="var(--mono)">
        EXAMPLE.COM
      </text>
      <Node x={20} y={56} label="Page" detail="analytics.track()" />
      <Node x={168} y={56} label="/_ra route" detail="createProxy()" />
      <Wire d="M128 78 L168 78" />
      <Wire d="M276 78 L400 78" delay="0.8s" />
      <Node x={400} y={56} label="API" detail="POST /v2/events" />
      <text
        x="338"
        y="70"
        textAnchor="middle"
        className="fill-muted"
        fontSize="9"
        fontFamily="var(--mono)"
      >
        + secret key
      </text>
      <text
        x="338"
        y="96"
        textAnchor="middle"
        className="fill-muted"
        fontSize="9"
        fontFamily="var(--mono)"
      >
        + forwarded IP
      </text>
      <text
        x="150"
        y="140"
        textAnchor="middle"
        className="fill-muted"
        fontSize="9"
        fontFamily="var(--mono)"
      >
        first-party request, no third-party host
      </text>
    </svg>
  );
}

export function PrivacyDiagram() {
  return (
    <svg
      viewBox="0 0 520 150"
      className="h-auto w-full"
      role="img"
      aria-label="The IP address is hashed with a daily salt and then dropped"
    >
      <Node x={0} y={28} label="IP address" detail="203.0.113.7" />
      <Wire d="M108 50 L168 50" />
      <g transform="translate(168 28)">
        <rect width="150" height="44" rx="6" fill="var(--surface)" stroke="var(--accent)" />
        <text x="12" y="19" className="fill-fg" fontSize="11" fontWeight="500">
          sha256(ip + salt)
        </text>
        <text x="12" y="33" className="fill-muted" fontSize="9" fontFamily="var(--mono)">
          salt rotates every UTC day
        </text>
      </g>
      <Wire d="M318 50 L378 50" delay="0.8s" />
      <Node x={378} y={28} label="Rate limit" detail="bot signal only" width={130} />
      <g transform="translate(0 96)">
        <line x1="54" y1="0" x2="54" y2="20" stroke="var(--line)" strokeDasharray="3 3" />
        <text
          x="54"
          y="36"
          textAnchor="middle"
          className="fill-muted"
          fontSize="9"
          fontFamily="var(--mono)"
        >
          raw IP dropped
        </text>
      </g>
      <text
        x="443"
        y="132"
        textAnchor="middle"
        className="fill-muted"
        fontSize="9"
        fontFamily="var(--mono)"
      >
        never a visitor id
      </text>
    </svg>
  );
}
