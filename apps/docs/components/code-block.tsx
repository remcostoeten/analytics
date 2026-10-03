import type { ComponentProps } from "react";

export function Pre({ className, ...props }: ComponentProps<"pre">) {
  return (
    <pre
      {...props}
      className={`${className ?? ""} not-fumadocs-codeblock overflow-x-auto p-4 font-mono text-[13px] leading-6`}
    />
  );
}
