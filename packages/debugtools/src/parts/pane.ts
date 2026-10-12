export const rootClass =
  "spc-console @container relative flex h-[var(--spc-height,640px)] flex-col overflow-hidden rounded-[10px] border border-console-line bg-console-bg text-left font-console-sans text-[13px] leading-[1.4] text-console-fg antialiased";

export const paneClass = "relative flex min-h-0 min-w-0 flex-col";

export const paneHeadClass =
  "flex h-9.5 flex-none items-center justify-between border-b border-console-divider pr-2.5 pl-3";

export const iconButtonClass =
  "grid size-5.5 place-items-center rounded-sm text-console-muted hover:bg-console-hover hover:text-console-fg";

export const hideScrollbarClass = "[scrollbar-width:none]";
