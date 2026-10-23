import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type { IllustrationLoop } from "./illustrations";

type EmptyStateLink = Omit<ComponentPropsWithoutRef<"a">, "children"> & {
  label: ReactNode;
  href: string;
};

type EmptyStateSize = "md" | "lg";

type EmptyStateEntrance = "rise" | "fade" | "blur";

type EmptyStateProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  illustration?: ReactNode;
  link?: EmptyStateLink;
  size?: EmptyStateSize;
  animated?: boolean | EmptyStateEntrance;
  loop?: boolean | IllustrationLoop;
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children?: ReactNode;
};

const root =
  "group/es box-border flex w-full min-w-0 flex-col items-center justify-center text-center text-(color:--es-foreground) motion-reduce:**:animate-none **:box-border [--es-background:var(--bg)] [--es-border:var(--line)] [--es-ease-out:var(--ease-out)] [--es-foreground:var(--fg)] [--es-muted:var(--muted)] [--es-surface:var(--surface)] data-[animated=fade]:[--es-enter-distance:0px] data-[animated=blur]:[--es-enter-blur:4px]";
const entrance =
  "group-data-animated/es:transition-[opacity,translate,filter] group-data-animated/es:duration-(--es-enter-duration,220ms) group-data-animated/es:ease-(--es-ease-out) starting:group-data-animated/es:opacity-0 starting:group-data-animated/es:translate-y-(--es-enter-distance,6px) starting:group-data-animated/es:blur-(--es-enter-blur,0px)";
const sizes = {
  md: {
    root: "min-h-[300px] gap-10 px-6 py-12 max-[480px]:px-4 max-[480px]:py-10",
    main: "gap-5",
    title: "text-base/[1.4] tracking-[-0.02em]",
    description: "max-w-96 text-balance",
  },
  lg: {
    root: "gap-24 px-5 py-12 max-[480px]:gap-16 max-[480px]:px-4 max-[480px]:py-8",
    main: "gap-6",
    title: "text-2xl/tight tracking-[-0.045em] max-[480px]:text-[22px]",
    description: "max-w-100 text-pretty",
  },
};

function HelpLink({ label, className = "", ...link }: EmptyStateLink) {
  return (
    <a
      {...link}
      className={`inline-flex items-center gap-1.5 rounded-sm text-xs/normal font-medium text-(color:--es-muted) no-underline transition-colors duration-150 ease-[ease] hover:text-(color:--es-foreground) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--es-foreground)/25 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span>{label}</span>
    </a>
  );
}

export function EmptyState({
  title,
  description,
  illustration,
  link,
  size = "md",
  animated = true,
  loop = true,
  headingLevel: Heading = "h2",
  className = "",
  children,
  ...props
}: EmptyStateProps) {
  const scale = sizes[size];

  return (
    <section
      {...props}
      className={`${root} ${scale.root} ${className}`}
      data-animated={animated === true ? "rise" : animated || undefined}
      data-loop={loop === true ? "float" : loop || undefined}
    >
      <div className={`flex w-full flex-col items-center ${scale.main}`}>
        {illustration ? (
          <div className={`flex justify-center ${entrance}`}>{illustration}</div>
        ) : null}
        <div
          className={`flex flex-col items-center gap-2 group-data-animated/es:delay-(--es-enter-stagger,40ms) ${entrance}`}
        >
          <Heading className={`m-0 font-semibold text-balance ${scale.title}`}>{title}</Heading>
          {description ? (
            <div
              className={`text-sm/relaxed text-(color:--es-muted) [&_a]:text-inherit [&_a]:underline [&_a]:underline-offset-4 ${scale.description}`}
            >
              {description}
            </div>
          ) : null}
        </div>
        {children ? (
          <div
            className={`flex flex-wrap justify-center gap-2 group-data-animated/es:delay-[calc(var(--es-enter-stagger,40ms)*2)] ${entrance}`}
          >
            {children}
          </div>
        ) : null}
        {link ? (
          <div
            className={`flex justify-center group-data-animated/es:delay-[calc(var(--es-enter-stagger,40ms)*3)] ${entrance}`}
          >
            <HelpLink {...link} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
