import { useId } from "react";

type Props = {
  className?: string;
};

export function Logo({ className }: Props) {
  const id = useId();
  const silver = `${id}-silver`;
  const fold = `${id}-fold`;

  return (
    <svg viewBox="-25 0 300 300" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={silver} x1=".1" y1=".7" x2=".95" y2=".25">
          <stop stopColor="#8574bd" />
          <stop offset=".25" stopColor="#d5ccf8" />
          <stop offset=".48" stopColor="#f8f6ff" />
          <stop offset=".7" stopColor="#999cd4" />
          <stop offset="1" stopColor="#e9e8fc" />
        </linearGradient>
        <linearGradient id={fold} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7878aa" />
          <stop offset=".45" stopColor="#eeeaff" />
          <stop offset="1" stopColor="#665a96" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${silver})`}
        d="M134 20C147 3 173 11 167 34C148 80 159 107 193 106Q198 105 199 112C204 143 230 174 227 206C225 254 193 278 134 282C71 286 25 263 21 214C15 169 47 125 74 91Z"
      />
      <path
        fill={`url(#${fold})`}
        d="M84 79C52 143 95 155 158 182C211 205 212 240 187 265C211 225 155 215 104 190C58 168 47 132 84 79Z"
      />
    </svg>
  );
}
