import type { ReactNode } from "react";

import { Magnetic } from "./magnetic";

type EyebrowProps = {
  children: ReactNode;
  centered?: boolean;
};

export function Eyebrow({ children, centered = false }: EyebrowProps) {
  return (
    <p
      className={`eyebrow flex items-center gap-1.5 text-ember ${centered ? "justify-center" : ""}`}
    >
      <span className="text-fog/60">|</span>
      <span className="text-fog/60">·</span>
      <span>{children}</span>
      <span className="text-fog/60">·</span>
      <span className="text-fog/60">|</span>
    </p>
  );
}

type ButtonProps = {
  children: ReactNode;
  tone?: "metal" | "dark" | "ghost";
  arrow?: boolean;
  small?: boolean;
};

export function Button({ children, tone = "dark", arrow = false, small = false }: ButtonProps) {
  const base = `arrow-nudge eyebrow inline-flex items-center justify-center gap-2 whitespace-nowrap ${small ? "h-8 px-3.5" : "h-10 px-7"}`;
  const tones = {
    metal: "metal text-ink",
    dark: "border border-line-strong bg-ink-raised text-mist hover:border-fog hover:text-paper",
    ghost: "border border-line bg-transparent text-mist hover:border-fog hover:text-paper",
  };
  return (
    <Magnetic className={`${base} ${tones[tone]}`}>
      <span>{children}</span>
      {arrow ? <span aria-hidden>›</span> : null}
    </Magnetic>
  );
}

type HeadingProps = {
  children: ReactNode;
  size?: "xl" | "lg" | "md";
  centered?: boolean;
};

export function Heading({ children, size = "lg", centered = false }: HeadingProps) {
  const sizes = {
    xl: "text-[56px] md:text-[72px] lg:text-[84px] leading-[0.98]",
    lg: "text-[40px] md:text-[52px] leading-[1.02]",
    md: "text-[34px] md:text-[44px] leading-[1.05]",
  };
  return (
    <h2
      className={`font-display font-normal tracking-[-0.01em] text-paper ${sizes[size]} ${centered ? "text-center" : ""}`}
    >
      {children}
    </h2>
  );
}

export function Dim({ children }: { children: ReactNode }) {
  return <span className="dim">{children}</span>;
}

type WindowProps = {
  children: ReactNode;
  title: string;
};

export function Window({ children, title }: WindowProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-line-strong bg-ink-raised shadow-[0_30px_80px_rgb(0_0_0/0.6)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 py-3">
        <span className="flex gap-1.5">
          <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#ff5f57]" />
          <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#febc2e]" />
          <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#28c840]" />
        </span>
        <span className="eyebrow text-fog">{title}</span>
        <span className="justify-self-end font-display text-lg text-ember">V</span>
      </div>
      {children}
    </div>
  );
}

export function Mark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 10 11.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M8 4.5v7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="group flex items-center gap-2 text-paper">
      <span className="transition-transform duration-500 group-hover:rotate-180">
        <Mark />
      </span>
      <span className="font-display text-xl">Stackly</span>
    </span>
  );
}
