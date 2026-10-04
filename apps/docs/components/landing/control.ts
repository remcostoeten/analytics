const controlStates =
  "text-muted transition-colors hover:bg-fg/7 hover:text-fg focus-visible:bg-fg/7 focus-visible:text-fg focus-visible:outline-none active:scale-100 aria-expanded:bg-fg/7 aria-expanded:text-fg";

export const outlineButton = `inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-0 hover:border-fg/25 focus-visible:border-fg/50 ${controlStates}`;

export const ghostButton = `inline-flex size-7 shrink-0 items-center justify-center rounded-md ${controlStates}`;
