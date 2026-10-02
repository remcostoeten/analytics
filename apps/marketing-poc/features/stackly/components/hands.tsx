const leftArm =
  "M0 110 C50 98 100 96 140 102 C160 105 176 110 188 116 L198 119 C208 117 218 120 228 125 L226 131 L212 132 L214 138 L200 140 L202 146 L190 147 L190 152 L176 152 C164 156 150 158 134 162 C90 172 45 182 0 188 Z";

const rightArm =
  "M460 58 C420 64 384 74 350 88 C322 99 300 110 282 122 C272 129 266 134 260 138 L250 142 L242 148 L248 153 L258 150 L262 156 L272 150 L280 154 L286 146 C300 142 318 136 338 130 C378 120 418 112 460 116 Z";

export function Hands() {
  return (
    <svg viewBox="0 0 460 260" className="h-full w-full" aria-hidden>
      <defs>
        <pattern id="hand-dots" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0.5" y="0.5" width="2.3" height="2.3" fill="#e8742b" />
        </pattern>
        <pattern id="hand-dots-dim" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0.5" y="0.5" width="1.4" height="1.4" fill="#8a4216" />
        </pattern>
        <linearGradient id="hand-fade-left" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="hand-fade-right" x1="1" x2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="hand-shade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </linearGradient>
        <mask id="mask-left">
          <rect width="460" height="260" fill="url(#hand-fade-left)" />
        </mask>
        <mask id="mask-right">
          <rect width="460" height="260" fill="url(#hand-fade-right)" />
        </mask>
        <mask id="mask-shade">
          <rect width="460" height="260" fill="url(#hand-shade)" />
        </mask>
      </defs>
      <g mask="url(#mask-left)">
        <path d={leftArm} fill="url(#hand-dots-dim)" transform="translate(0 6)" />
        <g mask="url(#mask-shade)">
          <path d={leftArm} fill="url(#hand-dots)" />
        </g>
      </g>
      <g mask="url(#mask-right)">
        <path d={rightArm} fill="url(#hand-dots-dim)" transform="translate(0 6)" />
        <g mask="url(#mask-shade)">
          <path d={rightArm} fill="url(#hand-dots)" />
        </g>
      </g>
    </svg>
  );
}
