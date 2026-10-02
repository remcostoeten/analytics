import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  centered?: boolean;
};

export function Eyebrow({ children, centered = false }: EyebrowProps) {
  return (
    <p className={`eyebrow flex items-center gap-2 text-ember ${centered ? "justify-center" : ""}`}>
      <span className="text-fog">|</span>
      <span className="text-fog">·</span>
      {children}
      <span className="text-fog">·</span>
      <span className="text-fog">|</span>
    </p>
  );
}

type ButtonProps = {
  children: ReactNode;
  tone?: "light" | "dark" | "outline";
  arrow?: boolean;
};

export function Button({ children, tone = "dark", arrow = false }: ButtonProps) {
  const base = "eyebrow inline-flex h-9 items-center gap-2 px-5 font-medium transition-colors";
  const tones = {
    light: "bg-paper text-ink hover:bg-white",
    dark: "border border-line-strong bg-ink-raised text-paper hover:border-fog",
    outline: "border border-line text-mist hover:border-fog hover:text-paper",
  };
  return (
    <button type="button" className={`${base} ${tones[tone]}`}>
      {children}
      {arrow ? <span aria-hidden>›</span> : null}
    </button>
  );
}

type HeadingProps = {
  children: ReactNode;
  size?: "lg" | "md";
  centered?: boolean;
};

export function Heading({ children, size = "lg", centered = false }: HeadingProps) {
  const sizes = { lg: "text-4xl md:text-5xl", md: "text-3xl md:text-4xl" };
  return (
    <h2
      className={`font-display font-normal leading-[1.05] tracking-tight text-paper ${sizes[size]} ${centered ? "text-center" : ""}`}
    >
      {children}
    </h2>
  );
}

type WindowProps = {
  children: ReactNode;
  title: string;
  className?: string;
};

export function Window({ children, title, className = "" }: WindowProps) {
  return (
    <div className={`overflow-hidden border border-line bg-ink-raised ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="size-2 rounded-full bg-line-strong" />
          <i className="size-2 rounded-full bg-line-strong" />
          <i className="size-2 rounded-full bg-line-strong" />
        </span>
        <span className="eyebrow text-fog">{title}</span>
        <span className="font-display text-ember">V</span>
      </div>
      {children}
    </div>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-paper">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 9.5 11.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-lg">Stackly</span>
    </span>
  );
}
