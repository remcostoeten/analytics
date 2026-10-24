import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

const base =
  "caps inline-flex h-8 items-center gap-2 rounded-md px-3 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary:
    "bg-fg text-bg hover:bg-accent hover:text-white focus-visible:bg-accent focus-visible:text-white",
  ghost: "border border-line bg-surface text-fg hover:border-fg focus-visible:bg-fg/10",
  danger: "border border-line bg-surface text-err hover:border-err focus-visible:bg-err/10",
};

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  return <button type="button" {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}
